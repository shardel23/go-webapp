/*
  Warnings:

  - You are about to drop the column `current_player` on the `games` table. All the data in the column will be lost.
  - You are about to drop the column `ko_position` on the `games` table. All the data in the column will be lost.
  - You are about to drop the column `pass_count` on the `games` table. All the data in the column will be lost.
  - You are about to alter the column `board_state` on the `games` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(400)`.

*/
-- AlterTable
ALTER TABLE "public"."game_invitations" ALTER COLUMN "expires_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour');

-- AlterTable
ALTER TABLE "public"."games" DROP COLUMN "current_player",
DROP COLUMN "ko_position",
DROP COLUMN "pass_count",
ALTER COLUMN "board_state" SET DATA TYPE VARCHAR(400);

-- AlterTable
ALTER TABLE "public"."matchmaking_queue" ALTER COLUMN "expires_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '5 minutes');
