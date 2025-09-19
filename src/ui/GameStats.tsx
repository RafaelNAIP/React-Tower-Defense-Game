import { useGameStore } from '../state/store';
import { GAME_CONFIG } from '../engine/definitions';

export function GameStats() {
  const {
    money,
    lives,
    mobs,
    towers,
    projectiles,
    pathCoords,
    currentWaveIndex,
    phase,
  } = useGameStore();

  // Get projectile visual properties
  const getProjectileVisuals = (projectileType: string) => {
    switch (projectileType) {
      case 'arrow':
        return { color: '#FFD700', size: 3 }; // Small golden dots
      case 'cannonball':
        return { color: '#FF4500', size: 6 }; // Larger orange balls
      case 'frost':
        return { color: '#00BFFF', size: 4 }; // Medium blue projectiles
      default:
        return { color: '#FFFFFF', size: 3 };
    }
  };

  // Get mob color based on type
  const getMobColor = (mobType: string): string => {
    switch (mobType) {
      case 'normal': return '#FF6B6B'; // Red
      case 'fast': return '#4ECDC4';   // Teal
      case 'tank': return '#45B7D1';   // Blue
      case 'flying': return '#96CEB4'; // Light green
      default: return '#FF6B6B';
    }
  };

  // Get next wave info
  const getNextWaveInfo = () => {
    const nextWave = currentWaveIndex + 1;
    if (nextWave > 10) return null;

    const waveCompositions: Record<number, string> = {
      1: "5 Goblins (Tutorial)",
      2: "8 Goblins", 
      3: "6 Goblins + 4 Wolves",
      4: "8 Wolves + 4 Goblins",
      5: "8 Goblins + 3 Orc Warriors",
      6: "6 Goblins + 5 Wolves + 4 Bats",
      7: "10 Wolves + 4 Orc Warriors + 6 Bats",
      8: "8 Orc Warriors + 10 Goblins + 3 Bats", 
      9: "15 Wolves + 10 Bats + 5 Orc Warriors",
      10: "FINAL: 10 Orc Warriors + 15 Wolves + 12 Bats + 20 Goblins"
    };

    return {
      wave: nextWave,
      composition: waveCompositions[nextWave] || "Unknown"
    };
  };

  const nextWaveInfo = getNextWaveInfo();

  return (
    <div className="space-y-4">
      {/* Game Stats - Debug Info */}
      <div className="bg-gray-800 p-4 rounded">
        <h3 className="font-bold mb-2">Game Info</h3>
        <div className="text-sm space-y-1">
          <p>Path length: {pathCoords.length} tiles</p>
          <p>Towers placed: {towers.length}</p>
          <p>Total investment: ${GAME_CONFIG.startingMoney - money}</p>
          <p>Active enemies: {mobs.length}</p>
          <p>Active projectiles: {projectiles.length}</p>
          <p>Lives remaining: {lives}/{GAME_CONFIG.startingLives}</p>
          <div className="mt-2 text-xs text-gray-400">
            <p>Debug Info:</p>
            {mobs.slice(0, 3).map((mob: any, i) => (
              <p key={i}>
                Mob {i + 1}: {(mob.pathProgress * 100).toFixed(1)}% 
                {mob.pathProgress >= 1 ? ' (REACHED END!)' : ''}
              </p>
            ))}
            {mobs.length > 3 && <p>...and {mobs.length - 3} more</p>}
          </div>
        </div>
      </div>

      {/* Next Wave Preview */}
      {nextWaveInfo && phase !== 'defeat' && phase !== 'victory' && (
        <div className="bg-purple-900/20 p-4 rounded">
          <h3 className="font-bold mb-2 text-purple-400">
            🔮 Wave {nextWaveInfo.wave} Preview
          </h3>
          <p className="text-sm text-purple-300">
            {nextWaveInfo.composition}
          </p>
          {nextWaveInfo.wave === 10 && (
            <p className="text-xs text-yellow-300 mt-1">
              ⚠️ Final boss wave! Prepare your strongest defenses!
            </p>
          )}
        </div>
      )}

      {/* Wave Progress */}
      <div className="bg-gray-800 p-4 rounded">
        <h3 className="font-bold mb-2">Wave Progress</h3>
        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(currentWaveIndex / 10) * 100}%` }}
          ></div>
        </div>
        <div className="text-sm text-gray-300">
          Completed: {currentWaveIndex}/10 waves
          {currentWaveIndex >= 10 && (
            <span className="text-yellow-400 ml-2">🏆 All waves complete!</span>
          )}
        </div>
      </div>
    </div>
  );
}