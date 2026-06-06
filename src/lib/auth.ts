import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { authConfig } from "./auth.config"
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      username?: string;
      permissions?: string[];
    } & DefaultSession["user"]
  }

  interface User {
    id: string;
    role: string;
    username?: string;
    permissions?: string[];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ username: z.string().min(3), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { username, password } = parsedCredentials.data;
          const user = await prisma.user.findUnique({ where: { username } });
          
          if (!user) return null;
          
          const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
          if (passwordsMatch) {
            return {
              id: user.id,
              username: user.username,
              name: user.name,
              role: user.role,
              permissions: user.permissions,
            };
          }
        }
        return null;
      }
    })
  ],
  session: {
    strategy: "jwt",
  }
})
