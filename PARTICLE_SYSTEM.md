# 粒子系统说明文档

## 概述

本游戏使用PixiJS v8原生粒子系统实现了丰富的视觉特效，增强了游戏的沉浸感和反馈体验。粒子系统支持多种精美纹理（火花、星星、烟雾、发光球），为不同的游戏事件提供独特的视觉反馈。

## 架构设计

### 核心组件

1. **ParticleManager** (`client/src/game/ParticleManager.ts`)
   - 管理所有粒子效果的生命周期
   - 提供创建、更新、销毁粒子效果的接口
   - 使用PixiJS的Sprite和Container实现轻量级粒子系统
   - 支持多种粒子纹理类型

2. **ParticleTextureGenerator** (`client/src/game/ParticleTextures.ts`)
   - 使用PixiJS Graphics动态生成粒子纹理
   - 提供5种纹理类型：火花、圆形、星形、烟雾、发光球
   - 纹理在初始化时生成并缓存，提升性能

3. **Game.tsx集成**
   - 在渲染层管理ParticleManager实例
   - 跟踪子弹和AOE状态变化，触发相应粒子效果
   - 在游戏主循环中更新粒子系统

### 设计原则

- **关注点分离**：GameEngine保持纯逻辑，粒子效果由渲染层（Game.tsx）管理
- **性能优化**：使用PixiJS原生Sprite而非第三方粒子库，减少依赖和开销
- **自动清理**：粒子效果自动销毁，避免内存泄漏
- **纹理复用**：纹理在初始化时生成并缓存，多个粒子共享同一纹理

## 粒子纹理类型

### 1. SPARK（火花）
- **形状**：菱形
- **用途**：子弹发射效果
- **特点**：尖锐的菱形外观，中心带高光

### 2. CIRCLE（圆形）
- **形状**：圆形
- **用途**：通用粒子
- **特点**：从中心到边缘渐变，中心高光

### 3. STAR（星形）
- **形状**：五角星
- **用途**：爆炸效果
- **特点**：五角星形状，中心光点

### 4. SMOKE（烟雾）
- **形状**：柔和圆形
- **用途**：拖尾效果
- **特点**：多层半透明圆形，模拟烟雾

### 5. GLOW（发光球）
- **形状**：带光晕的圆形
- **用途**：AOE范围指示
- **特点**：外层光晕+中层光晕+内核，三层结构

## 粒子效果类型

### 1. 发射火花 (Launch Spark)

**触发时机**：子弹刚创建时

**视觉效果**：
- 20个黄色火花粒子从发射点向四周扩散
- 使用**SPARK纹理**（菱形）
- 粒子速度：100-200像素/秒
- 生命周期：0.2-0.4秒
- 受重力影响，向下加速

**代码位置**：`ParticleManager.createLaunchSpark()`

### 2. 飞行拖尾 (Bullet Trail)

**触发时机**：子弹飞行过程中持续发射

**视觉效果**：
- 蓝色拖尾粒子跟随子弹移动
- 使用**SMOKE纹理**（柔和圆形）
- 发射频率：每0.02秒一个粒子
- 粒子静止不动，仅渐隐消失
- 生命周期：0.3-0.5秒

**代码位置**：`ParticleManager.createBulletTrail()` + `emitTrailParticle()`

### 3. 碰撞爆炸 (Explosion)

**触发时机**：子弹消失（碰撞砖块或边界）时

**视觉效果**：
- 30个橙色粒子从碰撞点爆发
- 使用**STAR纹理**（五角星）
- 粒子速度：150-300像素/秒
- 生命周期：0.3-0.6秒
- 受重力影响，向下加速

**代码位置**：`ParticleManager.createExplosion()`

### 4. AOE范围指示 (AOE Ring)

**触发时机**：AOE子弹碰撞时

**视觉效果**：
- 紫色粒子形成圆环
- 使用**GLOW纹理**（发光球）
- 粒子沿圆环向外扩散
- 持续发射，直到AOE效果结束
- 50个粒子初始化圆环

