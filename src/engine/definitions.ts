import type { TowerDefinition, MobDefinition, Wave, GameConfig } from './types';

// ===== GAME CONFIGURATION =====

export const GAME_CONFIG: GameConfig = {
  mapWidth: 16,
  mapHeight: 12,
  tileSize: 40,
  tickRate: 60, // 60 FPS simulation
  startingMoney: 100,
  startingLives: 20,
};

// ===== TOWER DEFINITIONS =====

export const TOWER_DEFINITIONS: Record<string, TowerDefinition> = {
  arrow: {
    type: 'arrow',
    name: 'Arrow Tower',
    description: 'Fast single-target tower with good range',
    baseCost: 25,
    range: 3.5, // tiles
    damage: 15,
    attackRate: 2.5, // attacks per second
    projectileSpeed: 8, // tiles per second
    upgrades: [
      {
        tier: 2,
        cost: 30,
        damageMultiplier: 1.6, // 15 → 24 damage
        attackRateMultiplier: 1.3, // 2.5 → 3.25 attacks/sec
        rangeMultiplier: 1.2, // 3.5 → 4.2 range
      },
      {
        tier: 3,
        cost: 60,
        damageMultiplier: 2.2, // 24 → 33 damage  
        attackRateMultiplier: 1.4, // 3.25 → 4.55 attacks/sec
        rangeMultiplier: 1.3, // 4.2 → 5.46 range
      },
    ],
  },

  cannon: {
    type: 'cannon',
    name: 'Cannon Tower',
    description: 'Slow but powerful AoE tower',
    baseCost: 50,
    range: 2.5, // tiles
    damage: 45,
    attackRate: 0.8, // attacks per second (slow)
    projectileSpeed: 6, // tiles per second
    splashRadius: 1.5, // tiles
    upgrades: [
      {
        tier: 2,
        cost: 75,
        damageMultiplier: 1.5, // 45 → 68 damage
        attackRateMultiplier: 1.2, // 0.8 → 0.96 attacks/sec
        rangeMultiplier: 1.2, // 2.5 → 3.0 range
      },
      {
        tier: 3,
        cost: 120,
        damageMultiplier: 2.0, // 68 → 90 damage
        attackRateMultiplier: 1.3, // 0.96 → 1.25 attacks/sec
        rangeMultiplier: 1.3, // 3.0 → 3.9 range
      },
    ],
  },

  frost: {
    type: 'frost',
    name: 'Frost Tower',
    description: 'Slows enemies and deals moderate damage',
    baseCost: 40,
    range: 3.0, // tiles
    damage: 20,
    attackRate: 1.5, // attacks per second
    projectileSpeed: 10, // tiles per second (fast projectiles)
    slowDuration: 3, // seconds
    slowAmount: 0.5, // 50% speed reduction
    upgrades: [
      {
        tier: 2,
        cost: 50,
        damageMultiplier: 1.4, // 20 → 28 damage
        attackRateMultiplier: 1.3, // 1.5 → 1.95 attacks/sec
        rangeMultiplier: 1.15, // 3.0 → 3.45 range
      },
      {
        tier: 3,
        cost: 80,
        damageMultiplier: 1.8, // 28 → 36 damage
        attackRateMultiplier: 1.4, // 1.95 → 2.73 attacks/sec
        rangeMultiplier: 1.25, // 3.45 → 4.31 range
      },
    ],
  },
};

// ===== MOB DEFINITIONS =====

export const MOB_DEFINITIONS: Record<string, MobDefinition> = {
  normal: {
    type: 'normal',
    name: 'Goblin',
    baseHp: 40,
    baseSpeed: 1.5, // tiles per second
    armor: 0,
    bounty: 5,
    hpMultiplier: 1.2, // +20% HP per wave (more aggressive scaling)
  },

  fast: {
    type: 'fast',
    name: 'Wolf',
    baseHp: 25,
    baseSpeed: 2.8, // tiles per second (fast!)
    armor: 0,
    bounty: 8,
    hpMultiplier: 1.15, // +15% HP per wave
    speedMultiplier: 1.03, // +3% speed per wave
  },

  tank: {
    type: 'tank',
    name: 'Orc Warrior',
    baseHp: 150, // Increased from 120
    baseSpeed: 0.8, // tiles per second (slow)
    armor: 8, // Increased from 5
    bounty: 20, // Increased bounty
    hpMultiplier: 1.25, // +25% HP per wave (tanks get much stronger)
  },

  flying: {
    type: 'flying',
    name: 'Bat',
    baseHp: 35, // Slightly increased
    baseSpeed: 2.5, // tiles per second
    armor: 0,
    bounty: 15, // Good bounty for flying enemies
    hpMultiplier: 1.18, // +18% HP per wave
    speedMultiplier: 1.04, // +4% speed per wave
  },
};

