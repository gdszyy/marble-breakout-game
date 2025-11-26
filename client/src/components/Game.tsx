import { useState, useRef, useEffect } from 'react';
import { BulletEditor } from './BulletEditor';
import * as PIXI from 'pixi.js';
import { GameEngine } from '../game/GameEngine';
import { GAME_CONFIG, COLORS } from '../game/config';
import { lerpColor } from '../game/utils';
import { TrajectoryPredictor } from '../game/TrajectoryPredictor';
import type { TrajectorySegment } from '../game/TrajectoryPredictor';
import { AssetLoader } from '../game/AssetLoader';
import type { GameAssets } from '../game/AssetLoader';

export default function Game() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [aimPosition, setAimPosition] = useState<{ x: number; y: number } | null>(null);
  const [trajectory, setTrajectory] = useState<TrajectorySegment[]>([]);
  const [assets, setAssets] = useState<GameAssets | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new PIXI.Application();
    
    // 加载资源
    AssetLoader.load().then((loadedAssets) => {
      setAssets(loadedAssets);
    }).catch((error) => {
      console.error('资源加载失败:', error);
    });

    app.init({
      width: GAME_CONFIG.CANVAS_WIDTH,
      height: GAME_CONFIG.CANVAS_HEIGHT,
      backgroundColor: COLORS.BACKGROUND,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    }).then(() => {
      if (canvasRef.current && app.canvas) {
        canvasRef.current.appendChild(app.canvas as HTMLCanvasElement);
      }

      const engine = new GameEngine();
      engineRef.current = engine;
      appRef.current = app;

      const gameContainer = new PIXI.Container();
      app.stage.addChild(gameContainer);

      let lastTime = Date.now();
      app.ticker.add(() => {
        const currentTime = Date.now();
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        engine.update(deltaTime);
        renderGame(app, gameContainer, engine);
        setGameState(engine.getState());
      });

      // 鼠标移动事件 - 显示轨迹预测
      app.canvas.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setAimPosition({ x, y });

        const state = engine.getState();
        const dx = x - state.player.position.x;
        const dy = y - state.player.position.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len > 0) {
          const direction = { x: dx / len, y: dy / len };
          const slot = state.bulletSlots[state.player.currentBulletSlot];
          const bounceCount = slot.program.modules.length > 0 ? 3 : 1; // 简化：有模块3次反弹
          
          const predictedTrajectory = TrajectoryPredictor.predict(
            state.player.position,
            direction,
            bounceCount,
            state.bricks,
            50
          );
          
          setTrajectory(TrajectoryPredictor.simplifyTrajectory(predictedTrajectory, 2));
        }
      });

      // 鼠标离开事件
      app.canvas.addEventListener('mouseleave', () => {
        setAimPosition(null);
        setTrajectory([]);
      });

      // 点击事件 - 发射子弹
      app.canvas.addEventListener('click', (e: MouseEvent) => {
        const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const state = engine.getState();
        const dx = x - state.player.position.x;
        const dy = y - state.player.position.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len > 0) {
          engine.shootBullet({ x: dx / len, y: dy / len });
        }
      });
    });

    return () => {
      app.destroy(true, { children: true });
    };
  }, []);

  function renderGame(app: PIXI.Application, container: PIXI.Container, engine: GameEngine) {
    container.removeChildren();

    const state = engine.getState();

    // 渲染砖块
    for (const brick of state.bricks) {
      const healthPercent = brick.health / brick.maxHealth;
      
      // 尝试使用资源图片
      const brickTexture = assets ? AssetLoader.getBrickTexture(healthPercent) : null;
      
      if (brickTexture) {
        const sprite = new PIXI.Sprite(brickTexture);
        sprite.x = brick.position.x;
        sprite.y = brick.position.y;
        sprite.width = brick.size.width;
        sprite.height = brick.size.height;
        container.addChild(sprite);
      } else {
        // 备用：使用颜色方块
        const graphics = new PIXI.Graphics();
        const color = lerpColor(COLORS.BRICK_LOW_HEALTH, COLORS.BRICK_HIGH_HEALTH, 1 - healthPercent);
        graphics.rect(brick.position.x, brick.position.y, brick.size.width, brick.size.height);
        graphics.fill(color);
        graphics.stroke({ width: 2, color: 0xffffff });
        container.addChild(graphics);
      }
      
      // 显示生命值
      const text = new PIXI.Text({
        text: brick.health.toString(),
        style: {
          fontSize: 14,
          fill: 0xffffff,
          align: 'center',
          stroke: { color: 0x000000, width: 3 },
        },
      });
      text.x = brick.position.x + brick.size.width / 2 - text.width / 2;
      text.y = brick.position.y + brick.size.height / 2 - text.height / 2;
      container.addChild(text);
    }

    // 渲染子弹
    for (const bullet of state.bullets) {
      const bulletType = bullet.program.modules.find((m: any) => !m.isModifier)?.type || 'NORMAL';
      const bulletTexture = assets ? AssetLoader.getBulletTexture(bulletType) : null;
      
      if (bulletTexture) {
        const sprite = new PIXI.Sprite(bulletTexture);
        sprite.x = bullet.position.x - bullet.radius;
        sprite.y = bullet.position.y - bullet.radius;
        sprite.width = bullet.radius * 2;
        sprite.height = bullet.radius * 2;
        container.addChild(sprite);
      } else {
        const graphics = new PIXI.Graphics();
        graphics.circle(bullet.position.x, bullet.position.y, bullet.radius);
        graphics.fill(COLORS.BULLET_NORMAL);
        container.addChild(graphics);
      }
    }

    // 渲染缓冲器
    for (const bumper of state.bumperArray) {
      const isReward = (bumper as any).isReward || false;
      const bumperTexture = assets ? (isReward ? assets.bumperReward : assets.bumper) : null;
      
      if (bumperTexture) {
        const sprite = new PIXI.Sprite(bumperTexture);
        const size = GAME_CONFIG.BUMPER_RADIUS * 2;
        sprite.x = bumper.position.x - GAME_CONFIG.BUMPER_RADIUS;
        sprite.y = bumper.position.y - GAME_CONFIG.BUMPER_RADIUS;
        sprite.width = size;
        sprite.height = size;
        
        if (bumper.cooldown > 0) {
          sprite.alpha = 0.5;
        }
        
        container.addChild(sprite);
      } else {
        const graphics = new PIXI.Graphics();
        const color = bumper.cooldown > 0 ? COLORS.BUMPER_COOLDOWN : COLORS.BUMPER;
        graphics.circle(bumper.position.x, bumper.position.y, GAME_CONFIG.BUMPER_RADIUS);
        graphics.fill(color);
        graphics.stroke({ width: 2, color: 0xffffff });
        container.addChild(graphics);
      }

      // 显示模块类型
      const text = new PIXI.Text({
        text: bumper.module.type.substring(0, 3),
        style: {
          fontSize: 10,
          fill: 0xffffff,
          align: 'center',
          stroke: { color: 0x000000, width: 2 },
        },
      });
      text.x = bumper.position.x - text.width / 2;
      text.y = bumper.position.y - text.height / 2;
      container.addChild(text);
    }

    // 渲染弹珠
    for (const marble of state.marbles) {
      const marbleTexture = assets ? assets.marble : null;
      
      if (marbleTexture) {
        const sprite = new PIXI.Sprite(marbleTexture);
        sprite.x = marble.position.x - marble.radius;
        sprite.y = marble.position.y - marble.radius;
        sprite.width = marble.radius * 2;
        sprite.height = marble.radius * 2;
        container.addChild(sprite);
      } else {
        const graphics = new PIXI.Graphics();
        graphics.circle(marble.position.x, marble.position.y, marble.radius);
        graphics.fill(COLORS.MARBLE);
        graphics.stroke({ width: 2, color: 0x00ffff });
        container.addChild(graphics);
      }
    }

    // 渲染子弹槽
    for (let i = 0; i < state.bulletSlots.length; i++) {
      const slot = state.bulletSlots[i];
      const graphics = new PIXI.Graphics();
      graphics.rect(slot.position.x, slot.position.y, slot.width, GAME_CONFIG.SLOT_HEIGHT);
      graphics.stroke({ width: 2, color: i === state.player.currentBulletSlot ? 0xffff00 : 0x666666 });
      container.addChild(graphics);

      const text = new PIXI.Text({
        text: `${slot.name}\n能量: ${Math.floor(slot.energy)}/${slot.energyCost}`,
        style: {
          fontSize: 10,
          fill: 0xffffff,
          align: 'center',
        },
      });
      text.x = slot.position.x + 5;
      text.y = slot.position.y + 5;
      container.addChild(text);
    }

    const player = new PIXI.Graphics();
    player.moveTo(state.player.position.x, state.player.position.y - 15);
    player.lineTo(state.player.position.x - 15, state.player.position.y + 15);
    player.lineTo(state.player.position.x + 15, state.player.position.y + 15);
    player.closePath();
    player.fill(COLORS.PLAYER);
    player.stroke({ width: 2, color: 0xffffff });
    container.addChild(player);

    const uiText = new PIXI.Text({
      text: `生命: ${state.player.health}/${state.player.maxHealth}  回合: ${state.round}  分数: ${state.score}`,
      style: {
        fontSize: 16,
        fill: 0xffffff,
      },
    });
    uiText.x = 10;
    uiText.y = 10;
    container.addChild(uiText);

    // 渲染轨迹预测
    if (trajectory.length > 0) {
      for (const segment of trajectory) {
        const graphics = new PIXI.Graphics();
        
        if (segment.points.length > 1) {
          graphics.moveTo(segment.points[0].x, segment.points[0].y);
          
          for (let i = 1; i < segment.points.length; i++) {
            graphics.lineTo(segment.points[i].x, segment.points[i].y);
          }
          
          graphics.stroke({ width: 2, color: 0xffff00, alpha: 0.5 });
        }
        
        container.addChild(graphics);
      }
      
      // 渲染目标点
      if (aimPosition) {
        const aimGraphics = new PIXI.Graphics();
        aimGraphics.circle(aimPosition.x, aimPosition.y, 5);
        aimGraphics.fill({ color: 0xffff00, alpha: 0.7 });
        container.addChild(aimGraphics);
      }
    }

    if (state.isGameOver) {
      const gameOverBg = new PIXI.Graphics();
      gameOverBg.rect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
      gameOverBg.fill({ color: 0x000000, alpha: 0.7 });
      container.addChild(gameOverBg);

      const gameOverText = new PIXI.Text({
        text: '游戏结束\n点击重新开始',
        style: {
          fontSize: 32,
          fill: 0xffffff,
          align: 'center',
        },
      });
      gameOverText.x = GAME_CONFIG.CANVAS_WIDTH / 2 - gameOverText.width / 2;
      gameOverText.y = GAME_CONFIG.CANVAS_HEIGHT / 2 - gameOverText.height / 2;
      container.addChild(gameOverText);
    }
  }

  const handleReset = () => {
    if (engineRef.current) {
      engineRef.current.reset();
    }
  };

  const handleSpawnBricks = () => {
    if (engineRef.current) {
      engineRef.current.spawnBrickRow();
    }
  };

  const handleMoveBricks = () => {
    if (engineRef.current) {
      engineRef.current.moveBricksDown();
    }
  };

  const handleNextPhase = () => {
    if (engineRef.current) {
      engineRef.current.nextPhase();
    }
  };

  const handleUpdateSlot = (slotId: string, modules: any[]) => {
    if (engineRef.current) {
      const state = engineRef.current.getState();
      const slot = state.bulletSlots.find((s: any) => s.id === slotId);
      if (slot) {
        slot.program.modules = modules;
        const energyCost = modules.length * 10;
        slot.energyCost = energyCost;
      }
    }
  };

  const handleSwitchSlot = (index: number) => {
    if (engineRef.current) {
      const state = engineRef.current.getState();
      state.player.currentBulletSlot = index;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-white text-center mb-2">
          弹珠编程打砖块 - 炼金术士守城
        </h1>
        <p className="text-gray-400 text-center">点击屏幕发射魔药攻击晶石魔像</p>
      </div>

      <div ref={canvasRef} className="border-4 border-blue-500 rounded-lg shadow-2xl" />

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold"
        >
          重新开始
        </button>
        <button
          onClick={handleSpawnBricks}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
        >
          生成砖块
        </button>
        <button
          onClick={handleMoveBricks}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold"
        >
          砖块下落
        </button>
        <button
          onClick={handleNextPhase}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold"
        >
          下一阶段
        </button>
        <button
          onClick={() => setIsEditorOpen(true)}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold"
        >
          子弹编程
        </button>
      </div>

      {gameState && (
        <div className="mt-4 text-white text-sm space-y-1">
          <p className="text-lg font-bold">当前阶段: {gameState.currentEvent}</p>
          <p>子弹数量: {gameState.bullets.length}</p>
          <p>砖块数量: {gameState.bricks.length}</p>
          <p>弹珠数量: {gameState.marbles.length}</p>
          <p>待发射弹珠: {gameState.pendingMarbleCount}</p>
        </div>
      )}

      {gameState && (
        <BulletEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          bulletSlots={gameState.bulletSlots}
          moduleInventory={gameState.moduleInventory}
          onUpdateSlot={handleUpdateSlot}
          currentSlotIndex={gameState.player.currentBulletSlot}
          onSwitchSlot={handleSwitchSlot}
        />
      )}
    </div>
  );
}
