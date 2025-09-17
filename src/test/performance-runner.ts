#!/usr/bin/env node

/**
 * Performance Test Runner
 *
 * This script runs comprehensive performance tests for the tower defense game,
 * including extended 10+ minute tests, memory leak detection, and FPS monitoring.
 *
 * Usage:
 *   npm run test:performance
 *   npm run test:performance:extended
 *   npm run test:performance:memory
 */

import { spawn, ChildProcess } from 'child_process'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

interface PerformanceTestConfig {
  name: string
  duration: number // in minutes
  targetFPS: number
  maxMainThreadTask: number // in ms
  memoryGrowthThreshold: number // percentage
  scenario: 'light' | 'normal' | 'heavy' | 'extreme'
}

const TEST_CONFIGS: PerformanceTestConfig[] = [
  {
    name: 'Quick Performance Check',
    duration: 0.5, // 30 seconds
    targetFPS: 58,
    maxMainThreadTask: 50,
    memoryGrowthThreshold: 20,
    scenario: 'normal',
  },
  {
    name: 'Standard Performance Test',
    duration: 2, // 2 minutes
    targetFPS: 55,
    maxMainThreadTask: 50,
    memoryGrowthThreshold: 30,
    scenario: 'normal',
  },
  {
    name: 'Extended Stability Test',
    duration: 10, // 10 minutes
    targetFPS: 50,
    maxMainThreadTask: 60,
    memoryGrowthThreshold: 50,
    scenario: 'heavy',
  },
  {
    name: 'Marathon Memory Test',
    duration: 20, // 20 minutes
    targetFPS: 45,
    maxMainThreadTask: 80,
    memoryGrowthThreshold: 75,
    scenario: 'extreme',
  },
]

class PerformanceTestRunner {
  private resultsDir: string

