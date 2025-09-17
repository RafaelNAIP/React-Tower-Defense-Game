import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGameStore } from './store'
import { act, renderHook } from '@testing-library/react'

// Mock the engine functions
vi.mock('../engine/grid', () => ({
  createMap: vi.fn(() => ({
    map: [
      [
        { coord: { x: 0, y: 0 }, type: 'buildable' },
        { coord: { x: 1, y: 0 }, type: 'path', pathIndex: 0 },
      ],
    ],
    pathCoords: [{ x: 1, y: 0 }],
  })),
}))

vi.mock('../engine/sim', () => ({
  GameLoop: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
  advanceTick: vi.fn((state) => state),
}))

describe('Game Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGameStore.setState(useGameStore.getInitialState?.() || {})
  })

  it('has correct initial state', () => {
    const { result } = renderHook(() => useGameStore())

    expect(result.current.phase).toBe('preparing')
    expect(result.current.money).toBe(100)
    expect(result.current.lives).toBe(20)
    expect(result.current.towers).toEqual([])
    expect(result.current.selectedTowerType).toBe(null)
    expect(result.current.selectedTowerId).toBe(null)
    expect(result.current.showRange).toBe(true)
  })

  it('can select tower type', () => {
    const { result } = renderHook(() => useGameStore())

    act(() => {
      result.current.setSelectedTowerType('arrow')
    })

    expect(result.current.selectedTowerType).toBe('arrow')
    expect(result.current.selectedTowerId).toBe(null) // Should clear tower selection
  })

  it('can build a tower', () => {
    const { result } = renderHook(() => useGameStore())

    // Mock canBuildAt to return true
    const mockCanBuildAt = vi.fn(() => true)
    act(() => {
      useGameStore.setState({ canBuildAt: mockCanBuildAt })
    })

    const initialMoney = result.current.money
    const coord = { x: 0, y: 0 }

    act(() => {
      result.current.buildTower(coord, 'arrow')
    })

    expect(result.current.towers).toHaveLength(1)
    expect(result.current.towers[0]).toMatchObject({
      gridCoord: coord,
      type: 'arrow',
      tier: 1,
    })
    expect(result.current.money).toBeLessThan(initialMoney) // Should cost money
    expect(result.current.selectedTowerId).toBe(result.current.towers[0].id) // Should select new tower
  })

  it('cannot build tower without enough money', () => {
    const { result } = renderHook(() => useGameStore())

    // Set money to 0
    act(() => {
      useGameStore.setState({ money: 0 })
    })

    const coord = { x: 0, y: 0 }

    act(() => {
      result.current.buildTower(coord, 'arrow')
    })

    expect(result.current.towers).toHaveLength(0) // Should not build
    expect(result.current.money).toBe(0) // Money should not change
  })

  it('cannot build tower at invalid location', () => {
    const { result } = renderHook(() => useGameStore())

    // Mock canBuildAt to return false
    const mockCanBuildAt = vi.fn(() => false)
    act(() => {
      useGameStore.setState({ canBuildAt: mockCanBuildAt })
    })

    const initialMoney = result.current.money
    const coord = { x: 0, y: 0 }

    act(() => {
      result.current.buildTower(coord, 'arrow')
    })

    expect(result.current.towers).toHaveLength(0) // Should not build
    expect(result.current.money).toBe(initialMoney) // Money should not change
  })

  it('can upgrade a tower', () => {
    const { result } = renderHook(() => useGameStore())

    // First build a tower
    act(() => {
      result.current.buildTower({ x: 0, y: 0 }, 'arrow')
    })

    const towerId = result.current.towers[0].id
    const initialMoney = result.current.money

    act(() => {
      result.current.upgradeTower(towerId)
    })

    const upgradedTower = result.current.towers.find(t => t.id === towerId)
    expect(upgradedTower?.tier).toBe(2)
    expect(result.current.money).toBeLessThan(initialMoney) // Should cost money
  })

  it('cannot upgrade tower to tier beyond 3', () => {
    const { result } = renderHook(() => useGameStore())

    // Mock canBuildAt to return true
    const mockCanBuildAt = vi.fn(() => true)
    act(() => {
      useGameStore.setState({ canBuildAt: mockCanBuildAt })
    })

    // Build a tower and manually set it to tier 3
    act(() => {
      result.current.buildTower({ x: 0, y: 0 }, 'arrow')
    })

    const towerId = result.current.towers[0].id

    act(() => {
      useGameStore.setState({
        towers: [{ ...result.current.towers[0], tier: 3 }]
      })
    })

    act(() => {
      result.current.upgradeTower(towerId)
    })

    const tower = result.current.towers.find(t => t.id === towerId)
    expect(tower?.tier).toBe(3) // Should remain at tier 3
  })

  it('can sell a tower', () => {
    const { result } = renderHook(() => useGameStore())

    // First build a tower
    act(() => {
      result.current.buildTower({ x: 0, y: 0 }, 'arrow')
    })

    const towerId = result.current.towers[0].id
    const initialMoney = result.current.money

    act(() => {
      result.current.sellTower(towerId)
    })

    expect(result.current.towers).toHaveLength(0) // Tower should be removed
    expect(result.current.money).toBeGreaterThan(initialMoney) // Should get money back
    expect(result.current.selectedTowerId).toBe(null) // Should clear selection
  })

  it('can set hovered coordinate', () => {
    const { result } = renderHook(() => useGameStore())

    const coord = { x: 5, y: 5 }

    act(() => {
      result.current.setHoveredCoord(coord)
    })

    expect(result.current.hoveredCoord).toEqual(coord)

    act(() => {
      result.current.setHoveredCoord(null)
    })

    expect(result.current.hoveredCoord).toBe(null)
  })

  it('can toggle show range', () => {
    const { result } = renderHook(() => useGameStore())

    expect(result.current.showRange).toBe(true)

    act(() => {
      result.current.setShowRange(false)
    })

    expect(result.current.showRange).toBe(false)
  })

  it('can calculate sell value correctly', () => {
    const { result } = renderHook(() => useGameStore())

    const tower = {
      id: 'test-tower',
      gridCoord: { x: 0, y: 0 },
      type: 'arrow' as const,
      tier: 2 as 1 | 2 | 3,
    }

    const sellValue = result.current.calculateSellValue(tower)

    expect(sellValue).toBeGreaterThan(0)
    expect(sellValue).toBeLessThan(75) // Should be less than full cost (70% return)
  })

  it('validates canBuildAt correctly', () => {
    const { result } = renderHook(() => useGameStore())

    // Test valid buildable location
    expect(result.current.canBuildAt({ x: 0, y: 0 })).toBe(true)

    // Test out of bounds
    expect(result.current.canBuildAt({ x: -1, y: 0 })).toBe(false)
    expect(result.current.canBuildAt({ x: 100, y: 100 })).toBe(false)

    // Test path location (should be false)
    expect(result.current.canBuildAt({ x: 1, y: 0 })).toBe(false)
  })

  it('can restart game', () => {
    const { result } = renderHook(() => useGameStore())

    // Build a tower and change some state
    act(() => {
      result.current.buildTower({ x: 0, y: 0 }, 'arrow')
      result.current.setSelectedTowerType('cannon')
      useGameStore.setState({ phase: 'wave-active' })
    })

    act(() => {
      result.current.restartGame()
    })

    expect(result.current.phase).toBe('preparing')
    expect(result.current.towers).toHaveLength(0)
    expect(result.current.money).toBe(100) // Back to starting money
    expect(result.current.selectedTowerId).toBe(null)
    // selectedTowerType should be preserved
    expect(result.current.selectedTowerType).toBe('cannon')
  })
})