import { OutboundClient } from "./components/outbound-client"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function OutboundPage() {
  const session = await auth()
  if (!session) {
    redirect("/")
  }

  const outsoles = await prisma.outsole.findMany({
    where: { isActive: true },
    select: {
      id: true,
      qrCode: true,
      model: true,
      article: true,
      component: true,
      color: true,
      size: true,
      stock: true
    },
    orderBy: { updatedAt: "desc" }
  })

  return <OutboundClient outsoles={outsoles} />
}
