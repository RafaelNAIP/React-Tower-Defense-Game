import React from 'react';
import { useGameStore } from '../state/store';
import { TOWER_DEFINITIONS, calculateTowerStats } from '../engine/definitions';
import type { TowerType } from '../engine/types';

export function BuildBar() {
  const {
    money,
    selectedTowerType,
    setSelectedTowerType,
  } = useGameStore();

  const getTowerColor = (towerType: TowerType): string => {
    switch (towerType) {
      case 'arrow': return '#FFD700'; // Gold
      case 'cannon': return '#FF4500'; // Orange-red  
      case 'frost': return '#00BFFF'; // Sky blue
      default: return '#FFD700';
    }
  };

  const getKeyboardShortcut = (towerType: TowerType): string => {
    switch (towerType) {
      case 'arrow': return 'Q';
      case 'cannon': return 'W';
      case 'frost': return 'E';
      default: return '';
    }
  };

  return (
    <section className="bg-gray-800 p-4 rounded" aria-label="Tower Building">
      <h3 className="font-bold mb-3">Build Towers</h3>
      <div className="grid grid-cols-1 gap-2" role="group" aria-label="Available tower types">
        {Object.entries(TOWER_DEFINITIONS).map(([key, definition]) => {
          const stats = calculateTowerStats(key, 1);
          const isSelected = selectedTowerType === key;
          const canAfford = money >= stats.cost;
          const shortcut = getKeyboardShortcut(key as TowerType);
          
          return (
            <button
              key={key}
              onClick={() => setSelectedTowerType(isSelected ? null : key as TowerType)}
              disabled={!canAfford}
              className={`p-3 border-2 rounded-lg text-left transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                isSelected 
                  ? 'border-blue-500 bg-blue-900/50 focus:ring-blue-400' 
                  : 'border-gray-600 hover:border-gray-400 focus:ring-gray-400'
              } ${
                !canAfford ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              aria-label={`${definition.name}. Cost: ${stats.cost} dollars. ${canAfford ? 'Affordable' : 'Too expensive'}. Press ${shortcut} to select.`}
              aria-describedby={`tower-${key}-details`}
              aria-pressed={isSelected}
              title={`Press ${shortcut} to select`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold" style={{ color: getTowerColor(key as TowerType) }}>
                  {definition.name}
                  <span className="ml-1 text-xs text-gray-400">({shortcut})</span>
                </span>
                <span className={`font-bold ${canAfford ? 'text-green-400' : 'text-red-400'}`}
                      aria-label={`Cost: ${stats.cost} dollars`}>
                  ${stats.cost}
                </span>
              </div>
              <div className="text-sm text-gray-300 mb-2">
                {definition.description}
              </div>
              <div 
                className="text-xs text-gray-400 grid grid-cols-2 gap-1"
                id={`tower-${key}-details`}
                aria-label={`Tower statistics: Damage ${stats.damage}, Range ${stats.range.toFixed(1)} tiles, DPS ${stats.dps.toFixed(1)}, Attack rate ${stats.attackRate.toFixed(1)} per second`}
              >
                <div>DMG: {stats.damage}</div>
                <div>RNG: {stats.range.toFixed(1)}</div>
                <div>DPS: {stats.dps.toFixed(1)}</div>
                <div>Rate: {stats.attackRate.toFixed(1)}/s</div>
              </div>
              
              {/* Special abilities for screen readers */}
              <div className="sr-only">
                {definition.splashRadius && `Splash damage with ${definition.splashRadius} tile radius. `}
                {definition.slowDuration && `Slows enemies by ${((1 - (definition.slowAmount || 0.5)) * 100).toFixed(0)}% for ${definition.slowDuration} seconds. `}
              </div>
            </button>
          );
        })}
      </div>
      
      {selectedTowerType && (
        <div 
          className="mt-3 p-2 bg-blue-900/30 rounded text-sm"
          role="status"
          aria-live="polite"
        >
          💡 {TOWER_DEFINITIONS[selectedTowerType].name} selected. Click on green tiles to build, or use arrow keys and Enter.
        </div>
      )}
    </section>
  );
}