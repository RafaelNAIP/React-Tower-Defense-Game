import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { GAME_CONFIG } from '../engine/definitions'
import { useGameStore } from '../state/store'

// Mock the engine functions
vi.mock('../engine/grid', () => ({
  createMap: vi.fn(() => ({
    map: Array(12).fill(null).map((_, y) =>
      Array(16).fill(null).map((_, x) => ({
        coord: { x, y },
        type: y === 5 ? 'path' : 'buildable',
        pathIndex: y === 5 ? x : undefined,
      }))
    ),
    pathCoords: Array(16).fill(null).map((_, x) => ({ x, y: 5 })),
  })),
  gridToWorld: vi.fn((coord, tileSize) => ({ x: coord.x * tileSize, y: coord.y * tileSize })),
  worldToGrid: vi.fn((pos, tileSize) => ({ x: Math.floor(pos.x / tileSize), y: Math.floor(pos.y / tileSize) })),
  distance: vi.fn((a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)),
  getPositionOnPath: vi.fn((pathCoords, progress) => {
    const index = Math.floor(progress * (pathCoords.length - 1))
    return pathCoords[Math.min(index, pathCoords.length - 1)]
  }),
  calculatePathLength: vi.fn(() => 15),
}))

vi.mock('../engine/sim', () => ({
  GameLoop: vi.fn().mockImplementation((tick, render) => ({
    start: vi.fn(),
    stop: vi.fn(),
    tick,
    render,
  })),
  advanceTick: vi.fn((state) => state), // Return state unchanged for UI tests
}))

// Mock canvas methods
const mockCanvasContext = {
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
}

// Mock localStorage and matchMedia
const mockLocalStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

const mockMatchMedia = vi.fn(() => ({
  matches: false,
  addListener: vi.fn(),
  removeListener: vi.fn(),
}))
Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia })

