import type { Vec2, GridCoord, Tile, TileType } from './types';

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
 * Calculate Manhattan distance between grid coordinates
 */
export function manhattanDistance(a: GridCoord, b: GridCoord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Check if two grid coordinates are equal
 */
export function coordsEqual(a: GridCoord, b: GridCoord): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Check if coordinate is within grid bounds
 */
export function isValidCoord(coord: GridCoord, width: number, height: number): boolean {
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

// ===== PATHFINDING (A* Algorithm) =====

type PathNode = {
  coord: GridCoord;
  gCost: number; // Distance from start
  hCost: number; // Heuristic distance to goal
  fCost: number; // Total cost (g + h)
  parent: PathNode | null;
};

/**
 * Get neighboring coordinates (4-directional movement)
 */
function getNeighbors(coord: GridCoord, width: number, height: number): GridCoord[] {
  const neighbors: GridCoord[] = [];
  const directions = [
    { x: 0, y: -1 }, // Up
    { x: 1, y: 0 },  // Right
    { x: 0, y: 1 },  // Down
    { x: -1, y: 0 }, // Left
  ];

  for (const dir of directions) {
    const neighbor = { x: coord.x + dir.x, y: coord.y + dir.y };
    if (isValidCoord(neighbor, width, height)) {
      neighbors.push(neighbor);
    }
  }

  return neighbors;
}

/**
 * A* pathfinding algorithm
 * Finds the shortest path between start and goal, avoiding blocked tiles
 */
export function findPath(
  start: GridCoord,
  goal: GridCoord,
  map: Tile[][],
  allowedTypes: TileType[] = ['buildable', 'path']
): GridCoord[] | null {
  const width = map[0].length;
  const height = map.length;

  if (!isValidCoord(start, width, height) || !isValidCoord(goal, width, height)) {
    return null;
  }

  const openList: PathNode[] = [];
  const closedSet = new Set<string>();

  // Helper function to create a unique key for coordinates
  const coordKey = (coord: GridCoord) => `${coord.x},${coord.y}`;

  // Create start node
  const startNode: PathNode = {
    coord: start,
    gCost: 0,
    hCost: manhattanDistance(start, goal),
    fCost: manhattanDistance(start, goal),
    parent: null,
  };

  openList.push(startNode);

  while (openList.length > 0) {
    // Find node with lowest fCost
    let currentIndex = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].fCost < openList[currentIndex].fCost) {
        currentIndex = i;
      }
    }

    const current = openList.splice(currentIndex, 1)[0];
    closedSet.add(coordKey(current.coord));

    // Check if we reached the goal
    if (coordsEqual(current.coord, goal)) {
      // Reconstruct path
      const path: GridCoord[] = [];
      let node: PathNode | null = current;
      while (node !== null) {
        path.unshift(node.coord);
        node = node.parent;
      }
      return path;
    }

    // Check all neighbors
    const neighbors = getNeighbors(current.coord, width, height);
    for (const neighborCoord of neighbors) {
      const key = coordKey(neighborCoord);

      // Skip if already processed
      if (closedSet.has(key)) continue;

      // Skip if tile type is not allowed
      const tile = map[neighborCoord.y][neighborCoord.x];
      if (!allowedTypes.includes(tile.type)) continue;

      const gCost = current.gCost + 1; // Each step costs 1
      const hCost = manhattanDistance(neighborCoord, goal);
      const fCost = gCost + hCost;

      // Check if this neighbor is already in open list with better cost
      const existingNode = openList.find(node => coordsEqual(node.coord, neighborCoord));
      if (existingNode && gCost >= existingNode.gCost) continue;

      // Create or update neighbor node
      const neighborNode: PathNode = {
        coord: neighborCoord,
        gCost,
        hCost,
        fCost,
        parent: current,
      };

      if (existingNode) {
        // Update existing node
        Object.assign(existingNode, neighborNode);
      } else {
        // Add new node to open list
        openList.push(neighborNode);
      }
    }
  }

  // No path found
  return null;
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

/**
 * Check if a tile can be built on (is buildable and not occupied)
 */
export function canBuildAt(
  coord: GridCoord,
  map: Tile[][],
  existingTowers: { gridCoord: GridCoord }[]
): boolean {
  const width = map[0]?.length || 0;
  const height = map.length;

  // Check bounds
  if (!isValidCoord(coord, width, height)) return false;

  // Check tile type
  const tile = map[coord.y][coord.x];
  if (tile.type !== 'buildable') return false;

  // Check if already occupied by a tower
  return !existingTowers.some(tower => coordsEqual(tower.gridCoord, coord));
}

/**
 * Get all tiles within a certain range of a position
 */
export function getTilesInRange(
  center: GridCoord,
  range: number,
  width: number,
  height: number
): GridCoord[] {
  const tiles: GridCoord[] = [];
  
  for (let y = center.y - range; y <= center.y + range; y++) {
    for (let x = center.x - range; x <= center.x + range; x++) {
      const coord = { x, y };
      if (isValidCoord(coord, width, height)) {
        const dist = manhattanDistance(center, coord);
        if (dist <= range) {
          tiles.push(coord);
        }
      }
    }
  }
  
  return tiles;
}