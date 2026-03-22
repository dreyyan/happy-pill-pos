/*
  Warnings:

  - A unique constraint covering the columns `[receiptNumber]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `receiptNumber` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemName` to the `TransactionItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('COMPLETED', 'VOIDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'GCASH');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "discount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
ADD COLUMN     "receiptNumber" TEXT NOT NULL,
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "TransactionItem" ADD COLUMN     "costAtSale" DOUBLE PRECISION,
ADD COLUMN     "itemName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_receiptNumber_key" ON "Transaction"("receiptNumber");
