// 游戏核心类型定义

// ============ 基础类型 ============
export interface Vector2 {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

// ============ 事件系统 ============
export enum GameEventType {
  BRICK_SPAWN = 'BRICK_SPAWN',           // 砖块生成
  BULLET_LOADING = 'BULLET_LOADING',     // 子弹装填阶段
  PLAYER_ACTION = 'PLAYER_ACTION',       // 玩家行动阶段
  BRICK_ACTION = 'BRICK_ACTION',         // 砖块行动(下落)阶段
  GAME_OVER = 'GAME_OVER',               // 游戏结束
}

export interface GameEvent {
  type: GameEventType;
  data?: any;
}

// ============ 子弹编程模块 ============
export enum BulletModuleType {
  // 基础子弹
  NORMAL = 'NORMAL',                     // 普通子弹
  PIERCING = 'PIERCING',                 // 穿透子弹
  AOE = 'AOE',                           // AOE子弹
  
  // 修饰模块
  BOUNCE_PLUS = 'BOUNCE_PLUS',           // 反弹次数+1
  SCATTER_PLUS = 'SCATTER_PLUS',         // 散射+1
  VOLLEY_PLUS = 'VOLLEY_PLUS',           // 齐射+1(自带散射效果)
  COLLISION_TRIGGER = 'COLLISION_TRIGGER', // 碰撞触发
}

// 模块稀有度
export enum ModuleRarity {
  COMMON = 'common',       // 普通(白色)
  UNCOMMON = 'uncommon',   // 优秀(绿色)
  RARE = 'rare',           // 稀有(蓝色)
  EPIC = 'epic',           // 史诗(紫色)
  LEGENDARY = 'legendary'  // 传说(金色)
}

export interface BulletModule {
  id: string;
  type: BulletModuleType;
  name: string;
  description: string;
  isModifier: boolean;  // 是否为修饰模块
  rarity: ModuleRarity;  // 稀有度
}

// 子弹编程序列
export interface BulletProgram {
  modules: BulletModule[];
}

// ============ 缓冲阵列系统 ============
export interface Bumper {
  id: string;
  position: Vector2;
  module: BulletModule;  // 碰撞时添加的模块
  cooldown: number;  // 当前冷却时间(毫秒)
  baseCooldown: number;  // 基础冷却时间(毫秒)
  hitCount: number;  // 被撞击次数
}

// 奖励缓冲器类型
export enum RewardBumperType {
  BASIC = 'basic',           // 基础奖励缓冲器
  ADVANCED = 'advanced',     // 高级奖励缓冲器(完整版扩展)
  LEGENDARY = 'legendary'    // 传说奖励缓冲器(完整版扩展)
}

// 奖励缓冲器位置配置
export interface RewardBumperSlot {
  x: number;                 // X坐标
  y: number;                 // Y坐标
  type: RewardBumperType;    // 奖励缓冲器类型
  description: string;       // 位置描述，如"右下角边缘"
}

// 奖励缓冲器实例
export interface RewardBumper {
  id: string;
  type: RewardBumperType;
  position: Vector2;
  isFixed: true;             // 固定位置，不可移动
  glowPhase: number;         // 闪烁相位(0-1)
  isTriggered: boolean;      // 是否已被触发
}

export interface BumperArrayTemplate {
  id: string;
  name: string;
  defaultBumpers: Bumper[];  // 默认缓冲器配置
  rewardBumpers: RewardBumperSlot[];  // 奖励缓冲器位置(固定)
}

export interface BulletSlot {
  id: string;
  name: string; // 槽位名称(用户可自定义)
  position: Vector2;
  width: number;
  program: BulletProgram;  // 该槽位的子弹编程
  energy: number; // 当前能量值
  energyCost: number; // 单次发射消耗能量
}

export interface BulletTemplate {
  id: string;
  name: string;
  width: number;              // 在缓冲阵列下方的宽度
  editable: boolean;          // 是否可编辑子弹编程
  fixedModules?: BulletModule[];  // 不可修改的预设模块
}

export enum MarbleState {
  FALLING = 'falling',      // 掉落中
  IN_SLOT = 'in_slot',      // 落入槽位
  OUT_OF_BOUNDS = 'out_of_bounds' // 掉出屏幕
}

export interface Marble {
  id: string;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  state: MarbleState;
  collectedModules: BulletModule[]; // 当前收集的模块
  bounceCount: number; // 碰撞次数(用于衰减)
  targetSlot?: string;  // 目标槽位ID
}

// ============ 游戏实体 ============
export interface Brick {
  id: string;
  position: Vector2;
  size: Size;
  health: number;
  maxHealth: number;
  row: number;  // 所在行
}

export interface Player {
  position: Vector2;
  health: number;
  maxHealth: number;
  currentBulletSlot: number;  // 当前选中的子弹槽位索引
}

export interface Bullet {
  id: string;
  position: Vector2;
  velocity: Vector2;
  program: BulletProgram;
  bounceCount: number;        // 剩余反弹次数
  damage: number;
  radius: number;
  lastDamageTime?: number;    // 上次造成伤害的时间(用于穿透子弹CD)
  delayTime?: number;         // 延迟发射时间(秒)
  triggerProgram?: any;       // 碰撞触发的程序段(使用any避免循环引用)
}

export interface AOERing {
  id: string;
  position: Vector2;          // 中心点(撞击点)
  currentRadius: number;      // 当前半径
  maxRadius: number;          // 最大半径
  expandSpeed: number;        // 扩展速度(px/s)
  damage: number;             // 伤害值
  damagedBricks: Set<string>; // 已受伤砖块ID集合
}

// ============ 游戏状态 ============
export interface GameState {
  // 事件系统
  currentEvent: GameEventType;
  
