import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getBearerToken, verifyAccessToken } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const token = getBearerToken(request.headers.get("authorization"));

  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  try {
    const verifiedToken = await verifyAccessToken(token);
    const requestHeaders = new Headers(request.headers);

    requestHeaders.set("x-user-admin", String(verifiedToken.isAdmin));
    requestHeaders.set("x-user-email", verifiedToken.email);
    requestHeaders.set("x-user-id", verifiedToken.sub);
    requestHeaders.set("x-user-name", verifiedToken.username);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}

export const config = {
  matcher: ["/api/users/:path*"],
};
