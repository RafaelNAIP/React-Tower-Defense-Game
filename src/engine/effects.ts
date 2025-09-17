import type { Mob } from './types';
import { calculateDamage, canBeSlowed } from './definitions';

/**
 * Apply slow effect to a mob
 */
export function applySlow(
  mob: Mob,
  slowMultiplier: number,
  duration: number,
  currentTime: number
): Mob {
  if (!canBeSlowed()) {
    return mob; // Some mobs might be immune to slows
  }

  const newSlowUntil = currentTime + duration;

  // If mob is already slowed, use the stronger slow effect
  const existingMultiplier = mob.status.slowMultiplier || 1;
  const finalMultiplier = Math.min(slowMultiplier, existingMultiplier);

  return {
    ...mob,
    status: {
      ...mob.status,
      slowUntil: Math.max(mob.status.slowUntil || 0, newSlowUntil),
      slowMultiplier: finalMultiplier,
    }
  };
}

/**
 * Update mob status effects (called each tick)
 */
export function updateMobEffects(mob: Mob, currentTime: number): Mob {
  let updatedMob = { ...mob };

  // Handle slow effect expiration
  if (mob.status.slowUntil && currentTime >= mob.status.slowUntil) {
    updatedMob = {
      ...updatedMob,
      status: {
        ...updatedMob.status,
        slowUntil: undefined,
        slowMultiplier: undefined,
      }
    };
  }

  return updatedMob;
}

/**
 * Get the effective speed of a mob considering all effects
 */
export function getEffectiveSpeed(mob: Mob, currentTime: number): number {
  let speed = mob.speed;

  // Apply slow effect
  if (mob.status.slowUntil && currentTime < mob.status.slowUntil && mob.status.slowMultiplier) {
    speed *= mob.status.slowMultiplier;
  }

  // Ensure minimum speed (can't completely freeze)
  return Math.max(speed, mob.speed * 0.1);
}

/**
 * Apply damage to a mob considering armor
 */
export function applyDamage(mob: Mob, baseDamage: number): { mob: Mob; actualDamage: number; killed: boolean } {
  const actualDamage = calculateDamage(baseDamage, mob.armor);
  const newHp = Math.max(0, mob.hp - actualDamage);
  const killed = newHp === 0;

  return {
    mob: { ...mob, hp: newHp },
    actualDamage,
    killed
  };
}