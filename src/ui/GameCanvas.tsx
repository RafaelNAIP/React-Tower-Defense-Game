import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../state/store';
import { GAME_CONFIG } from '../engine/definitions';
import { createCanvasRenderer, CanvasRenderer } from '../renderers/canvas';

interface GameCanvasProps {
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

export function GameCanvas({ onMouseMove, onMouseLeave, onClick }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  
  // Get specific state pieces to ensure re-renders
  const map = useGameStore(state => state.map);
  const towers = useGameStore(state => state.towers);
  const mobs = useGameStore(state => state.mobs);
  const projectiles = useGameStore(state => state.projectiles);
  const hoveredCoord = useGameStore(state => state.hoveredCoord);
  const selectedTowerId = useGameStore(state => state.selectedTowerId);
  const selectedTowerType = useGameStore(state => state.selectedTowerType);
  const showRange = useGameStore(state => state.showRange);
  const money = useGameStore(state => state.money);
  const canBuildAt = useGameStore(state => state.canBuildAt);

  const canvasWidth = GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize;
  const canvasHeight = GAME_CONFIG.mapHeight * GAME_CONFIG.tileSize;

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      rendererRef.current = createCanvasRenderer(canvas);
    } catch (error) {
      console.error('Failed to create canvas renderer:', error);
    }
  }, []);

  // Render game state
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    // Check if we can build at the current hovered coordinate
    const canBuildAtHovered = hoveredCoord ? canBuildAt(hoveredCoord) : false;

    // Create game state object for renderer
    const gameState = {
      map,
      towers,
      mobs,
      projectiles,
      hoveredCoord,
      selectedTowerId,
      selectedTowerType,
      showRange,
      money,
    };

    // Extract render options from game state
    const renderOptions = {
      showRange,
      hoveredCoord,
      selectedTowerId,
      selectedTowerType,
      money,
      canBuildAtHovered,
    };


    // Render the complete game state
    try {
      renderer.render(gameState as any, renderOptions);
    } catch (error) {
      console.error('Rendering error:', error);
    }
  }, [
    map,
    towers,
    mobs,
    projectiles,
    hoveredCoord,
    selectedTowerId,
    selectedTowerType,
    showRange,
    money,
    canBuildAt,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="border border-gray-600 cursor-crosshair"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    />
  );
}