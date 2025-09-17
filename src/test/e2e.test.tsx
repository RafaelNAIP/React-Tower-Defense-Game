import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { useGameStore } from '../state/store'
import { WAVE_DEFINITIONS } from '../engine/definitions'
import type { Mob } from '../engine/types'

// Mock the engine functions for E2E tests
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
  advanceTick: vi.fn((state, deltaTime) => {
    // Simulate wave progression and mob spawning
    const simulationTime = state.simulationTime + deltaTime
    let newState = { ...state, simulationTime }

    // Auto-start wave if preparing
    if (state.phase === 'preparing' && state.currentWaveIndex === 0) {
      newState = {
        ...newState,
        phase: 'wave-active',
        waves: [{ ...WAVE_DEFINITIONS[0], isActive: true }],
      }
    }

    // Spawn mobs for active wave
    if (state.phase === 'wave-active' && state.mobs.length === 0 && simulationTime > 1) {
      const wave = WAVE_DEFINITIONS[state.currentWaveIndex]
      if (wave) {
        // Simulate spawning first batch of mobs
        const newMobs = Array(Math.min(8, wave.entries[0]?.count || 0)).fill(null).map((_, i) => ({
          id: `mob-${i}`,
          type: 'normal',
          hp: 40,
          maxHp: 40,
          pos: { x: 0, y: 5 * 40 },
          speed: 1.5,
          armor: 0,
          bounty: 5,
          pathProgress: i * 0.1,
          status: {},
          reachedEnd: false,
          effects: [],
        }))
        newState = { ...newState, mobs: newMobs }
      }
    }

    // Simulate mobs taking damage and dying
    if (state.mobs.length > 0 && state.towers.length > 0) {
      // Simulate towers dealing damage to mobs
      const updatedMobs = state.mobs.map((mob: any) => {
        if (mob.hp <= 0) return mob

        // Check if any tower can hit this mob
        const towerInRange = state.towers.some((tower: any) => {
          const towerPos = { x: tower.gridCoord.x * 40, y: tower.gridCoord.y * 40 }
          const distance = Math.sqrt((towerPos.x - mob.pos.x) ** 2 + (towerPos.y - mob.pos.y) ** 2)
          return distance <= 3.5 * 40 // Arrow tower range
        })

        if (towerInRange) {
          return { ...mob, hp: Math.max(0, mob.hp - 15) } // Arrow tower damage
        }
        return mob
      })

      // Remove dead mobs and award money
      const deadMobs = updatedMobs.filter((mob: any) => mob.hp <= 0)
      const aliveMobs = updatedMobs.filter((mob: any) => mob.hp > 0)

      newState = {
        ...newState,
        mobs: aliveMobs,
        money: state.money + (deadMobs.length * 5), // Bounty per mob
      }

      // Check if wave is complete
      if (aliveMobs.length === 0 && simulationTime > 5) {
        newState = {
          ...newState,
          phase: 'preparing',
          currentWaveIndex: state.currentWaveIndex + 1,
          waves: [],
        }

        // Check for victory
        if (newState.currentWaveIndex >= WAVE_DEFINITIONS.length) {
          newState = { ...newState, phase: 'victory' }
        }
      }
    }

    // Simulate mobs reaching the end and causing life loss
    if (state.mobs.length > 0) {
      const mobsAtEnd = state.mobs.filter((mob: any) => mob.pathProgress >= 1)
      if (mobsAtEnd.length > 0) {
        newState = {
          ...newState,
          lives: Math.max(0, state.lives - mobsAtEnd.length),
          mobs: state.mobs.filter((mob: any) => mob.pathProgress < 1),
        }

        // Check for defeat
        if (newState.lives <= 0) {
          newState = { ...newState, phase: 'defeat' }
        }
      }
    }

    return newState
  }),
}))

// Mock matchMedia for accessibility settings
const mockMatchMedia = vi.fn()
Object.defineProperty(window, 'matchMedia', {
  value: mockMatchMedia,
  writable: true,
})

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

