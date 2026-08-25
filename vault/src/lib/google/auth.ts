import 'server-only';

import { google } from 'googleapis';

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

function loadServiceAccountCredentials(): ServiceAccountCredentials {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!encoded) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 is not set. See vault/README.md for how to create and encode the service account key.'
    );
  }
  const json = Buffer.from(encoded, 'base64').toString('utf-8');
  return JSON.parse(json) as ServiceAccountCredentials;
}

// A base64-encoded full JSON key (rather than separate email/private-key
// env vars) sidesteps the classic Netlify failure mode where a pasted
// private key's literal \n line breaks get mangled.
export function getGoogleAuth(scopes: string[]) {
  const credentials = loadServiceAccountCredentials();
  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes,
  });
}
