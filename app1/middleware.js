import { NextResponse } from "next/server";

const COOKIE_NAME = process.env.COOKIE_NAME || "token_app1";

export function middleware(req) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const { pathname } = req.nextUrl;

  // Protect /dashboard
  if (pathname.startsWith("/dashboard") && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect /login to /dashboard if already logged in
  if (pathname.startsWith("/login") && token) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/login"],
};
