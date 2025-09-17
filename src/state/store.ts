import { create } from 'zustand';
import type { GridCoord, TowerType, GameState } from '../engine/types';
import { createMap } from '../engine/grid';
import { GAME_CONFIG, calculateTowerStats, calculateUpgradeCost, TOWER_DEFINITIONS } from '../engine/definitions';
import { GameLoop, advanceTick } from '../engine/sim';

// Extended types for UI state
type PlacedTower = {
  id: string;
  gridCoord: GridCoord;
  type: TowerType;
  tier: 1 | 2 | 3;
};

type UIState = {
  // UI-only state
  hoveredCoord: GridCoord | null;
  selectedTowerId: string | null;
  selectedTowerType: TowerType | null;
  showRange: boolean;
};

type GameStore = Omit<GameState, 'selectedTowerType' | 'selectedTowerId' | 'hoveredGridCoord'> & UIState & {
  // Game actions
  buildTower: (coord: GridCoord, towerType: TowerType) => void;
  upgradeTower: (towerId: string) => void;
  sellTower: (towerId: string) => void;
  
  // Game control
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  setGameSpeed: (speed: number) => void;
  restartGame: () => void;
  
  // UI actions
  setHoveredCoord: (coord: GridCoord | null) => void;
  setSelectedTowerId: (id: string | null) => void;
  setSelectedTowerType: (type: TowerType | null) => void;
  setShowRange: (show: boolean) => void;
  
  // Game utilities
  getTowerById: (id: string) => PlacedTower | undefined;
  canBuildAt: (coord: GridCoord) => boolean;
  calculateSellValue: (tower: PlacedTower) => number;
  
  // Internal
  gameLoop: GameLoop | null;
  _tick: (deltaTime: number) => void;
  _render: () => void;
};

const { map, pathCoords } = createMap(GAME_CONFIG.mapWidth, GAME_CONFIG.mapHeight);

