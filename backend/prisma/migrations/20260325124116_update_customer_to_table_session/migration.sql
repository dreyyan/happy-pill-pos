/*
  Warnings:

  - You are about to drop the column `email` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Customer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tableNumber]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tableNumber` to the `Customer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "email",
DROP COLUMN "lastName",
DROP COLUMN "phone",
ADD COLUMN     "pax" INTEGER,
ADD COLUMN     "tableNumber" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tableNumber_key" ON "Customer"("tableNumber");