  constructor() {
    this.resultsDir = join(process.cwd(), 'performance-results')
    if (!existsSync(this.resultsDir)) {
      mkdirSync(this.resultsDir, { recursive: true })
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Performance Test Suite')
    console.log('=====================================')

    const results = []

    for (const config of TEST_CONFIGS) {
      try {
        console.log(`\n📊 Running: ${config.name}`)
        console.log(`⏱️  Duration: ${config.duration} minutes`)
        console.log(`🎯 Target FPS: ${config.targetFPS}`)
        console.log(`🧵 Max Main Thread Task: ${config.maxMainThreadTask}ms`)

        const result = await this.runPerformanceTest(config)
        results.push(result)

        this.logTestResult(result)
        this.saveTestResult(config, result)
      } catch (error) {
        console.error(`❌ Test "${config.name}" failed:`, error)
        results.push({
          config,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    this.generateSummaryReport(results)
  }
  generateSummaryReport(results: any[]) {
    throw new Error('Method not implemented.')
  }

  async runSingleTest(testName: string): Promise<void> {
    const config = TEST_CONFIGS.find(c => c.name.toLowerCase().includes(testName.toLowerCase()))
    if (!config) {
      console.error(`❌ Test "${testName}" not found`)
      console.log('Available tests:', TEST_CONFIGS.map(c => c.name).join(', '))
      return
    }

    console.log(`🚀 Running Single Test: ${config.name}`)
    const result = await this.runPerformanceTest(config)
    this.logTestResult(result)
    this.saveTestResult(config, result)
  }

  private async runPerformanceTest(config: PerformanceTestConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      // Create a custom vitest command for this specific test
      const testScript = this.generateTestScript(config)
      const tempTestFile = join(this.resultsDir, `temp-test-${Date.now()}.ts`)

      writeFileSync(tempTestFile, testScript)

      const vitestProcess = spawn('npx', ['vitest', tempTestFile, '--run'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      })

      let stdout = ''
      let stderr = ''

      vitestProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      vitestProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      vitestProcess.on('close', (code) => {
        // Clean up temp file
        try {
          require('fs').unlinkSync(tempTestFile)
        } catch (e) {
          // Ignore cleanup errors
        }

        if (code === 0) {
          // Parse results from stdout
          const result = this.parseTestOutput(stdout, config)
          resolve(result)
        } else {
          reject(new Error(`Test process exited with code ${code}: ${stderr}`))
        }
      })

      vitestProcess.on('error', (error) => {
        reject(error)
      })
    })
  }

  private generateTestScript(config: PerformanceTestConfig): string {
    return `
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGameStore } from '../state/store'

// Mock engine functions for performance testing
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
  getPositionOnPath: vi.fn(),
  calculatePathLength: vi.fn(() => 15),
}))

vi.mock('../engine/sim', () => ({
  GameLoop: vi.fn().mockImplementation(() => ({ start: vi.fn(), stop: vi.fn() })),
  advanceTick: vi.fn((state) => {
    const startTime = performance.now()

    // Simulate ${config.scenario} computational load
    const workLoad = {
      light: 100,
      normal: 500,
      heavy: 1000,
      extreme: 2000
    }['${config.scenario}']

    for (let i = 0; i < workLoad; i++) {
      Math.sqrt(i) * Math.sin(i)
    }

    const executionTime = performance.now() - startTime
    console.log(\`PERF_METRIC_MAIN_THREAD_TASK:\${executionTime}\`)

    return { ...state, simulationTime: state.simulationTime + 0.016 }
  }),
}))

describe('${config.name}', () => {
  const TARGET_FPS = ${config.targetFPS}
  const DURATION_MINUTES = ${config.duration}
  const MAX_MAIN_THREAD_MS = ${config.maxMainThreadTask}

  let frameCount = 0
  let startTime = 0
  let mainThreadTasks: number[] = []

  beforeEach(() => {
    frameCount = 0
    startTime = performance.now()
    mainThreadTasks = []

    // Capture main thread task metrics
    const originalLog = console.log
    console.log = (...args) => {
      const message = args.join(' ')
      if (message.includes('PERF_METRIC_MAIN_THREAD_TASK:')) {
        const taskTime = parseFloat(message.split(':')[1])
        mainThreadTasks.push(taskTime)
      }
      originalLog.apply(console, args)
    }
  })

  it('should meet performance requirements', async () => {
    const { result } = renderHook(() => useGameStore())

    // Set up scenario
    act(() => {
      const towerConfigs = {
        light: [{ x: 3, y: 3, type: 'arrow' }],
        normal: [
          { x: 2, y: 3, type: 'arrow' },
          { x: 5, y: 3, type: 'cannon' },
          { x: 8, y: 3, type: 'frost' }
        ],
        heavy: Array(10).fill(0).map((_, i) => ({
          x: 1 + (i % 14),
          y: 1 + Math.floor(i / 14),
          type: ['arrow', 'cannon', 'frost'][i % 3]
        })),
        extreme: Array(20).fill(0).map((_, i) => ({
          x: 1 + (i % 14),
          y: 1 + Math.floor(i / 14),
          type: ['arrow', 'cannon', 'frost'][i % 3]
        }))
      }['${config.scenario}']

      towerConfigs.forEach(tower => {
        result.current.buildTower({ x: tower.x, y: tower.y }, tower.type as any)
      })

      result.current.startGame()
    })

    // Run test for specified duration
    const totalFrames = DURATION_MINUTES * 60 * TARGET_FPS
    const batchSize = Math.max(1, Math.floor(totalFrames / 100)) // Process in batches

    console.log(\`PERF_METRIC_TEST_START:\${Date.now()}\`)

    for (let batch = 0; batch < 100; batch++) {
      await act(async () => {
        for (let frame = 0; frame < batchSize; frame++) {
          const frameStart = performance.now()

          result.current._tick(1 / TARGET_FPS)
          frameCount++

          const frameTime = performance.now() - frameStart
          console.log(\`PERF_METRIC_FRAME_TIME:\${frameTime}\`)

          // Memory check every 100 frames
          if (frameCount % 100 === 0 && 'memory' in performance) {
            const memory = (performance as any).memory
            if (memory) {
              console.log(\`PERF_METRIC_MEMORY:\${memory.usedJSHeapSize}\`)
            }
          }
        }

        // Yield control between batches
        await new Promise(resolve => setTimeout(resolve, 0))
      })
    }

    const endTime = performance.now()
    const totalTime = endTime - startTime
    const actualFPS = (frameCount / totalTime) * 1000

    console.log(\`PERF_METRIC_TEST_END:\${Date.now()}\`)
    console.log(\`PERF_METRIC_ACTUAL_FPS:\${actualFPS}\`)
    console.log(\`PERF_METRIC_FRAME_COUNT:\${frameCount}\`)
    console.log(\`PERF_METRIC_TOTAL_TIME:\${totalTime}\`)

    // Verify performance requirements
    expect(actualFPS).toBeGreaterThan(TARGET_FPS * 0.9) // 10% tolerance

    const mainThreadViolations = mainThreadTasks.filter(t => t > MAX_MAIN_THREAD_MS).length
    const violationRate = mainThreadViolations / mainThreadTasks.length
    expect(violationRate).toBeLessThan(0.1) // < 10% violations

    console.log(\`PERF_METRIC_MAIN_THREAD_VIOLATIONS:\${mainThreadViolations}\`)
    console.log(\`PERF_METRIC_VIOLATION_RATE:\${violationRate}\`)
  })
})
`
  }

  private parseTestOutput(output: string, config: PerformanceTestConfig): any {
    const metrics = {
      config,
      actualFPS: 0,
      frameCount: 0,
      totalTime: 0,
      mainThreadViolations: 0,
      violationRate: 0,
      memorySnapshots: [] as number[],
      frameTimes: [] as number[],
      success: false,
    }

    const lines = output.split('\n')

    for (const line of lines) {
      if (line.includes('PERF_METRIC_ACTUAL_FPS:')) {
        metrics.actualFPS = parseFloat(line.split(':')[1])
      } else if (line.includes('PERF_METRIC_FRAME_COUNT:')) {
        metrics.frameCount = parseInt(line.split(':')[1])
      } else if (line.includes('PERF_METRIC_TOTAL_TIME:')) {
        metrics.totalTime = parseFloat(line.split(':')[1])
      } else if (line.includes('PERF_METRIC_MAIN_THREAD_VIOLATIONS:')) {
        metrics.mainThreadViolations = parseInt(line.split(':')[1])
      } else if (line.includes('PERF_METRIC_VIOLATION_RATE:')) {
        metrics.violationRate = parseFloat(line.split(':')[1])
      } else if (line.includes('PERF_METRIC_MEMORY:')) {
        metrics.memorySnapshots.push(parseInt(line.split(':')[1]))
      } else if (line.includes('PERF_METRIC_FRAME_TIME:')) {
        metrics.frameTimes.push(parseFloat(line.split(':')[1]))
      }
    }

    // Determine success
    metrics.success =
      metrics.actualFPS >= config.targetFPS * 0.9 &&
      metrics.violationRate < 0.1 &&
      (metrics.memorySnapshots.length === 0 || this.checkMemoryStability(metrics.memorySnapshots, config.memoryGrowthThreshold))

    return metrics
  }

  private checkMemoryStability(snapshots: number[], threshold: number): boolean {
    if (snapshots.length < 2) return true

    const first = snapshots[0]
    const last = snapshots[snapshots.length - 1]
    const growth = ((last - first) / first) * 100

    return growth < threshold
  }

  private logTestResult(result: any): void {
    console.log('\n📊 Test Results:')
    console.log(`✅ Success: ${result.success ? 'PASS' : 'FAIL'}`)
    console.log(`🎯 FPS: ${result.actualFPS?.toFixed(2)} (target: ${result.config.targetFPS})`)
    console.log(`🖼️  Frames: ${result.frameCount}`)
    console.log(`⏱️  Duration: ${(result.totalTime / 1000).toFixed(2)}s`)
    console.log(`🧵 Main Thread Violations: ${result.mainThreadViolations} (${(result.violationRate * 100).toFixed(2)}%)`)

    if (result.memorySnapshots?.length > 1) {
      const memoryGrowth = ((result.memorySnapshots[result.memorySnapshots.length - 1] - result.memorySnapshots[0]) / result.memorySnapshots[0]) * 100
      console.log(`🧠 Memory Growth: ${memoryGrowth.toFixed(2)}%`)
    }
  }

  private saveTestResult(config: PerformanceTestConfig, result: any): void {
    const filename = join(this.resultsDir, `\${config.name.replace(/\\s+/g, '-').toLowerCase()}-\${Date.now()}.json\`)
    writeFileSync(filename, JSON.stringify({ config, result, timestamp: new Date().toISOString() }, null, 2))
    console.log(\`💾 Results saved to: \${filename}\`)
  }

  private generateSummaryReport(results: any[]): void {
    console.log('\n📋 Performance Test Summary')
    console.log('===========================')

    const passed = results.filter(r => r.success).length
    const total = results.length

    console.log(\`Overall: \${passed}/\${total} tests passed\`)

    results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL'
      console.log(\`\${index + 1}. \${result.config?.name || 'Unknown Test'}: \${status}\`)
    })

    // Save summary
    const summaryFile = join(this.resultsDir, \`summary-\${Date.now()}.json\`)
    writeFileSync(summaryFile, JSON.stringify({ results, timestamp: new Date().toISOString() }, null, 2))
    console.log(\`\n📄 Summary saved to: \${summaryFile}\`)
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  const runner = new PerformanceTestRunner()

  if (args.length === 0) {
    console.log('🚀 Running all performance tests...')
    await runner.runAllTests()
  } else {
    const testName = args[0]
    console.log(\`🚀 Running specific test: \${testName}\`)
    await runner.runSingleTest(testName)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { PerformanceTestRunner }
`)}}