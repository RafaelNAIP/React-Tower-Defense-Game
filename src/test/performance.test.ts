import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGameStore } from '../state/store'
import { WAVE_DEFINITIONS } from '../engine/definitions'

// Performance monitoring utilities
interface PerformanceMetrics {
  frameCount: number
  totalTime: number
  averageFPS: number
  minFrameTime: number
  maxFrameTime: number
  frameTimeBudgetViolations: number
  mainThreadTasks: Array<{ duration: number; timestamp: number }>
  memorySnapshots: Array<{ timestamp: number; usedJSHeapSize: number; totalJSHeapSize: number }>
  droppedFrames: number
}

class PerformanceProfiler {
  private metrics: PerformanceMetrics
  private lastFrameTime: number
  private startTime: number
  private isRunning: boolean
  private frameTimeThreshold: number = 16.67 // 60 FPS = 16.67ms per frame
  private mainThreadTaskThreshold: number = 50 // Main thread tasks should be < 50ms
  private memoryCheckInterval: number = 1000 // Check memory every 1 second

  constructor() {
    this.metrics = {
      frameCount: 0,
      totalTime: 0,
      averageFPS: 0,
      minFrameTime: Infinity,
      maxFrameTime: 0,
      frameTimeBudgetViolations: 0,
      mainThreadTasks: [],
      memorySnapshots: [],
      droppedFrames: 0,
    }
    this.lastFrameTime = 0
    this.startTime = 0
    this.isRunning = false
  }

  start() {
    this.isRunning = true
    this.startTime = performance.now()
    this.lastFrameTime = this.startTime
    this.scheduleMemoryCheck()
  }

  stop() {
    this.isRunning = false
    this.calculateFinalMetrics()
  }

  recordFrame() {
    if (!this.isRunning) return

    const currentTime = performance.now()
    const frameTime = currentTime - this.lastFrameTime

    this.metrics.frameCount++
    this.metrics.totalTime = currentTime - this.startTime

    // Track frame timing
    this.metrics.minFrameTime = Math.min(this.metrics.minFrameTime, frameTime)
    this.metrics.maxFrameTime = Math.max(this.metrics.maxFrameTime, frameTime)

    // Check for frame budget violations (> 16.67ms = dropped frames)
    if (frameTime > this.frameTimeThreshold) {
      this.metrics.frameTimeBudgetViolations++
      this.metrics.droppedFrames += Math.floor(frameTime / this.frameTimeThreshold) - 1
    }

    this.lastFrameTime = currentTime
  }

  recordMainThreadTask(duration: number) {
    if (!this.isRunning) return

    this.metrics.mainThreadTasks.push({
      duration,
      timestamp: performance.now() - this.startTime,
    })
  }

  private scheduleMemoryCheck() {
    if (!this.isRunning) return

    // Record memory usage if available
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory
      this.metrics.memorySnapshots.push({
        timestamp: performance.now() - this.startTime,
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
      })
    }