export const useGameStore = create<GameStore>((set, get) => ({
  // Game state
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
  
  // UI state
  hoveredCoord: null,
  selectedTowerId: null,
  selectedTowerType: null,
  showRange: true,

  // Game loop
  gameLoop: null,

  // Game actions
  buildTower: (coord: GridCoord, towerType: TowerType) => {
    const state = get();
    const stats = calculateTowerStats(towerType, 1);
    
    if (state.money < stats.cost) return;
    if (!state.canBuildAt(coord)) return;

    const newTower: PlacedTower = {
      id: `tower-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      gridCoord: coord,
      type: towerType,
      tier: 1,
    };

    set((state) => ({
      ...state,
      towers: [...state.towers, newTower] as any,
      money: state.money - stats.cost,
      selectedTowerId: newTower.id,
    }));
  },

  upgradeTower: (towerId: string) => {
    const state = get();
    const tower = state.getTowerById(towerId);
    
    if (!tower || tower.tier >= 3) return;

    const nextTier = tower.tier + 1;
    if (nextTier > 3) return;

    const upgradeCost = calculateUpgradeCost(tower.type, tower.tier as 1 | 2, nextTier as 2 | 3);
    
    if (state.money < upgradeCost) return;

    set((state) => ({
      ...state,
      towers: state.towers.map((t: any) => 
        t.id === towerId 
          ? { ...t, tier: nextTier as 1 | 2 | 3 }
          : t
      ),
      money: state.money - upgradeCost,
    }));
  },

  sellTower: (towerId: string) => {
    const state = get();
    const tower = state.getTowerById(towerId);
    
    if (!tower) return;

    const sellValue = state.calculateSellValue(tower);

    set((state) => ({
      ...state,
      towers: state.towers.filter((t: any) => t.id !== towerId),
      money: state.money + sellValue,
      selectedTowerId: null,
    }));
  },

  // UI actions
  setHoveredCoord: (coord: GridCoord | null) => set((state) => ({ ...state, hoveredCoord: coord })),
  
  setSelectedTowerId: (id: string | null) => set((state) => ({ 
    ...state,
    selectedTowerId: id,
    selectedTowerType: null, // Clear tower type selection when selecting existing tower
  })),
  
  setSelectedTowerType: (type: TowerType | null) => set((state) => ({
    ...state,
    selectedTowerType: type,
    selectedTowerId: null, // Clear tower selection when selecting type
  })),
  
  setShowRange: (show: boolean) => set((state) => ({ ...state, showRange: show })),

  // Game control
  startGame: () => {
    const state = get();
    if (state.gameLoop) return; // Already running

    const gameLoop = new GameLoop(
      state._tick,
      state._render
    );
    
    set((state) => ({ 
      ...state, 
      gameLoop,
      isPaused: false,
      phase: 'wave-active'
    }));
    
    gameLoop.start();
  },

  pauseGame: () => {
    const state = get();
    if (state.gameLoop) {
      state.gameLoop.stop();
    }
    set((state) => ({ ...state, isPaused: true }));
  },

  resumeGame: () => {
    const state = get();
    if (state.gameLoop) {
      state.gameLoop.start();
    }
    set((state) => ({ ...state, isPaused: false }));
  },

  setGameSpeed: (speed: number) => {
    set((state) => ({ ...state, gameSpeed: Math.max(0.5, Math.min(4, speed)) }));
  },

  restartGame: () => {
    const state = get();
    
    // Stop current game loop
    if (state.gameLoop) {
      state.gameLoop.stop();
    }
    
    // Reset to initial state
    const { map, pathCoords } = createMap(GAME_CONFIG.mapWidth, GAME_CONFIG.mapHeight);
    
    set((state) => ({
      // Reset game state
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
      
      // Keep UI state
      hoveredCoord: state.hoveredCoord,
      selectedTowerId: null, // Clear selection on restart
      selectedTowerType: state.selectedTowerType,
      showRange: state.showRange,
      gameLoop: null, // Reset game loop
    }));
  },

  // Internal game loop functions
  _tick: (deltaTime: number) => {
    const currentState = get();
    
    // Stop the game loop if game is over
    if (currentState.phase === 'defeat' || currentState.phase === 'victory') {
      if (currentState.gameLoop) {
        currentState.gameLoop.stop();
        console.log(`Game ended: ${currentState.phase}`);
      }
      return;
    }
    
    const newState = advanceTick(currentState, deltaTime);
    
    // Update only the game state properties, preserve UI state
    set((state) => ({
      ...state,
      ...newState,
      // Preserve UI state
      hoveredCoord: state.hoveredCoord,
      selectedTowerId: state.selectedTowerId,
      selectedTowerType: state.selectedTowerType,
      showRange: state.showRange,
      gameLoop: state.gameLoop,
    }));
    
    // Check if game just ended and stop the loop
    if (newState.phase === 'defeat' || newState.phase === 'victory') {
      const state = get();
      if (state.gameLoop) {
        state.gameLoop.stop();
        console.log(`Game loop stopped: ${newState.phase}`);
      }
    }
  },

  _render: () => {
    // Trigger re-render by updating a dummy value
    // React will automatically re-render when state changes
  },

  // Game utilities
  getTowerById: (id: string) => {
    const state = get();
    return state.towers.find((t: any) => t.id === id) as PlacedTower | undefined;
  },

  canBuildAt: (coord: GridCoord) => {
    const state = get();
    
    // Check bounds
    if (coord.x < 0 || coord.x >= GAME_CONFIG.mapWidth || 
        coord.y < 0 || coord.y >= GAME_CONFIG.mapHeight) {
      return false;
    }
    
    // Check tile type
    const tile = state.map[coord.y][coord.x];
    if (tile.type !== 'buildable') return false;
    
    // Check if already occupied
    return !state.towers.some((tower: any) => 
      tower.gridCoord.x === coord.x && tower.gridCoord.y === coord.y
    );
  },

  calculateSellValue: (tower: PlacedTower) => {
    let totalCost = TOWER_DEFINITIONS[tower.type].baseCost;
    
    // Add upgrade costs
    for (let tier = 2; tier <= tower.tier; tier++) {
      totalCost += calculateUpgradeCost(tower.type, (tier - 1) as 1 | 2, tier as 2 | 3);
    }
    
    return Math.floor(totalCost * 0.7); // 70% return
  },
}));