"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface GoBoardProps {
  size: number;
  onMove?: (x: number, y: number) => void;
  moves?: Array<{ x: number; y: number; color: "black" | "white" }>;
  currentPlayer?: "black" | "white";
  disabled?: boolean;
}

const GoBoard: React.FC<GoBoardProps> = ({
  size,
  onMove,
  moves = [],
  currentPlayer = "black",
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredIntersection, setHoveredIntersection] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasSize = Math.min(canvas.width, canvas.height);
    const cellSize = canvasSize / (size + 1);
    const boardSize = cellSize * (size - 1);
    const offset = cellSize;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set background
    ctx.fillStyle = "#DCB35C";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < size; i++) {
      const pos = offset + i * cellSize;

      // Vertical lines
      ctx.moveTo(pos, offset);
      ctx.lineTo(pos, offset + boardSize);

      // Horizontal lines
      ctx.moveTo(offset, pos);
      ctx.lineTo(offset + boardSize, pos);
    }

    ctx.stroke();

    // Draw star points (hoshi)
    const starPoints = getStarPoints(size);
    ctx.fillStyle = "#000";
    starPoints.forEach(({ x, y }) => {
      const centerX = offset + x * cellSize;
      const centerY = offset + y * cellSize;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw stones
    moves.forEach(({ x, y, color }) => {
      const centerX = offset + x * cellSize;
      const centerY = offset + y * cellSize;

      ctx.beginPath();
      ctx.arc(centerX, centerY, cellSize * 0.4, 0, 2 * Math.PI);

      if (color === "black") {
        ctx.fillStyle = "#000";
      } else {
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.fill();
    });

    // Draw hovered intersection
    if (hoveredIntersection && !disabled) {
      const centerX = offset + hoveredIntersection.x * cellSize;
      const centerY = offset + hoveredIntersection.y * cellSize;

      ctx.beginPath();
      ctx.arc(centerX, centerY, cellSize * 0.4, 0, 2 * Math.PI);
      ctx.strokeStyle = currentPlayer === "black" ? "#000" : "#fff";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [size, moves, hoveredIntersection, currentPlayer, disabled]);

  const getStarPoints = (boardSize: number) => {
    const points = [];
    if (boardSize === 19) {
      const coords = [3, 9, 15];
      for (const x of coords) {
        for (const y of coords) {
          points.push({ x, y });
        }
      }
    } else if (boardSize === 13) {
      const coords = [3, 6, 9];
      for (const x of coords) {
        for (const y of coords) {
          points.push({ x, y });
        }
      }
    } else if (boardSize === 9) {
      const coords = [2, 4, 6];
      for (const x of coords) {
        for (const y of coords) {
          points.push({ x, y });
        }
      }
    }
    return points;
  };

  const getIntersectionFromMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const canvasSize = Math.min(canvas.width, canvas.height);
    const cellSize = canvasSize / (size + 1);
    const offset = cellSize;

    const x = Math.round((e.clientX - rect.left - offset) / cellSize);
    const y = Math.round((e.clientY - rect.top - offset) / cellSize);

    if (x >= 0 && x < size && y >= 0 && y < size) {
      return { x, y };
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;

    const intersection = getIntersectionFromMouse(e);
    setHoveredIntersection(intersection);
  };

  const handleMouseLeave = () => {
    setHoveredIntersection(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;

    const intersection = getIntersectionFromMouse(e);
    if (intersection && onMove) {
      // Check if intersection is already occupied
      const isOccupied = moves.some(
        (move) => move.x === intersection.x && move.y === intersection.y
      );
      if (!isOccupied) {
        onMove(intersection.x, intersection.y);
      }
    }
  };

  useEffect(() => {
    drawBoard();
  }, [size, moves, hoveredIntersection, currentPlayer, disabled, drawBoard]);

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        className="border border-gray-800 cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
    </div>
  );
};

export default GoBoard;
