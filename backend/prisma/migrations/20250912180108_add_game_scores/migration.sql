-- AlterTable
ALTER TABLE "public"."game_invitations" ALTER COLUMN "expires_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour');

-- AlterTable
ALTER TABLE "public"."games" ADD COLUMN     "black_score" INTEGER DEFAULT 0,
ADD COLUMN     "white_score" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."matchmaking_queue" ALTER COLUMN "expires_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '5 minutes');
