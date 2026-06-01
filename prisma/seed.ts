import { PrismaClient, UserRole } from '@prisma/client'
// Using a simple crypto hash for seed. Note: In real app use bcrypt/argon2
// For next-auth credentials we'll configure bcrypt later.
// Let's assume we use standard bcrypt password hashing. We can just use a pre-hashed password for "password123".
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Clean up existing data for seed idempotency if needed (optional)
  // await prisma.transaction.deleteMany()
  // await prisma.auditLog.deleteMany()
  // await prisma.outsole.deleteMany()
  // await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash,
      role: UserRole.ADMIN,
    },
  })

  console.log(`Created admin user: ${admin.email}`)

  const operator = await prisma.user.upsert({
    where: { email: 'operator@example.com' },
    update: {},
    create: {
      name: 'Operator User',
      email: 'operator@example.com',
      passwordHash,
      role: UserRole.OPERATOR,
    },
  })

  console.log(`Created operator user: ${operator.email}`)

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
