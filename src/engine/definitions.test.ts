import { describe, it, expect } from 'vitest'
import {
  calculateTowerStats,
  calculateUpgradeCost,
  calculateMobStats,
  TOWER_DEFINITIONS,
  MOB_DEFINITIONS,
  GAME_CONFIG
} from './definitions'

describe('Tower Definitions', () => {
  it('calculates correct stats for tier 1 arrow tower', () => {
    const stats = calculateTowerStats('arrow', 1)

    expect(stats).toEqual({
      damage: 15,
      range: 3.5,
      attackRate: 2.5,
      dps: 37.5,
      cost: 25,
    })
  })

  it('calculates correct stats for tier 2 cannon tower', () => {
    const stats = calculateTowerStats('cannon', 2)

    expect(stats.damage).toBeGreaterThan(TOWER_DEFINITIONS.cannon.damage) // Should be upgraded
    expect(stats.range).toBeGreaterThan(TOWER_DEFINITIONS.cannon.range) // Range increases for tier 2
    expect(stats.cost).toBe(TOWER_DEFINITIONS.cannon.baseCost + 75) // Cost includes upgrade cost
  })

  it('calculates correct stats for tier 3 frost tower', () => {
    const stats = calculateTowerStats('frost', 3)

    expect(stats.damage).toBeGreaterThan(TOWER_DEFINITIONS.frost.damage)
    expect(stats.range).toBeGreaterThan(TOWER_DEFINITIONS.frost.range)
    expect(stats.dps).toBeGreaterThan(0)
  })

  it('calculates upgrade costs correctly', () => {
    const tier2Cost = calculateUpgradeCost('arrow', 1, 2)
    const tier3Cost = calculateUpgradeCost('arrow', 2, 3)

    expect(tier2Cost).toBeGreaterThan(0)
    expect(tier3Cost).toBeGreaterThan(tier2Cost) // Tier 3 should cost more than tier 2
  })

  it('has valid tower definitions', () => {
    Object.entries(TOWER_DEFINITIONS).forEach(([type, definition]) => {
      expect(definition.baseCost).toBeGreaterThan(0)
      expect(definition.damage).toBeGreaterThan(0)
      expect(definition.range).toBeGreaterThan(0)
      expect(definition.attackRate).toBeGreaterThan(0)
      expect(definition.upgrades).toHaveLength(2) // Should have tier 2 and 3 upgrades
    })
  })
})

describe('Mob Definitions', () => {
  it('calculates correct stats for wave 1 normal mob', () => {
    const stats = calculateMobStats('normal', 1)

    expect(stats.hp).toBe(MOB_DEFINITIONS.normal.baseHp)
    expect(stats.speed).toBe(MOB_DEFINITIONS.normal.baseSpeed)
    expect(stats.armor).toBe(MOB_DEFINITIONS.normal.armor)
    expect(stats.bounty).toBe(MOB_DEFINITIONS.normal.bounty)
    expect(stats.type).toBe('normal')
  })

  it('scales mob HP correctly with waves', () => {
    const wave1Stats = calculateMobStats('normal', 1)
    const wave5Stats = calculateMobStats('normal', 5)

    expect(wave5Stats.hp).toBeGreaterThan(wave1Stats.hp)
  })

  it('has valid mob definitions', () => {
    Object.entries(MOB_DEFINITIONS).forEach(([type, definition]) => {
      expect(definition.baseHp).toBeGreaterThan(0)
      expect(definition.baseSpeed).toBeGreaterThan(0)
      expect(definition.armor).toBeGreaterThanOrEqual(0)
      expect(definition.bounty).toBeGreaterThan(0)
      expect(definition.hpMultiplier).toBeGreaterThan(1)
    })
  })

  it('calculates tank mob with correct high HP', () => {
    const tankStats = calculateMobStats('tank', 1)
    const normalStats = calculateMobStats('normal', 1)

    expect(tankStats.hp).toBeGreaterThan(normalStats.hp)
    expect(tankStats.speed).toBeLessThan(normalStats.speed) // Tank should be slower
  })

  it('calculates fast mob with correct high speed', () => {
    const fastStats = calculateMobStats('fast', 1)
    const normalStats = calculateMobStats('normal', 1)

    expect(fastStats.speed).toBeGreaterThan(normalStats.speed)
    expect(fastStats.hp).toBeLessThan(normalStats.hp) // Fast should have less HP
  })
})

describe('Game Configuration', () => {
  it('has valid game config values', () => {
    expect(GAME_CONFIG.mapWidth).toBeGreaterThan(0)
    expect(GAME_CONFIG.mapHeight).toBeGreaterThan(0)
    expect(GAME_CONFIG.tileSize).toBeGreaterThan(0)
    expect(GAME_CONFIG.tickRate).toBeGreaterThan(0)
    expect(GAME_CONFIG.startingMoney).toBeGreaterThan(0)
    expect(GAME_CONFIG.startingLives).toBeGreaterThan(0)
  })

  it('has reasonable map dimensions', () => {
    expect(GAME_CONFIG.mapWidth).toBeLessThan(50) // Not too large
    expect(GAME_CONFIG.mapHeight).toBeLessThan(50)
    expect(GAME_CONFIG.mapWidth).toBeGreaterThan(5) // Not too small
    expect(GAME_CONFIG.mapHeight).toBeGreaterThan(5)
  })

  it('has enough starting money to buy at least one tower', () => {
    const cheapestTower = Math.min(
      ...Object.values(TOWER_DEFINITIONS).map(def => def.baseCost)
    )

    expect(GAME_CONFIG.startingMoney).toBeGreaterThanOrEqual(cheapestTower)
  })
})