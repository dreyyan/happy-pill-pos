/*
  Warnings:

  - A unique constraint covering the columns `[date]` on the table `SalesReport` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SalesReport_date_key" ON "SalesReport"("date");
