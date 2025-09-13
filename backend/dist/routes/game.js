"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const router = express_1.default.Router();
// Get user's game history
router.get("/history", async (req, res) => {
    try {
        const { userId, limit = 10, offset = 0 } = req.query;
        const games = await database_1.default.game.findMany({
            where: {
                OR: [
                    { blackPlayerId: parseInt(userId) },
                    { whitePlayerId: parseInt(userId) },
                ],
            },
            include: {
                blackPlayer: {
                    select: { username: true },
                },
                whitePlayer: {
                    select: { username: true },
                },
            },
            orderBy: { startedAt: "desc" },
            take: parseInt(limit),
            skip: parseInt(offset),
        });
        const formattedGames = games.map((game) => ({
            id: game.id,
            board_size: game.boardSize,
            status: game.status,
            result: game.result,
            started_at: game.startedAt,
            finished_at: game.finishedAt,
            black_player: game.blackPlayer?.username,
            white_player: game.whitePlayer?.username,
            winner_id: game.winnerId,
        }));
        res.json(formattedGames);
    }
    catch (error) {
        console.error("Game history error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Get game details
router.get("/:gameId", async (req, res) => {
    try {
        const { gameId } = req.params;
        const game = await database_1.default.game.findUnique({
            where: { id: parseInt(gameId) },
            include: {
                blackPlayer: {
                    select: { username: true },
                },
                whitePlayer: {
                    select: { username: true },
                },
                moves: {
                    include: {
                        player: {
                            select: { username: true },
                        },
                    },
                    orderBy: { moveNumber: "asc" },
                },
            },
        });
        if (!game) {
            return res.status(404).json({ message: "Game not found" });
        }
        const formattedGame = {
            id: game.id,
            black_player_id: game.blackPlayerId,
            white_player_id: game.whitePlayerId,
            board_size: game.boardSize,
            status: game.status,
            winner_id: game.winnerId,
            result: game.result,
            started_at: game.startedAt,
            finished_at: game.finishedAt,
            sgf_data: game.sgfData,
            black_player: game.blackPlayer?.username,
            white_player: game.whitePlayer?.username,
        };
        const formattedMoves = game.moves.map((move) => ({
            id: move.id,
            game_id: move.gameId,
            player_id: move.playerId,
            move_number: move.moveNumber,
            x_coordinate: move.xCoordinate,
            y_coordinate: move.yCoordinate,
            is_pass: move.isPass,
            is_resign: move.isResign,
            captured_stones: move.capturedStones,
            move_time: move.moveTime,
            player_name: move.player.username,
        }));
        res.json({
            game: formattedGame,
            moves: formattedMoves,
        });
    }
    catch (error) {
        console.error("Get game error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Create private game invitation
router.post("/invite", async (req, res) => {
    try {
        const { inviterId, inviteeId, boardSize = 19 } = req.body;
        // Check if invitee exists
        const invitee = await database_1.default.user.findUnique({
            where: { id: inviteeId },
        });
        if (!invitee) {
            return res.status(404).json({ message: "Invitee not found" });
        }
        // Create invitation
        const invitation = await database_1.default.gameInvitation.create({
            data: {
                inviterId,
                inviteeId,
                boardSize,
            },
        });
        res.status(201).json({
            message: "Invitation sent",
            invitationId: invitation.id,
        });
    }
    catch (error) {
        console.error("Create invitation error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Accept game invitation
router.post("/invite/:invitationId/accept", async (req, res) => {
    try {
        const { invitationId } = req.params;
        const { inviteeId } = req.body;
        // Get invitation details
        const invitation = await database_1.default.gameInvitation.findFirst({
            where: {
                id: parseInt(invitationId),
                inviteeId,
                status: "pending",
            },
        });
        if (!invitation) {
            return res
                .status(404)
                .json({ message: "Invitation not found or already processed" });
        }
        // Create game and update invitation in a transaction
        const result = await database_1.default.$transaction(async (tx) => {
            const game = await tx.game.create({
                data: {
                    blackPlayerId: invitation.inviterId,
                    whitePlayerId: invitation.inviteeId,
                    boardSize: invitation.boardSize,
                },
            });
            await tx.gameInvitation.update({
                where: { id: invitation.id },
                data: { status: "accepted" },
            });
            return game;
        });
        res.json({
            message: "Game created successfully",
            gameId: result.id,
        });
    }
    catch (error) {
        console.error("Accept invitation error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.default = router;
//# sourceMappingURL=game.js.map