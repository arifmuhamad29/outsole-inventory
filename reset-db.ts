import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Starting database reset...")

  // Delete in reverse order of dependencies
  await prisma.transaction.deleteMany()
  console.log("Deleted all Transactions")
  
  await prisma.auditLog.deleteMany()
  console.log("Deleted all AuditLogs")
  
  await prisma.stockOpnameItem.deleteMany()
  console.log("Deleted all StockOpnameItems")
  
  await prisma.stockOpnameSession.deleteMany()
  console.log("Deleted all StockOpnameSessions")
  
  await prisma.outsole.deleteMany()
  console.log("Deleted all Outsoles")
  
  await prisma.toolingPhase.deleteMany()
  console.log("Deleted all ToolingPhases")
  
  await prisma.toolingItem.deleteMany()
  console.log("Deleted all ToolingItems")
  
  await prisma.shoeModel.deleteMany()
  console.log("Deleted all ShoeModels")
  
  await prisma.bpmTfmStock.deleteMany()
  console.log("Deleted all BpmTfmStocks")
  
  await prisma.handoverItem.deleteMany()
  console.log("Deleted all HandoverItems")
  
  await prisma.handover.deleteMany()
  console.log("Deleted all Handovers")
  
  await prisma.purchaseTracking.deleteMany()
  console.log("Deleted all PurchaseTrackings")
  
  await prisma.season.deleteMany()
  console.log("Deleted all Seasons")
  
  await prisma.shoeLast.deleteMany()
  console.log("Deleted all ShoeLasts")
  
  await prisma.notification.deleteMany()
  console.log("Deleted all Notifications")
  
  console.log("Database reset complete (Users were preserved).")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
