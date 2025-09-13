import { Server, Socket } from "socket.io";
import prisma from "../config/database";
import { GoRules } from "../services/goRules";
import { GameStateManager } from "../services/gameStateManager";
import { BoardStateConverter } from "../utils/boardStateConverter";

interface AuthenticatedSocket extends Socket {
  userId?: number;
  username?: string;
}

export const setupSocketHandlers = (io: Server) => {
  // Map to store user ID to socket ID mapping
  const userSocketMap = new Map<number, string>();

  // Middleware to authenticate socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      // In a real app, you'd verify the JWT token here
      // For now, we'll just extract user info from the token
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      );

      socket.userId = parseInt(decoded.userId);
      socket.username = decoded.username;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(
      `User ${socket.username} (ID: ${socket.userId}) connected with socket ID: ${socket.id}`
    );

    // Store user-to-socket mapping
    if (socket.userId) {
      userSocketMap.set(socket.userId, socket.id);
      console.log(`Stored mapping: ${socket.userId} -> ${socket.id}`);
      console.log(
        "Current userSocketMap:",
        Array.from(userSocketMap.entries())
      );
    }

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

        const user = await prisma.user.findUnique({
          where: { id: userId },
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
        await prisma.matchmakingQueue.create({
          data: {
            playerId: userId,
            ratingRangeMin: ratingMin,
            ratingRangeMax: ratingMax,
            boardSize,
          },
        });

        // Look for a match
        const potentialMatch = await prisma.matchmakingQueue.findFirst({
          where: {
            AND: [
              { playerId: { not: userId! } },
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
          if (
            otherPlayerRating >= ratingMin &&
            otherPlayerRating <= ratingMax
          ) {
            // Randomly assign black and white players
            const isFirstPlayerBlack = Math.random() < 0.5;
            const blackPlayerId = isFirstPlayerBlack
              ? userId!
              : potentialMatch.playerId;
            const whitePlayerId = isFirstPlayerBlack
              ? potentialMatch.playerId
              : userId!;

            // Create game
            const game = await prisma.game.create({
              data: {
                blackPlayerId,
                whitePlayerId,
                boardSize,
                boardState: BoardStateConverter.createEmptyBoard(boardSize),
              },
            });

            // Remove both players from queue
            await prisma.matchmakingQueue.deleteMany({
              where: {
                playerId: {
                  in: [userId!, potentialMatch.playerId],
                },
              },
            });

            // Join both players to the game room
            socket.join(`game_${game.id}`);

            // Find the other player's socket using our mapping
            console.log(
              "Current userSocketMap:",
              Array.from(userSocketMap.entries())
            );
            console.log(
              `Looking for player ${potentialMatch.playerId} in socket map`
            );
            const otherPlayerSocketId = userSocketMap.get(
              potentialMatch.playerId
            );
            console.log(
              `Found socket ID for player ${potentialMatch.playerId}: ${otherPlayerSocketId}`
            );

            if (otherPlayerSocketId) {
              const otherPlayerSocket =
                io.sockets.sockets.get(otherPlayerSocketId);
              if (otherPlayerSocket) {
                console.log(
                  `Successfully found and joining white player socket: ${otherPlayerSocketId}`
                );
                otherPlayerSocket.join(`game_${game.id}`);
              } else {
                console.log(
                  `Socket ${otherPlayerSocketId} not found in io.sockets.sockets`
                );
              }
            }

            // Notify both players with correct assignments
            const firstPlayerColor = isFirstPlayerBlack ? "black" : "white";
            const secondPlayerColor = isFirstPlayerBlack ? "white" : "black";

            console.log(
              `Notifying first player (${socket.username}) as ${firstPlayerColor} with socket ID: ${socket.id}`
            );
            io.to(socket.id).emit("match-found", {
              gameId: game.id,
              playerColor: firstPlayerColor,
              blackPlayerId,
              whitePlayerId,
              boardSize: boardSize,
            });

            // Notify the other player using their socket ID
            if (otherPlayerSocketId) {
              console.log(
                `Notifying second player (${potentialMatch.playerId}) as ${secondPlayerColor} with socket ID: ${otherPlayerSocketId}`
              );
              io.to(otherPlayerSocketId).emit("match-found", {
                gameId: game.id,
                playerColor: secondPlayerColor,
                blackPlayerId,
                whitePlayerId,
                boardSize: boardSize,
              });
            } else {
              console.log(
                `Warning: Could not find socket for second player ${potentialMatch.playerId}`
              );
            }
          } else {
            socket.emit("queued", { message: "Added to matchmaking queue" });
          }
        } else {
          socket.emit("queued", { message: "Added to matchmaking queue" });
        }
      } catch (error) {
        console.error("Matchmaking error:", error);
        socket.emit("error", { message: "Matchmaking failed" });
      }
    });

    // Leave matchmaking queue
    socket.on("leave-matchmaking", async () => {
      try {
        await prisma.matchmakingQueue.deleteMany({
          where: { playerId: socket.userId! },
        });
        socket.emit("left-queue", { message: "Left matchmaking queue" });
      } catch (error) {
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
        console.log("make-move event received:", data);
        const { gameId, x, y, isPass = false, isResign = false } = data;
        const userId = socket.userId;

        console.log("Processing move for user:", userId, "in game:", gameId);

        if (!userId) {
          socket.emit("error", { message: "User not authenticated" });
          return;
        }

        // Get game details
        const game = await prisma.game.findUnique({
          where: { id: parseInt(gameId) },
          select: {
            boardSize: true,
            status: true,
            blackPlayerId: true,
            whitePlayerId: true,
          },
        });

        if (!game) {
          socket.emit("error", { message: "Game not found" });
          return;
        }

        if (game.status !== "active") {
          socket.emit("error", { message: "Game is not active" });
          return;
        }

        // Get game state from manager
        const gameStateManager = GameStateManager.getInstance();
        const goRules = await gameStateManager.getGameState(parseInt(gameId));

        // Handle pass
        if (isPass) {
          goRules.pass();

          // Store pass move
          const moveCount = await prisma.move.count({
            where: { gameId: parseInt(gameId) },
          });

          await prisma.move.create({
            data: {
              gameId: parseInt(gameId),
              playerId: userId!,
              moveNumber: moveCount + 1,
              xCoordinate: null,
              yCoordinate: null,
              isPass: true,
              isResign: false,
            },
          });

          // Save game state
          await gameStateManager.saveGameState(parseInt(gameId), goRules);

          // Check if game should end (two consecutive passes)
          const gameState = goRules.getGameState();
          if (gameState.gameEnded) {
            await prisma.game.update({
              where: { id: parseInt(gameId) },
              data: {
                status: "finished",
                winnerId:
                  gameState.winner === "black"
                    ? game.blackPlayerId
                    : gameState.winner === "white"
                    ? game.whitePlayerId
                    : null,
                blackScore: gameState.blackScore,
                whiteScore: gameState.whiteScore,
              },
            });
          }

          // Broadcast pass
          io.to(`game_${gameId}`).emit("move-made", {
            gameId,
            moveNumber: moveCount + 1,
            x: null,
            y: null,
            isPass: true,
            isResign: false,
            playerId: userId,
            playerName: socket.username,
            gameEnded: gameState.gameEnded,
            winner: gameState.winner,
            blackScore: gameState.blackScore,
            whiteScore: gameState.whiteScore,
            boardState: gameState.board,
          });

          return;
        }

        // Handle resignation
        if (isResign) {
          goRules.resign(userId!);

          // Store resign move
          const moveCount = await prisma.move.count({
            where: { gameId: parseInt(gameId) },
          });

          await prisma.move.create({
            data: {
              gameId: parseInt(gameId),
              playerId: userId!,
              moveNumber: moveCount + 1,
              xCoordinate: null,
              yCoordinate: null,
              isPass: false,
              isResign: true,
            },
          });

          // Save game state
          await gameStateManager.saveGameState(parseInt(gameId), goRules);

          // Update game status
          const gameState = goRules.getGameState();
          await prisma.game.update({
            where: { id: parseInt(gameId) },
            data: {
              status: "finished",
              winnerId:
                gameState.winner === "black"
                  ? game.blackPlayerId
                  : gameState.winner === "white"
                  ? game.whitePlayerId
                  : null,
            },
          });

          // Broadcast resignation
          io.to(`game_${gameId}`).emit("move-made", {
            gameId,
            moveNumber: moveCount + 1,
            x: null,
            y: null,
            isPass: false,
            isResign: true,
            playerId: userId,
            playerName: socket.username,
            gameEnded: true,
            winner: gameState.winner,
            blackScore: gameState.blackScore,
            whiteScore: gameState.whiteScore,
            boardState: gameState.board,
          });

          return;
        }

        // Validate move using Go rules
        if (!goRules.isLegalMove(x, y, userId!)) {
          socket.emit("invalid-move", { message: "Illegal move" });
          return;
        }

        // Make the move (guaranteed to succeed since isLegalMove passed)
        const moveResult = goRules.makeMove(x, y, userId!);

        console.log(
          "Move successful, captured stones:",
          moveResult.capturedStones
        );

        // Store move in database
        const moveCount = await prisma.move.count({
          where: { gameId: parseInt(gameId) },
        });

        await prisma.move.create({
          data: {
            gameId: parseInt(gameId),
            playerId: userId!,
            moveNumber: moveCount + 1,
            xCoordinate: x,
            yCoordinate: y,
            isPass: false,
            isResign: false,
            capturedStones:
              moveResult.capturedStones.length > 0
                ? JSON.stringify(moveResult.capturedStones)
                : null,
          },
        });

        // Save game state to database
        await gameStateManager.saveGameState(parseInt(gameId), goRules);

        // Get updated game state
        const gameState = goRules.getGameState();

        // Broadcast move to all players in the game
        console.log("Broadcasting move to game room:", `game_${gameId}`);
        io.to(`game_${gameId}`).emit("move-made", {
          gameId,
          moveNumber: moveCount + 1,
          x,
          y,
          isPass: false,
          isResign: false,
          playerId: userId,
          playerName: socket.username,
          capturedStones: moveResult.capturedStones,
          currentPlayer: gameState.currentPlayer,
          gameEnded: gameState.gameEnded,
          winner: gameState.winner,
          blackScore: gameState.blackScore,
          whiteScore: gameState.whiteScore,
          boardState: gameState.board,
        });
        console.log("Move broadcasted successfully");
      } catch (error) {
        console.error("Make move error:", error);
        socket.emit("error", { message: "Failed to make move" });
      }
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      console.log(
        `User ${socket.username} (ID: ${socket.userId}) disconnected`
      );

      // Remove from matchmaking queue
      if (socket.userId) {
        await prisma.matchmakingQueue.deleteMany({
          where: { playerId: socket.userId },
        });

        // Remove user-to-socket mapping
        userSocketMap.delete(socket.userId);
        console.log(`Removed mapping for user ${socket.userId}`);
        console.log(
          "Current userSocketMap after disconnect:",
          Array.from(userSocketMap.entries())
        );
      }
    });
  });
};
