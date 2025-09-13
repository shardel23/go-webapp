-- AlterTable
ALTER TABLE "public"."game_invitations" ALTER COLUMN "expires_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour');

-- AlterTable
ALTER TABLE "public"."games" ALTER COLUMN "board_state" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."matchmaking_queue" ALTER COLUMN "expires_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '5 minutes');
