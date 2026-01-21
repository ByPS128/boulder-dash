export type Vec2 = { x: number; y: number };

export const V = (x: number, y: number): Vec2 => ({ x, y });
export const addV = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const subV = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const eqV = (a: Vec2, b: Vec2): boolean => a.x === b.x && a.y === b.y;

export const DIR = {
  ZERO: V(0, 0),
  UP: V(0, -1),
  DOWN: V(0, 1),
  LEFT: V(-1, 0),
  RIGHT: V(1, 0),
} as const;

export enum CellKind {
  Dirt = "dirt",
  Wall = "wall",
  Titan = "titan",
  MagicWall = "magicWall",
  Boulder = "boulder",
  Diamond = "diamond",
  Player = "player",
  Exit = "exit",
  Spawn = "spawn",
  Explosion = "explosion",
  Firefly = "firefly",
  Butterfly = "butterfly",
  Amoeba = "amoeba",
}

export type MoveableKind = CellKind.Boulder | CellKind.Diamond;
export type EnemyKind = CellKind.Firefly | CellKind.Butterfly;

export interface CellEntityBase {
  kind: CellKind;
  pos: Vec2; // grid
  sprite?: Phaser.GameObjects.Sprite;
}

export interface MagicWallEntity extends CellEntityBase {
  kind: CellKind.MagicWall;
  /** Tick (GameScene.tickCount) until which wall stays active. 0 = inactive. */
  activeUntilTick: number;
}

export interface AmoebaEntity extends CellEntityBase {
  kind: CellKind.Amoeba;
}

export interface MoveableEntity extends CellEntityBase {
  kind: MoveableKind;
  isFalling: boolean;
  direction: Vec2;
  fallScenario: null | "straight" | "rollLeft" | "rollRight";
  moveProcessed: boolean;
}

export interface EnemyEntity extends CellEntityBase {
  kind: EnemyKind;
  direction: Vec2;
  moveProcessed: boolean;
  mustWait: boolean;
  killedByExplosion?: boolean;
}

export interface PlayerEntity extends CellEntityBase {
  kind: CellKind.Player;
  hidden: boolean;
  direction: Vec2;
  lastSideAnim: "runRight_anim" | "runLeft_anim";
  pushAttempts: number;
  isDead: boolean;
}

export interface SpawnEntity extends CellEntityBase {
  kind: CellKind.Spawn;
  spawnAnimated: number;
}

export interface ExplosionEntity extends CellEntityBase {
  kind: CellKind.Explosion;
}

export type CellEntity =
  | CellEntityBase // static stuff
  | MoveableEntity
  | EnemyEntity
  | PlayerEntity
  | SpawnEntity
  | ExplosionEntity
  | MagicWallEntity
  | AmoebaEntity;

export const isMoveable = (e: CellEntity | null): e is MoveableEntity =>
  !!e && (e.kind === CellKind.Boulder || e.kind === CellKind.Diamond);

export const isEnemy = (e: CellEntity | null): e is EnemyEntity =>
  !!e && (e.kind === CellKind.Firefly || e.kind === CellKind.Butterfly);

export const isPlayer = (e: CellEntity | null): e is PlayerEntity => !!e && e.kind === CellKind.Player;
