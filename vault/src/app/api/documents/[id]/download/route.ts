import { Readable } from 'node:stream';
import { createClient } from '@/lib/supabase/server';
import { streamDocumentFromDrive } from '@/lib/google/drive';

// Not a literal Google Drive signed URL -- Drive has no such concept for
// arbitrary files. Instead this route checks the visitor's own session
// against Row Level Security (the same `documents` select a client's
// session is allowed to see) and, only if that succeeds, streams the file
// bytes from Drive through our own server. The link is only ever good for
// as long as the visitor's session is, which is the practical equivalent
// of "short-lived" here.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Not authorized.', { status: 401 });
  }

  const { data: document, error } = await supabase
    .from('documents')
    .select('id, drive_file_id, mime_type, title')
    .eq('id', id)
    .single();

  if (error || !document) {
    return new Response('Not found.', { status: 404 });
  }

  const stream = await streamDocumentFromDrive(document.drive_file_id);
  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      'Content-Type': document.mime_type,
      'Content-Disposition': `attachment; filename="${document.title.replace(/"/g, '')}"`,
      'Cache-Control': 'no-store',
    },
  });
}
