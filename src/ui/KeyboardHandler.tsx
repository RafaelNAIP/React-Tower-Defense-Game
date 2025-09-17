import React, { useEffect, useCallback } from 'react';
import { useGameStore } from '../state/store';
import { Modal } from './Modal';

export function KeyboardHandler() {
  const {
    phase,
    isPaused,
    gameSpeed,
    hoveredCoord,
    selectedTowerId,
    selectedTowerType,
    towers,
    startGame,
    pauseGame,
    resumeGame,
    setGameSpeed,
    restartGame,
    buildTower,
    upgradeTower,
    sellTower,
    setSelectedTowerId,
    setSelectedTowerType,
    setHoveredCoord,
    canBuildAt,
    getTowerById,
  } = useGameStore();

  // Get current grid cursor position
  const [cursorPos, setCursorPos] = React.useState({ x: 8, y: 6 }); // Start in center

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Prevent default for game controls
    const gameKeys = ['Space', 'Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
                     'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 
                     'KeyP', 'KeyR', 'KeyU', 'KeyX', 'Plus', 'Minus'];
    
    if (gameKeys.includes(event.code)) {
      event.preventDefault();
    }

    // Game control keys
    switch (event.code) {
      case 'Space':
        // Start/Pause/Resume game
        if (phase === 'preparing') {
          startGame();
        } else if (phase === 'defeat' || phase === 'victory') {
          restartGame();
        } else {
          isPaused ? resumeGame() : pauseGame();
        }
        break;

      case 'KeyR':
        // Restart game
        if (event.ctrlKey || event.metaKey) {
          restartGame();
        }
        break;

      case 'Escape':
        // Clear selections
        setSelectedTowerType(null);
        setSelectedTowerId(null);
        break;

      // Speed controls
      case 'Digit1':
        setGameSpeed(0.5);
        break;
      case 'Digit2':
        setGameSpeed(1);
        break;
      case 'Digit3':
        setGameSpeed(2);
        break;
      case 'Digit4':
        setGameSpeed(4);
        break;

      // Tower selection
      case 'KeyQ':
        const newArrowSelection = selectedTowerType === 'arrow' ? null : 'arrow';
        setSelectedTowerType(newArrowSelection);
        setSelectedTowerId(null);
        console.log('Arrow tower', newArrowSelection ? 'selected' : 'deselected');
        if ((window as any).announceToScreenReader) {
          (window as any).announceToScreenReader(
            newArrowSelection ? 'Arrow tower selected' : 'Tower selection cleared'
          );
        }
        break;
      case 'KeyW':
        const newCannonSelection = selectedTowerType === 'cannon' ? null : 'cannon';
        setSelectedTowerType(newCannonSelection);
        setSelectedTowerId(null);
        console.log('Cannon tower', newCannonSelection ? 'selected' : 'deselected');
        if ((window as any).announceToScreenReader) {
          (window as any).announceToScreenReader(
            newCannonSelection ? 'Cannon tower selected' : 'Tower selection cleared'
          );
        }
        break;
      case 'KeyE':
        const newFrostSelection = selectedTowerType === 'frost' ? null : 'frost';
        setSelectedTowerType(newFrostSelection);
        setSelectedTowerId(null);
        console.log('Frost tower', newFrostSelection ? 'selected' : 'deselected');
        if ((window as any).announceToScreenReader) {
          (window as any).announceToScreenReader(
            newFrostSelection ? 'Frost tower selected' : 'Tower selection cleared'
          );
        }
        break;

      // Cursor movement (Arrow keys or WASD)
      case 'ArrowUp':
      case 'KeyI':
        setCursorPos(prev => {
          const newPos = { ...prev, y: Math.max(0, prev.y - 1) };
          console.log('Cursor moved to:', newPos);
          return newPos;
        });
        break;
      case 'ArrowDown':
      case 'KeyK':
        setCursorPos(prev => {
          const newPos = { ...prev, y: Math.min(11, prev.y + 1) };
          console.log('Cursor moved to:', newPos);
          return newPos;
        });
        break;
      case 'ArrowLeft':
      case 'KeyJ':
        setCursorPos(prev => {
          const newPos = { ...prev, x: Math.max(0, prev.x - 1) };
          console.log('Cursor moved to:', newPos);
          return newPos;
        });
        break;
      case 'ArrowRight':
      case 'KeyL':
        setCursorPos(prev => {
          const newPos = { ...prev, x: Math.min(15, prev.x + 1) };
          console.log('Cursor moved to:', newPos);
          return newPos;
        });
        break;

      // Actions at cursor position
      case 'Enter':
        handleCursorAction();
        break;

      // Tower management
      case 'KeyU':
        // Upgrade selected tower
        if (selectedTowerId) {
          upgradeTower(selectedTowerId);
        }
        break;

      case 'KeyX':
        // Sell selected tower
        if (selectedTowerId) {
          sellTower(selectedTowerId);
        }
        break;
    }
  }, [
    phase, isPaused, gameSpeed, selectedTowerId, selectedTowerType, cursorPos,
    startGame, pauseGame, resumeGame, setGameSpeed, restartGame,
    buildTower, upgradeTower, sellTower, setSelectedTowerId, setSelectedTowerType,
    canBuildAt, getTowerById
  ]);

  const handleCursorAction = useCallback(() => {
    console.log('Cursor action at:', cursorPos); // Debug log

    // Check if there's a tower at cursor position
    const towerAtCursor = towers.find((tower: any) =>
      tower.gridCoord.x === cursorPos.x && tower.gridCoord.y === cursorPos.y
    );

    if (towerAtCursor) {
      // Select existing tower
      console.log('Selecting tower:', towerAtCursor.id);
      setSelectedTowerId(towerAtCursor.id);
      setSelectedTowerType(null);
    } else if (selectedTowerType) {
      const canBuild = canBuildAt(cursorPos);
      console.log('Can build at', cursorPos, ':', canBuild);

      if (canBuild) {
        console.log('Building', selectedTowerType, 'at', cursorPos);
        buildTower(cursorPos, selectedTowerType);
      } else {
        console.log('Cannot build at this location');
        // Announce to screen reader
        if ((window as any).announceToScreenReader) {
          (window as any).announceToScreenReader('Cannot build tower at this location');
        }
      }
    } else {
      console.log('No tower type selected');
      // Announce to screen reader
      if ((window as any).announceToScreenReader) {
        (window as any).announceToScreenReader('Select a tower type first');
      }
    }
  }, [cursorPos, towers, selectedTowerType, canBuildAt, buildTower, setSelectedTowerId, setSelectedTowerType]);

  // Update hovered coordinate when cursor moves
  useEffect(() => {
    console.log('Setting hover coord to:', cursorPos);
    setHoveredCoord(cursorPos);
  }, [cursorPos, setHoveredCoord]);

  // Debug current state
  useEffect(() => {
    console.log('Keyboard state:', {
      cursorPos,
      selectedTowerType,
      selectedTowerId,
      hoveredCoord
    });
  }, [cursorPos, selectedTowerType, selectedTowerId, hoveredCoord]);

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return null; // This component only handles events
}

