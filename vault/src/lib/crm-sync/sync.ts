import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { readCrmClients, readCrmProperties } from '@/lib/google/sheets';
import { normalizeClientId, parseCrmLanguage, parseCrmDate } from './parse';

const TEST_DOMAIN = 'klehomerie.com';

interface SyncIssue {
  tab: '01_Clients' | '02_Properties';
  raw_value: unknown;
  reason: string;
}

export type CrmSyncResult =
  | { ok: true; rowsRead: number; rowsWritten: number; rowsSkipped: number }
  | { ok: false; error: string };

// Runs the "Sync from CRM" action end to end: read the two Sheets tabs,
// normalize and validate every row, apply the mirror atomically, then log
// exactly one sync_runs row (success or failure) plus any sync_issues.
// Manual trigger only -- no cron, no webhook. See vault/README.md.
export async function syncFromCrm(): Promise<CrmSyncResult> {
  const spreadsheetId = process.env.CRM_GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    return { ok: false, error: 'CRM_GOOGLE_SHEET_ID is not set.' };
  }

  const admin = createAdminClient();
  const startedAt = new Date().toISOString();
  let rowsRead = 0;
  let rowsSkipped = 0;
  const issues: SyncIssue[] = [];

  try {
    const [clientRows, propertyRows] = await Promise.all([
      readCrmClients(spreadsheetId),
      readCrmProperties(spreadsheetId),
    ]);
    rowsRead = clientRows.length + propertyRows.length;

    const knownClientRefs = new Set<string>();
    const clientsPayload: Array<Record<string, unknown>> = [];

    for (const row of clientRows) {
      const externalRef = normalizeClientId(row.clientId);
      if (!externalRef) {
        rowsSkipped += 1;
        issues.push({ tab: '01_Clients', raw_value: row, reason: 'Missing or unreadable ClientID.' });
        continue;
      }
      if (row.email.trim().toLowerCase().endsWith(`@${TEST_DOMAIN}`)) {
        rowsSkipped += 1;
        issues.push({
          tab: '01_Clients',
          raw_value: row,
          reason: 'Internal test domain (klehomerie.com), excluded from the mirror.',
        });
        continue;
      }

      const firstName = row.firstName.trim();
      const lastName = row.lastName.trim();
      const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';

      if (row.lastInteractionDate && !parseCrmDate(row.lastInteractionDate)) {
        issues.push({
          tab: '01_Clients',
          raw_value: row,
          reason: 'Unparsable Last Interaction Date.',
        });
      }

      knownClientRefs.add(externalRef);
      clientsPayload.push({
        external_crm_ref: externalRef,
        first_name: firstName || null,
        last_name: lastName || null,
        name,
        email: row.email.trim() || 'Unknown',
        phone: row.phone.trim() || null,
        language: parseCrmLanguage(row.language),
      });
    }

    const propertiesPayload: Array<Record<string, unknown>> = [];
    for (const row of propertyRows) {
      const externalRef = normalizeClientId(row.propertyId);
      const clientExternalRef = normalizeClientId(row.clientId);

      if (!externalRef) {
        rowsSkipped += 1;
        issues.push({ tab: '02_Properties', raw_value: row, reason: 'Missing or unreadable PropertyID.' });
        continue;
      }
      if (!clientExternalRef || !knownClientRefs.has(clientExternalRef)) {
        rowsSkipped += 1;
        issues.push({
          tab: '02_Properties',
          raw_value: row,
          reason: 'ClientID matches no row in 01_Clients.',
        });
        continue;
      }

      propertiesPayload.push({
        external_crm_ref: externalRef,
        client_external_ref: clientExternalRef,
        address: row.address.trim() || 'Unknown',
        zip: row.zip.trim() || null,
        city: row.city.trim() || null,
        notes: row.notes.trim() || null,
        is_active: row.status.trim().toLowerCase() === 'active',
      });
    }

    const { data, error } = await admin.rpc('crm_sync_apply', {
      p_clients: clientsPayload,
      p_properties: propertiesPayload,
    });

    if (error) {
      throw new Error(error.message);
    }

    const counts = data as { clients_written?: number; properties_written?: number } | null;
    const rowsWritten = (counts?.clients_written ?? 0) + (counts?.properties_written ?? 0);

    const { data: runRow, error: runError } = await admin
      .from('sync_runs')
      .insert({
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        rows_read: rowsRead,
        rows_written: rowsWritten,
        rows_skipped: rowsSkipped,
      })
      .select('id')
      .single();

    if (runError) {
      throw new Error(runError.message);
    }

    if (issues.length > 0) {
      await admin.from('sync_issues').insert(
        issues.map((issue) => ({
          run_id: runRow.id,
          tab: issue.tab,
          raw_value: issue.raw_value,
          reason: issue.reason,
        }))
      );
    }

    return { ok: true, rowsRead, rowsWritten, rowsSkipped };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error.';
    await admin.from('sync_runs').insert({
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      rows_read: rowsRead,
      rows_written: 0,
      rows_skipped: rowsSkipped,
      error: message,
    });
    return { ok: false, error: message };
  }
}
