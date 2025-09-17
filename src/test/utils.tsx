import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { vi, expect } from 'vitest'
import type { GridCoord, TowerType, GameState, Tile } from '../engine/types'

// Mock game store for testing
export const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
  phase: 'preparing',
  currentWaveIndex: 0,
  simulationTime: 0,
  isPaused: false,
  gameSpeed: 1,
  money: 100,
  lives: 10,
  mobs: [],
  towers: [],
  projectiles: [],
  map: createMockMap(),
  pathCoords: [
    { x: 0, y: 5 },
    { x: 1, y: 5 },
    { x: 2, y: 5 },
    { x: 3, y: 5 },
    { x: 4, y: 5 },
  ],
  waves: [],
  ...overrides,
})

// Create a simple mock map for testing
export const createMockMap = (): Tile[][] => {
  const map: Tile[][] = []
  for (let y = 0; y < 12; y++) {
    const row: Tile[] = []
    for (let x = 0; x < 16; x++) {
      row.push({
        coord: { x, y },
        type: y === 5 ? 'path' : 'buildable',
        pathIndex: y === 5 ? x : undefined,
      })
    }
    map.push(row)
  }
  return map
}

// Mock Zustand store
export const createMockStore = (initialState: Partial<any> = {}) => {
  const state = {
    ...createMockGameState(),
    hoveredCoord: null,
    selectedTowerId: null,
    selectedTowerType: null,
    showRange: true,
    buildTower: vi.fn(),
    upgradeTower: vi.fn(),
    sellTower: vi.fn(),
    startGame: vi.fn(),
    pauseGame: vi.fn(),
    resumeGame: vi.fn(),
    setGameSpeed: vi.fn(),
    restartGame: vi.fn(),
    setHoveredCoord: vi.fn(),
    setSelectedTowerId: vi.fn(),
    setSelectedTowerType: vi.fn(),
    setShowRange: vi.fn(),
    getTowerById: vi.fn(),
    canBuildAt: vi.fn(() => true),
    calculateSellValue: vi.fn(() => 50),
    gameLoop: null,
    _tick: vi.fn(),
    _render: vi.fn(),
    ...initialState,
  }

  return {
    getState: () => state,
    setState: vi.fn(),
    subscribe: vi.fn(),
    destroy: vi.fn(),
  }
}

// Mock useGameStore hook
export const mockUseGameStore = (mockState: any) => {
  return vi.fn((selector: any) => {
    if (typeof selector === 'function') {
      return selector(mockState)
    }
    return mockState
  })
}

// Custom render function for components that need the game store
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  mockStoreState?: any
}

export const renderWithGameStore = (
  ui: React.ReactElement,
  { mockStoreState = {}, ...renderOptions }: CustomRenderOptions = {}
) => {
  // This is a basic setup - you might need to create a Provider wrapper
  // if your components need access to the store context
  return render(ui, renderOptions)
}

// Helper to create mock coordinates
export const createMockCoord = (x: number = 0, y: number = 0): GridCoord => ({ x, y })

// Helper to create mock tower data
export const createMockTower = (overrides: any = {}) => ({
  id: 'test-tower-1',
  gridCoord: { x: 5, y: 3 },
  type: 'arrow' as TowerType,
  tier: 1,
  ...overrides,
})

// Helper to simulate key press events
export const simulateKeyPress = (key: string, options: any = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    code: `Key${key.toUpperCase()}`,
    bubbles: true,
    ...options,
  })

  window.dispatchEvent(event)
  return event
}

// Helper to simulate mouse events on canvas
export const simulateCanvasClick = (canvas: HTMLCanvasElement, x: number, y: number) => {
  const rect = { left: 0, top: 0, width: 800, height: 600 }
  canvas.getBoundingClientRect = vi.fn(() => rect as DOMRect)

  const event = new MouseEvent('click', {
    clientX: x,
    clientY: y,
    bubbles: true,
  })

  canvas.dispatchEvent(event)
  return event
}

// Helper to wait for animations/timers
export const waitForAnimation = () => {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve)
    })
  })
}

// Mock screen reader announcements
export const mockScreenReaderAnnouncements = () => {
  const announcements: string[] = []

  ;(global as any).window = {
    ...global.window,
    announceToScreenReader: vi.fn((message: string) => {
      announcements.push(message)
    }),
  }

  return {
    announcements,
    clearAnnouncements: () => announcements.splice(0, announcements.length),
  }
}

// Helper to assert canvas drawing calls
export const expectCanvasDrawing = (canvas: HTMLCanvasElement, method: string, times?: number) => {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas context not found')

  const mock = context[method as keyof CanvasRenderingContext2D] as any
  if (times !== undefined) {
    expect(mock).toHaveBeenCalledTimes(times)
  } else {
    expect(mock).toHaveBeenCalled()
  }
  return mock
}

// Helper to create a fully mocked game environment
export const createTestGameEnvironment = () => {
  const mockStore = createMockStore()
  const screenReader = mockScreenReaderAnnouncements()

  return {
    store: mockStore,
    screenReader,
    cleanup: () => {
      vi.clearAllMocks()
      screenReader.clearAnnouncements()
    },
  }
}