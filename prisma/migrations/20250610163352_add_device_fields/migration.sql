-- Add device fields to Employee and Attendance models
ALTER TABLE "Employee" ADD COLUMN "fingerprintId" INTEGER UNIQUE;
ALTER TABLE "Employee" ADD COLUMN "rfidTag" TEXT UNIQUE;
ALTER TABLE "Attendance" ADD COLUMN "deviceId" TEXT;