// 模块注册表 - 定义所有可用的子弹模块

import { BulletModuleType, ModuleRarity } from '../types/game';
import type { BulletModule } from '../types/game';

export class ModuleRegistry {
  private static modules: Map<BulletModuleType, BulletModule> = new Map();

  static {
    // 注册所有模块
    this.registerModule({
      id: 'normal',
      type: BulletModuleType.NORMAL,
      name: '普通子弹',
      description: '碰撞砖块造成伤害，子弹消失',
      isModifier: false,
      rarity: ModuleRarity.COMMON,
    });

    this.registerModule({
      id: 'piercing',
      type: BulletModuleType.PIERCING,
      name: '穿透子弹',
      description: '穿过砖块造成伤害，碰墙反弹',
      isModifier: false,
      rarity: ModuleRarity.UNCOMMON,
    });

    this.registerModule({
      id: 'aoe',
      type: BulletModuleType.AOE,
      name: 'AOE子弹',
      description: '碰撞后产生扩展圆环，范围伤害',
      isModifier: false,
      rarity: ModuleRarity.RARE,
    });

    this.registerModule({
      id: 'bounce-plus',
      type: BulletModuleType.BOUNCE_PLUS,
      name: '反弹+1',
      description: '子弹可多反弹1次',
      isModifier: true,
      rarity: ModuleRarity.COMMON,
    });

    this.registerModule({
      id: 'scatter-plus',
      type: BulletModuleType.SCATTER_PLUS,
      name: '散射+1',
      description: '子弹分裂成多个方向',
      isModifier: true,
      rarity: ModuleRarity.UNCOMMON,
    });

    this.registerModule({
      id: 'volley-plus',
      type: BulletModuleType.VOLLEY_PLUS,
      name: '齐射+1',
      description: '同时发射多个子弹',
      isModifier: true,
      rarity: ModuleRarity.RARE,
    });

    this.registerModule({
      id: 'collision-trigger',
      type: BulletModuleType.COLLISION_TRIGGER,
      name: '碰撞触发',
      description: '碰撞时触发右侧子弹',
      isModifier: true,
      rarity: ModuleRarity.EPIC,
    });
  }

  private static registerModule(module: BulletModule) {
    this.modules.set(module.type, module);
  }

  static getModule(type: BulletModuleType): BulletModule {
    const module = this.modules.get(type);
    if (!module) {
      throw new Error(`Module type ${type} not found in registry`);
    }
    return { ...module }; // 返回副本
  }

  static getAllModules(): BulletModule[] {
    return Array.from(this.modules.values()).map((m) => ({ ...m }));
  }

  static getBaseModules(): BulletModule[] {
    return this.getAllModules().filter((m) => !m.isModifier);
  }

  static getModifierModules(): BulletModule[] {
    return this.getAllModules().filter((m) => m.isModifier);
  }

  static createModuleInstance(type: BulletModuleType): BulletModule {
    const template = this.getModule(type);
    return {
      ...template,
      id: `${template.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}
