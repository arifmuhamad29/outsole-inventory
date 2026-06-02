import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

const { auth } = NextAuth(authConfig)
import { NextResponse } from "next/server"

const publicRoutes = ["/login"]
const openRoutes = ["/public"]
const operatorRoutes = ["/", "/outbound", "/inventory"]

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname)

  if (openRoutes.some(route => nextUrl.pathname.startsWith(route))) {
    return NextResponse.next()
  }

  if (isPublicRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", nextUrl))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    let callbackUrl = nextUrl.pathname
    if (nextUrl.search) {
      callbackUrl += nextUrl.search
    }
    const encodedCallbackUrl = encodeURIComponent(callbackUrl)
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl)
    )
  }

  const role = req.auth?.user?.role

  if (role === "OPERATOR") {
    // Exact match for operator routes or starting with those base paths?
    // /outbound, /, etc.
    const isOperatorAllowed = operatorRoutes.some(
      (route) => nextUrl.pathname === route || nextUrl.pathname.startsWith(`${route}/`)
    )
    
    // exception for "/" since it starts with "/" for everything
    if (nextUrl.pathname === "/") {
      return NextResponse.next()
    }

    if (!isOperatorAllowed && !nextUrl.pathname.startsWith("/api/scanner/outbound")) {
      return NextResponse.redirect(new URL("/", nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
