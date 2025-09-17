import React, { useState, useEffect } from 'react';
import { useGameStore } from './state/store';
import { GAME_CONFIG } from './engine/definitions';
import { GameCanvas } from './ui/GameCanvas';
import { Hud } from './ui/Hud';
import { BuildBar } from './ui/BuildBar';
import { TowerInfo } from './ui/TowerInfo';
import { GameStats } from './ui/GameStats';
import { KeyboardHandler, KeyboardShortcuts } from './ui/KeyboardHandler';
import { AccessibilitySettings, LiveAnnouncer, useAccessibilitySettings } from './ui/AccessibilitySettings';
import './App.css';

const TILE_SIZE = GAME_CONFIG.tileSize;

function App() {
  const {
    map,
    towers,
    hoveredCoord,
    selectedTowerType,
    buildTower,
    setHoveredCoord,
    setSelectedTowerId,
    getTowerById,
    canBuildAt,
  } = useGameStore();

  const { settings } = useAccessibilitySettings();
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Help shortcut
      if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        setShowKeyboardHelp(true);
      }
      
      // Accessibility settings shortcut
      if (event.key === 'a' && (event.ctrlKey || event.metaKey) && event.shiftKey) {
        event.preventDefault();
        setShowAccessibilitySettings(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Handle mouse move for hover effect
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gridCoord = {
      x: Math.floor(x / TILE_SIZE),
      y: Math.floor(y / TILE_SIZE)
    };

    if (gridCoord.x >= 0 && gridCoord.x < GAME_CONFIG.mapWidth &&
        gridCoord.y >= 0 && gridCoord.y < GAME_CONFIG.mapHeight) {
      setHoveredCoord(gridCoord);
    } else {
      setHoveredCoord(null);
    }
  };

  // Handle click to place tower or select existing tower
  const handleClick = () => {
    if (!hoveredCoord) return;

    // Check if clicking on existing tower
    const existingTower = towers.find((tower: any) => 
      tower.gridCoord.x === hoveredCoord.x && tower.gridCoord.y === hoveredCoord.y
    );

    if (existingTower) {
      setSelectedTowerId(existingTower.id);
      return;
    }

    // Try to build new tower
    if (selectedTowerType && canBuildAt(hoveredCoord)) {
      buildTower(hoveredCoord, selectedTowerType);
    }
  };

  const getTileInfo = () => {
    if (!hoveredCoord) return "Hover over a tile";
    
    const tile = map[hoveredCoord.y][hoveredCoord.x];
    const existingTower = towers.find((tower: any) => 
      tower.gridCoord.x === hoveredCoord.x && tower.gridCoord.y === hoveredCoord.y
    );
    
    if (existingTower) {
      const tower = getTowerById(existingTower.id);
      if (tower) {
        return `${tower.type.charAt(0).toUpperCase() + tower.type.slice(1)} Tower (Tier ${tower.tier}) - Click to select`;
      }
    }
    
    const canBuild = canBuildAt(hoveredCoord);
    return `Tile (${hoveredCoord.x}, ${hoveredCoord.y}): ${tile.type}${tile.pathIndex !== undefined ? ` [${tile.pathIndex}]` : ''} - ${canBuild ? 'Can build' : 'Cannot build'}`;
  };

  return (
    <>
      {/* Main App Content */}
      <div 
        className="min-h-screen bg-gray-900 text-white p-4"
        data-reduce-motion={settings.reduceMotion}
      >
        {/* Accessibility Components */}
        <KeyboardHandler />
        <LiveAnnouncer />
        
        {/* Skip to main content link for screen readers */}
        <a 
          href="#main-game"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
        >
          Skip to main game
        </a>

        <header className="mb-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Tower Defense - Accessible Edition</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowKeyboardHelp(true)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-400"
                aria-label="Show keyboard shortcuts help"
                title="Press ? for help"
              >
                Help (?)
              </button>
              <button
                onClick={() => setShowAccessibilitySettings(true)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-400"
                aria-label="Open accessibility settings"
                title="Ctrl+Shift+A"
              >
                ♿ Settings
              </button>
            </div>
          </div>
        </header>
        
        <main id="main-game" className="flex gap-6" role="main">
          {/* Game Area */}
          <div className="flex flex-col">
            {/* HUD */}
            <div className="mb-4">
              <Hud />
              <div className="mt-2 p-2 bg-gray-700 rounded text-sm text-gray-300" role="status" aria-live="polite">
                {getTileInfo()}
              </div>
            </div>
            
            {/* Game Canvas */}
            <div role="application" aria-label="Tower Defense Game Field">
              <div className="sr-only" aria-live="polite">
                Game field: Use arrow keys to navigate, Enter to build towers, Tab to access controls
              </div>
              <GameCanvas
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredCoord(null)}
                onClick={handleClick}
              />
            </div>
          </div>
          
          {/* UI Panel */}
          <aside className="flex flex-col gap-4 min-w-[300px]" aria-label="Game Controls and Information">
            {/* Tower Building */}
            <BuildBar />

            {/* Selected Tower Info */}
            <TowerInfo />

            {/* Game Statistics */}
            <GameStats />

            {/* Architecture Info */}
            <div className="bg-blue-900/20 p-4 rounded">
              <h3 className="font-bold mb-2 text-blue-400">♿ Accessibility Features</h3>
              <ul className="text-xs space-y-1 text-blue-300">
                <li>✅ Full keyboard navigation</li>
                <li>✅ Screen reader support</li>
                <li>✅ Focus management</li>
                <li>✅ Reduced motion options</li>
                <li>✅ ARIA labels and roles</li>
                <li>✅ Live status updates</li>
              </ul>
            </div>
          </aside>
        </main>
      </div>

      {/* Modal Dialogs - Rendered at root level for proper overlay */}
      <KeyboardShortcuts 
        isVisible={showKeyboardHelp} 
        onClose={() => setShowKeyboardHelp(false)} 
      />
      <AccessibilitySettings
        isOpen={showAccessibilitySettings}
        onClose={() => setShowAccessibilitySettings(false)}
      />
    </>
  );
}

export default App;