**代码位置**：`ParticleManager.createAOERing()`

## 粒子系统工作流程

### 初始化流程

```typescript
// 1. 在Game.tsx的useEffect中创建ParticleManager
const particleManager = new ParticleManager(app.renderer);
particleManagerRef.current = particleManager;

// 2. 创建Map跟踪子弹拖尾和AOE效果
const bulletTrailsRef = useRef<Map<string, ParticleEffect>>(new Map());
```

### 渲染循环

```typescript
// 在app.ticker中每帧更新
app.ticker.add(() => {
  // 更新游戏逻辑
  engine.update(deltaTime);
  
  // 更新粒子系统
  if (particleManager) {
    particleManager.update(deltaTime);
  }
  
  // 渲染场景
  renderBattleScene(...);
});
```

### 子弹粒子效果触发

```typescript
// 在renderBattleScene中
for (const bullet of state.bullets) {
  // 为新子弹创建效果
  if (!bulletTrails.has(bullet.id)) {
    // 发射火花（一次性，SPARK纹理）
    particleManager.createLaunchSpark(container, bullet.position.x, bullet.position.y);
    
    // 创建拖尾效果（持续，SMOKE纹理）
    const trailEffect = particleManager.createBulletTrail(container, bullet.position.x, bullet.position.y);
    bulletTrails.set(bullet.id, trailEffect);
  }
  
  // 更新拖尾位置
  const trailEffect = bulletTrails.get(bullet.id);
  if (trailEffect) {
    particleManager.updateParticlePosition(trailEffect, bullet.position.x, bullet.position.y);
    particleManager.emitTrailParticle(trailEffect);
  }
}

// 清理消失的子弹
const currentBulletIds = new Set(state.bullets.map(b => b.id));
for (const [bulletId, trailEffect] of Array.from(bulletTrails.entries())) {
  if (!currentBulletIds.has(bulletId)) {
    // 创建爆炸效果（STAR纹理）
    particleManager.createExplosion(container, trailEffect.container.x, trailEffect.container.y);
    particleManager.destroyEffect(trailEffect);
    bulletTrails.delete(bulletId);
  }
}
```

### AOE粒子效果触发

```typescript
// 在renderBattleScene中渲染AOE圆环
for (const ring of state.aoeRings) {
  // 渲染AOE圆环（紫色圆圈）
  const graphics = new PIXI.Graphics();
  graphics.circle(ring.position.x, ring.position.y, ring.currentRadius);
  graphics.stroke({ width: 3, color: 0xff00ff, alpha: 0.6 });
  container.addChild(graphics);
  
  // 为AOE圆环创建粒子效果（GLOW纹理）
  if (!aoeRingParticles.has(`aoe-${ring.id}`)) {
    const particleEffect = particleManager.createAOERing(
      container,
      ring.position.x,
      ring.position.y,
      ring.currentRadius
    );
    aoeRingParticles.set(`aoe-${ring.id}`, particleEffect);
  }
  
  // 更新AOE粒子位置（跟随圆环扩展）
  const particleEffect = aoeRingParticles.get(`aoe-${ring.id}`);
  if (particleEffect) {
    particleManager.updateParticlePosition(particleEffect, ring.position.x, ring.position.y);
  }
}

// 清理已消失的AOE粒子
const currentAOEIds = new Set(state.aoeRings.map(r => `aoe-${r.id}`));
for (const [aoeId, particleEffect] of Array.from(aoeRingParticles.entries())) {
  if (aoeId.startsWith('aoe-') && !currentAOEIds.has(aoeId)) {
    particleManager.destroyEffect(particleEffect);
    aoeRingParticles.delete(aoeId);
  }
}
```

## 粒子物理特性

### 运动模型

