import 'server-only';

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';

function athensDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = formatter.formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === 'year')?.value),
    month: Number(parts.find((p) => p.type === 'month')?.value),
    day: Number(parts.find((p) => p.type === 'day')?.value),
    weekday: parts.find((p) => p.type === 'weekday')?.value,
  };
}

function athensUtcOffsetMinutes(date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Athens',
    timeZoneName: 'shortOffset',
  });
  const offsetPart = formatter.formatToParts(date).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+2';
  const match = offsetPart.match(/GMT([+-]\d+)/);
  return (match ? Number(match[1]) : 2) * 60;
}

// Next working day, Monday to Saturday, Europe/Athens -- set at 18:00
// Athens local time on that date, computed fresh per date so a DST
// transition inside the search window doesn't skew it.
export function nextWorkingDayDueDate(from: Date): Date {
  let cursor = new Date(from.getTime());
  for (let i = 0; i < 8; i += 1) {
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    const { year, month, day, weekday } = athensDateParts(cursor);
    if (weekday !== 'Sun') {
      const offsetMinutes = athensUtcOffsetMinutes(cursor);
      const utcMillis = Date.UTC(year, month - 1, day, 18, 0, 0) - offsetMinutes * 60 * 1000;
      return new Date(utcMillis);
    }
  }
  return cursor; // unreachable -- Sunday can't occur 8 days running
}

export function formatAthensDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Athens',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export async function createClickUpTask(params: {
  name: string;
  description: string;
  dueDate: Date;
}): Promise<{ id: string }> {
  const token = process.env.CLICKUP_API_TOKEN;
  const listId = process.env.CLICKUP_AUTHORIZATIONS_LIST_ID;
  if (!token || !listId) {
    throw new Error('CLICKUP_API_TOKEN or CLICKUP_AUTHORIZATIONS_LIST_ID is not set.');
  }

  const response = await fetch(`${CLICKUP_API_BASE}/list/${listId}/task`, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: params.name,
      description: params.description,
      due_date: params.dueDate.getTime(),
      due_date_time: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ClickUp API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { id: string };
  return { id: data.id };
}
