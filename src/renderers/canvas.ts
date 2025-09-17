import type { GameState, TowerType, GridCoord } from '../engine/types';
import { gridToWorld } from '../engine/grid';
import { GAME_CONFIG, calculateTowerStats } from '../engine/definitions';

export interface RenderOptions {
  showRange: boolean;
  hoveredCoord: GridCoord | null;
  selectedTowerId: string | null;
  selectedTowerType: TowerType | null;
  money: number;
  canBuildAtHovered: boolean; // Add this flag
}

export interface TowerVisuals {
  color: string;
  size: number;
}

export interface MobVisuals {
  color: string;
  size: number;
}

export interface ProjectileVisuals {
  color: string;
  size: number;
}

/**
 * Pure canvas renderer - no React dependencies
 * This can be used in any JavaScript environment
 */
export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private tileSize: number;

  constructor(ctx: CanvasRenderingContext2D, tileSize: number = GAME_CONFIG.tileSize) {
    this.ctx = ctx;
    this.tileSize = tileSize;
  }

  /**
   * Main render function - renders the complete game state
   */
  render(gameState: GameState, options: RenderOptions): void {
    this.clearCanvas();
    this.renderMap(gameState.map);
    this.renderTowers(gameState.towers as any[], options);
    this.renderRangeCircles(gameState.towers as any[], options);
    this.renderProjectiles(gameState.projectiles);
    this.renderMobs(gameState.mobs);
    this.renderHoverEffects(options, gameState.towers as any[]);
  }

  /**
   * Clear the canvas
   */
  private clearCanvas(): void {
    const canvas = this.ctx.canvas;
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * Render the map tiles
   */
  private renderMap(map: GameState['map']): void {
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        this.renderTile(map[y][x], x, y);
      }
    }
  }

  /**
   * Render a single tile
   */
  private renderTile(tile: any, x: number, y: number): void {
    const tileX = x * this.tileSize;
    const tileY = y * this.tileSize;

    // Base tile color
    let fillStyle = '#228B22'; // buildable (green)
    if (tile.type === 'path') fillStyle = '#8B4513'; // path (brown)
    if (tile.type === 'blocked') fillStyle = '#2F4F4F'; // blocked (gray)

    this.ctx.fillStyle = fillStyle;
    this.ctx.fillRect(tileX, tileY, this.tileSize, this.tileSize);

    // Tile border
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(tileX, tileY, this.tileSize, this.tileSize);

    // Path numbers (for debugging)
    if (tile.type === 'path' && tile.pathIndex !== undefined) {
      this.ctx.fillStyle = 'white';
      this.ctx.font = '12px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        tile.pathIndex.toString(),
        tileX + this.tileSize / 2,
        tileY + this.tileSize / 2 + 4
      );
    }
  }

  /**
   * Render all towers
   */
  private renderTowers(towers: any[], options: RenderOptions): void {
    towers.forEach(tower => {
      this.renderTower(tower, options.selectedTowerId === tower.id);
    });
  }

  /**
   * Render a single tower
   */
  private renderTower(tower: any, isSelected: boolean): void {
    const worldPos = gridToWorld(tower.gridCoord, this.tileSize);
    const visuals = this.getTowerVisuals(tower.type);
    
    this.ctx.fillStyle = visuals.color;
    this.ctx.beginPath();
    this.ctx.arc(worldPos.x, worldPos.y, this.tileSize * 0.3, 0, Math.PI * 2);
    this.ctx.fill();

    // Tower border
    this.ctx.strokeStyle = isSelected ? '#FFFFFF' : '#000000';
    this.ctx.lineWidth = isSelected ? 3 : 2;
    this.ctx.stroke();

    // Tier indicator
    if (tower.tier > 1) {
      this.renderText(
        tower.tier.toString(),
        worldPos.x,
        worldPos.y + 5,
        'white',
        '14px bold monospace',
        'black',
        3
      );
    }
  }

  /**
   * Render range circles for selected towers
   */
  private renderRangeCircles(towers: any[], options: RenderOptions): void {
    if (!options.showRange) return;

    let rangeCenter: { x: number; y: number } | null = null;
    let range = 0;

    if (options.selectedTowerId) {
      // Show range for selected tower
      const selectedTower = towers.find(t => t.id === options.selectedTowerId);
      if (selectedTower) {
        rangeCenter = gridToWorld(selectedTower.gridCoord, this.tileSize);
        const stats = calculateTowerStats(selectedTower.type, selectedTower.tier);
        range = stats.range;
      }
    } else if (options.selectedTowerType && options.hoveredCoord) {
      // Show range preview for placement
      rangeCenter = gridToWorld(options.hoveredCoord, this.tileSize);
      const stats = calculateTowerStats(options.selectedTowerType, 1);
      range = stats.range;
    }

    if (rangeCenter && range > 0) {
      this.renderRangeCircle(rangeCenter.x, rangeCenter.y, range * this.tileSize);
    }
  }

  /**
   * Render a range circle
   */
  private renderRangeCircle(x: number, y: number, radius: number): void {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  /**
   * Render all projectiles
   */
  private renderProjectiles(projectiles: any[]): void {
    projectiles.forEach(projectile => {
      this.renderProjectile(projectile);
    });
  }

  /**
   * Render a single projectile
   */
  private renderProjectile(projectile: any): void {
    const visuals = this.getProjectileVisuals(projectile.type);
    
    this.ctx.fillStyle = visuals.color;
    this.ctx.beginPath();
    this.ctx.arc(projectile.pos.x, projectile.pos.y, visuals.size, 0, Math.PI * 2);
    this.ctx.fill();

    // Projectile border for visibility
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // Draw trail effect for moving projectiles
    if (projectile.speed > 0) {
      this.renderProjectileTrail(projectile, visuals.color);
    }
  }

  /**
   * Render projectile trail
   */
  private renderProjectileTrail(projectile: any, color: string): void {
    this.ctx.strokeStyle = color + '60'; // Semi-transparent trail
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(projectile.pos.x, projectile.pos.y);
    
    // Calculate trail start position
    const trailLength = 20;
    const dx = projectile.targetPos.x - projectile.pos.x;
    const dy = projectile.targetPos.y - projectile.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      const trailX = projectile.pos.x - (dx / dist) * trailLength;
      const trailY = projectile.pos.y - (dy / dist) * trailLength;
      this.ctx.lineTo(trailX, trailY);
    }
    
    this.ctx.stroke();
  }

  /**
   * Render all mobs
   */
  private renderMobs(mobs: any[]): void {
    mobs.forEach(mob => {
      if (mob.pathProgress >= 0) { // Only draw spawned mobs
        this.renderMob(mob);
      }
    });
  }

  /**
   * Render a single mob
   */
  private renderMob(mob: any): void {
    const visuals = this.getMobVisuals(mob.type);
    let color = visuals.color;
    
    // Flash red if mob reached the end
    if (mob.pathProgress >= 1) {
      color = '#FF0000';
    }
    
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(mob.pos.x, mob.pos.y, visuals.size, 0, Math.PI * 2);
    this.ctx.fill();

    // Mob border
    this.ctx.strokeStyle = mob.pathProgress >= 1 ? '#FFFF00' : '#000';
    this.ctx.lineWidth = mob.pathProgress >= 1 ? 3 : 1;
    this.ctx.stroke();

    // Slow effect indicator
    this.renderMobEffects(mob, visuals.size);

    // Health bar
    this.renderHealthBar(mob, visuals.size);

    // Progress indicator (for debugging)
    this.renderText(
      `${(mob.pathProgress * 100).toFixed(0)}%`,
      mob.pos.x,
      mob.pos.y + visuals.size + 12,
      'white',
      '8px monospace'
    );

    // Mob type indicator
    this.renderMobTypeIndicator(mob);
  }

  /**
   * Render mob status effects
   */
  private renderMobEffects(mob: any, mobSize: number): void {
    if (mob.status && mob.status.slowUntil && mob.status.slowUntil > Date.now() / 1000) {
      // Draw blue frost effect around slowed mobs
      this.ctx.strokeStyle = '#00BFFF';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]);
      this.ctx.beginPath();
      this.ctx.arc(mob.pos.x, mob.pos.y, mobSize + 5, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  /**
   * Render mob health bar
   */
  private renderHealthBar(mob: any, mobSize: number): void {
    const barWidth = mobSize * 2;
    const barHeight = 4;
    const healthPercent = mob.hp / mob.maxHp;
    
    // Background (red)
    this.ctx.fillStyle = '#FF0000';
    this.ctx.fillRect(
      mob.pos.x - barWidth / 2,
      mob.pos.y - mobSize - 8,
      barWidth,
      barHeight
    );
    
    // Health (green)
    this.ctx.fillStyle = '#00FF00';
    this.ctx.fillRect(
      mob.pos.x - barWidth / 2,
      mob.pos.y - mobSize - 8,
      barWidth * healthPercent,
      barHeight
    );
  }

  /**
   * Render mob type indicator
   */
  private renderMobTypeIndicator(mob: any): void {
    if (mob.type === 'tank') {
      this.renderText('T', mob.pos.x, mob.pos.y + 3, 'white', '10px monospace');
    } else if (mob.type === 'fast') {
      this.renderText('F', mob.pos.x, mob.pos.y + 3, 'white', '10px monospace');
    }
  }

  /**
   * Render hover effects and keyboard cursor
   */
  private renderHoverEffects(options: RenderOptions, towers: any[]): void {
    if (!options.hoveredCoord) return;

    const tileX = options.hoveredCoord.x * this.tileSize;
    const tileY = options.hoveredCoord.y * this.tileSize;
    const existingTower = towers.find(tower => 
      tower.gridCoord.x === options.hoveredCoord!.x && 
      tower.gridCoord.y === options.hoveredCoord!.y
    );
    
    if (existingTower) {
      // Hovering over existing tower
      this.renderHoverRect(tileX, tileY, '#FFFF00');
    } else if (options.selectedTowerType) {
      // Hovering with tower selected for building
      const stats = calculateTowerStats(options.selectedTowerType, 1);
      const hasEnoughMoney = options.money >= stats.cost;
      const canBuild = options.canBuildAtHovered;

      this.renderHoverRect(tileX, tileY, canBuild && hasEnoughMoney ? '#00FF00' : '#FF0000');

      // Preview tower if buildable and affordable
      if (canBuild && hasEnoughMoney) {
        this.renderTowerPreview(options.hoveredCoord, options.selectedTowerType);
      }
    } else {
      // Show keyboard cursor position even without tower selected
      this.renderHoverRect(tileX, tileY, '#FFFFFF', 2, [5, 5]); // White dashed border for cursor
    }
  }

  /**
   * Render hover rectangle with optional dash pattern
   */
  private renderHoverRect(x: number, y: number, color: string, lineWidth: number = 3, dashPattern?: number[]): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    
    if (dashPattern) {
      this.ctx.setLineDash(dashPattern);
    }
    
    this.ctx.strokeRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4);
    
    if (dashPattern) {
      this.ctx.setLineDash([]); // Reset dash pattern
    }
  }

  /**
   * Render tower placement preview
   */
  private renderTowerPreview(coord: GridCoord, towerType: TowerType): void {
    const worldPos = gridToWorld(coord, this.tileSize);
    const visuals = this.getTowerVisuals(towerType);
    
    // Draw semi-transparent tower preview
    this.ctx.fillStyle = visuals.color + 'AA'; // More opaque than before
    this.ctx.beginPath();
    this.ctx.arc(worldPos.x, worldPos.y, this.tileSize * 0.3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Add a pulsing border effect
    this.ctx.strokeStyle = visuals.color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(worldPos.x, worldPos.y, this.tileSize * 0.3, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Add text indicator
    this.ctx.fillStyle = 'white';
    this.ctx.font = '12px bold monospace';
    this.ctx.textAlign = 'center';
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 3;
    this.ctx.strokeText('PREVIEW', worldPos.x, worldPos.y - this.tileSize * 0.5);
    this.ctx.fillText('PREVIEW', worldPos.x, worldPos.y - this.tileSize * 0.5);
  }

  /**
   * Render text with optional outline
   */
  private renderText(
    text: string, 
    x: number, 
    y: number, 
    color: string, 
    font: string,
    outlineColor?: string,
    outlineWidth?: number
  ): void {
    this.ctx.font = font;
    this.ctx.textAlign = 'center';
    
    // Draw outline if specified
    if (outlineColor && outlineWidth) {
      this.ctx.strokeStyle = outlineColor;
      this.ctx.lineWidth = outlineWidth;
      this.ctx.strokeText(text, x, y);
    }
    
    // Draw text
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
  }

  /**
   * Get tower visual properties
   */
  private getTowerVisuals(towerType: TowerType): TowerVisuals {
    switch (towerType) {
      case 'arrow': return { color: '#FFD700', size: 0.3 }; // Gold
      case 'cannon': return { color: '#FF4500', size: 0.3 }; // Orange-red  
      case 'frost': return { color: '#00BFFF', size: 0.3 }; // Sky blue
      default: return { color: '#FFD700', size: 0.3 };
    }
  }

  /**
   * Get mob visual properties
   */
  private getMobVisuals(mobType: string): MobVisuals {
    const baseSize = this.tileSize;
    switch (mobType) {
      case 'normal': return { color: '#FF6B6B', size: baseSize * 0.25 };
      case 'fast': return { color: '#4ECDC4', size: baseSize * 0.2 };
      case 'tank': return { color: '#45B7D1', size: baseSize * 0.35 };
      case 'flying': return { color: '#96CEB4', size: baseSize * 0.22 };
      default: return { color: '#FF6B6B', size: baseSize * 0.25 };
    }
  }

  /**
   * Get projectile visual properties
   */
  private getProjectileVisuals(projectileType: string): ProjectileVisuals {
    switch (projectileType) {
      case 'arrow': return { color: '#FFD700', size: 3 };
      case 'cannonball': return { color: '#FF4500', size: 6 };
      case 'frost': return { color: '#00BFFF', size: 4 };
      default: return { color: '#FFFFFF', size: 3 };
    }
  }
}

/**
 * Utility function to create and setup a canvas renderer
 */
export function createCanvasRenderer(canvas: HTMLCanvasElement): CanvasRenderer {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas 2D context');
  }
  
  return new CanvasRenderer(ctx);
}