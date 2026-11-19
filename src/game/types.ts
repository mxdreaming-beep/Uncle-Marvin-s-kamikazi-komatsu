export type GamePhase = 'title' | 'playing' | 'victory' | 'gameover';

export type GameMode = 'mission' | 'freeroam';

export type CameraMode = 'chase' | 'aerial' | 'low' | 'cab';

export type HullStyle = 'armored' | 'factory';

export interface RadarBlip {
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  destroyed: boolean;
  hpRatio: number;
  isCooling?: boolean;
  isExplosive?: boolean;
}

export interface DestructionEvent {
  id: number;
  buildingName: string;
  reward: number;
  combo: number;
  note?: string;
}

export interface HudSnapshot {
  phase: GamePhase;
  mode: GameMode;
  damageDollars: number;
  bestScore: number;
  destroyedCount: number;
  totalBuildings: number;
  timeRemaining: number;
  elapsedTime: number;
  speedMph: number;
  engineTemp: number; // 0 to 100
  overheated: boolean;
  ramming: boolean;
  combo: number;
  comboTimer: number; // 0 to 1 normalized
  peakCombo: number;
  nearestTargetName: string | null;
  nearestTargetDist: number;
  dozerX: number;
  dozerZ: number;
  dozerHeading: number;
  blips: RadarBlip[];
  latestEvent: DestructionEvent | null;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  ram: boolean;
}
