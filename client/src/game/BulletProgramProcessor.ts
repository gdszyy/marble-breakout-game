// 子弹编程处理器 - 解析模块组合并生成子弹效果

import { BulletModuleType } from '../types/game';
import type { BulletModule, BulletProgram, Bullet } from '../types/game';
import { GAME_CONFIG } from './config';

export interface ProcessedBulletConfig {
  baseType: BulletModuleType; // 基础子弹类型
  bounceCount: number; // 反弹次数
  scatterCount: number; // 散射数量
  volleyCount: number; // 齐射数量
  damage: number; // 伤害值
  hasCollisionTrigger: boolean; // 是否有碰撞触发
  triggerProgram?: BulletProgram; // 触发的子程序
}

export class BulletProgramProcessor {
  /**
   * 验证子弹编程是否有效
   */
  static validate(program: BulletProgram): { valid: boolean; error?: string } {
    if (program.modules.length === 0) {
      return { valid: false, error: '至少需要一个模块' };
    }

    // 检查是否有基础子弹模块
    const hasBaseModule = program.modules.some((m) => !m.isModifier);
    if (!hasBaseModule) {
      return { valid: false, error: '至少需要一个基础子弹模块' };
    }

    return { valid: true };
  }

  /**
   * 解析子弹编程，生成配置
   */
  static process(program: BulletProgram): ProcessedBulletConfig {
    const modules = program.modules;
    
    // 找到第一个基础子弹模块
    const baseModuleIndex = modules.findIndex((m) => !m.isModifier);
    if (baseModuleIndex === -1) {
      throw new Error('No base bullet module found');
    }

    const baseModule = modules[baseModuleIndex];
    const modifiers = modules.slice(0, baseModuleIndex); // 左侧的修饰模块

    // 初始配置
    const config: ProcessedBulletConfig = {
      baseType: baseModule.type,
      bounceCount: this.getBaseBounceCount(baseModule.type),
      scatterCount: 1,
      volleyCount: 1,
      damage: GAME_CONFIG.BULLET_DAMAGE,
      hasCollisionTrigger: false,
    };

    // 应用修饰模块
    for (const modifier of modifiers) {
      this.applyModifier(config, modifier);
    }

    // 检查碰撞触发
    const collisionTriggerIndex = modules.findIndex((m) => m.type === BulletModuleType.COLLISION_TRIGGER);
    if (collisionTriggerIndex !== -1 && collisionTriggerIndex < modules.length - 1) {
      config.hasCollisionTrigger = true;
      // 触发的子程序是碰撞触发模块右侧的所有模块
      config.triggerProgram = {
        modules: modules.slice(collisionTriggerIndex + 1),
      };
    }

    return config;
  }

  /**
   * 获取基础子弹的反弹次数
   */
  private static getBaseBounceCount(baseType: BulletModuleType): number {
    switch (baseType) {
      case BulletModuleType.NORMAL:
        return 0; // 普通子弹不反弹
      case BulletModuleType.PIERCING:
        return 3; // 穿透子弹默认3次反弹
      case BulletModuleType.AOE:
        return 0; // AOE子弹不反弹
      default:
        return 0;
    }
  }

  /**
   * 应用修饰模块
   */
  private static applyModifier(config: ProcessedBulletConfig, modifier: BulletModule): void {
    switch (modifier.type) {
      case BulletModuleType.BOUNCE_PLUS:
        config.bounceCount += 1;
        break;
      case BulletModuleType.SCATTER_PLUS:
        config.scatterCount += 1;
        break;
      case BulletModuleType.VOLLEY_PLUS:
        config.volleyCount += 1;
        break;
    }
  }

  /**
   * 计算能量消耗
   */
  static calculateEnergyCost(program: BulletProgram): number {
    return program.modules.length * GAME_CONFIG.ENERGY_PER_MODULE;
  }

  /**
   * 生成发射角度（用于散射和齐射）
   */
  static generateAngles(baseAngle: number, count: number, spread: number = 30): number[] {
    if (count === 1) {
      return [baseAngle];
    }

    const angles: number[] = [];
    const angleStep = spread / (count - 1);
    const startAngle = baseAngle - spread / 2;

    for (let i = 0; i < count; i++) {
      angles.push(startAngle + angleStep * i);
    }

    return angles;
  }

  /**
   * 创建子弹实例
   */
  static createBullets(
    config: ProcessedBulletConfig,
    position: { x: number; y: number },
    direction: { x: number; y: number },
    program: BulletProgram
  ): Bullet[] {
    const bullets: Bullet[] = [];

    // 计算基础角度
    const baseAngle = Math.atan2(direction.y, direction.x);

    // 齐射：同时发射多个子弹
    const volleyAngles = this.generateAngles(baseAngle, config.volleyCount, 20);

    for (const volleyAngle of volleyAngles) {
      // 散射：每个齐射子弹分裂成多个方向
      const scatterAngles = this.generateAngles(volleyAngle, config.scatterCount, 30);

      for (const scatterAngle of scatterAngles) {
        const bullet: Bullet = {
          id: `bullet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          position: { ...position },
          velocity: {
            x: Math.cos(scatterAngle) * GAME_CONFIG.BULLET_SPEED,
            y: Math.sin(scatterAngle) * GAME_CONFIG.BULLET_SPEED,
          },
          program: { modules: [...program.modules] },
          bounceCount: config.bounceCount,
          damage: config.damage,
          radius: GAME_CONFIG.BULLET_RADIUS,
        };

        // 穿透子弹特殊处理
        if (config.baseType === BulletModuleType.PIERCING) {
          bullet.lastDamageTime = 0;
        }

        // 碰撞触发
        if (config.hasCollisionTrigger && config.triggerProgram) {
          bullet.triggerProgram = config.triggerProgram;
        }

        bullets.push(bullet);
      }
    }

    return bullets;
  }
}
