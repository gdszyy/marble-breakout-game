/**
 * 粒子系统管理器
 * 使用PixiJS v8原生粒子系统
 */

import { Container, Graphics, Sprite, Texture, Renderer } from 'pixi.js';
import { ParticleTextureGenerator, ParticleTextureType } from './ParticleTextures';

export interface SimpleParticle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  fadeOut: boolean;
  scaleStart: number;
  scaleEnd: number;
}

export interface ParticleEffect {
  container: Container;
  particles: SimpleParticle[];
  autoDestroy: boolean;
  lifetime?: number;
  createdAt: number;
  emitRate?: number;
  lastEmit?: number;
}

export class ParticleManager {
  private particleEffects: ParticleEffect[] = [];
  private textureGenerator: ParticleTextureGenerator;
  private defaultTexture: Texture;

  constructor(renderer: Renderer) {
    this.textureGenerator = new ParticleTextureGenerator(renderer);
    this.defaultTexture = this.textureGenerator.getTexture(ParticleTextureType.CIRCLE) || Texture.WHITE;
  }

  /**
   * 创建子弹发射火花效果
   */
  createLaunchSpark(container: Container, x: number, y: number): ParticleEffect {
    console.log('[ParticleManager] Creating launch spark at', x, y);
    const effectContainer = new Container();
    effectContainer.position.set(x, y);
    container.addChild(effectContainer);
    console.log('[ParticleManager] Effect container added to parent:', container);

    const particles: SimpleParticle[] = [];

    // 创建20个火花粒子（使用SPARK纹理）
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 100 + Math.random() * 100;
      const particle = this.createParticle(
        effectContainer,
        0,
        0,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.2 + Math.random() * 0.2,
        2.0, // 增大初始尺寸
        0.5, // 增大结束尺寸
        0xffff00, // 黄色
        ParticleTextureType.SPARK
      );
      particles.push(particle);
    }

    const effect: ParticleEffect = {
      container: effectContainer,
      particles,
      autoDestroy: true,
      lifetime: 0.5,
      createdAt: Date.now(),
    };

