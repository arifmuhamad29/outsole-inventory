import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  providers: [], // Will be populated in auth.ts to avoid Edge Runtime issues
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.username = token.username as string | undefined;
        session.user.permissions = token.permissions as string[] | undefined;
      }
      return session;
    }
  },
} satisfies NextAuthConfig;
