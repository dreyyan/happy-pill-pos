-- CreateTable
CREATE TABLE "AdminConfig" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "themeColor" TEXT NOT NULL DEFAULT '#ffffff',
    "logo" TEXT NOT NULL DEFAULT 'coffee',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminConfig_adminId_key" ON "AdminConfig"("adminId");

-- AddForeignKey
ALTER TABLE "AdminConfig" ADD CONSTRAINT "AdminConfig_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
