# 粒子系统说明文档

## 概述

本游戏使用PixiJS v8原生粒子系统实现了丰富的视觉特效，增强了游戏的沉浸感和反馈体验。

## 架构设计

### 核心组件

1. **ParticleManager** (`client/src/game/ParticleManager.ts`)
   - 管理所有粒子效果的生命周期
   - 提供创建、更新、销毁粒子效果的接口
   - 使用PixiJS的Sprite和Container实现轻量级粒子系统

2. **Game.tsx集成**
   - 在渲染层管理ParticleManager实例
   - 跟踪子弹状态变化，触发相应粒子效果
   - 在游戏主循环中更新粒子系统

### 设计原则

- **关注点分离**：GameEngine保持纯逻辑，粒子效果由渲染层（Game.tsx）管理
- **性能优化**：使用PixiJS原生Sprite而非第三方粒子库，减少依赖和开销
- **自动清理**：粒子效果自动销毁，避免内存泄漏

## 粒子效果类型

### 1. 发射火花 (Launch Spark)

**触发时机**：子弹刚创建时

**视觉效果**：
- 20个黄色粒子从发射点向四周扩散
- 粒子速度：100-200像素/秒
- 生命周期：0.2-0.4秒
- 受重力影响，向下加速

**代码位置**：`ParticleManager.createLaunchSpark()`

### 2. 飞行拖尾 (Bullet Trail)

**触发时机**：子弹飞行过程中持续发射

**视觉效果**：
- 蓝色拖尾粒子跟随子弹移动
- 发射频率：每0.02秒一个粒子
- 粒子静止不动，仅渐隐消失
- 生命周期：0.3-0.5秒

**代码位置**：`ParticleManager.createBulletTrail()` + `emitTrailParticle()`

### 3. 碰撞爆炸 (Explosion)

**触发时机**：子弹消失（碰撞砖块或边界）时

**视觉效果**：
- 30个橙色粒子从碰撞点爆发
- 粒子速度：150-300像素/秒
- 生命周期：0.3-0.6秒
- 受重力影响，向下加速

**代码位置**：`ParticleManager.createExplosion()`

### 4. AOE范围指示 (AOE Ring)

**触发时机**：AOE子弹碰撞时（预留接口）

**视觉效果**：
- 紫色粒子形成圆环
- 粒子沿圆环向外扩散
- 持续发射，直到AOE效果结束

**代码位置**：`ParticleManager.createAOERing()`

## 粒子系统工作流程

### 初始化流程

```typescript
// 1. 在Game.tsx的useEffect中创建ParticleManager
const particleManager = new ParticleManager();
particleManagerRef.current = particleManager;

// 2. 创建Map跟踪子弹拖尾效果
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
    // 发射火花（一次性）
    particleManager.createLaunchSpark(container, bullet.position.x, bullet.position.y);
    
    // 创建拖尾效果（持续）
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
    // 创建爆炸效果
    particleManager.createExplosion(container, trailEffect.container.x, trailEffect.container.y);
    particleManager.destroyEffect(trailEffect);
    bulletTrails.delete(bulletId);
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

### 内存管理

```typescript
// 组件卸载时清理
return () => {
  if (particleManagerRef.current) {
    particleManagerRef.current.cleanup();
  }
  app.destroy(true, { children: true });
};
```

## 扩展指南

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
      effectContainer,
      x, y,
      vx, vy,
      life,
      scaleStart, scaleEnd,
      tint
    );
    particles.push(particle);
  }

  const effect: ParticleEffect = {
    container: effectContainer,
    particles,
    autoDestroy: true, // 或false
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

## 已知限制

1. **AOE圆环效果未集成**
   - 接口已实现，但未在Game.tsx中触发
   - 需要在AOE子弹碰撞时调用

2. **粒子纹理简化**
   - 当前使用`Texture.WHITE`作为粒子纹理
   - 可以替换为自定义纹理以获得更丰富的效果

3. **性能考虑**
   - 大量粒子可能影响性能
   - 建议限制同时存在的粒子效果数量

## 测试

运行测试页面：
```bash
cd /home/ubuntu/marble-breakout-game
python3 -m http.server 8080
# 访问 http://localhost:8080/test-particles.html
```

## 参考资料

- PixiJS v8文档：https://pixijs.com/8.x/guides
- 游戏设计方案：`弹珠编程打砖块-炼金术士完整设计方案.md`
- 伪代码文档：`PSEUDOCODE_UI.md`
