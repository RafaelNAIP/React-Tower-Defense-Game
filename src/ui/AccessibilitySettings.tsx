import { useState, useEffect } from 'react';
import { Modal } from './Modal';

interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  announceActions: boolean;
}

const defaultSettings: AccessibilitySettings = {
  reduceMotion: false,
  highContrast: false,
  announceActions: true,
};

// Custom hook for accessibility settings
export function useAccessibilitySettings() {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Load from localStorage or use defaults
    const saved = localStorage.getItem('tower-defense-accessibility');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch {
        return defaultSettings;
      }
    }
    
    // Check for system preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return {
      ...defaultSettings,
      reduceMotion: prefersReducedMotion,
    };
  });

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('tower-defense-accessibility', JSON.stringify(settings));
  }, [settings]);

  // Apply CSS custom properties for accessibility
  useEffect(() => {
    const root = document.documentElement;
    
    if (settings.reduceMotion) {
      root.style.setProperty('--animation-duration', '0.01s');
      root.style.setProperty('--transition-duration', '0.01s');
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
    }

    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [settings]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return { settings, updateSetting };
}

// Accessibility settings panel component
export function AccessibilitySettings({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { settings, updateSetting } = useAccessibilitySettings();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="♿ Accessibility Settings" size="md">
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.reduceMotion}
                onChange={(e) => updateSetting('reduceMotion', e.target.checked)}
                className="w-5 h-5 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-2 mt-0.5"
              />
              <div className="flex-1">
                <span className="font-medium text-lg">🎭 Reduce Motion</span>
                <p className="text-sm text-gray-300 mt-1">Minimizes animations and transitions for users with vestibular disorders or motion sensitivity</p>
              </div>
            </label>
          </div>

          <div className="p-4 bg-gray-700 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => updateSetting('highContrast', e.target.checked)}
                className="w-5 h-5 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-2 mt-0.5"
              />
              <div className="flex-1">
                <span className="font-medium text-lg">🔆 High Contrast</span>
                <p className="text-sm text-gray-300 mt-1">Increases contrast and uses stronger borders for better visibility and clarity</p>
              </div>
            </label>
          </div>

          <div className="p-4 bg-gray-700 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.announceActions}
                onChange={(e) => updateSetting('announceActions', e.target.checked)}
                className="w-5 h-5 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-2 mt-0.5"
              />
              <div className="flex-1">
                <span className="font-medium text-lg">🔊 Announce Actions</span>
                <p className="text-sm text-gray-300 mt-1">Provides audio announcements for screen reader users about game events and actions</p>
              </div>
            </label>
          </div>
        </div>

        <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-700">
          <h3 className="font-semibold text-blue-300 mb-3 flex items-center gap-2">
            ⌨️ Keyboard Navigation
          </h3>
          <div className="text-sm text-blue-200 space-y-2">
            <p>• Press <kbd className="bg-blue-800 px-2 py-1 rounded text-xs">?</kbd> anytime to view all keyboard shortcuts</p>
            <p>• Use <kbd className="bg-blue-800 px-2 py-1 rounded text-xs">Tab</kbd> to navigate between UI elements</p>
            <p>• All game functions are accessible via keyboard</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold focus:ring-2 focus:ring-purple-400 transition-colors"
        >
          Save & Close (Esc)
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">
          Settings are automatically saved to your browser
        </p>
      </div>
    </Modal>
  );
}

// Live announcer for screen readers
export function LiveAnnouncer() {
  const [announcement, setAnnouncement] = useState('');
  const { settings } = useAccessibilitySettings();

  // Global function to make announcements
  useEffect(() => {
    (window as any).announceToScreenReader = (message: string) => {
      if (settings.announceActions) {
        setAnnouncement(message);
        setTimeout(() => setAnnouncement(''), 100); // Clear after brief moment
      }
    };

    return () => {
      delete (window as any).announceToScreenReader;
    };
  }, [settings.announceActions]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      role="status"
    >
      {announcement}
    </div>
  );
}