import type { Vec2, GridCoord, Tile } from './types';

// ===== COORDINATE UTILITIES =====

/**
 * Convert grid coordinate to world position (center of tile)
 */
export function gridToWorld(coord: GridCoord, tileSize: number): Vec2 {
  return {
    x: coord.x * tileSize + tileSize / 2,
    y: coord.y * tileSize + tileSize / 2,
  };
}

/**
 * Convert world position to grid coordinate (which tile contains this position)
 */
export function worldToGrid(pos: Vec2, tileSize: number): GridCoord {
  return {
    x: Math.floor(pos.x / tileSize),
    y: Math.floor(pos.y / tileSize),
  };
}

/**
 * Calculate distance between two points
 */
export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate squared distance (faster when you only need to compare distances)
 */
export function distanceSquared(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Check if coordinate is within grid bounds
 */
function isValidCoord(coord: GridCoord, width: number, height: number): boolean {
  return coord.x >= 0 && coord.x < width && coord.y >= 0 && coord.y < height;
}

// ===== MAP GENERATION =====

/**
 * Create a basic map layout
 * This creates a simple L-shaped path for now, but can be extended
 */
export function createMap(width: number, height: number): { map: Tile[][]; pathCoords: GridCoord[] } {
  // Initialize empty map with all buildable tiles
  const map: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    map[y] = [];
    for (let x = 0; x < width; x++) {
      map[y][x] = {
        coord: { x, y },
        type: 'buildable',
      };
    }
  }

  // Create a simple path from left side to bottom
  // This is a basic L-shaped path that can be customized
  const pathCoords: GridCoord[] = [];

  // Horizontal segment (left to middle)
  const pathY = Math.floor(height / 2);
  for (let x = 0; x < Math.floor(width * 0.7); x++) {
    const coord = { x, y: pathY };
    pathCoords.push(coord);
    map[pathY][x] = {
      coord,
      type: 'path',
      pathIndex: pathCoords.length - 1,
    };
  }

  // Vertical segment (down to bottom)
  const cornerX = Math.floor(width * 0.7) - 1;
  for (let y = pathY + 1; y < height; y++) {
    const coord = { x: cornerX, y };
    pathCoords.push(coord);
    map[y][cornerX] = {
      coord,
      type: 'path',
      pathIndex: pathCoords.length - 1,
    };
  }

  // Add some blocked tiles for variety (optional obstacles)
  const blockedPositions = [
    { x: Math.floor(width * 0.3), y: Math.floor(height * 0.3) },
    { x: Math.floor(width * 0.8), y: Math.floor(height * 0.6) },
    { x: Math.floor(width * 0.5), y: Math.floor(height * 0.8) },
  ];

  blockedPositions.forEach(coord => {
    if (isValidCoord(coord, width, height) && map[coord.y][coord.x].type === 'buildable') {
      map[coord.y][coord.x] = {
        coord,
        type: 'blocked',
      };
    }
  });

  return { map, pathCoords };
}

// ===== PATH UTILITIES =====

/**
 * Calculate the total length of a path
 */
export function calculatePathLength(pathCoords: GridCoord[], tileSize: number): number {
  if (pathCoords.length < 2) return 0;

  let totalLength = 0;
  for (let i = 1; i < pathCoords.length; i++) {
    const prev = gridToWorld(pathCoords[i - 1], tileSize);
    const curr = gridToWorld(pathCoords[i], tileSize);
    totalLength += distance(prev, curr);
  }

  return totalLength;
}

/**
 * Get position along path based on progress (0-1)
 * This is used for smooth mob movement along the path
 */
export function getPositionOnPath(
  pathCoords: GridCoord[],
  progress: number,
  tileSize: number
): Vec2 {
  if (pathCoords.length === 0) {
    return { x: 0, y: 0 };
  }

  if (pathCoords.length === 1 || progress <= 0) {
    return gridToWorld(pathCoords[0], tileSize);
  }

  if (progress >= 1) {
    return gridToWorld(pathCoords[pathCoords.length - 1], tileSize);
  }

  // Calculate total path length
  const totalLength = calculatePathLength(pathCoords, tileSize);
  const targetDistance = progress * totalLength;

  // Find which segment we're on
  let currentDistance = 0;
  for (let i = 1; i < pathCoords.length; i++) {
    const segmentStart = gridToWorld(pathCoords[i - 1], tileSize);
    const segmentEnd = gridToWorld(pathCoords[i], tileSize);
    const segmentLength = distance(segmentStart, segmentEnd);

    if (currentDistance + segmentLength >= targetDistance) {
      // We're on this segment
      const segmentProgress = (targetDistance - currentDistance) / segmentLength;

      return {
        x: segmentStart.x + (segmentEnd.x - segmentStart.x) * segmentProgress,
        y: segmentStart.y + (segmentEnd.y - segmentStart.y) * segmentProgress,
      };
    }

    currentDistance += segmentLength;
  }

  // Fallback to end of path
  return gridToWorld(pathCoords[pathCoords.length - 1], tileSize);
}