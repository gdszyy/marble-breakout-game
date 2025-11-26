/**
 * 粒子纹理生成器
 * 使用PixiJS Graphics创建各种粒子纹理
 */

import { Graphics, RenderTexture, Renderer } from 'pixi.js';

export enum ParticleTextureType {
  SPARK = 'spark',           // 火花（发射效果）
  CIRCLE = 'circle',         // 圆形（通用）
  STAR = 'star',             // 星形（爆炸效果）
  SMOKE = 'smoke',           // 烟雾（拖尾效果）
  GLOW = 'glow',             // 发光球（特殊效果）
}

export class ParticleTextureGenerator {
  private textures: Map<ParticleTextureType, RenderTexture> = new Map();
  private renderer: Renderer;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.generateAllTextures();
  }

  /**
   * 生成所有粒子纹理
   */
  private generateAllTextures(): void {
    this.textures.set(ParticleTextureType.SPARK, this.createSparkTexture());
    this.textures.set(ParticleTextureType.CIRCLE, this.createCircleTexture());
    this.textures.set(ParticleTextureType.STAR, this.createStarTexture());
    this.textures.set(ParticleTextureType.SMOKE, this.createSmokeTexture());
    this.textures.set(ParticleTextureType.GLOW, this.createGlowTexture());
  }

  /**
   * 获取指定类型的纹理
   */
  getTexture(type: ParticleTextureType): RenderTexture | undefined {
    return this.textures.get(type);
  }

  /**
   * 创建火花纹理（菱形，适合发射效果）
   */
  private createSparkTexture(): RenderTexture {
    const graphics = new Graphics();
    const size = 32; // 增大纹理尺寸
    
    // 绘制菱形
    graphics.moveTo(size / 2, 0);
    graphics.lineTo(size, size / 2);
    graphics.lineTo(size / 2, size);
    graphics.lineTo(0, size / 2);
    graphics.closePath();
    graphics.fill({ color: 0xffffff, alpha: 1 });
    
    // 添加内部高光
    graphics.circle(size / 2, size / 2, size / 4);
    graphics.fill({ color: 0xffffff, alpha: 0.8 });

    const texture = RenderTexture.create({ width: size, height: size });
    this.renderer.render({ container: graphics, target: texture });
    graphics.destroy();
    
    return texture;
  }

  /**
   * 创建圆形纹理（通用粒子）
   */
  private createCircleTexture(): RenderTexture {
    const graphics = new Graphics();
    const size = 32; // 增大纹理尺寸
    const radius = size / 2;
    
    // 绘制渐变圆形（从中心到边缘渐变）
    graphics.circle(radius, radius, radius);
    graphics.fill({ color: 0xffffff, alpha: 1 });
    
    // 添加中心高光
    graphics.circle(radius, radius, radius * 0.5);
    graphics.fill({ color: 0xffffff, alpha: 0.9 });

    const texture = RenderTexture.create({ width: size, height: size });
    this.renderer.render({ container: graphics, target: texture });
    graphics.destroy();
    
    return texture;
  }

  /**
   * 创建星形纹理（五角星，适合爆炸效果）
   */
  private createStarTexture(): RenderTexture {
    const graphics = new Graphics();
    const size = 32; // 增大纹理尺寸
    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = size / 2;
    const innerRadius = size / 4;
    const points = 5;
    
    // 绘制五角星
    for (let i = 0; i < points * 2; i++) {
      const angle = (Math.PI * i) / points - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (i === 0) {
        graphics.moveTo(x, y);
      } else {
        graphics.lineTo(x, y);
      }
    }
    graphics.closePath();
    graphics.fill({ color: 0xffffff, alpha: 1 });
    
    // 添加中心光点
    graphics.circle(centerX, centerY, innerRadius * 0.6);
    graphics.fill({ color: 0xffffff, alpha: 0.9 });

    const texture = RenderTexture.create({ width: size, height: size });
    this.renderer.render({ container: graphics, target: texture });
    graphics.destroy();
    
    return texture;
  }

  /**
   * 创建烟雾纹理（柔和的圆形，适合拖尾效果）
   */
  private createSmokeTexture(): RenderTexture {
    const graphics = new Graphics();
    const size = 32; // 增大纹理尺寸
    const centerX = size / 2;
    const centerY = size / 2;
    
    // 绘制多层半透明圆形模拟烟雾效果
    const layers = 3;
    for (let i = layers; i > 0; i--) {
      const radius = (size / 2) * (i / layers);
      const alpha = 0.3 * (i / layers);
      graphics.circle(centerX, centerY, radius);
      graphics.fill({ color: 0xffffff, alpha });
    }

    const texture = RenderTexture.create({ width: size, height: size });
    this.renderer.render({ container: graphics, target: texture });
    graphics.destroy();
    
    return texture;
  }

  /**
   * 创建发光球纹理（带光晕的圆形）
   */
  private createGlowTexture(): RenderTexture {
    const graphics = new Graphics();
    const size = 32; // 增大纹理尺寸
    const centerX = size / 2;
    const centerY = size / 2;
    
    // 外层光晕
    graphics.circle(centerX, centerY, size / 2);
    graphics.fill({ color: 0xffffff, alpha: 0.1 });
    
    // 中层光晕
    graphics.circle(centerX, centerY, size / 3);
    graphics.fill({ color: 0xffffff, alpha: 0.3 });
    
    // 内核
    graphics.circle(centerX, centerY, size / 6);
    graphics.fill({ color: 0xffffff, alpha: 1 });

    const texture = RenderTexture.create({ width: size, height: size });
    this.renderer.render({ container: graphics, target: texture });
    graphics.destroy();
    
    return texture;
  }

  /**
   * 清理所有纹理
   */
  destroy(): void {
    for (const texture of Array.from(this.textures.values())) {
      texture.destroy(true);
    }
    this.textures.clear();
  }
}
