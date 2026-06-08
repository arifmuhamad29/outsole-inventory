import { signOut } from "@/lib/auth";

export async function GET() {
  // Use official NextAuth signOut to ensure strict secure cookies are actually destroyed
  await signOut({ redirectTo: "/login" });
}