describe('Tower Defense E2E Tests', () => {
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
    // Reset the store to initial state by calling restartGame
    const state = useGameStore.getState()
    if (state.restartGame) {
      state.restartGame()
    }
  })

  describe('Complete Game Flow', () => {
    it('should complete the full flow: start -> place towers -> beat first wave', async () => {
      const { result } = renderHook(() => useGameStore())

      // Initial state verification
      expect(result.current.phase).toBe('preparing')
      expect(result.current.money).toBe(100)
      expect(result.current.lives).toBe(20)
      expect(result.current.towers).toHaveLength(0)
      expect(result.current.mobs).toHaveLength(0)

      // Step 1: Place towers strategically
      act(() => {
        // Place arrow tower near the path
        result.current.buildTower({ x: 1, y: 4 }, 'arrow')
      })

      expect(result.current.towers).toHaveLength(1)
      expect(result.current.money).toBe(75) // 100 - 25 for arrow tower

      act(() => {
        // Place another arrow tower for better coverage
        result.current.buildTower({ x: 3, y: 4 }, 'arrow')
      })

      expect(result.current.towers).toHaveLength(2)
      expect(result.current.money).toBe(50) // 75 - 25 for second arrow tower

      // Step 2: Start the game
      act(() => {
        result.current.startGame()
      })

      expect(result.current.phase).toBe('wave-active')
      expect(result.current.gameLoop).toBeTruthy()

      // Step 3: Simulate game ticks to progress the wave
      act(() => {
        // Simulate enough ticks to spawn mobs (simulation needs > 1 second)
        for (let i = 0; i < 70; i++) { // More than 1 second at 60 FPS
          result.current._tick(1/60)
        }
      })

      // Verify mobs were spawned (or check if they were killed quickly)
      const hadMobs = result.current.mobs.length > 0 || result.current.money > 50
      expect(hadMobs).toBe(true)

      // Step 4: Continue simulation until wave is beaten
      await act(async () => {
        // Simulate enough time for towers to kill all mobs
        for (let i = 0; i < 300; i++) { // 5 seconds at 60 FPS
          result.current._tick(1/60)

          // Break early if wave is complete
          if (result.current.phase === 'preparing' ||
              result.current.phase === 'victory' ||
              result.current.phase === 'defeat') {
            break
          }
        }
      })

      // Verify wave was beaten
      expect(result.current.mobs).toHaveLength(0)
      expect(result.current.phase).toBe('preparing')
      expect(result.current.currentWaveIndex).toBe(1)
      expect(result.current.money).toBeGreaterThan(50) // Should have earned money from kills
      expect(result.current.lives).toBe(20) // Should not have lost any lives
    })

    it('should handle defeat when mobs reach the end', async () => {
      const { result } = renderHook(() => useGameStore())

      // Don't place any towers - mobs should reach the end
      act(() => {
        result.current.startGame()
      })

      expect(result.current.phase).toBe('wave-active')

      // Simulate mobs reaching the end without towers to stop them
      await act(async () => {
        // Set up mobs that will reach the end
        const mobsAtEnd = Array(25).fill(null).map((_, i) => ({
          id: `mob-${i}`,
          type: 'normal',
          hp: 40,
          maxHp: 40,
          pos: { x: 15 * 40, y: 5 * 40 },
          speed: 1.5,
          armor: 0,
          bounty: 5,
          pathProgress: 1, // At the end
          status: {},
          reachedEnd: true,
          effects: [],
        }))

        useGameStore.setState({
          mobs: mobsAtEnd as Mob[],
        })

        // Process tick to handle mobs reaching end
        result.current._tick(1/60)
      })

      // Verify defeat condition
      expect(result.current.phase).toBe('defeat')
      expect(result.current.lives).toBe(0)
    })
  })

  describe('Tower Placement Strategies', () => {
    it('should handle strategic tower placement near path chokepoints', () => {
      const { result } = renderHook(() => useGameStore())

      // Test placement validation
      expect(result.current.canBuildAt({ x: 1, y: 4 })).toBe(true) // Near path
      expect(result.current.canBuildAt({ x: 1, y: 5 })).toBe(false) // On path
      expect(result.current.canBuildAt({ x: -1, y: 4 })).toBe(false) // Out of bounds

      // Place towers in strategic positions
      act(() => {
        result.current.buildTower({ x: 1, y: 4 }, 'arrow') // Early position
      })

      expect(result.current.towers).toHaveLength(1)
      expect(result.current.money).toBe(75) // 100 - 25

      act(() => {
        result.current.buildTower({ x: 8, y: 4 }, 'cannon') // Middle position
      })

      expect(result.current.towers).toHaveLength(2)
      expect(result.current.money).toBe(25) // 75 - 50

      // Can't afford frost tower (costs 40, only have 25)
      act(() => {
        result.current.buildTower({ x: 14, y: 4 }, 'frost') // Should fail
      })

      expect(result.current.towers).toHaveLength(2) // Still only 2 towers
      expect(result.current.money).toBe(25) // Money unchanged

      // Verify towers are placed correctly
      const towers = result.current.towers
      expect(towers[0].type).toBe('arrow')
      expect(towers[0].gridCoord).toEqual({ x: 1, y: 4 })
      expect(towers[1].type).toBe('cannon')
      expect(towers[1].gridCoord).toEqual({ x: 8, y: 4 })
    })

    it('should prevent building towers on invalid locations', () => {
      const { result } = renderHook(() => useGameStore())

      const initialMoney = result.current.money
      const initialTowerCount = result.current.towers.length

      // Try to build on path
      act(() => {
        result.current.buildTower({ x: 5, y: 5 }, 'arrow')
      })

      expect(result.current.towers).toHaveLength(initialTowerCount)
      expect(result.current.money).toBe(initialMoney) // Money should not change

      // Try to build out of bounds
      act(() => {
        result.current.buildTower({ x: 20, y: 5 }, 'arrow')
      })

      expect(result.current.towers).toHaveLength(initialTowerCount)
      expect(result.current.money).toBe(initialMoney)

      // Try to build on existing tower location
      act(() => {
        result.current.buildTower({ x: 2, y: 3 }, 'arrow')
        result.current.buildTower({ x: 2, y: 3 }, 'cannon') // Same location
      })

      expect(result.current.towers).toHaveLength(1) // Only first tower should be built
      expect(result.current.money).toBe(initialMoney - 25) // Only first tower cost
    })
  })

  describe('Tower Upgrades and Economy', () => {
    it('should handle tower upgrades correctly', () => {
      const { result } = renderHook(() => useGameStore())

      // Give enough money for upgrades
      act(() => {
        useGameStore.setState({ money: 200 })
      })

      // Build a tower
      act(() => {
        result.current.buildTower({ x: 2, y: 3 }, 'arrow')
      })

      const tower = result.current.towers[0]
      expect(tower.tier).toBe(1)

      const moneyBeforeUpgrade = result.current.money

      // Upgrade to tier 2
      act(() => {
        result.current.upgradeTower(tower.id)
      })

      const upgradedTower = result.current.towers[0]
      expect(upgradedTower.tier).toBe(2)
      expect(result.current.money).toBeLessThan(moneyBeforeUpgrade) // Should cost money

      // Upgrade to tier 3
      const moneyBeforeSecondUpgrade = result.current.money
      act(() => {
        const towerToUpgrade = result.current.towers[0]
        result.current.upgradeTower(towerToUpgrade.id)
      })

      const tier3Tower = result.current.towers[0]
      expect(tier3Tower.tier).toBe(3)
      expect(result.current.money).toBeLessThan(moneyBeforeSecondUpgrade)

      // Try to upgrade beyond tier 3 (should fail)
      const moneyBeforeFailedUpgrade = result.current.money
      act(() => {
        const towerToUpgrade = result.current.towers[0]
        result.current.upgradeTower(towerToUpgrade.id)
      })

      expect(result.current.towers[0].tier).toBe(3) // Should remain tier 3
      expect(result.current.money).toBe(moneyBeforeFailedUpgrade) // Money should not change
    })

    it('should handle tower selling correctly', () => {
      const { result } = renderHook(() => useGameStore())

      const initialMoney = result.current.money

      // Build and upgrade a tower
      act(() => {
        result.current.buildTower({ x: 2, y: 3 }, 'arrow')
      })

      const tower = result.current.towers[0]
      expect(tower).toBeTruthy()

      act(() => {
        result.current.upgradeTower(tower.id) // Upgrade to tier 2
      })

      const moneyAfterBuilding = result.current.money
      const upgradedTower = result.current.towers[0]

      // Sell the tower
      act(() => {
        result.current.sellTower(upgradedTower.id)
      })

      expect(result.current.towers).toHaveLength(0)
      expect(result.current.money).toBeGreaterThan(moneyAfterBuilding) // Should get money back
      expect(result.current.money).toBeLessThan(initialMoney) // But not full amount (70% return)
      expect(result.current.selectedTowerId).toBe(null) // Selection should be cleared
    })

    it('should prevent actions when not enough money', () => {
      const { result } = renderHook(() => useGameStore())

      // Drain money
      act(() => {
        useGameStore.setState({ money: 10 })
      })

      const initialTowerCount = result.current.towers.length

      // Try to build expensive tower
      act(() => {
        result.current.buildTower({ x: 2, y: 3 }, 'cannon') // Costs 50
      })

      expect(result.current.towers).toHaveLength(initialTowerCount)
      expect(result.current.money).toBe(10) // Should remain unchanged

      // Build cheap tower
      act(() => {
        useGameStore.setState({ money: 30 })
        result.current.buildTower({ x: 2, y: 3 }, 'arrow') // Costs 25
      })

      expect(result.current.towers).toHaveLength(1)
      expect(result.current.money).toBe(5)

      // Try to upgrade without enough money
      const tower = result.current.towers[0]
      act(() => {
        result.current.upgradeTower(tower.id) // Costs 30 for tier 2
      })

      expect(result.current.towers[0].tier).toBe(1) // Should remain tier 1
      expect(result.current.money).toBe(5) // Money should not change
    })
  })

  describe('Game State Management', () => {
    it('should handle game restart correctly', () => {
      const { result } = renderHook(() => useGameStore())

      // Build some towers and start game
      act(() => {
        result.current.buildTower({ x: 2, y: 3 }, 'arrow')
        result.current.setSelectedTowerType('cannon')
        result.current.startGame()
        useGameStore.setState({
          phase: 'wave-active',
          currentWaveIndex: 2,
          money: 50,
          lives: 15,
        })
      })

      // Restart game
      act(() => {
        result.current.restartGame()
      })

      // Verify reset to initial state
      expect(result.current.phase).toBe('preparing')
      expect(result.current.currentWaveIndex).toBe(0)
      expect(result.current.money).toBe(100)
      expect(result.current.lives).toBe(20)
      expect(result.current.towers).toHaveLength(0)
      expect(result.current.mobs).toHaveLength(0)
      expect(result.current.selectedTowerId).toBe(null)
      expect(result.current.selectedTowerType).toBe('cannon') // Should preserve tower type selection
      expect(result.current.gameLoop).toBe(null)
    })

    it('should handle game pause and resume', () => {
      const { result } = renderHook(() => useGameStore())

      // Start game
      act(() => {
        result.current.startGame()
      })

      expect(result.current.isPaused).toBe(false)
      expect(result.current.gameLoop).toBeTruthy()

      // Pause game
      act(() => {
        result.current.pauseGame()
      })

      expect(result.current.isPaused).toBe(true)

      // Resume game
      act(() => {
        result.current.resumeGame()
      })

      expect(result.current.isPaused).toBe(false)
    })

    it('should handle game speed changes', () => {
      const { result } = renderHook(() => useGameStore())

      expect(result.current.gameSpeed).toBe(1)

      // Increase speed
      act(() => {
        result.current.setGameSpeed(2)
      })

      expect(result.current.gameSpeed).toBe(2)

      // Test bounds (should clamp between 0.5 and 4)
      act(() => {
        result.current.setGameSpeed(10)
      })

      expect(result.current.gameSpeed).toBe(4)

      act(() => {
        result.current.setGameSpeed(0.1)
      })

      expect(result.current.gameSpeed).toBe(0.5)
    })
  })
})