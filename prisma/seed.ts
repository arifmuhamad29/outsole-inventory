import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // 1. Backfill existing users (if any) to have a username based on their email
  const existingUsers = await prisma.user.findMany({
    where: { username: null }
  })

  for (const user of existingUsers) {
    if (user.email) {
      const newUsername = user.email.split("@")[0] + "-" + Math.floor(Math.random() * 1000)
      await prisma.user.update({
        where: { id: user.id },
        data: { username: newUsername }
      })
      console.log(`Backfilled username for ${user.email} -> ${newUsername}`)
    }
  }

  // 2. Create the Super Admin if it doesn't exist
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
