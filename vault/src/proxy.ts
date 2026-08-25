import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isOperatorEmail } from '@/lib/operators';

// Next.js 16 renamed middleware.ts to proxy.ts (and the `middleware` export
// to `proxy`) -- see node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md.
// This performs the optimistic checks only: refresh the session cookie and
// redirect unauthenticated or non-operator visitors away from /admin and
// /portal. The real authorization boundary is Row Level Security in
// Postgres and the operator check repeated in each layout -- see
// lib/operators.ts and app/admin/layout.tsx.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith('/admin');
  const isPortalRoute = pathname.startsWith('/portal');

  if ((isAdminRoute || isPortalRoute) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminRoute && !isOperatorEmail(user?.email)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
