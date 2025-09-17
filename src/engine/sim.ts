import type { GameState, Mob, Tower, Projectile, GameAction } from './types';
import { GAME_CONFIG, MOB_DEFINITIONS, calculateMobStats, TOWER_DEFINITIONS, calculateTowerStats } from './definitions';
import { getPositionOnPath, calculatePathLength, gridToWorld, distance } from './grid';
import { updateMobEffects, getEffectiveSpeed, applyDamage, applySlow } from './effects';
import { findTarget, canTowerAttack, getMobsInSplashRange } from './targeting';

/**
 * Main simulation engine - processes one game tick
 * This is a pure function that takes current state and returns new state
 */
export function advanceTick(state: GameState, deltaTime: number): GameState {
  if (state.isPaused) return state;
  
  // Stop simulation if game is over
  if (state.phase === 'defeat' || state.phase === 'victory') {
    return state;
  }

  let newState = {
    ...state,
    simulationTime: state.simulationTime + deltaTime * state.gameSpeed,
  };

  // Update mobs
  newState = updateMobs(newState, deltaTime * state.gameSpeed);
  
  // Update towers (targeting and shooting)
  newState = updateTowers(newState);
  
  // Update projectiles
  newState = updateProjectiles(newState, deltaTime * state.gameSpeed);
  
  // Handle wave spawning
  newState = updateWaveSpawning(newState);
  
  // Check game over conditions
  newState = updateGamePhase(newState);

  return newState;
}

/**
 * Update towers - targeting and shooting
 */
