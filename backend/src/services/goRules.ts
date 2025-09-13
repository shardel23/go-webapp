export interface Stone {
  x: number;
  y: number;
  color: "black" | "white";
}

export interface Group {
  stones: Stone[];
  liberties: number;
  color: "black" | "white";
}

export interface GameState {
  board: string; // String representation: "0" = empty, "1" = black, "2" = white
  size: number;
  moves: Stone[];
  capturedStones: Stone[];
  koPosition: { x: number; y: number } | null;
  currentPlayer: "black" | "white";
  passCount: number;
  gameEnded: boolean;
  winner: "black" | "white" | "draw" | null;
  blackScore: number;
  whiteScore: number;
}

export class GoRules {
  private board: string; // String representation: "0" = empty, "1" = black, "2" = white
  private size: number;
  private moves: Stone[];
  private capturedStones: Stone[];
  private koPosition: { x: number; y: number } | null;
  private currentPlayer: "black" | "white";
  private passCount: number;
  private gameEnded: boolean;
  private winner: "black" | "white" | "draw" | null;
  private blackScore: number;
  private whiteScore: number;

  constructor(size: number = 19) {
    this.size = size;
    this.board = "0".repeat(size * size); // Initialize empty board as string
    this.moves = [];
    this.capturedStones = [];
    this.koPosition = null;
    this.currentPlayer = "black";
    this.passCount = 0;
    this.gameEnded = false;
    this.winner = null;
    this.blackScore = 0;
    this.whiteScore = 0;
  }

  // Initialize game state from existing moves
  initializeFromMoves(moves: any[], boardSize: number): void {
    console.log(
      `Initializing from ${moves.length} moves for board size ${boardSize}`
    );
    this.size = boardSize;
    this.board = "0".repeat(boardSize * boardSize); // Initialize empty board as string
    this.moves = [];
    this.capturedStones = [];
    this.koPosition = null;
    this.currentPlayer = "black";
    this.passCount = 0;
    this.gameEnded = false;
    this.winner = null;
    this.blackScore = 0;
    this.whiteScore = 0;

    // Replay all moves to reconstruct board state
    for (const move of moves) {
      if (!move.isPass && !move.isResign) {
        // Determine stone color based on move number (0-based)
        const stoneColor = (move.moveNumber - 1) % 2 === 0 ? "black" : "white";
        this.currentPlayer = stoneColor;
        console.log(
          `Replaying move ${move.moveNumber}: ${stoneColor} at (${move.xCoordinate}, ${move.yCoordinate})`
        );
        // Note: No validation needed here since we're replaying known valid moves
        this.makeMove(move.xCoordinate, move.yCoordinate, move.playerId);
      } else if (move.isPass) {
        this.pass();
      }
    }

    console.log(`Board after initialization:`, this.board);
  }

  // Make a move and return the result
  // Note: This function assumes the move has already been validated by isLegalMove
  makeMove(
    x: number,
    y: number,
    playerId: number
  ): { success: boolean; capturedStones: Stone[]; error?: string } {
    // Determine stone color based on current player
    const stoneColor = this.currentPlayer;
    console.log(
      `Making move: playerId=${playerId}, currentPlayer=${this.currentPlayer}, stoneColor=${stoneColor}`
    );

    // Create and place the stone
    const stone: Stone = { x, y, color: stoneColor };
    const index = y * this.size + x;
    this.board =
      this.board.substring(0, index) +
      (stoneColor === "black" ? "1" : "2") +
      this.board.substring(index + 1);
    console.log(`Placed ${stoneColor} stone at (${x}, ${y})`);

    // Check for captures of opponent stones
    const capturedStones = this.checkCaptures(x, y, stoneColor);

    // Commit the move
    this.moves.push(stone);
    this.capturedStones.push(...capturedStones);

    // Update ko position if exactly one stone was captured
    if (capturedStones.length === 1) {
      this.koPosition = { x: capturedStones[0].x, y: capturedStones[0].y };
    } else {
      this.koPosition = null;
    }

    // Switch players
    this.currentPlayer = this.currentPlayer === "black" ? "white" : "black";
    this.passCount = 0;

    return { success: true, capturedStones };
  }

  // Pass turn
  pass(): void {
    this.passCount++;
    this.currentPlayer = this.currentPlayer === "black" ? "white" : "black";

    // Check for game end (two consecutive passes)
    if (this.passCount >= 2) {
      this.endGame();
    }
  }

  // Resign game
  resign(playerId: number): void {
    this.gameEnded = true;
    this.winner = this.moves.length % 2 === 0 ? "white" : "black";
  }

