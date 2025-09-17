import { useGameStore } from '../state/store';
import { TOWER_DEFINITIONS, calculateTowerStats, getUpgradePreview } from '../engine/definitions';
import type { TowerType } from '../engine/types';

export function TowerInfo() {
  const {
    money,
    selectedTowerId,
    getTowerById,
    upgradeTower,
    sellTower,
    calculateSellValue,
    setSelectedTowerId,
  } = useGameStore();

  const getTowerColor = (towerType: TowerType): string => {
    switch (towerType) {
      case 'arrow': return '#FFD700'; // Gold
      case 'cannon': return '#FF4500'; // Orange-red  
      case 'frost': return '#00BFFF'; // Sky blue
      default: return '#FFD700';
    }
  };

  if (!selectedTowerId) return null;

  const tower = getTowerById(selectedTowerId);
  if (!tower) return null;

  const definition = TOWER_DEFINITIONS[tower.type];
  const stats = calculateTowerStats(tower.type, tower.tier);
  const upgradePreview = tower.tier < 3 ? getUpgradePreview(tower.type, tower.tier as 1 | 2, money) : null;

  return (
    <div className="bg-gray-800 p-4 rounded">
      <h3 className="font-bold mb-3">
        <span style={{ color: getTowerColor(tower.type) }}>
          {definition.name}
        </span>
        {' '}(Tier {tower.tier})
      </h3>
      
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>Damage: <span className="text-yellow-400">{Math.round(stats.damage)}</span></div>
        <div>Range: <span className="text-blue-400">{stats.range.toFixed(1)}</span></div>
        <div>Attack Rate: <span className="text-green-400">{stats.attackRate.toFixed(1)}/s</span></div>
        <div>DPS: <span className="text-red-400">{stats.dps.toFixed(1)}</span></div>
      </div>

      {/* Special Effects */}
      {definition.splashRadius && (
        <div className="text-sm text-orange-400 mb-2">
          💥 Splash Radius: {definition.splashRadius} tiles
        </div>
      )}
      {definition.slowDuration && (
        <div className="text-sm text-blue-400 mb-2">
          ❄️ Slows enemies by {((1 - (definition.slowAmount || 0.5)) * 100).toFixed(0)}% for {definition.slowDuration}s
        </div>
      )}

      {/* Upgrade Preview */}
      {upgradePreview && (
        <div className="mb-3 p-2 bg-gray-700 rounded">
          <h4 className="text-sm font-semibold mb-2 text-green-400">
            Upgrade to Tier {tower.tier + 1} (${upgradePreview.cost}):
          </h4>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div>
              DMG: {Math.round(upgradePreview.currentStats.damage)} → {' '}
              <span className="text-green-400">{Math.round(upgradePreview.upgradeStats.damage)}</span>
              <span className="text-green-400"> (+{Math.round(upgradePreview.upgradeStats.damage - upgradePreview.currentStats.damage)})</span>
            </div>
            <div>
              RNG: {upgradePreview.currentStats.range.toFixed(1)} → {' '}
              <span className="text-green-400">{upgradePreview.upgradeStats.range.toFixed(1)}</span>
              <span className="text-green-400"> (+{(upgradePreview.upgradeStats.range - upgradePreview.currentStats.range).toFixed(1)})</span>
            </div>
            <div>
              Rate: {upgradePreview.currentStats.attackRate.toFixed(1)} → {' '}
              <span className="text-green-400">{upgradePreview.upgradeStats.attackRate.toFixed(1)}</span>
              <span className="text-green-400"> (+{(upgradePreview.upgradeStats.attackRate - upgradePreview.currentStats.attackRate).toFixed(1)})</span>
            </div>
            <div>
              DPS: {upgradePreview.currentStats.dps.toFixed(1)} → {' '}
              <span className="text-green-400">{upgradePreview.upgradeStats.dps.toFixed(1)}</span>
              <span className="text-green-400"> (+{(upgradePreview.upgradeStats.dps - upgradePreview.currentStats.dps).toFixed(1)})</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setSelectedTowerId(null)}
          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
        >
          Deselect
        </button>
        
        {tower.tier < 3 && upgradePreview && (
          <button
            onClick={() => upgradeTower(tower.id)}
            disabled={!upgradePreview.canAfford}
            className={`px-3 py-1 rounded text-sm font-semibold ${
              upgradePreview.canAfford
                ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                : 'bg-gray-600 cursor-not-allowed text-gray-400'
            }`}
          >
            Upgrade ${upgradePreview.cost}
          </button>
        )}
        
        <button
          onClick={() => sellTower(tower.id)}
          className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm"
        >
          Sell (${calculateSellValue(tower)})
        </button>
      </div>
    </div>
  );
}