import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // 1. Create the Super Admin if it doesn't exist
  const superAdminUsername = "superadmin"
  
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { username: superAdminUsername }
  })

  if (!existingSuperAdmin) {
    const passwordHash = await bcrypt.hash("SuperAdmin123!", 10)
    
    await prisma.user.create({
      data: {
        name: "Super Administrator",
        username: superAdminUsername,
        passwordHash,
        role: "SUPER_ADMIN",
      }
    })
    console.log(`Created Super Admin with username: ${superAdminUsername}`)
  } else {
    console.log(`Super Admin already exists.`)
  }

  console.log("Seeding finished.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
