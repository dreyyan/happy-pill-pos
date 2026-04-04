/*
  Warnings:

  - Added the required column `department` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `department` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `department` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Department" AS ENUM ('CAFE', 'RESTOBAR');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "department" "Department";

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "department" "Department" NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "department" "Department" NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "department" "Department" NOT NULL;

-- CreateIndex
CREATE INDEX "Item_department_idx" ON "Item"("department");

-- CreateIndex
CREATE INDEX "Order_department_idx" ON "Order"("department");

-- CreateIndex
CREATE INDEX "Transaction_department_idx" ON "Transaction"("department");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");
