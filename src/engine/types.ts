// Core geometric types
export type Vec2 = {
  x: number;
  y: number;
};

// Grid coordinate (discrete positions)
export type GridCoord = {
  x: number;
  y: number;
};

// Tile types for the map
export type TileType = 'path' | 'buildable' | 'blocked';

export type Tile = {
  coord: GridCoord;
  type: TileType;
  pathIndex?: number; // For path tiles, indicates order in the path
};

// Mob (enemy) types and properties
export type MobType = 'normal' | 'fast' | 'tank' | 'flying';

export type MobStatus = {
  slowUntil?: number; // simulation time when slow effect expires
  slowMultiplier?: number; // speed reduction multiplier (0.5 = 50% speed)
};

export type Mob = {
  id: string;
  pos: Vec2; // World position (can be fractional)
  hp: number;
  maxHp: number;
  speed: number; // tiles per second
  armor: number; // flat damage reduction
  type: MobType;
  bounty: number; // money awarded when killed
  pathProgress: number; // 0-1, how far along the path
  status: MobStatus;
  reachedEnd: boolean; // true if mob reached the base
};

// Tower types and properties
export type TowerType = 'arrow' | 'cannon' | 'frost';

export type Tower = {
  id: string;
  gridCoord: GridCoord; // Grid position where tower is built
  pos: Vec2; // World position (center of the tile)
  type: TowerType;
  tier: 1 | 2 | 3; // Upgrade level
  
  // Combat stats
  range: number; // tiles
  damage: number;
  attackRate: number; // attacks per second
  projectileSpeed?: number; // tiles per second (undefined for instant hit)
  
  // Timing
  lastAttackTime: number; // simulation time of last attack
  
  // Special effects (for different tower types)
  splashRadius?: number; // for cannon towers
  slowDuration?: number; // for frost towers (seconds)
  slowAmount?: number; // for frost towers (multiplier, e.g., 0.6 = 40% slow)
};

// Projectile system
export type ProjectileType = 'arrow' | 'cannonball' | 'frost';

export type Projectile = {
  id: string;
  pos: Vec2;
  targetPos: Vec2; // Where it's heading
  targetMobId?: string; // Which mob it's tracking (can be undefined for AoE)
  speed: number; // tiles per second
  damage: number;
  type: ProjectileType;
  
  // Special properties
  splashRadius?: number; // for AoE projectiles
  slowDuration?: number; // for frost projectiles
  slowAmount?: number; // for frost projectiles
  
  // Tracking
  hasHit: boolean;
};

// Wave configuration
export type WaveEntry = {
  delay: number; // seconds after wave start
  mobType: MobType;
  count: number;
  spacing: number; // seconds between each mob spawn
};

export type Wave = {
  id: number;
  entries: WaveEntry[];
  isActive: boolean;
  isCompleted: boolean;
  startTime?: number; // simulation time when wave started
};

// Targeting strategies for towers
export type TargetingStrategy = 
  | 'first' // First mob in path
  | 'last' // Last mob in path
  | 'nearest' // Closest mob to tower
  | 'strongest' // Mob with most HP
  | 'weakest'; // Mob with least HP

// Game state and configuration
export type GameConfig = {
  mapWidth: number; // tiles
  mapHeight: number; // tiles
  tileSize: number; // pixels per tile
  tickRate: number; // ticks per second (e.g., 60)
  startingMoney: number;
  startingLives: number;
};

export type GamePhase = 'preparing' | 'wave-active' | 'between-waves' | 'victory' | 'defeat';

// Main game state
export type GameState = {
  // Meta state
  phase: GamePhase;
  currentWaveIndex: number;
  simulationTime: number; // total elapsed time in seconds
  isPaused: boolean;
  gameSpeed: number; // 1x, 2x speed multiplier
  
  // Player resources
  money: number;
  lives: number;
  
  // Game entities
  mobs: Mob[];
  towers: Tower[];
  projectiles: Projectile[];
  
  // Map data
  map: Tile[][];
  pathCoords: GridCoord[]; // Ordered list of path coordinates
  
  // Wave management
  waves: Wave[];
  nextWaveTime?: number; // when next wave will start
  
  // UI state (these will be overridden in the store)
  hoveredGridCoord?: GridCoord; // For build preview
};

// Tower definitions and costs
export type TowerDefinition = {
  type: TowerType;
  name: string;
  description: string;
  baseCost: number;
  range: number;
  damage: number;
  attackRate: number;
  projectileSpeed?: number;
  
  // Special properties
  splashRadius?: number;
  slowDuration?: number;
  slowAmount?: number;
  
  // Upgrade costs and multipliers for each tier
  upgrades: {
    tier: 2 | 3;
    cost: number;
    damageMultiplier: number;
    rangeMultiplier?: number;
    attackRateMultiplier?: number;
  }[];
};

// Mob definitions
export type MobDefinition = {
  type: MobType;
  name: string;
  baseHp: number;
  baseSpeed: number;
  armor: number;
  bounty: number;
  // Scaling per wave
  hpMultiplier: number; // HP increases by this much per wave
  speedMultiplier?: number; // Speed increases (optional)
};

// Events system for game feedback
export type GameEvent = 
  | { type: 'mob-killed'; mobId: string; bounty: number }
  | { type: 'mob-reached-end'; mobId: string; livesLost: number }
  | { type: 'tower-built'; towerId: string; cost: number }
  | { type: 'tower-upgraded'; towerId: string; newTier: number; cost: number }
  | { type: 'tower-sold'; towerId: string; refund: number }
  | { type: 'wave-started'; waveId: number }
  | { type: 'wave-completed'; waveId: number }
  | { type: 'game-over'; victory: boolean };

// Action types for game state updates
export type GameAction = 
  | { type: 'tick'; deltaTime: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'set-speed'; speed: number }
  | { type: 'select-tower-type'; towerType: TowerType | undefined }
  | { type: 'build-tower'; gridCoord: GridCoord; towerType: TowerType }
  | { type: 'upgrade-tower'; towerId: string }
  | { type: 'sell-tower'; towerId: string }
  | { type: 'select-tower'; towerId: string | undefined }
  | { type: 'start-next-wave' }
  | { type: 'set-hover-coord'; coord: GridCoord | undefined }
  | { type: 'restart-game' };

// Utility types for calculations
export type DamageCalculation = {
  baseDamage: number;
  finalDamage: number; // after armor reduction
  isKill: boolean;
};

export type UpgradePreview = {
  currentStats: {
    damage: number;
    range: number;
    attackRate: number;
    dps: number;
  };
  upgradeStats: {
    damage: number;
    range: number;
    attackRate: number;
    dps: number;
  };
  cost: number;
  canAfford: boolean;
};