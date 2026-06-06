import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

const { auth } = NextAuth(authConfig)
import { NextResponse } from "next/server"

const publicRoutes = ["/login"]
const openRoutes = ["/public"]
const operatorRoutes = ["/", "/outbound", "/inventory", "/tooling", "/bpm-tfm", "/handover"]

// Simple in-memory rate limiter for Edge environment
type RateLimitInfo = { count: number; expiresAt: number }
const rateLimitMap = new Map<string, RateLimitInfo>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS = 30

function getRateLimit(ip: string) {
  const now = Date.now()
  
  // Basic memory cleanup for long-running edge instances
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.expiresAt < now) {
        rateLimitMap.delete(key)
      }
    }
    if (rateLimitMap.size > 2000) {
      rateLimitMap.clear()
    }
  }

  const info = rateLimitMap.get(ip)
  if (!info || info.expiresAt < now) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW })
    return { count: 1, limit: MAX_REQUESTS, remaining: MAX_REQUESTS - 1 }
  }
  
  info.count += 1
  return { count: info.count, limit: MAX_REQUESTS, remaining: Math.max(0, MAX_REQUESTS - info.count) }
}

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname)

  if (openRoutes.some(route => nextUrl.pathname.startsWith(route))) {
    if (nextUrl.pathname.startsWith("/public/inventory")) {
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1"
      const { count, limit, remaining } = getRateLimit(ip)
      
      if (count > limit) {
        return new NextResponse(
          JSON.stringify({ error: "Too many requests. Please slow down and try again in a minute." }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": "0",
            }
          }
        )
      }
      
      const res = NextResponse.next()
      res.headers.set("X-RateLimit-Limit", limit.toString())
      res.headers.set("X-RateLimit-Remaining", remaining.toString())
      return res
    }
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
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|sw.js|workbox-.*|icon-.*\\.png|public/.*).*)',
  ],
}
