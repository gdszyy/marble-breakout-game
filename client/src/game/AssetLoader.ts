// 资源加载器 - 加载游戏图片资源

import * as PIXI from 'pixi.js';

export interface GameAssets {
  // 砖块（晶石魔像）
  brickRed: PIXI.Texture;
  brickOrange: PIXI.Texture;
  brickPurple: PIXI.Texture;
  
  // 子弹（魔药）
  bulletNormal: PIXI.Texture;
  bulletPiercing: PIXI.Texture;
  bulletAOE: PIXI.Texture;
  
  // 弹珠（能量水滴）
  marble: PIXI.Texture;
  
  // 缓冲器（材料注入点）
  bumper: PIXI.Texture;
  bumperReward: PIXI.Texture;
}

export class AssetLoader {
  private static assets: GameAssets | null = null;
  private static loading: boolean = false;

  /**
   * 加载所有游戏资源
   */
  static async load(): Promise<GameAssets> {
    if (this.assets) {
      return this.assets;
    }

    if (this.loading) {
      // 等待加载完成
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.assets) {
            clearInterval(checkInterval);
            resolve(this.assets);
          }
        }, 100);
      });
    }

    this.loading = true;

    try {
      const basePath = '/game_assets';

      // 加载所有纹理
      const textures = await PIXI.Assets.load([
        `${basePath}/enemies/crystal_golem_red_dark_v2.webp`,
        `${basePath}/crystal_golem_orange.webp`,
        `${basePath}/crystal_golem_purple.webp`,
        `${basePath}/potions/explosive_elixir_purple_potion.webp`,
        `${basePath}/piercing_essence_blue.webp`,
        `${basePath}/flame_tincture_red.webp`,
        `${basePath}/energy_droplet_cyan.webp`,
        `${basePath}/material_injection_point_cyan.webp`,
        `${basePath}/sages_touch_golden.webp`,
      ]);

      this.assets = {
        brickRed: textures[`${basePath}/enemies/crystal_golem_red_dark_v2.webp`],
        brickOrange: textures[`${basePath}/crystal_golem_orange.webp`],
        brickPurple: textures[`${basePath}/crystal_golem_purple.webp`],
        bulletNormal: textures[`${basePath}/flame_tincture_red.webp`],
        bulletPiercing: textures[`${basePath}/piercing_essence_blue.webp`],
        bulletAOE: textures[`${basePath}/potions/explosive_elixir_purple_potion.webp`],
        marble: textures[`${basePath}/energy_droplet_cyan.webp`],
        bumper: textures[`${basePath}/material_injection_point_cyan.webp`],
        bumperReward: textures[`${basePath}/sages_touch_golden.webp`],
      };

      this.loading = false;
      return this.assets;
    } catch (error) {
      console.error('Failed to load game assets:', error);
      this.loading = false;
      throw error;
    }
  }

  /**
   * 获取已加载的资源
   */
  static getAssets(): GameAssets | null {
    return this.assets;
  }

  /**
   * 根据生命值百分比选择砖块纹理
   */
  static getBrickTexture(healthPercent: number): PIXI.Texture | null {
    if (!this.assets) return null;

    if (healthPercent > 0.66) {
      return this.assets.brickRed;
    } else if (healthPercent > 0.33) {
      return this.assets.brickOrange;
    } else {
      return this.assets.brickPurple;
    }
  }

  /**
   * 根据子弹类型选择纹理
   */
  static getBulletTexture(bulletType: string): PIXI.Texture | null {
    if (!this.assets) return null;

    switch (bulletType) {
      case 'PIERCING':
        return this.assets.bulletPiercing;
      case 'AOE':
        return this.assets.bulletAOE;
      default:
        return this.assets.bulletNormal;
    }
  }
}