// Keyboard shortcuts help component
export function KeyboardShortcuts({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isVisible} onClose={onClose} title="⌨️ Keyboard Controls" size="xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-blue-400 mb-3 text-lg">🎮 Game Controls</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-3">
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono">Space</kbd> 
                <span>Start/Pause/Resume</span>
              </li>
              <li className="flex items-center gap-3">
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono">Ctrl+R</kbd> 
                <span>Restart Game</span>
              </li>
              <li className="flex items-center gap-3">
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono">Esc</kbd> 
                <span>Clear Selection</span>
              </li>
              <li className="flex items-center gap-3">
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono">1-4</kbd> 
                <span>Game Speed (0.5x-4x)</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-yellow-400 mb-3 text-lg">🏗️ Tower Building</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-3">
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono">Q</kbd> 
                <span>Select Arrow Tower</span>
              </li>
              <li className="flex items-center gap-3">
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono">W</kbd> 
                <span>Select Cannon Tower</span>
              </li>
              <li className="flex items-center gap-3">
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono">E</kbd> 
                <span>Select Frost Tower</span>
              </li>
              <li className="flex items-center gap-3">
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono">Enter</kbd> 
                <span>Build/Select Tower</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-green-400 mb-3 text-lg">🧭 Navigation</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-3">
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono">↑↓←→</kbd> 
                <span>Move Cursor</span>
              </li>
              <li className="flex items-center gap-3">
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono">I,K,J,L</kbd> 
                <span>Alt Navigation</span>
              </li>
              <li className="flex items-center gap-3">
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono">Tab</kbd> 
                <span>Cycle UI Elements</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-red-400 mb-3 text-lg">⚔️ Tower Management</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-3">
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono">U</kbd> 
                <span>Upgrade Selected Tower</span>
              </li>
              <li className="flex items-center gap-3">
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono">X</kbd> 
                <span>Sell Selected Tower</span>
              </li>
              <li className="flex items-center gap-3">
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono">?</kbd> 
                <span>Show This Help</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-purple-400 mb-3 text-lg">♿ Accessibility</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-3">
                <kbd className="bg-gray-700 px-3 py-1 rounded font-mono">Ctrl+Shift+A</kbd> 
                <span>Accessibility Settings</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-900/30 rounded-lg border border-blue-700">
        <h3 className="font-semibold text-blue-300 mb-2">💡 Pro Tips</h3>
        <ul className="text-xs text-blue-200 space-y-1">
          <li>• Use Tab to navigate between UI elements for screen reader compatibility</li>
          <li>• White dashed border shows your keyboard cursor position</li>
          <li>• Yellow preview appears when tower type is selected and position is valid</li>
          <li>• Green border = can build, Red border = cannot build</li>
          <li>• Press Esc anytime to clear selections and start over</li>
        </ul>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 transition-colors"
        >
          Got it! (Esc)
        </button>
      </div>
    </Modal>
  );
}