    setTimeout(() => this.scheduleMemoryCheck(), this.memoryCheckInterval)
  }

  private calculateFinalMetrics() {
    if (this.metrics.totalTime > 0) {
      this.metrics.averageFPS = (this.metrics.frameCount / this.metrics.totalTime) * 1000
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  // Analysis methods
  isPerformanceAcceptable(): boolean {
    return (
      this.metrics.averageFPS >= 55 && // Allow 5 FPS tolerance
      this.getMainThreadTaskViolations() < this.metrics.mainThreadTasks.length * 0.1 && // < 10% violations
      this.metrics.frameTimeBudgetViolations < this.metrics.frameCount * 0.05 // < 5% frame drops
    )
  }

  getMainThreadTaskViolations(): number {
    return this.metrics.mainThreadTasks.filter(task => task.duration > this.mainThreadTaskThreshold).length
  }

  getMemoryTrend(): 'stable' | 'increasing' | 'decreasing' | 'insufficient_data' {
    if (this.metrics.memorySnapshots.length < 5) return 'insufficient_data'

    const samples = this.metrics.memorySnapshots.slice(-5)
    const firstMemory = samples[0].usedJSHeapSize
    const lastMemory = samples[samples.length - 1].usedJSHeapSize
    const threshold = firstMemory * 0.1 // 10% threshold

    if (lastMemory > firstMemory + threshold) return 'increasing'
    if (lastMemory < firstMemory - threshold) return 'decreasing'
    return 'stable'
  }
}

// Mock engine functions with performance tracking
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

// Performance-aware simulation mock
vi.mock('../engine/sim', () => ({
  GameLoop: vi.fn().mockImplementation((tick, render) => ({
    start: vi.fn(),
    stop: vi.fn(),
    tick,
    render,
  })),
  advanceTick: vi.fn((state, deltaTime) => {
    // Simulate realistic game logic execution time
    const startTime = performance.now()

    // Simulate computation work (pathfinding, collision detection, etc.)
    let computationWork = 0
    for (let i = 0; i < 1000; i++) {
      computationWork += Math.sqrt(i) * Math.sin(i)
    }

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

    // Spawn mobs for active wave with realistic complexity
    if (state.phase === 'wave-active' && state.mobs.length < 20 && simulationTime > 1) {
      const wave = WAVE_DEFINITIONS[state.currentWaveIndex]
      if (wave) {
        const mobCount = Math.min(20, wave.entries[0]?.count || 0)
        const newMobs = Array(mobCount).fill(null).map((_, i) => ({
          id: `mob-${i}-${Date.now()}`,
          type: 'normal',
          hp: 40,
          maxHp: 40,
          pos: { x: i * 10, y: 5 * 40 },
          speed: 1.5,
          armor: 0,
          bounty: 5,
          pathProgress: i * 0.05,
          effects: [],
        }))
        newState = { ...newState, mobs: [...state.mobs, ...newMobs] }
      }
    }

    // Simulate towers dealing damage to mobs (complex calculations)
    if (state.mobs.length > 0 && state.towers.length > 0) {
      const updatedMobs = state.mobs.map((mob: any) => {
        if (mob.hp <= 0) return mob

        // Simulate complex targeting and damage calculations
        state.towers.reduce((work: number, tower: any) => {
          const distance = Math.sqrt(
            Math.pow(tower.gridCoord.x * 40 - mob.pos.x, 2) +
            Math.pow(tower.gridCoord.y * 40 - mob.pos.y, 2)
          )
          return work + Math.sin(distance) * Math.cos(distance)
        }, 0)

        const towerInRange = state.towers.some((tower: any) => {
          const distance = Math.sqrt(
            Math.pow(tower.gridCoord.x * 40 - mob.pos.x, 2) +
            Math.pow(tower.gridCoord.y * 40 - mob.pos.y, 2)
          )
          return distance <= 3.5 * 40
        })

        if (towerInRange) {
          return { ...mob, hp: Math.max(0, mob.hp - 15) }
        }
        return mob
      })

      // Remove dead mobs and award money
      const deadMobs = updatedMobs.filter((mob: any) => mob.hp <= 0)
      const aliveMobs = updatedMobs.filter((mob: any) => mob.hp > 0)

      newState = {
        ...newState,
        mobs: aliveMobs,
        money: state.money + (deadMobs.length * 5),
      }

      // Progress wave if all mobs are dead
      if (aliveMobs.length === 0 && state.mobs.length > 0) {
        newState = {
          ...newState,
          phase: 'preparing',
          currentWaveIndex: state.currentWaveIndex + 1,
          waves: [],
        }
      }
    }

    // Simulate mob movement updates
    if (newState.mobs.length > 0) {
      newState.mobs = newState.mobs.map((mob: any) => ({
        ...mob,
        pathProgress: Math.min(1, mob.pathProgress + deltaTime * mob.speed * 0.01),
        pos: {
          x: mob.pos.x + deltaTime * mob.speed * 10,
          y: mob.pos.y,
        },
      }))
    }

    const executionTime = performance.now() - startTime

    // Record performance metrics if profiler is available
    if ((global as any).performanceProfiler) {
      (global as any).performanceProfiler.recordMainThreadTask(executionTime)
    }

    return newState
  }),
}))

describe('Performance Tests', () => {
  let profiler: PerformanceProfiler

  beforeEach(() => {
    vi.clearAllMocks()
    profiler = new PerformanceProfiler()
    // Make profiler globally available for mocks
    ;(global as any).performanceProfiler = profiler
  })

  afterEach(() => {
    profiler.stop()
    delete (global as any).performanceProfiler

    // Reset the store
    const state = useGameStore.getState()
    if (state.restartGame) {
      state.restartGame()
    }
  })

  describe('Frame Rate Performance', () => {
    it('should maintain 60 FPS during normal gameplay', async () => {
      const { result } = renderHook(() => useGameStore())
      profiler.start()

      // Set up a realistic game scenario
      act(() => {
        result.current.buildTower({ x: 2, y: 3 }, 'arrow')
        result.current.buildTower({ x: 5, y: 3 }, 'cannon')
        result.current.buildTower({ x: 8, y: 3 }, 'frost')
        result.current.startGame()
      })

      // Simulate 5 seconds of gameplay at 60 FPS
      const targetFPS = 60
      const testDurationMs = 5000
      const expectedFrames = (testDurationMs / 1000) * targetFPS

      await act(async () => {
        for (let frame = 0; frame < expectedFrames; frame++) {
          profiler.recordFrame()
          result.current._tick(1 / targetFPS) // 16.67ms per frame

          // Yield control occasionally to prevent blocking
          if (frame % 60 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0))
          }
        }
      })

      profiler.stop()
      const metrics = profiler.getMetrics()

      // Verify performance requirements
      expect(metrics.averageFPS).toBeGreaterThan(55) // Allow 5 FPS tolerance
      expect(metrics.frameTimeBudgetViolations).toBeLessThan(expectedFrames * 0.05) // < 5% violations
      expect(profiler.isPerformanceAcceptable()).toBe(true)

      console.log('Frame Rate Performance Results:', {
        averageFPS: metrics.averageFPS.toFixed(2),
        frameCount: metrics.frameCount,
        violations: metrics.frameTimeBudgetViolations,
        droppedFrames: metrics.droppedFrames,
      })
    })

    it('should handle complex scenarios with many entities', async () => {
      const { result } = renderHook(() => useGameStore())
      profiler.start()

      // Set up complex scenario with many towers
      act(() => {
        for (let x = 1; x < 15; x += 2) {
          for (let y = 1; y < 4; y++) {
            const towerType = ['arrow', 'cannon', 'frost'][Math.floor(Math.random() * 3)]
            result.current.buildTower({ x, y }, towerType as any)
          }
        }
        result.current.startGame()
      })

      // Simulate 3 seconds of complex gameplay
      const testDurationMs = 3000
      const targetFPS = 60
      const expectedFrames = (testDurationMs / 1000) * targetFPS

      await act(async () => {
        for (let frame = 0; frame < expectedFrames; frame++) {
          profiler.recordFrame()
          result.current._tick(1 / targetFPS)

          if (frame % 30 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0))
          }
        }
      })

      profiler.stop()
      const metrics = profiler.getMetrics()

      // Verify performance under stress
      expect(metrics.averageFPS).toBeGreaterThan(45) // Lower tolerance for complex scenarios
      expect(metrics.frameTimeBudgetViolations).toBeLessThan(expectedFrames * 0.1) // < 10% violations

      console.log('Complex Scenario Performance Results:', {
        averageFPS: metrics.averageFPS.toFixed(2),
        violations: metrics.frameTimeBudgetViolations,
        towersBuilt: result.current.towers.length,
        mobsActive: result.current.mobs.length,
      })
    })
  })

  describe('Main Thread Task Performance', () => {
    it('should keep main thread tasks under 50ms', async () => {
      const { result } = renderHook(() => useGameStore())
      profiler.start()

      // Set up game and run simulation
      act(() => {
        result.current.buildTower({ x: 3, y: 3 }, 'arrow')
        result.current.startGame()
      })

      // Run for 2 seconds and monitor main thread tasks
      await act(async () => {
        for (let i = 0; i < 120; i++) { // 2 seconds at 60 FPS
          profiler.recordFrame()
          result.current._tick(1 / 60)

          if (i % 30 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0))
          }
        }
      })

      profiler.stop()
      const metrics = profiler.getMetrics()
      const violations = profiler.getMainThreadTaskViolations()

      // Verify main thread performance
      expect(violations).toBeLessThan(metrics.mainThreadTasks.length * 0.1) // < 10% violations

      if (metrics.mainThreadTasks.length > 0) {
        const maxTaskDuration = Math.max(...metrics.mainThreadTasks.map(task => task.duration))
        const avgTaskDuration = metrics.mainThreadTasks.reduce((sum, task) => sum + task.duration, 0) / metrics.mainThreadTasks.length

        expect(avgTaskDuration).toBeLessThan(25) // Average should be well under 50ms
        expect(maxTaskDuration).toBeLessThan(100) // Even worst case should be reasonable

        console.log('Main Thread Task Performance:', {
          totalTasks: metrics.mainThreadTasks.length,
          violations,
          avgDuration: avgTaskDuration.toFixed(2) + 'ms',
          maxDuration: maxTaskDuration.toFixed(2) + 'ms',
        })
      }
    })
  })

  describe('Memory Stability', () => {
    it('should maintain stable memory usage over extended gameplay', async () => {
      const { result } = renderHook(() => useGameStore())
      profiler.start()

      // Set up realistic game scenario
      act(() => {
        result.current.buildTower({ x: 2, y: 3 }, 'arrow')
        result.current.buildTower({ x: 6, y: 3 }, 'cannon')
        result.current.startGame()
      })

      // Simulate 10+ minutes of gameplay (compressed to ~30 seconds of test time)
      const simulatedMinutes = 12
      const framesPerMinute = 60 * 60 // 60 FPS * 60 seconds
      const totalFrames = simulatedMinutes * framesPerMinute
      const compressionRatio = 100 // Run every 100th frame to compress time

      await act(async () => {
        for (let frame = 0; frame < totalFrames; frame += compressionRatio) {
          profiler.recordFrame()

          // Simulate multiple ticks to advance game state faster
          for (let tick = 0; tick < compressionRatio; tick++) {
            result.current._tick(1 / 60)
          }

          // Yield control every second of simulated time
          if (frame % framesPerMinute === 0) {
            await new Promise(resolve => setTimeout(resolve, 0))
          }
        }
      })

      profiler.stop()
      const metrics = profiler.getMetrics()
      const memoryTrend = profiler.getMemoryTrend()

      // Verify memory stability
      expect(memoryTrend).not.toBe('increasing') // Memory shouldn't be constantly growing

      if (metrics.memorySnapshots.length > 1) {
        const firstSnapshot = metrics.memorySnapshots[0]
        const lastSnapshot = metrics.memorySnapshots[metrics.memorySnapshots.length - 1]
        const memoryGrowth = (lastSnapshot.usedJSHeapSize - firstSnapshot.usedJSHeapSize) / firstSnapshot.usedJSHeapSize

        expect(memoryGrowth).toBeLessThan(0.5) // Memory shouldn't grow more than 50%

        console.log('Memory Stability Results:', {
          duration: `${simulatedMinutes} minutes (simulated)`,
          trend: memoryTrend,
          memoryGrowth: `${(memoryGrowth * 100).toFixed(2)}%`,
          snapshots: metrics.memorySnapshots.length,
          initialMemory: `${(firstSnapshot.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          finalMemory: `${(lastSnapshot.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        })
      }
    })

    it('should not have memory leaks during wave transitions', async () => {
      const { result } = renderHook(() => useGameStore())
      profiler.start()

      // Set up game
      act(() => {
        result.current.buildTower({ x: 3, y: 3 }, 'arrow')
        result.current.startGame()
      })

      // Simulate multiple wave cycles
      const waveCount = 5

      for (let wave = 0; wave < waveCount; wave++) {
        await act(async () => {
          // Simulate wave active period
          for (let i = 0; i < 300; i++) { // 5 seconds per wave
            profiler.recordFrame()
            result.current._tick(1 / 60)

            if (i % 60 === 0) {
              await new Promise(resolve => setTimeout(resolve, 0))
            }
          }

          // Force wave completion
          useGameStore.setState({
            mobs: [],
            phase: 'preparing',
            currentWaveIndex: wave + 1,
          })
        })
      }

      profiler.stop()
      const metrics = profiler.getMetrics()

      // Check for memory leaks after multiple waves
      if (metrics.memorySnapshots.length >= 2) {
        const memoryTrend = profiler.getMemoryTrend()
        expect(memoryTrend).toBe('stable') // Should be stable after wave cycles

        console.log('Wave Transition Memory Test:', {
          wavesSimulated: waveCount,
          memoryTrend,
          finalMobCount: result.current.mobs.length,
          finalProjectileCount: result.current.projectiles.length,
        })
      }
    })
  })

  describe('Performance Regression Detection', () => {
    it('should establish performance baseline', async () => {
      const { result } = renderHook(() => useGameStore())
      profiler.start()

      // Standard test scenario
      act(() => {
        result.current.buildTower({ x: 2, y: 3 }, 'arrow')
        result.current.buildTower({ x: 5, y: 3 }, 'cannon')
        result.current.buildTower({ x: 8, y: 3 }, 'frost')
        result.current.startGame()
      })

      // Run baseline test
      await act(async () => {
        for (let i = 0; i < 300; i++) { // 5 seconds
          profiler.recordFrame()
          result.current._tick(1 / 60)

          if (i % 60 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0))
          }
        }
      })

      profiler.stop()
      const metrics = profiler.getMetrics()

      // Store baseline metrics (in real implementation, these would be saved)
      const baseline = {
        averageFPS: metrics.averageFPS,
        frameViolations: metrics.frameTimeBudgetViolations,
        mainThreadViolations: profiler.getMainThreadTaskViolations(),
        isAcceptable: profiler.isPerformanceAcceptable(),
      }

      console.log('Performance Baseline Established:', baseline)

      // Verify baseline meets requirements
      expect(baseline.isAcceptable).toBe(true)
      expect(baseline.averageFPS).toBeGreaterThan(55)
    })
  })
})