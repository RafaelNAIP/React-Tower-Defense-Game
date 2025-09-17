import { describe, it, expect } from 'vitest'
import {
  gridToWorld,
  worldToGrid,
  distance,
  createMap,
  getPositionOnPath,
  calculatePathLength
} from './grid'

describe('Grid Utilities', () => {
  describe('gridToWorld', () => {
    it('converts grid coordinates to world coordinates', () => {
      const result = gridToWorld({ x: 2, y: 3 }, 32)
      expect(result).toEqual({ x: 80, y: 112 }) // (2 * 32 + 16, 3 * 32 + 16)
    })

    it('handles zero coordinates', () => {
      const result = gridToWorld({ x: 0, y: 0 }, 32)
      expect(result).toEqual({ x: 16, y: 16 }) // Center of first tile
    })

    it('works with different tile sizes', () => {
      const result = gridToWorld({ x: 1, y: 1 }, 64)
      expect(result).toEqual({ x: 96, y: 96 }) // (1 * 64 + 32, 1 * 64 + 32)
    })
  })

  describe('worldToGrid', () => {
    it('converts world coordinates to grid coordinates', () => {
      const result = worldToGrid({ x: 80, y: 112 }, 32)
      expect(result).toEqual({ x: 2, y: 3 })
    })

    it('handles edge cases', () => {
      const result = worldToGrid({ x: 0, y: 0 }, 32)
      expect(result).toEqual({ x: 0, y: 0 })
    })

    it('rounds down fractional coordinates', () => {
      const result = worldToGrid({ x: 95, y: 127 }, 32)
      expect(result).toEqual({ x: 2, y: 3 }) // Should round down
    })
  })

  describe('distance', () => {
    it('calculates distance between two points', () => {
      const result = distance({ x: 0, y: 0 }, { x: 3, y: 4 })
      expect(result).toBe(5) // 3-4-5 triangle
    })

    it('handles same point', () => {
      const result = distance({ x: 5, y: 5 }, { x: 5, y: 5 })
      expect(result).toBe(0)
    })

    it('calculates diagonal distance correctly', () => {
      const result = distance({ x: 0, y: 0 }, { x: 1, y: 1 })
      expect(result).toBeCloseTo(Math.sqrt(2), 5)
    })
  })

  describe('createMap', () => {
    it('creates a map with correct dimensions', () => {
      const { map } = createMap(5, 3)
      expect(map).toHaveLength(3) // Height
      expect(map[0]).toHaveLength(5) // Width
    })

    it('creates tiles with correct coordinates', () => {
      const { map } = createMap(3, 3)
      expect(map[1][2].coord).toEqual({ x: 2, y: 1 })
    })

    it('creates a valid path', () => {
      const { map, pathCoords } = createMap(5, 3)

      // Path should exist
      expect(pathCoords.length).toBeGreaterThan(0)

      // All path coordinates should be within bounds
      pathCoords.forEach(coord => {
        expect(coord.x).toBeGreaterThanOrEqual(0)
        expect(coord.x).toBeLessThan(5)
        expect(coord.y).toBeGreaterThanOrEqual(0)
        expect(coord.y).toBeLessThan(3)
      })

      // Path tiles should be marked as path type
      pathCoords.forEach((coord, index) => {
        const tile = map[coord.y][coord.x]
        expect(tile.type).toBe('path')
        expect(tile.pathIndex).toBe(index)
      })
    })

    it('creates buildable tiles around the path', () => {
      const { map } = createMap(10, 10)

      let hasBuildableTiles = false
      map.forEach(row => {
        row.forEach(tile => {
          if (tile.type === 'buildable') {
            hasBuildableTiles = true
          }
        })
      })

      expect(hasBuildableTiles).toBe(true)
    })
  })

  describe('getPositionOnPath', () => {
    const pathCoords = [
      { x: 0, y: 5 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
    ]

    it('returns start position for progress 0', () => {
      const result = getPositionOnPath(pathCoords, 0, 32)
      expect(result).toEqual({ x: 16, y: 176 }) // gridToWorld(0, 5, 32)
    })

    it('returns end position for progress 1', () => {
      const result = getPositionOnPath(pathCoords, 1, 32)
      expect(result).toEqual({ x: 144, y: 176 }) // gridToWorld(4, 5, 32)
    })

    it('interpolates between path segments', () => {
      const result = getPositionOnPath(pathCoords, 0.25, 32)
      // Should be 25% along the path
      expect(result.x).toBeGreaterThan(16)
      expect(result.x).toBeLessThan(144)
      expect(result.y).toBe(176) // Y should stay same for horizontal path
    })

    it('handles progress beyond 1', () => {
      const result = getPositionOnPath(pathCoords, 1.5, 32)
      expect(result).toEqual({ x: 144, y: 176 }) // Should clamp to end
    })

    it('handles negative progress', () => {
      const result = getPositionOnPath(pathCoords, -0.5, 32)
      expect(result).toEqual({ x: 16, y: 176 }) // Should clamp to start
    })
  })

  describe('calculatePathLength', () => {
    const tileSize = 32

    it('calculates correct length for straight horizontal path', () => {
      const pathCoords = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
      ]

      const length = calculatePathLength(pathCoords, tileSize)
      expect(length).toBe(3 * tileSize) // 3 segments of tileSize length
    })

    it('calculates correct length for straight vertical path', () => {
      const pathCoords = [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
      ]

      const length = calculatePathLength(pathCoords, tileSize)
      expect(length).toBe(2 * tileSize) // 2 segments of tileSize length
    })

    it('calculates correct length for diagonal segments', () => {
      const pathCoords = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ]

      const length = calculatePathLength(pathCoords, tileSize)
      expect(length).toBeCloseTo(2 * Math.sqrt(2) * tileSize, 5) // 2 diagonal segments
    })

    it('handles single point path', () => {
      const pathCoords = [{ x: 0, y: 0 }]
      const length = calculatePathLength(pathCoords, tileSize)
      expect(length).toBe(0)
    })

    it('handles empty path', () => {
      const length = calculatePathLength([], tileSize)
      expect(length).toBe(0)
    })
  })
})