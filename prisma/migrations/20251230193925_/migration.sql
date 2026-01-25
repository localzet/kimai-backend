/*
  Warnings:

  - You are about to drop the column `created_at` on the `MlConfig` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `MlConfig` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `MlResult` table. All the data in the column will be lost.
  - You are about to drop the column `timesheet_id` on the `MlResult` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `MlResult` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `ip_address` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `last_used_at` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `refresh_token` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `user_agent` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `SyncState` table. All the data in the column will be lost.
  - You are about to drop the column `sync_status` on the `SyncState` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `SyncState` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `SyncState` table. All the data in the column will be lost.
  - You are about to drop the column `activity_id` on the `Timesheet` table. All the data in the column will be lost.
  - You are about to drop the column `activity_name` on the `Timesheet` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Timesheet` table. All the data in the column will be lost.
  - You are about to drop the column `kimai_id` on the `Timesheet` table. All the data in the column will be lost.
  - You are about to drop the column `meta_fields` on the `Timesheet` table. All the data in the column will be lost.
  - You are about to drop the column `project_name` on the `Timesheet` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `Timesheet` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Timesheet` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `mix_id` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `token_version` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `calendar_sync` on the `UserSettings` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `UserSettings` table. All the data in the column will be lost.
  - You are about to drop the column `excluded_tags` on the `UserSettings` table. All the data in the column will be lost.
  - You are about to drop the column `kimai_api_key` on the `UserSettings` table. All the data in the column will be lost.
  - You are about to drop the column `kimai_api_url` on the `UserSettings` table. All the data in the column will be lost.
  - You are about to drop the column `project_settings` on the `UserSettings` table. All the data in the column will be lost.
  - You are about to drop the column `rate_per_minute` on the `UserSettings` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `UserSettings` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `UserSettings` table. All the data in the column will be lost.
  - You are about to drop the column `user_preferences` on the `UserSettings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[refreshToken]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `SyncState` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,kimaiId]` on the table `Timesheet` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `UserSettings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `MlConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `MlResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiresAt` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastUsedAt` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refreshToken` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `SyncState` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SyncState` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `SyncState` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Timesheet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Timesheet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `kimaiApiKey` to the `UserSettings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kimaiApiUrl` to the `UserSettings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectSettings` to the `UserSettings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `UserSettings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `UserSettings` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MlResult" DROP CONSTRAINT "MlResult_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_user_id_fkey";

-- DropForeignKey
ALTER TABLE "SyncState" DROP CONSTRAINT "SyncState_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Timesheet" DROP CONSTRAINT "Timesheet_user_id_fkey";

-- DropForeignKey
ALTER TABLE "UserSettings" DROP CONSTRAINT "UserSettings_user_id_fkey";

-- DropIndex
DROP INDEX "Session_refresh_token_key";

-- DropIndex
DROP INDEX "SyncState_user_id_key";

-- DropIndex
DROP INDEX "Timesheet_user_id_kimai_id_key";

-- DropIndex
DROP INDEX "User_mix_id_key";

-- DropIndex
DROP INDEX "UserSettings_user_id_key";

-- AlterTable
ALTER TABLE "MlConfig" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "MlResult" DROP COLUMN "created_at",
DROP COLUMN "timesheet_id",
DROP COLUMN "user_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "timesheetId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "created_at",
DROP COLUMN "expires_at",
DROP COLUMN "ip_address",
DROP COLUMN "last_used_at",
DROP COLUMN "refresh_token",
DROP COLUMN "updated_at",
DROP COLUMN "user_agent",
DROP COLUMN "user_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "refreshToken" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SyncState" DROP COLUMN "created_at",
DROP COLUMN "sync_status",
DROP COLUMN "updated_at",
DROP COLUMN "user_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Timesheet" DROP COLUMN "activity_id",
DROP COLUMN "activity_name",
DROP COLUMN "created_at",
DROP COLUMN "kimai_id",
DROP COLUMN "meta_fields",
DROP COLUMN "project_name",
DROP COLUMN "updated_at",
DROP COLUMN "user_id",
ADD COLUMN     "activityId" INTEGER,
ADD COLUMN     "activityName" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "kimaiId" INTEGER,
ADD COLUMN     "metaFields" JSONB,
ADD COLUMN     "projectName" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "created_at",
DROP COLUMN "mix_id",
DROP COLUMN "password_hash",
DROP COLUMN "token_version",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- AlterTable
ALTER TABLE "UserSettings" DROP COLUMN "calendar_sync",
DROP COLUMN "created_at",
DROP COLUMN "excluded_tags",
DROP COLUMN "kimai_api_key",
DROP COLUMN "kimai_api_url",
DROP COLUMN "project_settings",
DROP COLUMN "rate_per_minute",
DROP COLUMN "updated_at",
DROP COLUMN "user_id",
DROP COLUMN "user_preferences",
ADD COLUMN     "calendarSync" JSONB,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "excludedTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "kimaiApiKey" TEXT NOT NULL,
ADD COLUMN     "kimaiApiUrl" TEXT NOT NULL,
ADD COLUMN     "projectSettings" JSONB NOT NULL,
ADD COLUMN     "ratePerMinute" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ADD COLUMN     "userPreferences" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "SyncState_userId_key" ON "SyncState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Timesheet_userId_kimaiId_key" ON "Timesheet"("userId", "kimaiId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- AddForeignKey
ALTER TABLE "SyncState" ADD CONSTRAINT "SyncState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MlResult" ADD CONSTRAINT "MlResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