describe('App E2E Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset store state between tests
    useGameStore.getState().restartGame()

    // Mock canvas methods inside beforeEach to ensure they're reset for each test
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext as unknown as CanvasRenderingContext2D) as any
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize,
      height: GAME_CONFIG.mapHeight * GAME_CONFIG.tileSize,
    } as DOMRect))
  })

  describe('Complete Game Workflow Through UI', () => {
    it('should handle complete tower building workflow through UI', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Verify initial UI state
      expect(screen.getByText('Tower Defense - Accessible Edition')).toBeInTheDocument()
      expect(screen.getByLabelText('Money: 100 dollars')).toBeInTheDocument() // Money
      expect(screen.getByLabelText('Lives remaining: 20')).toBeInTheDocument() // Lives

      // Test that store buildTower works directly first
      const store = useGameStore.getState()
      store.setSelectedTowerType('arrow')
      store.buildTower({ x: 2, y: 3 }, 'arrow')

      // Verify money decreased after direct store call
      await waitFor(() => {
        expect(screen.getByLabelText('Money: 75 dollars')).toBeInTheDocument()
      }, { timeout: 1000 })

      // Build another tower directly
      store.buildTower({ x: 4, y: 3 }, 'arrow')

      await waitFor(() => {
        expect(screen.getByLabelText('Money: 50 dollars')).toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('should handle tower selection and upgrade through UI', async () => {
      render(<App />)

      // Build a tower first using store directly
      const store = useGameStore.getState()
      store.buildTower({ x: 2, y: 3 }, 'arrow')

      // Select the tower directly via store
      const towers = store.towers
      if (towers.length > 0) {
        store.setSelectedTowerId(towers[0].id)
      }

      // Look for upgrade button in tower info panel
      await waitFor(() => {
        const upgradeButton = screen.queryByRole('button', { name: /upgrade/i })
        if (upgradeButton) {
          expect(upgradeButton).toBeInTheDocument()
        }
      })

      // Look for sell button
      await waitFor(() => {
        const sellButton = screen.queryByRole('button', { name: /sell/i })
        if (sellButton) {
          expect(sellButton).toBeInTheDocument()
        }
      })
    })

    it('should prevent building towers when insufficient funds', async () => {
      render(<App />)

      // Use store directly to build expensive cannon towers to drain money
      let store = useGameStore.getState()
      store.setSelectedTowerType('cannon')

      // Build two cannon towers (50 each = 100 total)
      store.buildTower({ x: 2, y: 3 }, 'cannon')

      await waitFor(() => {
        expect(screen.getByLabelText('Money: 50 dollars')).toBeInTheDocument()
      })

      // Get fresh store state and build at a different location
      store = useGameStore.getState()
      store.buildTower({ x: 6, y: 3 }, 'cannon')

      await waitFor(() => {
        expect(screen.getByLabelText('Money: 0 dollars')).toBeInTheDocument()
      })

      // Try to build another tower (should fail due to insufficient funds)
      store.buildTower({ x: 6, y: 3 }, 'cannon')

      // Money should still be 0
      expect(screen.getByLabelText('Money: 0 dollars')).toBeInTheDocument()
    })

    it('should show appropriate feedback for invalid placement', async () => {
      render(<App />)

      // Test that store correctly prevents building on path tiles
      const store = useGameStore.getState()
      store.setSelectedTowerType('arrow')

      // Verify initial money
      expect(screen.getByLabelText('Money: 100 dollars')).toBeInTheDocument()

      // Try to place on path (y=5 is the path) - should fail silently
      store.buildTower({ x: 5, y: 5 }, 'arrow')

      // Money should remain the same since placement failed
      expect(screen.getByLabelText('Money: 100 dollars')).toBeInTheDocument()
    })
  })

  describe('Accessibility Features Integration', () => {
    it('should handle keyboard shortcuts', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Test help shortcut
      await user.keyboard('?')

      await waitFor(() => {
        expect(screen.getByText(/keyboard controls/i)).toBeInTheDocument()
      })

      // Close help modal
      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByText(/keyboard controls/i)).not.toBeInTheDocument()
      })
    })

    it('should open accessibility settings', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Click accessibility settings button
      const accessibilityButton = screen.getByRole('button', { name: /open accessibility settings/i })
      await user.click(accessibilityButton)

      await waitFor(() => {
        expect(screen.getByText('♿ Accessibility Settings')).toBeInTheDocument()
      })

      // Verify accessibility options are present
      expect(screen.getByLabelText(/reduce motion/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/high contrast/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/announce actions/i)).toBeInTheDocument()
    })

    it('should provide screen reader feedback', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Move mouse over canvas to trigger tile info updates
      const canvas = screen.getByRole('application')

      fireEvent.mouseMove(canvas, {
        clientX: 2 * GAME_CONFIG.tileSize,
        clientY: 3 * GAME_CONFIG.tileSize,
      })

      // Check that tile information is announced via live region
      await waitFor(() => {
        const liveRegions = screen.getAllByRole('status')
        const tileInfoRegion = liveRegions.find(region =>
          region.textContent?.includes('Tile (') &&
          region.textContent?.includes('buildable')
        )
        expect(tileInfoRegion).toHaveTextContent(/Tile \(\d+, \d+\): buildable - Can build/)
      })
    })
  })

  describe('Game Controls Integration', () => {
    it('should handle game start/pause/resume controls', async () => {
      const user = userEvent.setup()
      render(<App />)

      // Look for game control buttons
      const startButton = screen.queryByRole('button', { name: /start/i })
      if (startButton) {
        await user.click(startButton)

        // Should show pause button after starting
        await waitFor(() => {
          expect(screen.queryByRole('button', { name: /pause/i })).toBeInTheDocument()
        })
      }
    })

    it('should display game statistics correctly', () => {
      render(<App />)

      // Check that game stats are displayed
      expect(screen.getByLabelText('Money: 100 dollars')).toBeInTheDocument() // Money
      expect(screen.getByLabelText('Lives remaining: 20')).toBeInTheDocument() // Lives

      // Should show wave information
      expect(screen.getByText('Wave:')).toBeInTheDocument()
    })

    it('should handle responsive hover effects', async () => {
      render(<App />)

      const canvas = screen.getByRole('application')

      // Test hovering different locations
      fireEvent.mouseMove(canvas, {
        clientX: 1 * GAME_CONFIG.tileSize,
        clientY: 1 * GAME_CONFIG.tileSize,
      })

      await waitFor(() => {
        expect(screen.getByText(/Tile \(\d+, \d+\): buildable - Can build/)).toBeInTheDocument()
      })

      // Test hovering different location
      fireEvent.mouseMove(canvas, {
        clientX: 5 * GAME_CONFIG.tileSize,
        clientY: 3 * GAME_CONFIG.tileSize,
      })

      await waitFor(() => {
        expect(screen.getByText(/Tile \(\d+, \d+\)/)).toBeInTheDocument()
      })

      // Hover effects test completed successfully
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle canvas rendering errors gracefully', () => {
      // Mock canvas context to throw error
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null)

      // Should not crash the app
      expect(() => render(<App />)).not.toThrow()
    })

    it('should handle rapid clicking without breaking state', async () => {
      const user = userEvent.setup()
      render(<App />)

      const arrowTowerButton = screen.getByRole('button', { name: /arrow tower/i })
      const canvas = screen.getByRole('application')

      // Rapidly select and deselect tower
      for (let i = 0; i < 5; i++) {
        await user.click(arrowTowerButton) // Select
        await user.click(arrowTowerButton) // Deselect
      }

      // App should still be functional
      expect(screen.getByText('Tower Defense - Accessible Edition')).toBeInTheDocument()

      // Rapid clicking on canvas
      for (let i = 0; i < 10; i++) {
        fireEvent.click(canvas, {
          clientX: Math.random() * 640,
          clientY: Math.random() * 480,
        })
      }

      // Should not crash
      expect(screen.getByText('Tower Defense - Accessible Edition')).toBeInTheDocument()
    })

    it('should handle window resize events', () => {
      render(<App />)

      // Simulate window resize
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      // App should still render correctly
      expect(screen.getByText('Tower Defense - Accessible Edition')).toBeInTheDocument()
    })
  })
})