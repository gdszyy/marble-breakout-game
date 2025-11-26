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

// 子弹发射组（一组修饰器+一个子弹类型）
export interface BulletGroup {
  modifiers: BulletModule[]; // 修饰器列表
  bulletType: BulletModule; // 子弹类型
  hasCollisionTrigger: boolean; // 是否有碰撞触发
  triggerProgram?: BulletProgram; // 碰撞触发的子程序
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
   * 解析子弹编程为多个发射组
   * 示例: [齐射+2] [普通] [普通] [穿透] 
   * => 组1: {modifiers: [齐射+2], bulletType: 普通}
   *    组2: {modifiers: [], bulletType: 普通}
   *    组3: {modifiers: [], bulletType: 穿透}
   */
  static parseGroups(program: BulletProgram): BulletGroup[] {
    const modules = program.modules;
    const groups: BulletGroup[] = [];
    let currentModifiers: BulletModule[] = [];
    let foundCollisionTrigger = false;
    let collisionTriggerIndex = -1;

    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];

      // 检查碰撞触发
      if (module.type === BulletModuleType.COLLISION_TRIGGER) {
        foundCollisionTrigger = true;
        collisionTriggerIndex = i;
        continue;
      }

      if (module.isModifier) {
        // 修饰器累积
        currentModifiers.push(module);
      } else {
        // 子弹类型：创建一个发射组
        const group: BulletGroup = {
          modifiers: [...currentModifiers],
          bulletType: module,
          hasCollisionTrigger: false,
        };

        // 如果这是碰撞触发之前的最后一个子弹，设置触发程序
        if (foundCollisionTrigger && collisionTriggerIndex < i) {
          group.hasCollisionTrigger = true;
          group.triggerProgram = {
            modules: modules.slice(collisionTriggerIndex + 1),
          };
          foundCollisionTrigger = false; // 只对第一个子弹生效
        }

        groups.push(group);
        currentModifiers = []; // 清空修饰器
      }
    }

    return groups;
  }

  /**
   * 处理单个发射组，生成配置
   */
  static processGroup(group: BulletGroup): ProcessedBulletConfig {
    const config: ProcessedBulletConfig = {
      baseType: group.bulletType.type,
      bounceCount: this.getBaseBounceCount(group.bulletType.type),
      scatterCount: 1,
      volleyCount: 1,
      damage: GAME_CONFIG.BULLET_DAMAGE,
      hasCollisionTrigger: group.hasCollisionTrigger,
      triggerProgram: group.triggerProgram,
    };

    // 应用修饰器
    for (const modifier of group.modifiers) {
      this.applyModifier(config, modifier);
    }

    return config;
  }

  /**
   * 解析子弹编程，生成第一组子弹的配置（兼容旧接口）
   */
  static process(program: BulletProgram): ProcessedBulletConfig {
    const groups = this.parseGroups(program);
    if (groups.length === 0) {
      throw new Error('No bullet groups found');
    }
    return this.processGroup(groups[0]);
  }

  /**
   * 获取基础子弹的反弹次数
   */
  private static getBaseBounceCount(baseType: BulletModuleType): number {
    switch (baseType) {
      case BulletModuleType.NORMAL:
        return 0; // 普通子弹不反弹
      case BulletModuleType.PIERCING:
        return 3; // 穿透子弹默认3次穿透
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
        // 反弹+1：对普通子弹增加反弹，对穿透子弹增加穿透次数
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
   * 创建子弹实例（单个发射组）
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

  /**
   * 创建延迟发射的所有子弹组
   * 返回: { bullets: Bullet[], delay: number }[]
   */
  static createDelayedBulletGroups(
    program: BulletProgram,
    position: { x: number; y: number },
    direction: { x: number; y: number }
  ): Array<{ bullets: Bullet[]; delay: number }> {
    const groups = this.parseGroups(program);
    const result: Array<{ bullets: Bullet[]; delay: number }> = [];

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const config = this.processGroup(group);
      const bullets = this.createBullets(
        config,
        position,
        direction,
        { modules: [group.bulletType] } // 单个子弹的program
      );

      result.push({
        bullets,
        delay: i * 0.2, // 每组延迟0.2秒
      });
    }

    return result;
  }
}