// ===== WAVE DEFINITIONS =====

export const WAVE_DEFINITIONS: Wave[] = [
  // Wave 1: Tutorial - Just normal enemies
  {
    id: 1,
    isActive: false,
    isCompleted: false,
    entries: [
      { delay: 0, mobType: 'normal', count: 8, spacing: 1.0 },
    ],
  },

  // Wave 2: More enemies
  {
    id: 2,
    isActive: false,
    isCompleted: false,
    entries: [
      { delay: 0, mobType: 'normal', count: 12, spacing: 0.8 },
    ],
  },

  // Wave 3: Introduce fast enemies
  {
    id: 3,
    isActive: false,
    isCompleted: false,
    entries: [
      { delay: 0, mobType: 'normal', count: 8, spacing: 1.0 },
      { delay: 5, mobType: 'fast', count: 4, spacing: 0.5 },
    ],
  },

  // Wave 4: Mixed wave
  {
    id: 4,
    isActive: false,
    isCompleted: false,
    entries: [
      { delay: 0, mobType: 'fast', count: 6, spacing: 0.6 },
      { delay: 3, mobType: 'normal', count: 10, spacing: 0.7 },
    ],
  },

  // Wave 5: First tank
  {
    id: 5,
    isActive: false,
    isCompleted: false,
    entries: [
      { delay: 0, mobType: 'normal', count: 6, spacing: 1.0 },
      { delay: 4, mobType: 'tank', count: 2, spacing: 2.0 },
      { delay: 8, mobType: 'fast', count: 5, spacing: 0.4 },
    ],
  },

  // Wave 6: Flying enemies introduced
  {
    id: 6,
    isActive: false,
    isCompleted: false,
    entries: [
      { delay: 0, mobType: 'flying', count: 4, spacing: 1.0 },
      { delay: 3, mobType: 'normal', count: 8, spacing: 0.8 },
    ],
  },

  // Wave 7: Challenging mix
  {
    id: 7,
    isActive: false,
    isCompleted: false,
    entries: [
      { delay: 0, mobType: 'fast', count: 8, spacing: 0.5 },
      { delay: 2, mobType: 'tank', count: 3, spacing: 1.5 },
      { delay: 6, mobType: 'flying', count: 6, spacing: 0.8 },
    ],
  },

  // Wave 8: Heavy armor wave
  {
    id: 8,
    isActive: false,
    isCompleted: false,
    entries: [
      { delay: 0, mobType: 'tank', count: 5, spacing: 1.2 },
      { delay: 4, mobType: 'normal', count: 12, spacing: 0.6 },
    ],
  },

  // Wave 9: Speed rush
  {
    id: 9,
    isActive: false,
    isCompleted: false,
    entries: [
      { delay: 0, mobType: 'fast', count: 15, spacing: 0.4 },
      { delay: 2, mobType: 'flying', count: 8, spacing: 0.6 },
    ],
  },

  // Wave 10: Boss wave - lots of everything!
  {
    id: 10,
    isActive: false,
    isCompleted: false,
    entries: [
      { delay: 0, mobType: 'tank', count: 6, spacing: 1.0 },
      { delay: 2, mobType: 'fast', count: 10, spacing: 0.5 },
      { delay: 5, mobType: 'flying', count: 8, spacing: 0.7 },
      { delay: 8, mobType: 'normal', count: 15, spacing: 0.5 },
      { delay: 12, mobType: 'tank', count: 4, spacing: 0.8 }, // Final boss tanks
    ],
  },
];

// ===== HELPER FUNCTIONS =====

/**
 * Calculate tower stats for a specific tier
 */
export function calculateTowerStats(towerType: string, tier: 1 | 2 | 3) {
  const definition = TOWER_DEFINITIONS[towerType];
  if (!definition) throw new Error(`Unknown tower type: ${towerType}`);

  let stats = {
    damage: definition.damage,
    range: definition.range,
    attackRate: definition.attackRate,
    cost: definition.baseCost,
  };

  // Apply upgrades up to the specified tier
  for (let t = 2; t <= tier; t++) {
    const upgrade = definition.upgrades.find(u => u.tier === t);
    if (upgrade) {
      stats.damage *= upgrade.damageMultiplier;
      stats.range *= upgrade.rangeMultiplier || 1;
      stats.attackRate *= upgrade.attackRateMultiplier || 1;
      stats.cost += upgrade.cost;
    }
  }

  return {
    ...stats,
    dps: stats.damage * stats.attackRate, // Damage per second
  };
}

