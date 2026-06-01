# database_schema.prisma.md

## Prisma Schema Specification

Database: PostgreSQL

ORM: Prisma

---

## Enums

```prisma
enum UserRole {
  ADMIN
  OPERATOR
}

enum TransactionType {
  INBOUND
  OUTBOUND
  ADJUSTMENT
  STOCK_OPNAME
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  STOCK_IN
  STOCK_OUT
  STOCK_ADJUSTMENT
  STOCK_OPNAME
}
```

---

## User

```prisma
model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  passwordHash String
  role         UserRole

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  transactions Transaction[]
  auditLogs    AuditLog[]

  @@index([role])
}
```

---

## Outsole

```prisma
model Outsole {
  id             String   @id @default(uuid())

  qrCode         String   @unique

  model          String
  color          String
  size           Int

  stock          Int      @default(0)

  minimumStock   Int      @default(5)

  isActive       Boolean  @default(true)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  transactions   Transaction[]

  stockOpnameItems StockOpnameItem[]

  @@unique([model, color, size])

  @@index([model])
  @@index([color])
  @@index([size])
  @@index([stock])
}
```

---

## Transaction

```prisma
model Transaction {
  id          String @id @default(uuid())

  outsoleId   String
  outsole     Outsole @relation(fields: [outsoleId], references: [id])

  userId      String
  user        User @relation(fields: [userId], references: [id])

  type        TransactionType

  qty         Int

  notes       String?

  createdAt   DateTime @default(now())

  @@index([outsoleId])
  @@index([userId])
  @@index([type])
  @@index([createdAt])
}
```

---

## AuditLog

```prisma
model AuditLog {
  id            String @id @default(uuid())

  userId        String
  user          User @relation(fields: [userId], references: [id])

  action        AuditAction

  entityName    String

  entityId      String

  beforeData    Json?

  afterData     Json?

  createdAt     DateTime @default(now())

  @@index([userId])
  @@index([entityName])
  @@index([entityId])
  @@index([createdAt])
}
```

---

## StockOpnameSession

```prisma
model StockOpnameSession {
  id              String @id @default(uuid())

  sessionName     String

  createdById     String
  createdBy       User @relation(fields: [createdById], references: [id])

  startedAt       DateTime @default(now())

  finishedAt      DateTime?

  items           StockOpnameItem[]

  createdAt       DateTime @default(now())

  @@index([startedAt])
}
```

---

## StockOpnameItem

```prisma
model StockOpnameItem {
  id                 String @id @default(uuid())

  sessionId          String
  session            StockOpnameSession @relation(fields: [sessionId], references: [id])

  outsoleId          String
  outsole            Outsole @relation(fields: [outsoleId], references: [id])

  systemStock        Int

  physicalStock      Int

  difference         Int

  createdAt          DateTime @default(now())

  @@index([sessionId])
  @@index([outsoleId])
}
```

---

# Required Business Rules

## Rule 1

All stock mutations must use Prisma transaction.

Mandatory for:

* Inbound
* Outbound
* Adjustment
* Stock Opname Finalization

---

## Rule 2

Stock cannot become negative.

Validation:

```text
stock >= 0
```

---

## Rule 3

Every stock mutation must create:

* Transaction record
* AuditLog record

inside the same database transaction.

---

## Rule 4

Delete operation is prohibited.

Use:

```text
isActive = false
```

Soft delete only.

---

## Rule 5

QR Code format:

```text
OSL-{SHORT_UUID}
```

Example:

```text
OSL-8F3D7A2B
```

---

## Rule 6

Low stock warning:

```text
stock <= minimumStock
```

---

## Rule 7

Only ADMIN can:

* Inbound
* Adjustment
* Stock Opname
* User Management

---

## Rule 8

OPERATOR can:

* Scan outbound
* View dashboard

Nothing else.

---

## Rule 9

All APIs must use:

* Zod validation
* Typed responses
* Proper HTTP status codes

---

## Rule 10

All pages must support:

* Loading state
* Empty state
* Error state

No exceptions.

```
```
