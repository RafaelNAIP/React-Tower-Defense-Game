import type { Mob, MobStatus } from './types';
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
  if (!canBeSlowed(mob.type)) {
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

/**
 * Create visual effect data for rendering
 */
export type VisualEffect = {
  id: string;
  type: 'damage' | 'slow' | 'death' | 'splash';
  pos: { x: number; y: number };
  startTime: number;
  duration: number;
  data: any; // Effect-specific data
};

export function createDamageEffect(
  pos: { x: number; y: number },
  damage: number,
  currentTime: number
): VisualEffect {
  return {
    id: `damage-${Date.now()}-${Math.random()}`,
    type: 'damage',
    pos,
    startTime: currentTime,
    duration: 1000, // 1 second
    data: { damage }
  };
}

export function createSlowEffect(
  pos: { x: number; y: number },
  currentTime: number
): VisualEffect {
  return {
    id: `slow-${Date.now()}-${Math.random()}`,
    type: 'slow',
    pos,
    startTime: currentTime,
    duration: 500, // 0.5 seconds
    data: {}
  };
}

export function createSplashEffect(
  pos: { x: number; y: number },
  radius: number,
  currentTime: number
): VisualEffect {
  return {
    id: `splash-${Date.now()}-${Math.random()}`,
    type: 'splash',
    pos,
    startTime: currentTime,
    duration: 800, // 0.8 seconds
    data: { radius }
  };
}

export function createDeathEffect(
  pos: { x: number; y: number },
  mobType: string,
  currentTime: number
): VisualEffect {
  return {
    id: `death-${Date.now()}-${Math.random()}`,
    type: 'death',
    pos,
    startTime: currentTime,
    duration: 1500, // 1.5 seconds
    data: { mobType }
  };
}

/**
 * Update and clean up visual effects
 */
export function updateVisualEffects(
  effects: VisualEffect[],
  currentTime: number
): VisualEffect[] {
  return effects.filter(effect => {
    const elapsed = currentTime - effect.startTime;
    return elapsed < effect.duration;
  });
}

/**
 * Status effect stacking rules
 */
export const EFFECT_STACKING_RULES = {
  slow: {
    // Slows stack by taking the strongest effect and longest duration
    stackType: 'strongest' as const,
    maxStacks: 1,
    // Minimum speed cap - mobs can't be slowed below 10% of base speed
    minSpeedMultiplier: 0.1
  },
  
  // Future effects can be added here
  poison: {
    stackType: 'additive' as const,
    maxStacks: 5,
  },
  
  freeze: {
    stackType: 'override' as const,
    maxStacks: 1,
  }
};

/**
 * Check if a mob has any active effects
 */
export function hasActiveEffects(mob: Mob, currentTime: number): boolean {
  return !!(mob.status.slowUntil && currentTime < mob.status.slowUntil);
}

/**
 * Get visual indicator for mob effects (for rendering)
 */
export function getMobEffectIndicators(mob: Mob, currentTime: number): string[] {
  const indicators: string[] = [];
  
  if (mob.status.slowUntil && currentTime < mob.status.slowUntil) {
    indicators.push('❄️'); // Slow effect
  }
  
  return indicators;
}