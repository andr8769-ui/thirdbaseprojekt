-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "creatorId" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#3355FF',
ADD COLUMN     "creatorId" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "taskId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "creatorId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
