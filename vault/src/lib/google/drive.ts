import 'server-only';

import { google } from 'googleapis';
import { Readable } from 'node:stream';
import { getGoogleAuth } from './auth';

const DRIVE_SCOPE = ['https://www.googleapis.com/auth/drive'];

// Workspace folder that every per-property Drive folder is created inside.
// Fixed by the project instructions -- not configurable.
const WORKSPACE_FOLDER_ID = '1heud2_HZ7fvH0xtdoZpprC31VFNlGifi';

function driveClient() {
  return google.drive({ version: 'v3', auth: getGoogleAuth(DRIVE_SCOPE) });
}

// Called once, on first document upload for a property. The CRM's
// VaultFolderURL column is never read -- it holds human folder names, not
// IDs, and is blank on most rows.
export async function ensurePropertyFolder(
  propertyRef: string,
  address: string
): Promise<string> {
  const drive = driveClient();
  const folderName = `[${propertyRef}] ${address}`;

  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [WORKSPACE_FOLDER_ID],
    },
    fields: 'id',
  });

  if (!created.data.id) {
    throw new Error('Drive did not return a folder id.');
  }
  return created.data.id;
}

export async function uploadDocumentToDrive(params: {
  folderId: string;
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
}): Promise<string> {
  const drive = driveClient();

  const uploaded = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [params.folderId],
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.fileBuffer),
    },
    fields: 'id',
  });

  if (!uploaded.data.id) {
    throw new Error('Drive did not return a file id.');
  }
  return uploaded.data.id;
}

// Streams file bytes through our own server rather than issuing a Drive
// URL directly -- Drive has no first-class signed-URL concept for
// arbitrary files. This is called from a route handler gated on the
// visitor's own session (see /api/documents/[id]/download), so the
// resulting "link" is only ever live for as long as that session is.
export async function streamDocumentFromDrive(fileId: string): Promise<Readable> {
  const drive = driveClient();
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return res.data as unknown as Readable;
}