    this.particleEffects.push(effect);
    console.log('[ParticleManager] Launch spark created with', particles.length, 'particles');
    console.log('[ParticleManager] Total effects:', this.particleEffects.length);
    return effect;
  }

  /**
   * 创建子弹飞行拖尾效果
   */
  createBulletTrail(container: Container, x: number, y: number): ParticleEffect {
    const effectContainer = new Container();
    effectContainer.position.set(x, y);
    container.addChild(effectContainer);

    const effect: ParticleEffect = {
      container: effectContainer,
      particles: [],
      autoDestroy: false,
      createdAt: Date.now(),
      emitRate: 0.02, // 每0.02秒发射一个粒子
      lastEmit: Date.now(),
    };

    this.particleEffects.push(effect);
    return effect;
  }

  /**
   * 为拖尾效果发射新粒子
   */
  emitTrailParticle(effect: ParticleEffect): void {
    if (!effect.emitRate) return;

    const now = Date.now();
    if (effect.lastEmit && now - effect.lastEmit < effect.emitRate * 1000) {
      return;
    }

    effect.lastEmit = now;

      const particle = this.createParticle(
        effect.container,
        0,
        0,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        0.3 + Math.random() * 0.2,
        1.5, // 增大初始尺寸
        0.5, // 增大结束尺寸
        0x00aaff, // 蓝色
        ParticleTextureType.SMOKE
      );
    effect.particles.push(particle);
  }

  /**
   * 创建子弹碰撞爆炸效果
   */
  createExplosion(container: Container, x: number, y: number): ParticleEffect {
    const effectContainer = new Container();
    effectContainer.position.set(x, y);
    container.addChild(effectContainer);

    const particles: SimpleParticle[] = [];

    // 创建30个爆炸粒子（使用STAR纹理）
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      const speed = 150 + Math.random() * 150;
      const particle = this.createParticle(
        effectContainer,
        0,
        0,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.3 + Math.random() * 0.3,
        2.5, // 增大初始尺寸
        1.0, // 增大结束尺寸
        0xff8800, // 橙色
        ParticleTextureType.STAR
      );
      particles.push(particle);
    }

    const effect: ParticleEffect = {
      container: effectContainer,
      particles,
      autoDestroy: true,
      lifetime: 0.7,
      createdAt: Date.now(),
    };

    this.particleEffects.push(effect);
    return effect;
  }

  /**
   * 创建AOE范围指示粒子
   */
  createAOERing(
    container: Container,
    x: number,
    y: number,
    radius: number
  ): ParticleEffect {
    const effectContainer = new Container();
    effectContainer.position.set(x, y);
    container.addChild(effectContainer);

    const effect: ParticleEffect = {
      container: effectContainer,
      particles: [],
      autoDestroy: false,
      createdAt: Date.now(),
      emitRate: 0.01, // 每0.01秒发射粒子
      lastEmit: Date.now(),
    };

    // 初始化一些粒子形成圆环（使用GLOW纹理）
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      const particle = this.createParticle(
        effectContainer,
        px,
        py,
        Math.cos(angle) * 30,
        Math.sin(angle) * 30,
        0.5 + Math.random() * 0.5,
        0.2,
        0.1,
        0xff00ff, // 紫色
        ParticleTextureType.GLOW
      );
      effect.particles.push(particle);
    }

    this.particleEffects.push(effect);
    return effect;
  }

  /**
   * 创建单个粒子
   */
  private createParticle(
    container: Container,
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    scaleStart: number,
    scaleEnd: number,
    tint: number,
    textureType?: ParticleTextureType
  ): SimpleParticle {
    const texture = textureType 
      ? (this.textureGenerator.getTexture(textureType) || this.defaultTexture)
      : this.defaultTexture;
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.position.set(x, y);
    sprite.scale.set(scaleStart);
    sprite.tint = tint;
    container.addChild(sprite);

    return {
      sprite,
      vx,
      vy,
      life,
      maxLife: life,
      fadeOut: true,
      scaleStart,
      scaleEnd,
    };
  }

  /**
   * 更新粒子位置（用于跟随子弹或AOE环移动）
   */
  updateParticlePosition(effect: ParticleEffect, x: number, y: number): void {
    effect.container.position.set(x, y);
  }

  /**
   * 销毁粒子效果
   */
  destroyEffect(effect: ParticleEffect): void {
    for (const particle of effect.particles) {
      particle.sprite.destroy();
    }
    effect.container.parent?.removeChild(effect.container);
    effect.container.destroy();

    const index = this.particleEffects.indexOf(effect);
    if (index > -1) {
      this.particleEffects.splice(index, 1);
    }
  }

  /**
   * 更新所有粒子效果
   */
  update(deltaTime: number): void {
    const now = Date.now();
    const effectsToDestroy: ParticleEffect[] = [];
    const dt = deltaTime * 0.001; // 转换为秒

    for (const effect of this.particleEffects) {
      // 更新粒子
      const particlesToRemove: SimpleParticle[] = [];

      for (const particle of effect.particles) {
        // 更新位置
        particle.sprite.x += particle.vx * dt;
        particle.sprite.y += particle.vy * dt;

        // 应用重力（仅对某些效果）
        if (effect.autoDestroy) {
          particle.vy += 200 * dt; // 重力加速度
        }

        // 更新生命值
        particle.life -= dt;

        if (particle.life <= 0) {
          particle.sprite.destroy();
          particlesToRemove.push(particle);
        } else {
          // 更新透明度
          const lifeRatio = particle.life / particle.maxLife;
          if (particle.fadeOut) {
            particle.sprite.alpha = lifeRatio;
          }

          // 更新缩放
          const scale =
            particle.scaleStart +
            (particle.scaleEnd - particle.scaleStart) * (1 - lifeRatio);
          particle.sprite.scale.set(scale);
        }
      }

      // 移除死亡的粒子
      for (const particle of particlesToRemove) {
        const index = effect.particles.indexOf(particle);
        if (index > -1) {
          effect.particles.splice(index, 1);
        }
      }

      // 为持续发射的效果发射新粒子
      if (effect.emitRate && !effect.autoDestroy) {
        this.emitTrailParticle(effect);
      }

      // 检查是否需要自动销毁
      if (effect.autoDestroy && effect.lifetime) {
        const elapsed = (now - effect.createdAt) / 1000;
        if (elapsed >= effect.lifetime && effect.particles.length === 0) {
          effectsToDestroy.push(effect);
        }
      }
    }

    // 销毁过期的粒子效果
    for (const effect of effectsToDestroy) {
      this.destroyEffect(effect);
    }
  }

  /**
   * 清理所有粒子效果
   */
  cleanup(): void {
    for (const effect of [...this.particleEffects]) {
      this.destroyEffect(effect);
    }
    this.particleEffects = [];
    this.textureGenerator.destroy();
  }
}
