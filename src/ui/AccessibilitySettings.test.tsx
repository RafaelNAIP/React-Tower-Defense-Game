import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AccessibilitySettings, useAccessibilitySettings } from './AccessibilitySettings'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

// Mock window.matchMedia
const mockMatchMedia = vi.fn()
Object.defineProperty(window, 'matchMedia', {
  value: mockMatchMedia,
  writable: true,
})

describe('AccessibilitySettings', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    mockMatchMedia.mockReturnValue({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })
  })

  afterEach(() => {
    // Clean up any DOM changes
    document.documentElement.classList.remove('high-contrast')
    document.documentElement.style.removeProperty('--animation-duration')
    document.documentElement.style.removeProperty('--transition-duration')
  })

  it('renders when open', () => {
    render(<AccessibilitySettings isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText('♿ Accessibility Settings')).toBeInTheDocument()
    expect(screen.getByText('🎭 Reduce Motion')).toBeInTheDocument()
    expect(screen.getByText('🔆 High Contrast')).toBeInTheDocument()
    expect(screen.getByText('🔊 Announce Actions')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<AccessibilitySettings isOpen={false} onClose={mockOnClose} />)

    expect(screen.queryByText('♿ Accessibility Settings')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(<AccessibilitySettings isOpen={true} onClose={mockOnClose} />)

    const closeButton = screen.getByRole('button', { name: /save & close/i })
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('has proper accessibility attributes', () => {
    render(<AccessibilitySettings isOpen={true} onClose={mockOnClose} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    const reduceMotionCheckbox = screen.getByRole('checkbox', { name: /reduce motion/i })
    expect(reduceMotionCheckbox).toBeInTheDocument()

    const highContrastCheckbox = screen.getByRole('checkbox', { name: /high contrast/i })
    expect(highContrastCheckbox).toBeInTheDocument()

    const announceActionsCheckbox = screen.getByRole('checkbox', { name: /announce actions/i })
    expect(announceActionsCheckbox).toBeInTheDocument()
  })

  it('shows keyboard navigation help', () => {
    render(<AccessibilitySettings isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText('⌨️ Keyboard Navigation')).toBeInTheDocument()
    expect(screen.getByText(/press.*anytime to view all keyboard shortcuts/i)).toBeInTheDocument()
    expect(screen.getByText(/to navigate between UI elements/i)).toBeInTheDocument()
  })
})

describe('useAccessibilitySettings hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    mockMatchMedia.mockReturnValue({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })
  })

  afterEach(() => {
    // Clean up any DOM changes
    document.documentElement.classList.remove('high-contrast')
    document.documentElement.style.removeProperty('--animation-duration')
    document.documentElement.style.removeProperty('--transition-duration')
  })

  it('returns default settings when no saved settings exist', () => {
    function TestComponent() {
      const { settings } = useAccessibilitySettings()
      return (
        <div>
          <span data-testid="reduce-motion">{settings.reduceMotion.toString()}</span>
          <span data-testid="high-contrast">{settings.highContrast.toString()}</span>
          <span data-testid="announce-actions">{settings.announceActions.toString()}</span>
        </div>
      )
    }

    render(<TestComponent />)

    expect(screen.getByTestId('reduce-motion')).toHaveTextContent('false')
    expect(screen.getByTestId('high-contrast')).toHaveTextContent('false')
    expect(screen.getByTestId('announce-actions')).toHaveTextContent('true')
  })

  it('loads saved settings from localStorage', () => {
    const savedSettings = {
      reduceMotion: true,
      highContrast: true,
      announceActions: false,
    }
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedSettings))

    function TestComponent() {
      const { settings } = useAccessibilitySettings()
      return (
        <div>
          <span data-testid="reduce-motion">{settings.reduceMotion.toString()}</span>
          <span data-testid="high-contrast">{settings.highContrast.toString()}</span>
          <span data-testid="announce-actions">{settings.announceActions.toString()}</span>
        </div>
      )
    }

    render(<TestComponent />)

    expect(screen.getByTestId('reduce-motion')).toHaveTextContent('true')
    expect(screen.getByTestId('high-contrast')).toHaveTextContent('true')
    expect(screen.getByTestId('announce-actions')).toHaveTextContent('false')
  })

  it('detects system preference for reduced motion', () => {
    mockMatchMedia.mockReturnValue({
      matches: true, // User prefers reduced motion
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })

    function TestComponent() {
      const { settings } = useAccessibilitySettings()
      return <span data-testid="reduce-motion">{settings.reduceMotion.toString()}</span>
    }

    render(<TestComponent />)

    expect(screen.getByTestId('reduce-motion')).toHaveTextContent('true')
  })

  it('saves settings to localStorage when updated', () => {
    function TestComponent() {
      const { settings, updateSetting } = useAccessibilitySettings()
      return (
        <div>
          <button onClick={() => updateSetting('reduceMotion', true)}>
            Enable Reduce Motion
          </button>
          <span data-testid="reduce-motion">{settings.reduceMotion.toString()}</span>
        </div>
      )
    }

    render(<TestComponent />)

    const button = screen.getByText('Enable Reduce Motion')
    fireEvent.click(button)

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'tower-defense-accessibility',
      expect.stringContaining('"reduceMotion":true')
    )
  })

  it('applies CSS properties for reduced motion', () => {
    function TestComponent() {
      const { updateSetting } = useAccessibilitySettings()
      return (
        <button onClick={() => updateSetting('reduceMotion', true)}>
          Enable Reduce Motion
        </button>
      )
    }

    render(<TestComponent />)

    const button = screen.getByText('Enable Reduce Motion')
    fireEvent.click(button)

    // Check that CSS custom properties are set
    expect(document.documentElement.style.getPropertyValue('--animation-duration')).toBe('0.01s')
    expect(document.documentElement.style.getPropertyValue('--transition-duration')).toBe('0.01s')
  })

  it('applies CSS class for high contrast', () => {
    function TestComponent() {
      const { updateSetting } = useAccessibilitySettings()
      return (
        <button onClick={() => updateSetting('highContrast', true)}>
          Enable High Contrast
        </button>
      )
    }

    render(<TestComponent />)

    const button = screen.getByText('Enable High Contrast')
    fireEvent.click(button)

    expect(document.documentElement.classList.contains('high-contrast')).toBe(true)
  })

  it('handles malformed localStorage data gracefully', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid json')

    function TestComponent() {
      const { settings } = useAccessibilitySettings()
      return <span data-testid="reduce-motion">{settings.reduceMotion.toString()}</span>
    }

    // Should not throw an error
    expect(() => render(<TestComponent />)).not.toThrow()

    // Should fall back to defaults
    expect(screen.getByTestId('reduce-motion')).toHaveTextContent('false')
  })
})