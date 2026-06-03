import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Tooling data...')
  
  // Create Shoe Model
  const model1 = await prisma.shoeModel.upsert({
    where: { name: 'LITE RACER ADAPT 8.0 I WIDE' },
    update: {},
    create: {
      name: 'LITE RACER ADAPT 8.0 I WIDE',
    },
  })

  const model2 = await prisma.shoeModel.upsert({
    where: { name: 'SAMBA OG W' },
    update: {},
    create: {
      name: 'SAMBA OG W',
    },
  })

  // Tooling Items for Model 1 (Bottom Tooling)
  const bTool1 = await prisma.toolingItem.create({
    data: {
      modelId: model1.id,
      category: 'BOTTOM TOOLING',
      name: 'Gauge top net',
      remark: 'DRAWING PROCESS',
      phases: {
        create: [
          { phaseType: 'SAMPLE', qty: '1 SET', status: 'VERIFIED', orderDate: new Date('2026-05-01'), targetETA: new Date('2026-05-15'), actualETA: new Date('2026-05-14') },
          { phaseType: 'EXTREME', qty: '1 SET', status: 'ON PROCESS', orderDate: new Date('2026-06-01'), targetETA: new Date('2026-06-10') },
          { phaseType: 'FSR', qty: '3 SETS', status: 'ON PROCESS', orderDate: new Date('2026-06-05'), targetETA: new Date('2026-06-20') },
        ]
      }
    }
  })

  // Tooling Items for Model 1 (Assembly Tooling)
  const aTool1 = await prisma.toolingItem.create({
    data: {
      modelId: model1.id,
      category: 'ASSEMBLY TOOLING',
      name: '3D Gauge',
      phases: {
        create: [
          { phaseType: 'SAMPLE', qty: '2 PRS', status: 'EXISTING' },
          { phaseType: 'EXTREME', qty: '2 PRS', status: 'NOT USE' },
          { phaseType: 'FSR', qty: '10 PRS', status: 'ON PROCESS', targetETA: new Date('2026-05-25') }, // Overdue
        ]
      }
    }
  })

  console.log('Seeding completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
