import { useGameStore } from '../state/store';

export function Hud() {
  const {
    money,
    lives,
    mobs,
    projectiles,
    phase,
    currentWaveIndex,
    isPaused,
    gameSpeed,
    showRange,
    startGame,
    pauseGame,
    resumeGame,
    setGameSpeed,
    restartGame,
    setShowRange,
  } = useGameStore();

  // Screen reader announcements
  const getGameStatusAnnouncement = () => {
    if (phase === 'victory') return 'Victory! You have successfully defended your base!';
    if (phase === 'defeat') return 'Game Over! Your base has been destroyed!';
    if (phase === 'wave-active') return `Wave ${currentWaveIndex} is active with ${mobs.length} enemies remaining`;
    if (phase === 'preparing') return 'Game ready to start. Press Space or click Start Game.';
    return '';
  };

  return (
    <div className="p-4 bg-gray-800 rounded" role="banner" aria-label="Game Status">
      {/* Screen reader live region for game status */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        id="game-status-announcer"
      >
        {getGameStatusAnnouncement()}
      </div>

      {/* Resource Display */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4" role="group" aria-label="Game Resources">
          <div aria-label={`Money: ${money} dollars`}>
            <h3 className="font-bold">💰 ${money}</h3>
          </div>
          <div aria-label={`Lives remaining: ${lives}`}>
            <h3 className="font-bold">❤️ {lives}</h3>
          </div>
          <div className="text-sm" aria-label={`Current wave: ${currentWaveIndex} of 10`}>
            <span className="text-gray-400">Wave:</span> {currentWaveIndex}/10
            {currentWaveIndex >= 10 && mobs.length === 0 && (
              <span className="ml-2 text-yellow-400">Complete!</span>
            )}
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showRange}
            onChange={(e) => setShowRange(e.target.checked)}
            aria-describedby="range-help"
          />
          Show Range
          <span id="range-help" className="sr-only">
            Toggle visibility of tower range circles on the game field
          </span>
        </label>
      </div>
      
      {/* Game Controls */}
      <div className="flex items-center gap-2 mb-2" role="group" aria-label="Game Controls">
        {(phase === 'defeat' || phase === 'victory') ? (
          <button
            onClick={restartGame}
            className="px-3 py-1 rounded text-sm font-semibold bg-green-600 hover:bg-green-500 focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-800"
            aria-label="Restart the game from the beginning"
          >
            🔄 Restart Game
          </button>
        ) : (
          <>
            <button
              onClick={() => phase === 'preparing' ? startGame() : isPaused ? resumeGame() : pauseGame()}
              className={`px-3 py-1 rounded text-sm font-semibold focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                phase === 'preparing' 
                  ? 'bg-green-600 hover:bg-green-500 focus:ring-green-400' 
                  : isPaused 
                  ? 'bg-blue-600 hover:bg-blue-500 focus:ring-blue-400' 
                  : 'bg-yellow-600 hover:bg-yellow-500 focus:ring-yellow-400'
              }`}
              aria-label={
                phase === 'preparing' 
                  ? 'Start the game and begin wave 1' 
                  : isPaused 
                  ? 'Resume the paused game' 
                  : 'Pause the current game'
              }
              aria-describedby="game-control-help"
            >
              {phase === 'preparing' ? '▶️ Start Game' : isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>
            <span id="game-control-help" className="sr-only">
              You can also press Space to {phase === 'preparing' ? 'start' : isPaused ? 'resume' : 'pause'} the game
            </span>
            
            <fieldset className="flex items-center gap-1" aria-label="Game Speed Controls">
              <legend className="text-sm sr-only">Choose game speed multiplier</legend>
              <span className="text-sm">Speed:</span>
              {[0.5, 1, 2, 4].map(speed => (
                <button
                  key={speed}
                  onClick={() => setGameSpeed(speed)}
                  className={`px-2 py-1 rounded text-xs focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-800 ${
                    gameSpeed === speed 
                      ? 'bg-blue-600 text-white focus:ring-blue-400' 
                      : 'bg-gray-600 hover:bg-gray-500 focus:ring-gray-400'
                  }`}
                  aria-label={`Set game speed to ${speed} times normal`}
                  aria-pressed={gameSpeed === speed}
                >
                  {speed}x
                </button>
              ))}
            </fieldset>
          </>
        )}
      </div>
      
      {/* Game Status */}
      <div className="flex items-center gap-4 text-sm" role="group" aria-label="Current Game Status">
        <div className={`px-2 py-1 rounded ${
          phase === 'preparing' ? 'bg-gray-600' :
          phase === 'wave-active' ? 'bg-green-600' :
          phase === 'victory' ? 'bg-yellow-600' :
          phase === 'defeat' ? 'bg-red-600' : 'bg-blue-600'
        }`} aria-label={`Game phase: ${phase}`}>
          {phase === 'preparing' && '⚡ Ready to Start'}
          {phase === 'wave-active' && `🌊 Wave ${currentWaveIndex} Active`}
          {phase === 'victory' && '🏆 Victory!'}
          {phase === 'defeat' && '💀 Defeated'}
          {phase === 'between-waves' && '⏳ Between Waves'}
        </div>
        
        <div className="text-gray-300" aria-label={`Active enemies: ${mobs.length}`}>
          Enemies: {mobs.length}
        </div>
        {projectiles.length > 0 && (
          <div className="text-gray-300" aria-label={`Active projectiles: ${projectiles.length}`}>
            Projectiles: {projectiles.length}
          </div>
        )}
      </div>
    </div>
  );
}