每个粒子包含以下属性：
- `vx, vy`：速度向量（像素/秒）
- `life`：剩余生命时间（秒）
- `scaleStart, scaleEnd`：起始和结束缩放
- `fadeOut`：是否渐隐

### 更新逻辑

```typescript
// 每帧更新粒子
particle.sprite.x += particle.vx * dt;
particle.sprite.y += particle.vy * dt;

// 应用重力（仅对某些效果）
if (effect.autoDestroy) {
  particle.vy += 200 * dt; // 重力加速度
}

// 更新生命值
particle.life -= dt;

// 更新透明度（渐隐）
const lifeRatio = particle.life / particle.maxLife;
particle.sprite.alpha = lifeRatio;

// 更新缩放（从大到小）
const scale = particle.scaleStart + (particle.scaleEnd - particle.scaleStart) * (1 - lifeRatio);
particle.sprite.scale.set(scale);
```

## 性能优化

### 纹理生成与缓存

1. **初始化时生成**
   - 所有纹理在ParticleTextureGenerator初始化时生成
   - 使用RenderTexture缓存纹理，避免重复绘制

2. **纹理共享**
   - 多个粒子共享同一纹理
   - 通过tint属性改变粒子颜色

3. **Graphics销毁**
   - 纹理生成后立即销毁Graphics对象
   - 减少内存占用

### 自动清理机制

1. **粒子生命周期管理**
   - 粒子生命值耗尽时自动销毁Sprite
   - 从particles数组中移除

2. **效果自动销毁**
   - `autoDestroy: true`的效果在生命周期结束且无粒子时自动销毁
   - 从particleEffects数组中移除
   - 清理Container和所有子对象

3. **子弹拖尾清理**
   - 子弹消失时，从bulletTrails Map中移除
   - 调用destroyEffect清理所有资源

4. **AOE粒子清理**
   - AOE圆环消失时，从aoeRingParticles Map中移除
   - 调用destroyEffect清理所有资源

### 内存管理

```typescript
// 组件卸载时清理
return () => {
  if (particleManagerRef.current) {
    particleManagerRef.current.cleanup(); // 清理所有粒子和纹理
  }
  app.destroy(true, { children: true });
};
```

## 测试指南

### 测试子弹粒子效果

1. **发射火花测试**
   - 进入玩家行动阶段
   - 点击画布发射子弹
   - 观察发射点是否出现黄色菱形火花向四周扩散

2. **飞行拖尾测试**
   - 发射子弹后观察子弹飞行
   - 应该看到蓝色烟雾粒子跟随子弹
   - 拖尾应该逐渐消失

3. **碰撞爆炸测试**
   - 让子弹击中砖块或边界
   - 观察碰撞点是否出现橙色星形粒子爆发
   - 粒子应该向四周扩散并受重力影响

### 测试AOE粒子效果

1. **配置AOE子弹**
   - 在子弹编程界面添加AOE模块
   - 配置示例：[AOE子弹]

2. **发射AOE子弹**
   - 发射配置好的AOE子弹
   - 击中砖块后应该出现紫色圆环
   - 圆环周围应该有紫色发光粒子

3. **观察圆环扩展**
   - AOE圆环应该逐渐扩大
   - 粒子应该跟随圆环移动
   - 圆环消失时粒子也应该清理

### 性能测试

1. **多子弹测试**
   - 配置齐射模块发射多个子弹
   - 观察粒子系统性能
   - 检查帧率是否稳定

2. **内存泄漏测试**
   - 长时间游玩并发射大量子弹
   - 使用浏览器开发者工具监控内存
   - 确认内存不会持续增长

## 扩展指南

### 添加新粒子纹理

1. 在`ParticleTextures.ts`中添加新纹理类型：