  // 游戏实体
  player: Player;
  bricks: Brick[];
  bullets: Bullet[];
  aoeRings: AOERing[];        // AOE圆环效果
  
  // 子弹装填系统
  bumperArray: Bumper[];
  rewardBumpers: RewardBumper[];  // 奖励缓冲器列表
  bulletSlots: BulletSlot[];
  marbles: Marble[];
  currentBumperTemplate: BumperArrayTemplate;
  
  // 模块库存系统
  moduleInventory: Record<BulletModuleType, number>;
  
  // 游戏进度
  round: number;
  score: number;
  isGameOver: boolean;
  
  // UI提示
  errorMessage: string | null;  // 错误消息
  debugLog: string[];  // 调试日志
  
  // 瞄准系统
  aimingTrajectory: Vector2[] | null;  // 瞄准轨迹点列表
  aimDirection: Vector2 | null;  // 瞄准方向
  
  // 配置
  gridSize: number;  // 网格大小(砖块下落的单位)
  marbleLaunchMode: 'auto' | 'manual';  // 弹珠发射模式
  
  // 手动发射模式相关
  manualLaunchDirection: Vector2 | null;  // 手动发射方向
  pendingMarbleCount: number;  // 待发射弹珠数量
  
  // 抽奖系统
  lotteryState: {
    isActive: boolean;  // 是否正在抽奖
    modules: BulletModule[];  // 奖池模块列表
  };
  
  // 模块收集动画
  moduleCollectionAnimation: {
    queue: BulletModule[];  // 待播放的模块队列
    currentModule: BulletModule | null;  // 当前正在展示的模块
    timer: number;  // 当前动画计时器
    interval: number;  // 动画间隔(毫秒)
    targetSlotId: string | null;  // 目标槽位ID
  };
  
  // 能量转化动画
  energyConversionAnimation: {
    queue: Array<{ energy: number; modules: BulletModule[] }>;  // 待播放的能量转化队列
    current: { energy: number; modules: BulletModule[] } | null;  // 当前正在展示的能量转化
    timer: number;  // 当前动画计时器
    interval: number;  // 动画间隔(毫秒)
    targetSlotId: string | null;  // 目标槽位ID
  };
}
