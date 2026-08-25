import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClickUpTask, nextWorkingDayDueDate, formatAthensDateTime } from '@/lib/slice2/clickup';
import { ASSET_CLASS_LABELS, formatNetAmount, formatVatAmount, formatGrossAmount } from '@/lib/copy';

interface AuthorizationRow {
  id: string;
  status: string;
  asset_class: string;
  title: string;
  amount_net_cents: number;
  vat_rate: number;
  decided_at: string | null;
  decided_by: string | null;
  doc_id: string | null;
  clickup_task_id: string | null;
  properties: { external_crm_ref: string | null; prop_ref: string; address: string } | null;
  documents: { title: string } | null;
}

// Called by the authorizations_notify_clickup trigger (pg_net) after an
// approve/decline row is inserted. The ledger row already stands by the
// time this runs -- nothing here can roll it back. Delivery is
// at-least-once, so this dedupes on authorization.id via clickup_task_id
// before ever calling ClickUp.
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');
  if (!secret || secret !== process.env.WEBHOOK_SHARED_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const authorizationId = payload?.authorization_id as string | undefined;
  if (!authorizationId) {
    return new Response('Missing authorization_id', { status: 400 });
  }

  const admin = createAdminClient();

  const { data: authorization } = await admin
    .from('authorizations')
    .select(
      `id, status, asset_class, title, amount_net_cents, vat_rate, decided_at, decided_by, doc_id,
       clickup_task_id,
       properties(external_crm_ref, prop_ref, address),
       documents(title)`
    )
    .eq('id', authorizationId)
    .single<AuthorizationRow>();

  if (!authorization) {
    return new Response('Not found', { status: 404 });
  }

  if (authorization.clickup_task_id) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  let decidedByName = 'Unknown';
  if (authorization.decided_by) {
    const { data: decider } = await admin
      .from('clients')
      .select('name')
      .eq('auth_user_id', authorization.decided_by)
      .maybeSingle();
    if (decider) decidedByName = decider.name;
  }

  const propertyRef =
    authorization.properties?.external_crm_ref ?? authorization.properties?.prop_ref ?? 'Unknown';
  const decisionLabel = authorization.status === 'approved' ? 'approved' : 'declined';
  const taskName = `[${propertyRef}] Authorization ${decisionLabel} - ${authorization.title}`;

  const decidedAt = authorization.decided_at ? new Date(authorization.decided_at) : null;
  const description = [
    `Asset class: ${ASSET_CLASS_LABELS[authorization.asset_class] ?? authorization.asset_class}`,
    `Net: ${formatNetAmount(authorization.amount_net_cents)}`,
    `VAT (24%): ${formatVatAmount(authorization.amount_net_cents, authorization.vat_rate)}`,
    `Gross: ${formatGrossAmount(authorization.amount_net_cents, authorization.vat_rate)}`,
    `Decided at: ${decidedAt ? formatAthensDateTime(decidedAt) : 'Unknown'} (Europe/Athens)`,
    `Decided by: ${decidedByName}`,
    `Linked document: ${authorization.documents?.title ?? 'None'}`,
  ].join('\n');

  try {
    const task = await createClickUpTask({
      name: taskName,
      description,
      dueDate: nextWorkingDayDueDate(decidedAt ?? new Date()),
    });

    const { data: claimed } = await admin
      .from('authorizations')
      .update({ clickup_task_id: task.id })
      .eq('id', authorization.id)
      .is('clickup_task_id', null)
      .select('id')
      .maybeSingle();

    if (!claimed) {
      // Lost a race with another at-least-once delivery that set
      // clickup_task_id first -- the task we just created is now
      // orphaned. Log it rather than silently dropping it.
      await admin.from('sync_issues').insert({
        tab: 'clickup_authorization_notify',
        raw_value: { authorization_id: authorization.id, orphaned_clickup_task_id: task.id },
        reason: 'clickup_task_id was already set by a concurrent delivery; this task was created anyway.',
      });
    }

    return NextResponse.json({ ok: true, task_id: task.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ClickUp error.';
    await admin.from('sync_issues').insert({
      tab: 'clickup_authorization_notify',
      raw_value: { authorization_id: authorization.id, status: authorization.status },
      reason: message,
    });
    // Acknowledge receipt regardless. The ledger row already stands; a
    // failed notification must never cause redelivery storms against a
    // ClickUp outage. STOP means stop, not retry from here.
    return NextResponse.json({ ok: false, error: message });
  }
}
