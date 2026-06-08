import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ isZombie: true })
  }
  
  try {
    const liveUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, isDeleted: true }
    })
    
    if (!liveUser || liveUser.isDeleted) {
      return NextResponse.json({ isZombie: true })
    }
    
    return NextResponse.json({ isZombie: false })
  } catch (error) {
    console.error("Zombie API Check Error:", error)
    // Don't log out on transient DB errors
    return NextResponse.json({ isZombie: false })
  }
}