```typescript
export enum ParticleTextureType {
  // ... 现有类型
  LIGHTNING = 'lightning', // 新增闪电纹理
}

// 在ParticleTextureGenerator中添加生成方法
private createLightningTexture(): RenderTexture {
  const graphics = new Graphics();
  // 绘制闪电形状
  // ...
  const texture = RenderTexture.create({ width: size, height: size });
  this.renderer.render({ container: graphics, target: texture });
  graphics.destroy();
  return texture;
}

// 在generateAllTextures中注册
private generateAllTextures(): void {
  // ... 现有纹理
  this.textures.set(ParticleTextureType.LIGHTNING, this.createLightningTexture());
}
```

2. 在粒子效果中使用新纹理：

```typescript
const particle = this.createParticle(
  container, x, y, vx, vy, life,
  scaleStart, scaleEnd, tint,
  ParticleTextureType.LIGHTNING // 使用新纹理
);
```

### 添加新粒子效果

1. 在`ParticleManager.ts`中添加新方法：

```typescript
createMyEffect(container: Container, x: number, y: number): ParticleEffect {
  const effectContainer = new Container();
  effectContainer.position.set(x, y);
  container.addChild(effectContainer);

  const particles: SimpleParticle[] = [];
  
  // 创建粒子
  for (let i = 0; i < particleCount; i++) {
    const particle = this.createParticle(
      effectContainer, x, y, vx, vy, life,
      scaleStart, scaleEnd, tint,
      ParticleTextureType.SPARK // 选择纹理类型
    );
    particles.push(particle);
  }

  const effect: ParticleEffect = {
    container: effectContainer,
    particles,
    autoDestroy: true,
    lifetime: duration,
    createdAt: Date.now(),
  };

  this.particleEffects.push(effect);
  return effect;
}
```

2. 在`Game.tsx`中触发效果：

```typescript
// 在适当的时机调用
if (particleManager) {
  particleManager.createMyEffect(container, x, y);
}
```

### 调整粒子参数

在`ParticleManager.ts`中修改以下参数：

- **粒子数量**：循环次数
- **速度**：`Math.cos(angle) * speed`
- **生命周期**：`life`参数
- **颜色**：`tint`参数（十六进制颜色）
- **缩放**：`scaleStart`和`scaleEnd`
- **重力**：`particle.vy += gravity * dt`
- **纹理类型**：`ParticleTextureType`枚举

## 技术细节

### 纹理渲染流程

1. **创建Graphics对象**
   ```typescript
   const graphics = new Graphics();
   ```

2. **绘制形状**
   ```typescript
   graphics.circle(x, y, radius);
   graphics.fill({ color: 0xffffff, alpha: 1 });
   ```

3. **渲染到纹理**
   ```typescript
   const texture = RenderTexture.create({ width: size, height: size });
   this.renderer.render({ container: graphics, target: texture });
   ```

4. **销毁Graphics**
   ```typescript
   graphics.destroy();
   ```

5. **缓存纹理**
   ```typescript
   this.textures.set(type, texture);
   ```

### 粒子Sprite创建

```typescript
const texture = this.textureGenerator.getTexture(textureType) || this.defaultTexture;
const sprite = new Sprite(texture);
sprite.anchor.set(0.5); // 中心锚点
sprite.position.set(x, y);
sprite.scale.set(scaleStart);
sprite.tint = tint; // 颜色着色
container.addChild(sprite);
```

## 已知限制

1. **纹理分辨率固定**
   - 当前纹理大小固定（16-32像素）
   - 可以通过修改纹理生成代码调整

2. **粒子数量限制**
   - 大量粒子可能影响性能
   - 建议限制同时存在的粒子效果数量

3. **纹理颜色限制**
   - 纹理生成时使用白色
   - 通过tint属性改变颜色
   - 无法实现复杂的多色纹理

## 参考资料

- PixiJS v8文档：https://pixijs.com/8.x/guides
- 游戏设计方案：`弹珠编程打砖块-炼金术士完整设计方案.md`
- 伪代码文档：`PSEUDOCODE_UI.md`
- 粒子纹理生成器：`client/src/game/ParticleTextures.ts`
- 粒子管理器：`client/src/game/ParticleManager.ts`
