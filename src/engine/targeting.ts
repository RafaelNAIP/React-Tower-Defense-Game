import type { Mob, Tower, TargetingStrategy, Vec2 } from './types';
import { distance, distanceSquared } from './grid';

/**
 * Find the best target for a tower based on its targeting strategy
 */
export function findTarget(
  tower: Tower,
  mobs: Mob[],
  strategy: TargetingStrategy = 'first'
): Mob | null {
  // Filter mobs within range
  const mobsInRange = mobs.filter(mob => {
    const dist = distance(tower.pos, mob.pos);
    return dist <= tower.range && !mob.reachedEnd;
  });

  if (mobsInRange.length === 0) return null;

  switch (strategy) {
    case 'first':
      return getFirstMob(mobsInRange);
    
    case 'last':
      return getLastMob(mobsInRange);
    
    case 'nearest':
      return getNearestMob(tower.pos, mobsInRange);
    
    case 'strongest':
      return getStrongestMob(mobsInRange);
    
    case 'weakest':
      return getWeakestMob(mobsInRange);
    
    default:
      return getFirstMob(mobsInRange);
  }
}

/**
 * Get the mob that's furthest along the path (closest to the end)
 */
function getFirstMob(mobs: Mob[]): Mob | null {
  if (mobs.length === 0) return null;
  
  return mobs.reduce((closest, mob) => 
    mob.pathProgress > closest.pathProgress ? mob : closest
  );
}

/**
 * Get the mob that's earliest in the path (furthest from the end)
 */
function getLastMob(mobs: Mob[]): Mob | null {
  if (mobs.length === 0) return null;
  
  return mobs.reduce((furthest, mob) => 
    mob.pathProgress < furthest.pathProgress ? mob : furthest
  );
}

/**
 * Get the mob that's closest to the tower
 */
function getNearestMob(towerPos: Vec2, mobs: Mob[]): Mob | null {
  if (mobs.length === 0) return null;
  
  return mobs.reduce((nearest, mob) => {
    const nearestDist = distanceSquared(towerPos, nearest.pos);
    const mobDist = distanceSquared(towerPos, mob.pos);
    return mobDist < nearestDist ? mob : nearest;
  });
}

/**
 * Get the mob with the most HP
 */
function getStrongestMob(mobs: Mob[]): Mob | null {
  if (mobs.length === 0) return null;
  
  return mobs.reduce((strongest, mob) => 
    mob.hp > strongest.hp ? mob : strongest
  );
}

/**
 * Get the mob with the least HP
 */
function getWeakestMob(mobs: Mob[]): Mob | null {
  if (mobs.length === 0) return null;
  
  return mobs.reduce((weakest, mob) => 
    mob.hp < weakest.hp ? mob : weakest
  );
}

/**
 * Check if a tower can attack (cooldown is ready)
 */
export function canTowerAttack(tower: Tower, currentTime: number): boolean {
  const timeSinceLastAttack = currentTime - tower.lastAttackTime;
  const cooldownTime = 1 / tower.attackRate; // Convert attacks/sec to seconds/attack
  return timeSinceLastAttack >= cooldownTime;
}

/**
 * Calculate lead position for moving targets
 * Predicts where a mob will be when the projectile reaches it
 */
export function calculateLeadPosition(
  towerPos: Vec2,
  target: Mob,
  projectileSpeed: number
): Vec2 {
  if (!projectileSpeed || projectileSpeed <= 0) {
    return target.pos; // Instant hit
  }

  // Simple lead calculation
  const distanceToTarget = distance(towerPos, target.pos);
  const timeToReach = distanceToTarget / projectileSpeed;
  
  // Estimate where the mob will be after timeToReach seconds
  // This is simplified - in reality we'd need to calculate along the path
  const leadDistance = target.speed * timeToReach;
  
  // For now, just project forward in current direction
  // TODO: Implement proper path-following prediction
  return {
    x: target.pos.x,
    y: target.pos.y
  };
}

/**
 * Get all mobs within a splash radius
 */
export function getMobsInSplashRange(
  centerPos: Vec2,
  splashRadius: number,
  mobs: Mob[]
): Mob[] {
  return mobs.filter(mob => {
    const dist = distance(centerPos, mob.pos);
    return dist <= splashRadius && !mob.reachedEnd;
  });
}

/**
 * Calculate damage falloff for splash attacks
 */
export function calculateSplashDamage(
  baseDamage: number,
  distanceFromCenter: number,
  splashRadius: number,
  falloffType: 'none' | 'linear' | 'exponential' = 'linear'
): number {
  if (distanceFromCenter > splashRadius) return 0;
  
  switch (falloffType) {
    case 'none':
      return baseDamage;
    
    case 'linear':
      const falloffRatio = 1 - (distanceFromCenter / splashRadius);
      return baseDamage * falloffRatio;
    
    case 'exponential':
      const expRatio = Math.pow(1 - (distanceFromCenter / splashRadius), 2);
      return baseDamage * expRatio;
    
    default:
      return baseDamage;
  }
}

/**
 * Check line of sight between tower and target
 * For now, this is a simple implementation - could be enhanced with terrain
 */
export function hasLineOfSight(
  from: Vec2,
  to: Vec2,
  obstacles: Vec2[] = []
): boolean {
  // Simple implementation - no obstacles for now
  // Could be enhanced to check for terrain features that block shots
  return true;
}

/**
 * Targeting strategies configuration
 */
export const TARGETING_STRATEGIES: Record<TargetingStrategy, {
  name: string;
  description: string;
  icon: string;
}> = {
  first: {
    name: 'First',
    description: 'Target enemies closest to the end',
    icon: '🎯'
  },
  last: {
    name: 'Last',
    description: 'Target enemies furthest from the end',
    icon: '🔙'
  },
  nearest: {
    name: 'Nearest',
    description: 'Target closest enemy',
    icon: '📍'
  },
  strongest: {
    name: 'Strongest',
    description: 'Target enemy with most HP',
    icon: '💪'
  },
  weakest: {
    name: 'Weakest',
    description: 'Target enemy with least HP',
    icon: '🎈'
  }
};