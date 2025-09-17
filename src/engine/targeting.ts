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


