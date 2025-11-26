// 游戏引擎 - 完整实现四阶段循环系统

import { GameEventType, BulletModuleType, MarbleState, ModuleRarity } from '../types/game';
import type { GameState, Brick, Bullet, Player, Marble, Bumper, BulletSlot, BulletModule, BulletProgram, DamageNumber } from '../types/game';
import { GAME_CONFIG } from './config';
import { generateId, circleRectCollision, normalize, distance, randomFloat } from './utils';
import { EventManager } from './EventManager';
import { ModuleRegistry } from './ModuleRegistry';
import { BulletProgramProcessor } from './BulletProgramProcessor';
import { SceneManager, Scene } from './SceneManager';
export class GameEngine {
  private state: GameState;
  private eventManager: EventManager;
  private sceneManager: SceneManager;
  private phaseTitleTimer: number = 0;
  private showingPhaseTitle: boolean = false;

  constructor() {
    this.state = this.createInitialState();
    this.eventManager = new EventManager(this.state);
    this.sceneManager = new SceneManager();
    this.setupEventHandlers();
  }

  private createInitialState(): GameState {
    // 玩家固定在底部中央，不能移动
    const player: Player = {
      position: { x: GAME_CONFIG.CANVAS_WIDTH / 2, y: GAME_CONFIG.CANVAS_HEIGHT - 50 },
      health: GAME_CONFIG.PLAYER_INITIAL_HEALTH,
      maxHealth: GAME_CONFIG.PLAYER_MAX_HEALTH,
      currentBulletSlot: 0,
    };

    // 初始化子弹槽
    const bulletSlots: BulletSlot[] = [
      {
        id: 'slot-a',
        name: '槽位A',
        position: { x: 50, y: GAME_CONFIG.CANVAS_HEIGHT - 120 },
        width: GAME_CONFIG.SLOT_WIDTH,
        program: { modules: [] },
        energy: 0,
        energyCost: 0,
      },
      {
        id: 'slot-b',
        name: '槽位B',
        position: { x: 170, y: GAME_CONFIG.CANVAS_HEIGHT - 120 },
        width: GAME_CONFIG.SLOT_WIDTH,
        program: { modules: [] },
        energy: 0,
        energyCost: 0,
      },
      {
        id: 'slot-c',
        name: '槽位C',
        position: { x: 290, y: GAME_CONFIG.CANVAS_HEIGHT - 120 },
        width: GAME_CONFIG.SLOT_WIDTH,
        program: { modules: [] },
        energy: 0,
        energyCost: 0,
      },
    ];

    return {
      currentEvent: GameEventType.BRICK_SPAWN,
      player,
      bricks: [],
      bullets: [],
      aoeRings: [],
      damageNumbers: [],
      brickFlashTimers: new Map(),
      bumperArray: [],
      rewardBumpers: [],
      bulletSlots,
      marbles: [],
      currentBumperTemplate: {
        id: 'default',
        name: '标准阵列',
        defaultBumpers: [],
        rewardBumpers: [],
      },
      moduleInventory: {
        [BulletModuleType.NORMAL]: 10,
        [BulletModuleType.PIERCING]: 5,
        [BulletModuleType.AOE]: 5,
        [BulletModuleType.BOUNCE_PLUS]: 5,
        [BulletModuleType.SCATTER_PLUS]: 3,
        [BulletModuleType.VOLLEY_PLUS]: 3,
        [BulletModuleType.COLLISION_TRIGGER]: 2,
      },
      round: 1,
      score: 0,
      isGameOver: false,
      errorMessage: null,
      debugLog: [],
      showPhaseTitle: false,
      phaseTitleTimer: 0,
      aimingTrajectory: null,
      aimDirection: null,
      gridSize: GAME_CONFIG.GRID_SIZE,
      marbleLaunchMode: 'auto',
      manualLaunchDirection: null,
      pendingMarbleCount: 0,
      lotteryState: {
        isActive: false,
        modules: [],
      },
      moduleCollectionAnimation: {
        queue: [],
        currentModule: null,
        timer: 0,
        interval: 1000,
        targetSlotId: null,
      },
      energyConversionAnimation: {
        queue: [],
        current: null,
        timer: 0,
        interval: 1000,
        targetSlotId: null,
      },
    };
  }

  private setupEventHandlers() {
    this.eventManager.registerHandler(GameEventType.BRICK_SPAWN, () => this.handleBrickSpawn());
    this.eventManager.registerHandler(GameEventType.BULLET_LOADING, () => this.handleBulletLoading());
    this.eventManager.registerHandler(GameEventType.PLAYER_ACTION, () => this.handlePlayerAction());
    this.eventManager.registerHandler(GameEventType.BRICK_ACTION, () => this.handleBrickAction());
  }

