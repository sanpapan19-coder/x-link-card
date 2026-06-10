import { NextRequest, NextResponse } from 'next/server';

function unauthorized() {
  return new NextResponse('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="X Link Card Admin", charset="UTF-8"',
    },
  });
}

export function middleware(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('ADMIN_PASSWORD is not configured.', { status: 503 });
    }

    return NextResponse.next();
  }

  const username = process.env.ADMIN_USERNAME || 'admin';
  const authorization = request.headers.get('authorization');

  if (!authorization?.startsWith('Basic ')) {
    return unauthorized();
  }

  try {
    const credentials = atob(authorization.slice('Basic '.length));
    const separatorIndex = credentials.indexOf(':');
    const providedUsername = credentials.slice(0, separatorIndex);
    const providedPassword = credentials.slice(separatorIndex + 1);

    if (providedUsername === username && providedPassword === password) {
      return NextResponse.next();
    }
  } catch {
    return unauthorized();
  }

  return unauthorized();
}

export const config = {
  matcher: ['/admin/:path*'],
};