  // Check for captures of opponent stones after placing a stone
  private checkCaptures(
    x: number,
    y: number,
    stoneColor: "black" | "white"
  ): Stone[] {
    const capturedStones: Stone[] = [];
    const opponentColor = stoneColor === "black" ? "white" : "black";

    console.log(`Checking captures for ${stoneColor} stone at (${x}, ${y})`);
    console.log(`Looking for ${opponentColor} groups to capture`);
    console.log(`Current board state:`);
    for (let i = 0; i < this.size; i++) {
      let row = "";
      for (let j = 0; j < this.size; j++) {
        const stone = this.getStoneAt(j, i);
        if (stone) {
          row += stone.color === "black" ? "B" : "W";
        } else {
          row += ".";
        }
      }
      console.log(row);
    }

    // Check all four directions for opponent groups
    const directions = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ];

    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
        const neighbor = this.getStoneAt(nx, ny);
        console.log(
          `Checking position (${nx}, ${ny}):`,
          neighbor ? `${neighbor.color} stone` : "empty"
        );

        if (neighbor && neighbor.color === opponentColor) {
          console.log(`Found ${opponentColor} neighbor at (${nx}, ${ny})`);
          // Get the group that this neighbor belongs to
          const group = this.getGroup(nx, ny, opponentColor);
          console.log(
            `Group has ${group.liberties} liberties, stones:`,
            group.stones.map((s) => `(${s.x},${s.y})`)
          );

          // Check if this group now has no liberties (after the new stone was placed)
          if (group.liberties === 0) {
            console.log(`Capturing group with ${group.stones.length} stones`);
            // Group has no liberties, capture it
            for (const stone of group.stones) {
              this.setStoneAt(stone.x, stone.y, null);
              capturedStones.push(stone);
            }
          } else {
            console.log(
              `Group has ${group.liberties} liberties, not capturing`
            );
          }
        } else if (neighbor) {
          console.log(
            `Found ${neighbor.color} neighbor at (${nx}, ${ny}) - not ${opponentColor}, skipping`
          );
        } else {
          console.log(`Empty position at (${nx}, ${ny}) - skipping`);
        }
      }
    }

    console.log(`Total captured stones: ${capturedStones.length}`);
    return capturedStones;
  }

  // Check if a move would be suicidal (self-capture)
  private checkSelfCapture(
    x: number,
    y: number,
    stoneColor: "black" | "white"
  ): boolean {
    console.log(
      `Checking self-capture for ${stoneColor} stone at (${x}, ${y})`
    );

    // Place stone temporarily
    this.setStoneAt(x, y, { x, y, color: stoneColor });

    // Check if the newly placed stone's group has liberties
    const hasLiberties = this.hasLiberties(x, y, stoneColor);

    // Remove the temporary stone
    this.setStoneAt(x, y, null);

    console.log(`Self-capture check: hasLiberties=${hasLiberties}`);
    return !hasLiberties;
  }

  // Get a group of connected stones
  private getGroup(x: number, y: number, color: "black" | "white"): Group {
    const visited = new Set<string>();
    const group: Stone[] = [];
    const stack = [{ x, y }];

    while (stack.length > 0) {
      const { x: cx, y: cy } = stack.pop()!;
      const key = `${cx},${cy}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const stone = this.getStoneAt(cx, cy);
      if (stone && stone.color === color) {
        group.push(stone);

        // Check all four directions
        const directions = [
          [0, 1],
          [1, 0],
          [0, -1],
          [-1, 0],
        ];
        for (const [dx, dy] of directions) {
          const nx = cx + dx;
          const ny = cy + dy;

          if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
            const neighbor = this.getStoneAt(nx, ny);
            if (neighbor && neighbor.color === color) {
              stack.push({ x: nx, y: ny });
            }
          }
        }
      }
    }

    // Calculate liberties for this group
    const liberties = this.calculateLiberties(group);

    return { stones: group, liberties, color };
  }

  // Calculate liberties for a group
  private calculateLiberties(group: Stone[]): number {
    const libertySet = new Set<string>();

    for (const stone of group) {
      const directions = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ];
      for (const [dx, dy] of directions) {
        const nx = stone.x + dx;
        const ny = stone.y + dy;

        if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
          if (this.getStoneAt(nx, ny) === null) {
            libertySet.add(`${nx},${ny}`);
          }
        }
      }
    }

    console.log(
      `Group liberties calculated: ${libertySet.size} for group with ${group.length} stones`
    );
    return libertySet.size;
  }

  // Check if a position has liberties
  private hasLiberties(
    x: number,
    y: number,
    color: "black" | "white"
  ): boolean {
    const group = this.getGroup(x, y, color);
    return group.liberties > 0;
  }

  // End the game and calculate scores
  private endGame(): void {
    this.gameEnded = true;
    this.calculateScores();
  }

  // Calculate final scores
  private calculateScores(): void {
    // Simple scoring: captured stones + territory
    this.blackScore = this.capturedStones.filter(
      (s) => s.color === "white"
    ).length;
    this.whiteScore = this.capturedStones.filter(
      (s) => s.color === "black"
    ).length;

    // Add territory scoring (simplified)
    const territory = this.calculateTerritory();
    this.blackScore += territory.black;
    this.whiteScore += territory.white;

    // Determine winner
    if (this.blackScore > this.whiteScore) {
      this.winner = "black";
    } else if (this.whiteScore > this.blackScore) {
      this.winner = "white";
    } else {
      this.winner = "draw";
    }
  }

  // Calculate territory (simplified)
  private calculateTerritory(): { black: number; white: number } {
    let blackTerritory = 0;
    let whiteTerritory = 0;

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.getStoneAt(x, y) === null) {
          // Empty intersection, check if it's surrounded by one color
          const surrounding = this.getSurroundingStones(x, y);
          if (surrounding.black > 0 && surrounding.white === 0) {
            blackTerritory++;
          } else if (surrounding.white > 0 && surrounding.black === 0) {
            whiteTerritory++;
          }
        }
      }
    }

    return { black: blackTerritory, white: whiteTerritory };
  }

  // Get surrounding stones for territory calculation
  private getSurroundingStones(
    x: number,
    y: number
  ): { black: number; white: number } {
    let black = 0;
    let white = 0;

    const directions = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ];
    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
        const stone = this.getStoneAt(nx, ny);
        if (stone) {
          if (stone.color === "black") black++;
          else white++;
        }
      }
    }

    return { black, white };
  }

  // Get current game state
  getGameState(): GameState {
    return {
      board: this.board, // Board is already a string
      size: this.size,
      moves: [...this.moves],
      capturedStones: [...this.capturedStones],
      koPosition: this.koPosition ? { ...this.koPosition } : null,
      currentPlayer: this.currentPlayer,
      passCount: this.passCount,
      gameEnded: this.gameEnded,
      winner: this.winner,
      blackScore: this.blackScore,
      whiteScore: this.whiteScore,
    };
  }

  // Get board size
  getSize(): number {
    return this.size;
  }

  // Set board state (for loading from database)
  setBoardState(boardString: string): void {
    this.board = boardString;
  }

  // Helper methods to access board as 2D array
  private getStoneAt(x: number, y: number): Stone | null {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) return null;
    const index = y * this.size + x;
    const char = this.board[index];
    if (char === "1") return { x, y, color: "black" };
    if (char === "2") return { x, y, color: "white" };
    return null;
  }

  private setStoneAt(x: number, y: number, stone: Stone | null): void {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) return;
    const index = y * this.size + x;
    const char = stone ? (stone.color === "black" ? "1" : "2") : "0";
    this.board =
      this.board.substring(0, index) + char + this.board.substring(index + 1);
  }

  // Set current player
  setCurrentPlayer(player: "black" | "white"): void {
    this.currentPlayer = player;
  }

  // Set pass count
  setPassCount(count: number): void {
    this.passCount = count;
  }

  // Set ko position
  setKoPosition(position: { x: number; y: number } | null): void {
    this.koPosition = position ? { ...position } : null;
  }

  // Set scores
  setScores(blackScore: number, whiteScore: number): void {
    this.blackScore = blackScore;
    this.whiteScore = whiteScore;
  }

  // Set game ended
  setGameEnded(ended: boolean): void {
    this.gameEnded = ended;
  }

  // Set winner
  setWinner(winner: "black" | "white" | "draw" | null): void {
    this.winner = winner;
  }

  // Check if a move is legal
  isLegalMove(x: number, y: number, playerId: number): boolean {
    if (this.gameEnded) return false;
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) return false;
    if (this.getStoneAt(x, y) !== null) return false;

    // Check ko rule
    if (this.koPosition && this.koPosition.x === x && this.koPosition.y === y)
      return false;

    // Check if move would be suicidal
    const stoneColor = this.currentPlayer;
    const isSuicidal = this.checkSelfCapture(x, y, stoneColor);

    return !isSuicidal;
  }

  // Undo last move
  undoLastMove(): { success: boolean; error?: string } {
    if (this.moves.length === 0) {
      return { success: false, error: "No moves to undo" };
    }

    // Remove last move from moves array
    const lastMove = this.moves.pop()!;

    // Remove stone from board
    this.setStoneAt(lastMove.x, lastMove.y, null);

    // Switch current player back
    this.currentPlayer = this.currentPlayer === "black" ? "white" : "black";

    // Reset pass count
    this.passCount = 0;

    // Reset ko position
    this.koPosition = null;

    // Remove captured stones from the last move
    // Note: This is simplified - in a real implementation, you'd need to track
    // which stones were captured in each move to properly restore them
    this.capturedStones = this.capturedStones.slice(0, -1);

    return { success: true };
  }

  // Set moves (for simulation)
  setMoves(moves: Stone[]): void {
    this.moves = [...moves];
  }

  // Set captured stones (for simulation)
  setCapturedStones(capturedStones: Stone[]): void {
    this.capturedStones = [...capturedStones];
  }
}
