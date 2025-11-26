// 简化版游戏引擎 - MVP实现

import type { GameState, GameEventType, Brick, Bullet, Player, BulletModuleType } from '../types/game';
import { GAME_CONFIG, COLORS } from './config';
import { generateId, circleRectCollision, normalize, distance, lerpColor } from './utils';

export class GameEngine {
  private state: GameState;
  private lastUpdate: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const player: Player = {
      position: { x: GAME_CONFIG.CANVAS_WIDTH / 2, y: GAME_CONFIG.CANVAS_HEIGHT - 50 },
      health: GAME_CONFIG.PLAYER_INITIAL_HEALTH,
      maxHealth: GAME_CONFIG.PLAYER_MAX_HEALTH,
      currentBulletSlot: 0,
    };

    // 创建初始砖块
    const bricks: Brick[] = [];
    for (let i = 0; i < GAME_CONFIG.BRICKS_PER_ROW; i++) {
      bricks.push({
        id: generateId(),
        position: {
          x: 50 + i * (GAME_CONFIG.BRICK_WIDTH + GAME_CONFIG.BRICK_SPACING),
          y: 100,
        },
        size: { width: GAME_CONFIG.BRICK_WIDTH, height: GAME_CONFIG.BRICK_HEIGHT },
        health: 10,
        maxHealth: 10,
        row: 0,
      });
    }

    return {
      currentEvent: 'PLAYER_ACTION' as GameEventType,
      player,
      bricks,
      bullets: [],
      aoeRings: [],
      bumperArray: [],
      rewardBumpers: [],
      bulletSlots: [],
      marbles: [],
      currentBumperTemplate: {
        id: 'default',
        name: '标准阵列',
        defaultBumpers: [],
        rewardBumpers: [],
      },
      moduleInventory: {
        NORMAL: 5,
        PIERCING: 5,
        AOE: 5,
        BOUNCE_PLUS: 5,
        SCATTER_PLUS: 5,
        VOLLEY_PLUS: 5,
        COLLISION_TRIGGER: 5,
      } as Record<BulletModuleType, number>,
      round: 1,
      score: 0,
      isGameOver: false,
      errorMessage: null,
      debugLog: [],
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

  getState(): GameState {
    return this.state;
  }

  update(deltaTime: number): void {
    if (this.state.isGameOver) return;

    // 更新子弹
    this.updateBullets(deltaTime);

    // 更新AOE圆环
    this.updateAOERings(deltaTime);

    // 检测碰撞
    this.checkCollisions();

    // 清理越界子弹
    this.cleanupBullets();

    // 检查游戏结束条件
    this.checkGameOver();
  }

  private updateBullets(deltaTime: number): void {
    const dt = deltaTime / 1000;

    for (const bullet of this.state.bullets) {
      // 更新位置
      bullet.position.x += bullet.velocity.x * dt;
      bullet.position.y += bullet.velocity.y * dt;

      // 边界碰撞
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

  private updateAOERings(deltaTime: number): void {
    const dt = deltaTime / 1000;

    this.state.aoeRings = this.state.aoeRings.filter((ring) => {
      ring.currentRadius += ring.expandSpeed * dt;
      return ring.currentRadius < ring.maxRadius;
    });
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
          // 造成伤害
          brick.health -= bullet.damage;

          if (brick.health <= 0) {
            bricksToRemove.push(brick.id);
            this.state.score += 10;
          }

          // 反弹或移除子弹
          if (bullet.bounceCount > 0) {
            // 计算反弹方向
            const brickCenter = {
              x: brick.position.x + brick.size.width / 2,
              y: brick.position.y + brick.size.height / 2,
            };
            const normal = normalize({
              x: bullet.position.x - brickCenter.x,
              y: bullet.position.y - brickCenter.y,
            });

            // 反射速度
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

    // 移除被摧毁的砖块
    this.state.bricks = this.state.bricks.filter((b) => !bricksToRemove.includes(b.id));

    // 移除消失的子弹
    this.state.bullets = this.state.bullets.filter((b) => !bulletsToRemove.includes(b.id));
  }

  private cleanupBullets(): void {
    this.state.bullets = this.state.bullets.filter(
      (bullet) => bullet.position.y < GAME_CONFIG.CANVAS_HEIGHT + 50
    );
  }

  private checkGameOver(): void {
    // 检查砖块是否触及底部
    for (const brick of this.state.bricks) {
      if (brick.position.y + brick.size.height >= this.state.player.position.y) {
        this.state.player.health--;
        this.state.bricks = this.state.bricks.filter((b) => b.id !== brick.id);

        if (this.state.player.health <= 0) {
          this.state.isGameOver = true;
          this.state.currentEvent = 'GAME_OVER' as GameEventType;
        }
        break;
      }
    }
  }

  shootBullet(direction: { x: number; y: number }): void {
    const bullet: Bullet = {
      id: generateId(),
      position: { ...this.state.player.position },
      velocity: {
        x: direction.x * GAME_CONFIG.BULLET_SPEED,
        y: direction.y * GAME_CONFIG.BULLET_SPEED,
      },
      program: { modules: [] },
      bounceCount: 1,
      damage: GAME_CONFIG.BULLET_DAMAGE,
      radius: GAME_CONFIG.BULLET_RADIUS,
    };

    this.state.bullets.push(bullet);
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
    this.state.round++;
  }

  reset(): void {
    this.state = this.createInitialState();
  }
}