function updateTowers(state: GameState): GameState {
  const updatedTowers: any[] = [];
  const newProjectiles: Projectile[] = [...state.projectiles];

  // Convert placed towers to full tower objects for targeting
  state.towers.forEach((placedTower: any) => {
    const stats = calculateTowerStats(placedTower.type, placedTower.tier);
    const worldPos = gridToWorld(placedTower.gridCoord, GAME_CONFIG.tileSize);
    
    const tower: Tower = {
      id: placedTower.id,
      gridCoord: placedTower.gridCoord,
      pos: worldPos,
      type: placedTower.type,
      tier: placedTower.tier,
      range: stats.range * GAME_CONFIG.tileSize, // Convert to pixels
      damage: stats.damage,
      attackRate: stats.attackRate,
      projectileSpeed: TOWER_DEFINITIONS[placedTower.type].projectileSpeed,
      lastAttackTime: placedTower.lastAttackTime || 0,
      splashRadius: TOWER_DEFINITIONS[placedTower.type].splashRadius,
      slowDuration: TOWER_DEFINITIONS[placedTower.type].slowDuration,
      slowAmount: TOWER_DEFINITIONS[placedTower.type].slowAmount,
    };

    // Check if tower can attack
    if (canTowerAttack(tower, state.simulationTime)) {
      // Find target
      const target = findTarget(tower, state.mobs, 'first');
      
      if (target) {
        // Create projectile
        const projectile: Projectile = {
          id: `projectile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          pos: { ...tower.pos },
          targetPos: { ...target.pos },
          targetMobId: target.id,
          speed: tower.projectileSpeed || 0, // 0 means instant hit
          damage: tower.damage,
          type: tower.type === 'arrow' ? 'arrow' : tower.type === 'cannon' ? 'cannonball' : 'frost',
          splashRadius: tower.splashRadius,
          slowDuration: tower.slowDuration,
          slowAmount: tower.slowAmount,
          hasHit: false,
        };

        newProjectiles.push(projectile);
        
        // Update tower's last attack time
        const updatedTower = {
          ...placedTower,
          lastAttackTime: state.simulationTime,
        };
        updatedTowers.push(updatedTower);
        
        console.log(`Tower ${tower.id} fired at mob ${target.id}`);
      } else {
        // No target, keep tower unchanged
        updatedTowers.push(placedTower);
      }
    } else {
      // Can't attack yet, keep tower unchanged
      updatedTowers.push(placedTower);
    }
  });

  return {
    ...state,
    towers: updatedTowers,
    projectiles: newProjectiles,
  };
}

/**
 * Update projectiles - movement and collision
 */
function updateProjectiles(state: GameState, deltaTime: number): GameState {
  const activeProjectiles: Projectile[] = [];
  let updatedMobs = [...state.mobs];
  let moneyGained = 0;

  state.projectiles.forEach(projectile => {
    if (projectile.hasHit) return; // Skip projectiles that already hit

    // Instant hit (arrows/frost without travel time)
    if (!projectile.speed || projectile.speed <= 0) {
      const result = handleProjectileHit(projectile, updatedMobs, state.simulationTime);
      updatedMobs = result.mobs;
      moneyGained += result.bountyGained;
      return; // Don't keep instant projectiles
    }

    // Moving projectiles (cannons)
    const distanceToTarget = distance(projectile.pos, projectile.targetPos);
    const moveDistance = projectile.speed * GAME_CONFIG.tileSize * deltaTime;

    if (distanceToTarget <= moveDistance) {
      // Projectile reached target
      const result = handleProjectileHit(projectile, updatedMobs, state.simulationTime);
      updatedMobs = result.mobs;
      moneyGained += result.bountyGained;
    } else {
      // Move projectile toward target
      const direction = {
        x: (projectile.targetPos.x - projectile.pos.x) / distanceToTarget,
        y: (projectile.targetPos.y - projectile.pos.y) / distanceToTarget,
      };

      const updatedProjectile = {
        ...projectile,
        pos: {
          x: projectile.pos.x + direction.x * moveDistance,
          y: projectile.pos.y + direction.y * moveDistance,
        },
      };

      activeProjectiles.push(updatedProjectile);
    }
  });

  return {
    ...state,
    projectiles: activeProjectiles,
    mobs: updatedMobs,
    money: state.money + moneyGained,
  };
}

/**
 * Handle projectile hitting target(s)
 */
function handleProjectileHit(
  projectile: Projectile, 
  mobs: Mob[], 
  currentTime: number
): { mobs: Mob[]; bountyGained: number } {
  let updatedMobs = [...mobs];
  let bountyGained = 0;

  if (projectile.splashRadius && projectile.splashRadius > 0) {
    // Splash damage (cannon)
    const mobsInRange = getMobsInSplashRange(
      projectile.targetPos, 
      projectile.splashRadius * GAME_CONFIG.tileSize, 
      updatedMobs
    );

    mobsInRange.forEach(mob => {
      const result = applyDamage(mob, projectile.damage);
      const mobIndex = updatedMobs.findIndex(m => m.id === mob.id);
      
      if (mobIndex !== -1) {
        if (result.killed) {
          // Remove dead mob and award bounty
          bountyGained += updatedMobs[mobIndex].bounty;
          updatedMobs.splice(mobIndex, 1);
          console.log(`Mob ${mob.id} killed by splash damage! Bounty: ${mob.bounty}`);
        } else {
          // Update mob with reduced HP
          updatedMobs[mobIndex] = result.mob;
        }
      }
    });
  } else {
    // Single target damage
    const targetMob = updatedMobs.find(mob => mob.id === projectile.targetMobId);
    
    if (targetMob) {
      let updatedMob = targetMob;
      
      // Apply slow effect (frost towers)
      if (projectile.slowDuration && projectile.slowAmount) {
        updatedMob = applySlow(updatedMob, projectile.slowAmount, projectile.slowDuration, currentTime);
      }
      
      // Apply damage
      const result = applyDamage(updatedMob, projectile.damage);
      const mobIndex = updatedMobs.findIndex(m => m.id === targetMob.id);
      
      if (mobIndex !== -1) {
        if (result.killed) {
          // Remove dead mob and award bounty
          bountyGained += updatedMobs[mobIndex].bounty;
          updatedMobs.splice(mobIndex, 1);
          console.log(`Mob ${targetMob.id} killed! Bounty: ${targetMob.bounty}`);
        } else {
          // Update mob with reduced HP/effects
          updatedMobs[mobIndex] = result.mob;
        }
      }
    }
  }

  return { mobs: updatedMobs, bountyGained };
}

/**
 * Update all mobs - movement, effects, cleanup
 */
function updateMobs(state: GameState, deltaTime: number): GameState {
  const updatedMobs: Mob[] = [];
  let livesLost = 0;

  for (const mob of state.mobs) {
    // Skip mobs that haven't spawned yet (negative progress)
    if (mob.pathProgress < 0) {
      // Update spawn timer
      const newProgress = mob.pathProgress + deltaTime;
      const updatedMob = {
        ...mob,
        pathProgress: newProgress,
        pos: newProgress >= 0 ? getPositionOnPath(state.pathCoords, 0, GAME_CONFIG.tileSize) : mob.pos,
      };
      updatedMobs.push(updatedMob);
      continue;
    }

    // Update status effects
    const mobWithUpdatedEffects = updateMobEffects(mob, state.simulationTime);
    
    // Calculate movement
    const effectiveSpeed = getEffectiveSpeed(mobWithUpdatedEffects, state.simulationTime);
    const pathLength = calculatePathLength(state.pathCoords, GAME_CONFIG.tileSize);
    const progressDelta = (effectiveSpeed * GAME_CONFIG.tileSize * deltaTime) / pathLength;
    
    const newProgress = Math.min(1, mobWithUpdatedEffects.pathProgress + progressDelta);
    
    let updatedMob = {
      ...mobWithUpdatedEffects,
      pathProgress: newProgress,
      pos: getPositionOnPath(state.pathCoords, newProgress, GAME_CONFIG.tileSize),
    };

    // Check if mob reached the end
    if (updatedMob.pathProgress >= 1 && !updatedMob.reachedEnd) {
      updatedMob.reachedEnd = true;
      livesLost += 1; // Count this mob as reaching the end
      console.log(`Mob ${updatedMob.id} reached the end! Lives lost: ${livesLost}`);
    }

    // Keep alive mobs that haven't reached the end
    if (!updatedMob.reachedEnd && updatedMob.hp > 0) {
      updatedMobs.push(updatedMob);
    }
  }

  // Apply life loss
  const newLives = Math.max(0, state.lives - livesLost);
  
  if (livesLost > 0) {
    console.log(`Total lives lost this tick: ${livesLost}, New lives: ${newLives}`);
  }

  return {
    ...state,
    mobs: updatedMobs,
    lives: newLives,
  };
}

/**
 * Handle wave spawning
 */
function updateWaveSpawning(state: GameState): GameState {
  // Spawn waves every 15 seconds (increased from 10 for better pacing)
  const waveInterval = 15; // seconds
  const shouldSpawnWave = Math.floor(state.simulationTime / waveInterval) > state.currentWaveIndex;
  
  if (shouldSpawnWave && state.currentWaveIndex < 10) { // Now 10 waves total
    return spawnWave(state);
  }

  return state;
}

/**
 * Spawn a wave based on wave number with progressive difficulty
 */
function spawnWave(state: GameState): GameState {
  const waveNumber = state.currentWaveIndex + 1;
  const newMobs: Mob[] = [];

  // Progressive wave design with increasing difficulty
  let mobTypes: Array<{type: keyof typeof MOB_DEFINITIONS, count: number}> = [];
  
  switch (waveNumber) {
    case 1: // Tutorial wave
      mobTypes = [{ type: 'normal', count: 5 }];
      break;
      
    case 2: // More basic enemies
      mobTypes = [{ type: 'normal', count: 8 }];
      break;
      
    case 3: // Introduce fast enemies
      mobTypes = [
        { type: 'normal', count: 6 }, 
        { type: 'fast', count: 4 }
      ];
      break;
      
    case 4: // Fast-heavy wave
      mobTypes = [
        { type: 'fast', count: 8 }, 
        { type: 'normal', count: 4 }
      ];
      break;
      
    case 5: // First tanks appear
      mobTypes = [
        { type: 'normal', count: 8 }, 
        { type: 'tank', count: 3 }
      ];
      break;
      
    case 6: // Introduce flying enemies
      mobTypes = [
        { type: 'normal', count: 6 },
        { type: 'fast', count: 5 },
        { type: 'flying', count: 4 }
      ];
      break;
      
    case 7: // Mixed challenge
      mobTypes = [
        { type: 'fast', count: 10 },
        { type: 'tank', count: 4 },
        { type: 'flying', count: 6 }
      ];
      break;
      
    case 8: // Heavy armor wave
      mobTypes = [
        { type: 'tank', count: 8 },
        { type: 'normal', count: 10 },
        { type: 'flying', count: 3 }
      ];
      break;
      
    case 9: // Speed and air assault
      mobTypes = [
        { type: 'fast', count: 15 },
        { type: 'flying', count: 10 },
        { type: 'tank', count: 5 }
      ];
      break;
      
    case 10: // Epic final boss wave
      mobTypes = [
        { type: 'tank', count: 10 },
        { type: 'fast', count: 15 },
        { type: 'flying', count: 12 },
        { type: 'normal', count: 20 }
      ];
      break;
  }

  // Spawn mobs with progressive timing
  let spawnDelay = 0;
  const baseSpacing = Math.max(0.3, 1.2 - (waveNumber * 0.1)); // Faster spawning in later waves
  
  mobTypes.forEach(({ type, count }) => {
    for (let i = 0; i < count; i++) {
      const mobStats = calculateMobStats(type, waveNumber);
      const mob: Mob = {
        id: `mob-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        pos: getPositionOnPath(state.pathCoords, 0, GAME_CONFIG.tileSize),
        hp: mobStats.hp,
        maxHp: mobStats.maxHp,
        speed: mobStats.speed,
        armor: mobStats.armor,
        type: mobStats.type as any,
        bounty: mobStats.bounty,
        pathProgress: -spawnDelay / 10, // Negative progress = not spawned yet
        status: {},
        reachedEnd: false,
      };
      
      newMobs.push(mob);
      spawnDelay += baseSpacing;
    }
    
    // Add extra delay between mob types in the same wave
    spawnDelay += 1.5;
  });

  console.log(`Wave ${waveNumber} spawned with ${newMobs.length} enemies (${mobTypes.map(m => `${m.count} ${m.type}`).join(', ')})`);

  return {
    ...state,
    mobs: [...state.mobs, ...newMobs],
    currentWaveIndex: waveNumber,
    phase: 'wave-active',
  };
}

/**
 * Update game phase and check win/lose conditions
 */
function updateGamePhase(state: GameState): GameState {
  // Check game over
  if (state.lives <= 0 && state.phase !== 'defeat') {
    console.log("Game Over! Player defeated.");
    return { ...state, phase: 'defeat' };
  }

  // Check victory (after wave 10 with all enemies cleared)
  if (state.currentWaveIndex >= 10 && state.mobs.length === 0 && state.phase !== 'victory') {
    console.log("Victory! All 10 waves completed.");
    return { ...state, phase: 'victory' };
  }

  return state;
}

/**
 * Game reducer - handles game actions and updates state
 * This follows Redux patterns for predictable state updates
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'tick':
      return advanceTick(state, action.deltaTime);

    case 'pause':
      return { ...state, isPaused: true };

    case 'resume':
      return { ...state, isPaused: false };

    case 'set-speed':
      return { 
        ...state, 
        gameSpeed: Math.max(0.5, Math.min(4, action.speed)) // Clamp between 0.5x and 4x
      };

    case 'restart-game':
      // Reset to initial state
      return createInitialGameState(state.map, state.pathCoords);

    case 'start-next-wave':
      // TODO: Implement wave starting logic
      return state;

    default:
      return state;
  }
}

/**
 * Create initial game state
 */
export function createInitialGameState(
  map: GameState['map'], 
  pathCoords: GameState['pathCoords']
): GameState {
  return {
    phase: 'preparing',
    currentWaveIndex: 0,
    simulationTime: 0,
    isPaused: false,
    gameSpeed: 1,
    money: GAME_CONFIG.startingMoney,
    lives: GAME_CONFIG.startingLives,
    mobs: [],
    towers: [],
    projectiles: [],
    map,
    pathCoords,
    waves: [],
  };
}

/**
 * Game loop controller
 * Manages the fixed-timestep simulation loop
 */
export class GameLoop {
  private isRunning = false;
  private lastTime = 0;
  private accumulator = 0;
  private readonly targetDeltaTime = 1000 / GAME_CONFIG.tickRate; // 16.67ms for 60fps
  private onTick: (deltaTime: number) => void;
  private onRender: () => void;
  
  constructor(
    onTick: (deltaTime: number) => void,
    onRender: () => void
  ) {
    this.onTick = onTick;
    this.onRender = onRender;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.isRunning = false;
  }

  private loop = () => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const frameTime = Math.min(currentTime - this.lastTime, 100); // Cap frame time to prevent spiral of death
    this.lastTime = currentTime;

    this.accumulator += frameTime;

    // Fixed timestep updates
    while (this.accumulator >= this.targetDeltaTime) {
      this.onTick(this.targetDeltaTime / 1000); // Convert to seconds
      this.accumulator -= this.targetDeltaTime;
    }

    // Render
    this.onRender();

    requestAnimationFrame(this.loop);
  };
}

