-- AlterTable
ALTER TABLE "public"."game_invitations" ALTER COLUMN "expires_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour');

-- AlterTable
ALTER TABLE "public"."games" ADD COLUMN     "board_state" TEXT,
ADD COLUMN     "current_player" VARCHAR(10) DEFAULT 'black',
ADD COLUMN     "ko_position" VARCHAR(20),
ADD COLUMN     "pass_count" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."matchmaking_queue" ALTER COLUMN "expires_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '5 minutes');
