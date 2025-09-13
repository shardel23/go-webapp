"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = void 0;
const database_1 = __importDefault(require("../config/database"));
const setupSocketHandlers = (io) => {
    // Middleware to authenticate socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error("Authentication error"));
            }
            // In a real app, you'd verify the JWT token here
            // For now, we'll just extract user info from the token
            const jwt = require("jsonwebtoken");
            const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
            socket.userId = decoded.userId;
            socket.username = decoded.username;
            next();
        }
        catch (err) {
            next(new Error("Authentication error"));
        }
    });
    io.on("connection", (socket) => {
        console.log(`User ${socket.username} connected`);
        // Join matchmaking queue
        socket.on("join-matchmaking", async (data) => {
            try {
                const { boardSize = 19, ratingRange = 200 } = data;
                const userId = socket.userId;
                // Get user's rating
                if (!userId) {
                    socket.emit("error", { message: "User not authenticated" });
                    return;
                }
                const user = await database_1.default.user.findUnique({
                    where: { id: parseInt(userId) },
                    select: { rating: true },
                });
                if (!user) {
                    socket.emit("error", { message: "User not found" });
                    return;
                }
                const userRating = user.rating;
                const ratingMin = userRating - ratingRange;
                const ratingMax = userRating + ratingRange;
                // Add to matchmaking queue
                await database_1.default.matchmakingQueue.create({
                    data: {
                        playerId: parseInt(userId),
                        ratingRangeMin: ratingMin,
                        ratingRangeMax: ratingMax,
                        boardSize,
                    },
                });
                // Look for a match
                const potentialMatch = await database_1.default.matchmakingQueue.findFirst({
                    where: {
                        AND: [
                            { playerId: { not: parseInt(userId) } },
                            { boardSize },
                            { ratingRangeMin: { lte: userRating } },
                            { ratingRangeMax: { gte: userRating } },
                        ],
                    },
                    include: {
                        player: {
                            select: { rating: true },
                        },
                    },
                });
                if (potentialMatch) {
                    const otherPlayerRating = potentialMatch.player.rating;
                    // Check if the other player's rating is within our range
                    if (otherPlayerRating >= ratingMin &&
                        otherPlayerRating <= ratingMax) {
                        // Create game
                        const game = await database_1.default.game.create({
                            data: {
                                blackPlayerId: parseInt(userId),
                                whitePlayerId: potentialMatch.playerId,
                                boardSize,
                            },
                        });
                        // Remove both players from queue
                        await database_1.default.matchmakingQueue.deleteMany({
                            where: {
                                playerId: {
                                    in: [parseInt(userId), potentialMatch.playerId],
                                },
                            },
                        });
                        // Notify both players
                        io.to(socket.id).emit("match-found", {
                            gameId: game.id,
                            playerColor: "black",
                        });
                        io.to(`user_${potentialMatch.playerId}`).emit("match-found", {
                            gameId: game.id,
                            playerColor: "white",
                        });
                    }
                    else {
                        socket.emit("queued", { message: "Added to matchmaking queue" });
                    }
                }
                else {
                    socket.emit("queued", { message: "Added to matchmaking queue" });
                }
            }
            catch (error) {
                console.error("Matchmaking error:", error);
                socket.emit("error", { message: "Matchmaking failed" });
            }
        });
        // Leave matchmaking queue
        socket.on("leave-matchmaking", async () => {
            try {
                await database_1.default.matchmakingQueue.deleteMany({
                    where: { playerId: parseInt(socket.userId) },
                });
                socket.emit("left-queue", { message: "Left matchmaking queue" });
            }
            catch (error) {
                console.error("Leave queue error:", error);
                socket.emit("error", { message: "Failed to leave queue" });
            }
        });
        // Join game room
        socket.on("join-game", (gameId) => {
            socket.join(`game_${gameId}`);
            socket.emit("joined-game", { gameId });
        });
        // Make a move
        socket.on("make-move", async (data) => {
            try {
                const { gameId, x, y, isPass = false, isResign = false } = data;
                const userId = socket.userId;
                if (!userId) {
                    socket.emit("error", { message: "User not authenticated" });
                    return;
                }
                // Validate move (basic validation for now)
                if (!isPass && !isResign && (x < 0 || x >= 19 || y < 0 || y >= 19)) {
                    socket.emit("invalid-move", { message: "Invalid coordinates" });
                    return;
                }
                // Get current move number
                const moveCount = await database_1.default.move.count({
                    where: { gameId: parseInt(gameId) },
                });
                const moveNumber = moveCount + 1;
                // Store move
                await database_1.default.move.create({
                    data: {
                        gameId: parseInt(gameId),
                        playerId: parseInt(userId),
                        moveNumber,
                        xCoordinate: x,
                        yCoordinate: y,
                        isPass,
                        isResign,
                    },
                });
                // Broadcast move to all players in the game
                io.to(`game_${gameId}`).emit("move-made", {
                    gameId,
                    moveNumber,
                    x,
                    y,
                    isPass,
                    isResign,
                    playerId: userId,
                    playerName: socket.username,
                });
                // Check for game end conditions
                if (isResign) {
                    // Handle resignation
                    const game = await database_1.default.game.findUnique({
                        where: { id: parseInt(gameId) },
                        select: { blackPlayerId: true, whitePlayerId: true },
                    });
                    if (game) {
                        const isBlackPlayer = parseInt(userId) === game.blackPlayerId;
                        const winnerId = isBlackPlayer
                            ? game.whitePlayerId
                            : game.blackPlayerId;
                        const result = isBlackPlayer ? "white_wins" : "black_wins";
                        await database_1.default.game.update({
                            where: { id: parseInt(gameId) },
                            data: {
                                status: "finished",
                                winnerId,
                                result,
                                finishedAt: new Date(),
                            },
                        });
                        io.to(`game_${gameId}`).emit("game-ended", {
                            gameId,
                            reason: "resignation",
                            winner: isBlackPlayer ? "white" : "black",
                        });
                    }
                }
            }
            catch (error) {
                console.error("Make move error:", error);
                socket.emit("error", { message: "Failed to make move" });
            }
        });
        // Handle disconnection
        socket.on("disconnect", async () => {
            console.log(`User ${socket.username} disconnected`);
            // Remove from matchmaking queue
            if (socket.userId) {
                await database_1.default.matchmakingQueue.deleteMany({
                    where: { playerId: parseInt(socket.userId) },
                });
            }
        });
    });
};
exports.setupSocketHandlers = setupSocketHandlers;
//# sourceMappingURL=socketHandlers.js.map