/**
 * Calculate mob stats for a specific wave
 */
export function calculateMobStats(mobType: string, waveNumber: number) {
  const definition = MOB_DEFINITIONS[mobType];
  if (!definition) throw new Error(`Unknown mob type: ${mobType}`);

  // Scale stats based on wave number (wave 1 = base stats)
  const waveMultiplier = waveNumber - 1; // Wave 1 = 0 multiplier, Wave 2 = 1 multiplier, etc.
  
  const hp = Math.floor(definition.baseHp * Math.pow(definition.hpMultiplier, waveMultiplier));
  const speed = definition.baseSpeed * Math.pow(definition.speedMultiplier || 1, waveMultiplier);

  return {
    hp,
    maxHp: hp,
    speed,
    armor: definition.armor,
    bounty: definition.bounty,
    type: definition.type,
    name: definition.name,
  };
}

/**
 * Calculate total cost to upgrade a tower to a specific tier
 */
export function calculateUpgradeCost(towerType: string, fromTier: 1 | 2, toTier: 2 | 3): number {
  const definition = TOWER_DEFINITIONS[towerType];
  if (!definition) return 0;

  if (fromTier >= toTier) return 0;

  const upgrade = definition.upgrades.find(u => u.tier === toTier);
  return upgrade?.cost || 0;
}

/**
 * Calculate sell value for a tower (usually 70% of total investment)
 */
export function calculateSellValue(towerType: string, tier: 1 | 2 | 3): number {
  const stats = calculateTowerStats(towerType, tier);
  return Math.floor(stats.cost * 0.7); // 70% return on investment
}

/**
 * Get preview of upgrade stats
 */
export function getUpgradePreview(towerType: string, currentTier: 1 | 2, money: number) {
  const nextTier = (currentTier + 1) as 2 | 3;
  if (nextTier > 3) return null;

  const currentStats = calculateTowerStats(towerType, currentTier);
  const upgradeStats = calculateTowerStats(towerType, nextTier);
  const upgradeCost = calculateUpgradeCost(towerType, currentTier, nextTier);

  return {
    currentStats: {
      damage: currentStats.damage,
      range: currentStats.range,
      attackRate: currentStats.attackRate,
      dps: currentStats.dps,
    },
    upgradeStats: {
      damage: upgradeStats.damage,
      range: upgradeStats.range,
      attackRate: upgradeStats.attackRate,
      dps: upgradeStats.dps,
    },
    cost: upgradeCost,
    canAfford: money >= upgradeCost,
  };
}

/**
 * Calculate damage after armor reduction
 */
export function calculateDamage(baseDamage: number, armor: number): number {
  // Simple armor formula: damage reduced by armor, minimum 1 damage
  return Math.max(1, baseDamage - armor);
}

/**
 * Check if a mob type is affected by slows (flying mobs might be immune in advanced versions)
 */
export function canBeSlowed(): boolean {
  // For now, all mobs can be slowed
  // Later we could make flying mobs immune to ground-based slows
  return true;
}

// ===== BALANCING NOTES =====

/*
TOWER BALANCE PHILOSOPHY:

Arrow Tower:
- Cheap, reliable single-target DPS
- Good range, fast projectiles
- Best against fast, low-HP enemies
- Tier 3 DPS: 33 * 4.55 = 150 DPS

Cannon Tower:
- Expensive but high AoE damage  
- Slower attack rate, shorter range
- Best against groups of enemies
- Tier 3 DPS: 90 * 1.25 = 112 DPS (but AoE!)

Frost Tower:
- Utility tower with decent damage
- Provides crowd control via slows
- Best as support for other towers
- Tier 3 DPS: 36 * 2.73 = 98 DPS + slow utility

MOB SCALING:
- Each wave increases mob HP significantly
- Fast mobs also get speed increases
- By wave 10, enemies are much stronger
- Encourages tower upgrades and strategic placement

ECONOMIC BALANCE:
- Wave 1 gives ~40 gold (8 * 5)
- Early towers cost 25-50 gold
- Upgrades become necessary by wave 5+
- Selling gives 70% return for repositioning
*/