  // ========== 阶段处理器 ==========

  private handleBrickSpawn() {
    console.log('[Phase] Brick Spawn');
    this.spawnBrickRow();
    // 移除自动切换，改为手动控制
  }

  private handleBulletLoading() {
    console.log('[Phase] Bullet Loading');
    this.initializeBumpers();
    this.state.pendingMarbleCount = 3;
    
    // 装填阶段开始时，为所有配置了编程的子弹槽充能
    for (const slot of this.state.bulletSlots) {
      if (slot.program && slot.program.modules.length > 0 && slot.energyCost > 0) {
        // 充满能量
        slot.energy = slot.energyCost;
      }
    }
    
    if (this.state.marbleLaunchMode === 'auto') {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => this.launchMarble(), i * 300);
      }
    }
  }

  private handlePlayerAction() {
    console.log('[Phase] Player Action');
  }

  private handleBrickAction() {
    console.log('[Phase] Brick Action');
    this.moveBricksDown();
    this.checkBricksTouchBottom();
    // 移除自动切换，改为手动控制
  }

  // ========== 游戏循环 ==========

  getState(): GameState {
    return this.state;
  }

  getSceneManager(): SceneManager {
    return this.sceneManager;
  }

  isShowingPhaseTitle(): boolean {
    return this.showingPhaseTitle;
  }

  update(deltaTime: number): void {
    if (this.state.isGameOver) return;

    // 更新阶段标题计时器
    if (this.state.showPhaseTitle) {
      this.state.phaseTitleTimer += deltaTime;
      if (this.state.phaseTitleTimer >= 1000) {  // 1秒后隐藏
        this.state.showPhaseTitle = false;
        this.state.phaseTitleTimer = 0;
      }
    }

    // 更新场景切换
    this.sceneManager.updateTransition(deltaTime);

    // 根据当前阶段判断是否需要切换场景
    const targetScene = this.sceneManager.getSceneForEvent(this.state.currentEvent);
    const currentScene = this.sceneManager.getCurrentScene();
    if (targetScene !== currentScene && !this.sceneManager.isTransitioning()) {
      this.sceneManager.startTransition(targetScene);
    }

    this.updateBullets(deltaTime);
    this.updateMarbles(deltaTime);
    this.updateAOERings(deltaTime);
    this.updateBumperCooldowns(deltaTime);
    this.updateVisualEffects(deltaTime / 1000); // 更新视觉效果
    this.checkCollisions();
    this.cleanup();
    
    // 自动阶段切换：检查当前阶段是否完成
    this.checkAutoPhaseTransition();
  }
  
  /**
   * 检查并执行自动阶段切换
   */
  private checkAutoPhaseTransition(): void {
    // 如果正在显示阶段标题，不进行切换
    if (this.state.showPhaseTitle) {
      return;
    }
    
    // 检查当前阶段是否完成
    if (this.eventManager.isPhaseComplete()) {
      // 特殊处理：砖块生成和砖块下沉阶段需要延迟一小段时间
      const currentPhase = this.state.currentEvent;
      if (currentPhase === GameEventType.BRICK_SPAWN || currentPhase === GameEventType.BRICK_ACTION) {
        // 等待阶段标题显示完毕后再切换（约1秒）
        // 这里简化处理，直接切换
        this.eventManager.nextPhase();
      } else {
        // 其他阶段直接切换
        this.eventManager.nextPhase();
      }
    }
  }

  private updateBullets(deltaTime: number): void {
    const dt = deltaTime / 1000;

    for (const bullet of this.state.bullets) {
      bullet.position.x += bullet.velocity.x * dt;
      bullet.position.y += bullet.velocity.y * dt;

      if (bullet.position.x - bullet.radius < 0) {
        bullet.position.x = bullet.radius;
        bullet.velocity.x = -bullet.velocity.x * GAME_CONFIG.BORDER_BOUNCE_DECAY;
      }
      if (bullet.position.x + bullet.radius > GAME_CONFIG.CANVAS_WIDTH) {
        bullet.position.x = GAME_CONFIG.CANVAS_WIDTH - bullet.radius;
        bullet.velocity.x = -bullet.velocity.x * GAME_CONFIG.BORDER_BOUNCE_DECAY;
      }
      if (bullet.position.y - bullet.radius < 0) {
        bullet.position.y = bullet.radius;
        bullet.velocity.y = -bullet.velocity.y * GAME_CONFIG.BORDER_BOUNCE_DECAY;
      }
    }
  }

  private updateMarbles(deltaTime: number): void {
    const dt = deltaTime / 1000;

    for (const marble of this.state.marbles) {
      if (marble.state !== MarbleState.FALLING) continue;

      marble.velocity.y += GAME_CONFIG.MARBLE_GRAVITY * dt;
      marble.position.x += marble.velocity.x * dt;
      marble.position.y += marble.velocity.y * dt;

      if (marble.position.x - marble.radius < 0) {
        marble.position.x = marble.radius;
        marble.velocity.x = -marble.velocity.x * GAME_CONFIG.BORDER_BOUNCE_DECAY;
      }
      if (marble.position.x + marble.radius > GAME_CONFIG.CANVAS_WIDTH) {
        marble.position.x = GAME_CONFIG.CANVAS_WIDTH - marble.radius;
        marble.velocity.x = -marble.velocity.x * GAME_CONFIG.BORDER_BOUNCE_DECAY;
      }

      this.checkMarbleBumperCollision(marble);
      this.checkMarbleSlotCollision(marble);
    }
  }

  private checkMarbleBumperCollision(marble: Marble): void {
    for (const bumper of this.state.bumperArray) {
      if (bumper.cooldown > 0) continue;

      const bumperRadius = GAME_CONFIG.BUMPER_RADIUS;
      const dist = distance(marble.position, bumper.position);
      
      if (dist < marble.radius + bumperRadius) {
        const normal = normalize({
          x: marble.position.x - bumper.position.x,
          y: marble.position.y - bumper.position.y,
        });
        const speed = Math.sqrt(marble.velocity.x ** 2 + marble.velocity.y ** 2);
        marble.velocity.x = normal.x * speed * GAME_CONFIG.MARBLE_BOUNCE_DECAY;
        marble.velocity.y = normal.y * speed * GAME_CONFIG.MARBLE_BOUNCE_DECAY;

        marble.collectedModules.push(bumper.module);
        marble.bounceCount++;

        bumper.cooldown = bumper.baseCooldown + bumper.hitCount * 100;
        bumper.hitCount++;
      }
    }
  }

  private checkMarbleSlotCollision(marble: Marble): void {
    for (const slot of this.state.bulletSlots) {
      const slotBottom = slot.position.y + GAME_CONFIG.SLOT_HEIGHT;
      
      if (
        marble.position.x >= slot.position.x &&
        marble.position.x <= slot.position.x + slot.width &&
        marble.position.y >= slot.position.y &&
        marble.position.y <= slotBottom
      ) {
        marble.state = MarbleState.IN_SLOT;
        marble.targetSlot = slot.id;
        this.handleMarbleInSlot(marble, slot);
      }
    }
  }

  private handleMarbleInSlot(marble: Marble, slot: BulletSlot): void {
    if (slot.program.modules.length === 0) {
      slot.program.modules = marble.collectedModules;
      slot.energyCost = marble.collectedModules.length * GAME_CONFIG.ENERGY_PER_MODULE;
      slot.energy = slot.energyCost;
    } else {
      const energyGain = marble.collectedModules.length * GAME_CONFIG.ENERGY_PER_MODULE * GAME_CONFIG.ENERGY_FULL_SLOT_EFFICIENCY;
      slot.energy += energyGain;
    }

    this.state.pendingMarbleCount--;
  }

  private updateAOERings(deltaTime: number): void {
    const dt = deltaTime / 1000;
    this.state.aoeRings = this.state.aoeRings.filter((ring) => {
      ring.currentRadius += ring.expandSpeed * dt;
      return ring.currentRadius < ring.maxRadius;
    });
  }

  private updateBumperCooldowns(deltaTime: number): void {
    for (const bumper of this.state.bumperArray) {
      if (bumper.cooldown > 0) {
        bumper.cooldown = Math.max(0, bumper.cooldown - deltaTime);
      }
    }
  }

  private checkCollisions(): void {
    const bulletsToRemove: string[] = [];
    const bricksToRemove: string[] = [];

    for (const bullet of this.state.bullets) {
      for (const brick of this.state.bricks) {
        if (
          circleRectCollision(
            bullet.position,
            bullet.radius,
            brick.position.x,
            brick.position.y,
            brick.size.width,
            brick.size.height
          )
        ) {
          brick.health -= bullet.damage;
          
          // 创建伤害数字效果
          this.createDamageNumber(bullet.damage, {
            x: brick.position.x + brick.size.width / 2,
            y: brick.position.y + brick.size.height / 2,
          });
          
          // 设置砖块闪烁效果
          this.state.brickFlashTimers.set(brick.id, 0.15); // 0.15秒闪烁

          if (brick.health <= 0) {
            bricksToRemove.push(brick.id);
            this.state.score += 10;
          }

          // 碰撞触发：在碰撞点发射新子弹
          if (bullet.triggerProgram) {
            const triggerBullets = this.createTriggeredBullets(
              bullet.triggerProgram,
              bullet.position
            );
            this.state.bullets.push(...triggerBullets);
          }

          if (bullet.bounceCount > 0) {
            const brickCenter = {
              x: brick.position.x + brick.size.width / 2,
              y: brick.position.y + brick.size.height / 2,
            };
            const normal = normalize({
              x: bullet.position.x - brickCenter.x,
              y: bullet.position.y - brickCenter.y,
            });

            const speed = Math.sqrt(bullet.velocity.x ** 2 + bullet.velocity.y ** 2);
            bullet.velocity.x = normal.x * speed;
            bullet.velocity.y = normal.y * speed;
            bullet.bounceCount--;
          } else {
            bulletsToRemove.push(bullet.id);
          }

          break;
        }
      }
    }

    this.state.bricks = this.state.bricks.filter((b) => !bricksToRemove.includes(b.id));
    this.state.bullets = this.state.bullets.filter((b) => !bulletsToRemove.includes(b.id));
  }

  private cleanup(): void {
    this.state.bullets = this.state.bullets.filter(
      (bullet) => bullet.position.y < GAME_CONFIG.CANVAS_HEIGHT + 50
    );

    this.state.marbles = this.state.marbles.filter((marble) => {
      if (marble.position.y > GAME_CONFIG.CANVAS_HEIGHT + 50) {
        if (marble.state === MarbleState.FALLING) {
          this.state.pendingMarbleCount--;
        }
        return false;
      }
      return marble.state === MarbleState.FALLING;
    });
  }

  // ========== 游戏操作 ==========

  shootBullet(direction: { x: number; y: number }): void {
    const slot = this.state.bulletSlots[this.state.player.currentBulletSlot];
    
    // 验证编程
    const validation = BulletProgramProcessor.validate(slot.program);
    if (!validation.valid) {
      this.state.errorMessage = validation.error || '子弹编程无效';
      return;
    }

    if (slot.energy < slot.energyCost) {
      this.state.errorMessage = '能量不足';
      return;
    }

    // 生成延迟发射的子弹组
    const bulletGroups = BulletProgramProcessor.createDelayedBulletGroups(
      slot.program,
      this.state.player.position,
      direction
    );

    // 立即发射第一组
    if (bulletGroups.length > 0) {
      this.state.bullets.push(...bulletGroups[0].bullets);
    }

    // 延迟发射其他组
    for (let i = 1; i < bulletGroups.length; i++) {
      const group = bulletGroups[i];
      setTimeout(() => {
        this.state.bullets.push(...group.bullets);
      }, group.delay * 1000);
    }

    slot.energy -= slot.energyCost;
    this.state.errorMessage = null;
  }

  // 创建伤害数字效果
  private createDamageNumber(damage: number, position: { x: number; y: number }): void {
    const damageNumber: DamageNumber = {
      id: generateId(),
      position: { ...position },
      damage,
      lifetime: 1.0, // 1秒生命时间
      velocity: { x: 0, y: -50 }, // 向上移动
    };
    this.state.damageNumbers.push(damageNumber);
  }
  
  // 更新视觉效果
  private updateVisualEffects(deltaTime: number): void {
    // 更新伤害数字
    this.state.damageNumbers = this.state.damageNumbers.filter((dn) => {
      dn.position.x += dn.velocity.x * deltaTime;
      dn.position.y += dn.velocity.y * deltaTime;
      dn.lifetime -= deltaTime;
      return dn.lifetime > 0;
    });
    
    // 更新砖块闪烁计时器
    const brickIdsToRemove: string[] = [];
    this.state.brickFlashTimers.forEach((timer, brickId) => {
      const newTimer = timer - deltaTime;
      if (newTimer <= 0) {
        brickIdsToRemove.push(brickId);
      } else {
        this.state.brickFlashTimers.set(brickId, newTimer);
      }
    });
    brickIdsToRemove.forEach(id => this.state.brickFlashTimers.delete(id));
  }

  // 创建碰撞触发的子弹
  private createTriggeredBullets(
    triggerProgram: BulletProgram,
    position: { x: number; y: number }
  ): Bullet[] {
    const groups = BulletProgramProcessor.parseGroups(triggerProgram);
    const allBullets: Bullet[] = [];

    for (const group of groups) {
      const config = BulletProgramProcessor.processGroup(group);
      
      // 向四周发射（散射效果）
      const angleCount = Math.max(config.scatterCount, config.volleyCount);
      const angles = BulletProgramProcessor.generateAngles(0, angleCount, 360);

      for (const angle of angles) {
        const bullet: Bullet = {
          id: `bullet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          position: { ...position },
          velocity: {
            x: Math.cos(angle) * GAME_CONFIG.BULLET_SPEED,
            y: Math.sin(angle) * GAME_CONFIG.BULLET_SPEED,
          },
          program: { modules: [group.bulletType] },
          bounceCount: config.bounceCount,
          damage: config.damage,
          radius: GAME_CONFIG.BULLET_RADIUS,
        };

        // 穿透子弹特殊处理
        if (config.baseType === BulletModuleType.PIERCING) {
          bullet.lastDamageTime = 0;
        }

        allBullets.push(bullet);
      }
    }

    return allBullets;
  }

  spawnBrickRow(): void {
    for (let i = 0; i < GAME_CONFIG.BRICKS_PER_ROW; i++) {
      this.state.bricks.push({
        id: generateId(),
        position: {
          x: 50 + i * (GAME_CONFIG.BRICK_WIDTH + GAME_CONFIG.BRICK_SPACING),
          y: 50,
        },
        size: { width: GAME_CONFIG.BRICK_WIDTH, height: GAME_CONFIG.BRICK_HEIGHT },
        health: this.state.round * GAME_CONFIG.BRICK_HEALTH_MULTIPLIER,
        maxHealth: this.state.round * GAME_CONFIG.BRICK_HEALTH_MULTIPLIER,
        row: 0,
      });
    }
  }

  moveBricksDown(): void {
    for (const brick of this.state.bricks) {
      brick.position.y += GAME_CONFIG.GRID_SIZE;
      brick.row++;
    }
  }

  checkBricksTouchBottom(): void {
    const touchedBricks = this.state.bricks.filter(
      (brick) => brick.position.y + brick.size.height >= this.state.player.position.y
    );

    for (const brick of touchedBricks) {
      this.state.player.health--;
      this.state.bricks = this.state.bricks.filter((b) => b.id !== brick.id);

      if (this.state.player.health <= 0) {
        this.state.isGameOver = true;
        this.state.currentEvent = GameEventType.GAME_OVER;
      }
    }
  }

  launchMarble(): void {
    const marble: Marble = {
      id: generateId(),
      position: { x: GAME_CONFIG.CANVAS_WIDTH / 2, y: 50 },
      velocity: {
        x: randomFloat(GAME_CONFIG.MARBLE_INITIAL_SPEED_X_RANGE[0], GAME_CONFIG.MARBLE_INITIAL_SPEED_X_RANGE[1]),
        y: 0,
      },
      radius: GAME_CONFIG.MARBLE_RADIUS,
      state: MarbleState.FALLING,
      collectedModules: [],
      bounceCount: 0,
    };

    this.state.marbles.push(marble);
  }

  initializeBumpers(): void {
    this.state.bumperArray = [];
    
    const layers = [
      { y: 200, count: 3 },
      { y: 280, count: 3 },
      { y: 360, count: 2 },
    ];

    const moduleTypes = [
      BulletModuleType.NORMAL,
      BulletModuleType.NORMAL,
      BulletModuleType.PIERCING,
      BulletModuleType.AOE,
      BulletModuleType.BOUNCE_PLUS,
      BulletModuleType.SCATTER_PLUS,
      BulletModuleType.VOLLEY_PLUS,
      BulletModuleType.COLLISION_TRIGGER,
    ];

    let moduleIndex = 0;
    for (const layer of layers) {
      const spacing = GAME_CONFIG.CANVAS_WIDTH / (layer.count + 1);
      for (let i = 0; i < layer.count; i++) {
        const moduleType = moduleTypes[moduleIndex % moduleTypes.length];
        const bumper: Bumper = {
          id: generateId(),
          position: { x: spacing * (i + 1), y: layer.y },
          module: ModuleRegistry.createModuleInstance(moduleType),
          cooldown: 0,
          baseCooldown: GAME_CONFIG.BUMPER_COOLDOWN,
          hitCount: 0,
        };
        this.state.bumperArray.push(bumper);
        moduleIndex++;
      }
    }
  }

  nextPhase(): void {
    this.eventManager.nextPhase();
  }

  reset(): void {
    this.state = this.createInitialState();
    this.eventManager = new EventManager(this.state);
    this.setupEventHandlers();
  }
}
