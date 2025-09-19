import { useState } from 'react';
import { useGameStore } from '../state/store';
import { useAccessibilitySettings } from './AccessibilitySettings';
import { GAME_CONFIG } from '../engine/definitions';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

type MenuSection = 'help' | 'settings' | 'gameInfo' | 'controls';

export function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const [activeSection, setActiveSection] = useState<MenuSection>('help');
  const { settings, updateSetting } = useAccessibilitySettings();
  const {
    money,
    lives,
    currentWaveIndex,
    phase,
    gameSpeed,
    showRange,
    setGameSpeed,
    setShowRange,
    restartGame,
    startGame,
    pauseGame,
    resumeGame,
    isPaused,
  } = useGameStore();

  if (!isOpen) return null;

  const menuSections = [
    { id: 'help' as MenuSection, label: 'Help', icon: '❓' },
    { id: 'settings' as MenuSection, label: 'Settings', icon: '⚙️' },
    { id: 'gameInfo' as MenuSection, label: 'Game Info', icon: 'ℹ️' },
    { id: 'controls' as MenuSection, label: 'Controls', icon: '🎮' },
  ];

  const renderHelpSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-blue-400 mb-3">Game Help</h3>

      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-white mb-2">Objective</h4>
          <p className="text-gray-300 text-sm">
            Defend your base by placing towers to stop enemy waves. Survive all 10 waves to win!
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Tower Types</h4>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• <strong>Basic:</strong> Balanced damage and range</li>
            <li>• <strong>Sniper:</strong> Long range, high damage, slow fire rate</li>
            <li>• <strong>Cannon:</strong> Area damage, short range</li>
            <li>• <strong>Laser:</strong> Fast fire rate, moderate damage</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Tips</h4>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• Place towers at chokepoints for maximum efficiency</li>
            <li>• Upgrade towers by clicking on them</li>
            <li>• Use different tower types for different strategies</li>
            <li>• Watch your money - don't spend it all at once!</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderSettingsSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-blue-400 mb-3">Settings</h3>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-white mb-2">Game Settings</h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-gray-300">Show Tower Range</span>
              <input
                type="checkbox"
                checked={showRange}
                onChange={(e) => setShowRange(e.target.checked)}
                className="rounded"
              />
            </label>

            <div>
              <label className="block text-gray-300 mb-2">Game Speed</label>
              <div className="flex gap-2">
                {[0.5, 1, 2, 4].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setGameSpeed(speed)}
                    className={`px-3 py-1 rounded text-sm ${
                      gameSpeed === speed
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Accessibility</h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-gray-300">Reduce Motion</span>
              <input
                type="checkbox"
                checked={settings.reduceMotion}
                onChange={(e) => updateSetting( 'reduceMotion', e.target.checked )}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-gray-300">High Contrast</span>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => updateSetting( 'highContrast', e.target.checked )}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-gray-300">Screen Reader Mode</span>
              <input
                type="checkbox"
                checked={settings.screenReaderMode}
                onChange={(e) => updateSetting( 'screenReaderMode', e.target.checked )}
                className="rounded"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGameInfoSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-blue-400 mb-3">Game Information</h3>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-700 p-3 rounded">
            <div className="text-yellow-400 text-lg font-bold">${money}</div>
            <div className="text-gray-300 text-sm">Money</div>
          </div>
          <div className="bg-gray-700 p-3 rounded">
            <div className="text-red-400 text-lg font-bold">{lives}</div>
            <div className="text-gray-300 text-sm">Lives</div>
          </div>
        </div>

        <div className="bg-gray-700 p-3 rounded">
          <div className="text-blue-400 text-lg font-bold">Wave {currentWaveIndex}/10</div>
          <div className="text-gray-300 text-sm">
            Status: {phase === 'preparing' && 'Ready to Start'}
            {phase === 'wave-active' && 'Active'}
            {phase === 'between-waves' && 'Between Waves'}
            {phase === 'victory' && 'Victory!'}
            {phase === 'defeat' && 'Defeated'}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Game Statistics</h4>
          <div className="bg-gray-700 p-3 rounded text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Map Size:</span>
              <span className="text-white">{GAME_CONFIG.mapWidth}x{GAME_CONFIG.mapHeight}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Tile Size:</span>
              <span className="text-white">{GAME_CONFIG.tileSize}px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Max Money:</span>
              <span className="text-white">${GAME_CONFIG.maxMoney}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderControlsSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-blue-400 mb-3">Game Controls</h3>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-white mb-2">Quick Actions</h4>
          <div className="space-y-2">
            {(phase === 'defeat' || phase === 'victory') ? (
              <button
                onClick={restartGame}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-white font-semibold"
              >
                🔄 Restart Game
              </button>
            ) : (
              <button
                onClick={() => phase === 'preparing' ? startGame() : isPaused ? resumeGame() : pauseGame()}
                className={`w-full px-4 py-2 rounded text-white font-semibold ${
                  phase === 'preparing'
                    ? 'bg-green-600 hover:bg-green-500'
                    : isPaused
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-yellow-600 hover:bg-yellow-500'
                }`}
              >
                {phase === 'preparing' ? '▶️ Start Game' : isPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Keyboard Shortcuts</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Start/Pause/Resume</span>
              <kbd>Space</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Show Help</span>
              <kbd>?</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Accessibility Settings</span>
              <kbd>Ctrl+Shift+A</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Navigate Grid</span>
              <kbd>Arrow Keys</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Build Tower</span>
              <kbd>Enter</kbd>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Mouse Controls</h4>
          <div className="space-y-1 text-sm text-gray-300">
            <div>• <strong>Click:</strong> Place tower or select existing tower</div>
            <div>• <strong>Hover:</strong> Preview tower placement</div>
            <div>• <strong>Right Panel:</strong> Select tower types and view info</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'help':
        return renderHelpSection();
      case 'settings':
        return renderSettingsSection();
      case 'gameInfo':
        return renderGameInfoSection();
      case 'controls':
        return renderControlsSection();
      default:
        return renderHelpSection();
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="side-menu-title">
      <div className="modal-content w-full max-w-4xl h-[90vh] sm:h-[80vh] flex flex-col sm:flex-row m-4">
        {/* Menu Navigation */}
        <div className="w-full sm:w-48 bg-gray-900 border-b sm:border-b-0 sm:border-r border-gray-600 flex sm:flex-col">
          <div className="p-4 border-b border-gray-600">
            <h2 id="side-menu-title" className="text-lg font-bold text-white">Game Menu</h2>
          </div>

          <nav className="flex-1 p-2" aria-label="Menu sections">
            <ul className="flex sm:flex-col sm:space-y-1 space-x-1 sm:space-x-0 overflow-x-auto sm:overflow-x-visible">
              {menuSections.map((section) => (
                <li key={section.id} className="flex-shrink-0 sm:flex-shrink">
                  <button
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded flex items-center gap-3 transition-colors whitespace-nowrap sm:whitespace-normal ${
                      activeSection === section.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                    aria-current={activeSection === section.id ? 'page' : undefined}
                  >
                    <span className="text-lg">{section.icon}</span>
                    <span className="hidden sm:inline">{section.label}</span>
                    <span className="sm:hidden text-xs">{section.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-4 border-t sm:border-t border-gray-600">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm sm:text-base"
              aria-label="Close menu"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {renderActiveSection()}
        </div>
      </div>
    </div>
  );
}