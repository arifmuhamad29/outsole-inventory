import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  // Wipe all NextAuth/Auth.js session cookies
  for (const cookie of allCookies) {
    if (cookie.name.includes("authjs") || cookie.name.includes("next-auth")) {
      cookieStore.delete(cookie.name);
    }
  }

  // Redirect to login cleanly
  return NextResponse.redirect(new URL("/login", request.url));
}
