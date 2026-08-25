import 'server-only';

import { google } from 'googleapis';
import { getGoogleAuth } from './auth';

const SHEETS_SCOPE = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

export interface CrmClientRow {
  clientId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  language: string;
  lastInteractionDate: string;
}

export interface CrmPropertyRow {
  propertyId: string | null;
  clientId: string | null;
  address: string;
  zip: string;
  city: string;
  notes: string;
  status: string;
}

async function readTab(spreadsheetId: string, range: string) {
  const sheets = google.sheets({ version: 'v4', auth: getGoogleAuth(SHEETS_SCOPE) });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return res.data.values ?? [];
}

// 01_Clients: ClientID | FullName | First name | Last name | Email | Phone |
//             Language | Preferred Channel | ΑΦΜ | Notes | Last Interaction Date
// FullName is intentionally not read: it stores "Last, First" with an
// embedded comma.
export async function readCrmClients(spreadsheetId: string): Promise<CrmClientRow[]> {
  const rows = await readTab(spreadsheetId, '01_Clients!A2:K');
  return rows.map((row) => ({
    clientId: row[0] ?? null,
    firstName: row[2] ?? '',
    lastName: row[3] ?? '',
    email: row[4] ?? '',
    phone: row[5] ?? '',
    language: row[6] ?? '',
    lastInteractionDate: row[10] ?? '',
  }));
}

// 02_Properties: PropertyID | ClientID | Address | ZIP | City | Notes |
//                Status | Geocode | VaultFolderURL
// Geocode and VaultFolderURL are intentionally not read in Slice 1.
export async function readCrmProperties(spreadsheetId: string): Promise<CrmPropertyRow[]> {
  const rows = await readTab(spreadsheetId, '02_Properties!A2:I');
  return rows.map((row) => ({
    propertyId: row[0] ?? null,
    clientId: row[1] ?? null,
    address: row[2] ?? '',
    zip: row[3] ?? '',
    city: row[4] ?? '',
    notes: row[5] ?? '',
    status: row[6] ?? '',
  }));
}
