"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function getToolingModels() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const models = await prisma.shoeModel.findMany({
    include: {
      toolingItems: {
        orderBy: {
          name: 'asc'
        },
        include: {
          phases: true,
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  })

  return models
}
