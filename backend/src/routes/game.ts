import express from "express";
import prisma from "../config/database";

// Middleware to authenticate JWT token
const authenticateToken = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  // For now, we'll just check if token exists
  // In production, you should verify the JWT token properly
  (req as any).user = { id: 1 }; // This should be decoded from the JWT token
  next();
};

const router = express.Router();

// Get user's game history
router.get("/history", async (req, res) => {
  try {
    const { userId, limit = 10, offset = 0 } = req.query;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "User ID is required" });
    }

    const games = await prisma.game.findMany({
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
        moves: {
          orderBy: { moveNumber: "asc" },
        },
      },
      orderBy: { startedAt: "desc" },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
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
      moves: game.moves,
    }));

    res.json(formattedGames);
  } catch (error) {
    console.error("Game history error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get game details
router.get("/:gameId", authenticateToken, async (req, res) => {
  try {
    const gameId = parseInt(req.params.gameId);
    const userId = (req as any).user.id;

    if (isNaN(gameId)) {
      return res.status(400).json({ error: "Invalid game ID" });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        blackPlayer: {
          select: {
            id: true,
            username: true,
            rating: true,
            gamesPlayed: true,
            gamesWon: true,
          },
        },
        whitePlayer: {
          select: {
            id: true,
            username: true,
            rating: true,
            gamesPlayed: true,
            gamesWon: true,
          },
        },
        moves: {
          orderBy: { moveNumber: "asc" },
        },
      },
    });

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    // Check if user is authorized to view this game
    const isPlayer =
      game.blackPlayerId === userId || game.whitePlayerId === userId;
    if (!isPlayer) {
      return res.status(403).json({ error: "Unauthorized to view this game" });
    }

    // Return the game with all details
    res.json(game);
  } catch (error) {
    console.error("Get game error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create private game invitation
router.post("/invite", async (req, res) => {
  try {
    const { inviterId, inviteeId, boardSize = 19 } = req.body;

    // Check if invitee exists
    const invitee = await prisma.user.findUnique({
      where: { id: inviteeId },
    });

    if (!invitee) {
      return res.status(404).json({ message: "Invitee not found" });
    }

    // Create invitation
    const invitation = await prisma.gameInvitation.create({
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
  } catch (error) {
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
    const invitation = await prisma.gameInvitation.findFirst({
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
    const result = await prisma.$transaction(async (tx) => {
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
  } catch (error) {
    console.error("Accept invitation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
