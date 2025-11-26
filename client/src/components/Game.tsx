import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { GameEngine } from '../game/GameEngine';
import { GAME_CONFIG, COLORS } from '../game/config';
import { BulletEditor } from './BulletEditor';
import { TrajectoryPredictor, TrajectorySegment } from '../game/TrajectoryPredictor';
import { AssetLoader, GameAssets } from '../game/AssetLoader';
import { Scene } from '../game/SceneManager';
import { GameEventType } from '../types/game';

function lerpColor(color1: number, color2: number, t: number): number {
  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;

  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return (r << 16) | (g << 8) | b;
}

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
        
        // 根据当前场景渲染不同内容
        const currentScene = engine.getSceneManager().getCurrentScene();
        if (currentScene === Scene.BATTLE) {
          renderBattleScene(app, gameContainer, engine);
        } else {
          renderLoadingScene(app, gameContainer, engine);
        }
        
        // 强制React重新渲染，确保阶段标题和场景切换及时更新
        setGameState({...engine.getState()});
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
          // 计算反弹次数
          if (slot && slot.program && slot.program.modules) {
            const bounceCount = slot.program.modules.filter((m: any) => m.type === 'BOUNCE_PLUS').length;
            const traj = TrajectoryPredictor.predict(
              state.player.position,
              direction,
              bounceCount,
              state.bricks
            );
            setTrajectory(traj);
          }
        }
      });

      // 点击事件 - 切换子弹槽或发射子弹
      app.canvas.addEventListener('click', (e: MouseEvent) => {
        const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const state = engine.getState();
        
        // 检查是否点击了子弹槽区域
        let clickedSlot = -1;
        for (let i = 0; i < state.bulletSlots.length; i++) {
          const slot = state.bulletSlots[i];
          if (x >= slot.position.x && x <= slot.position.x + slot.width &&
              y >= slot.position.y && y <= slot.position.y + GAME_CONFIG.SLOT_HEIGHT) {
            clickedSlot = i;
            break;
          }
        }
        
        // 如果点击了子弹槽，切换当前槽位
        if (clickedSlot >= 0) {
          state.player.currentBulletSlot = clickedSlot;
          setGameState({...state});
          return;
        }
        
        // 否则发射子弹
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

  // 渲染战斗场景（砖块、子弹、玩家）
  function renderBattleScene(app: PIXI.Application, container: PIXI.Container, engine: GameEngine) {
    container.removeChildren();
    const state = engine.getState();

    // 渲染砖块
    for (const brick of state.bricks) {
      const healthPercent = brick.health / brick.maxHealth;
      
      const brickTexture = assets ? AssetLoader.getBrickTexture(healthPercent) : null;
      
      if (brickTexture) {
        const sprite = new PIXI.Sprite(brickTexture);
        sprite.x = brick.position.x;
        sprite.y = brick.position.y;
        sprite.width = brick.size.width;
        sprite.height = brick.size.height;
        container.addChild(sprite);
      } else {
        const graphics = new PIXI.Graphics();
        const color = lerpColor(COLORS.BRICK_LOW_HEALTH, COLORS.BRICK_HIGH_HEALTH, 1 - healthPercent);
        graphics.rect(brick.position.x, brick.position.y, brick.size.width, brick.size.height);
        graphics.fill(color);
        graphics.stroke({ width: 2, color: 0xffffff });
        container.addChild(graphics);
      }
      
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
      const bulletType = bullet.program?.modules?.find((m: any) => !m.isModifier)?.type || 'NORMAL';
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

    // 渲染玩家
    const player = new PIXI.Graphics();
    player.moveTo(state.player.position.x, state.player.position.y - 15);
    player.lineTo(state.player.position.x - 15, state.player.position.y + 15);
    player.lineTo(state.player.position.x + 15, state.player.position.y + 15);
    player.closePath();
    player.fill(COLORS.PLAYER);
    player.stroke({ width: 2, color: 0xffffff });
    container.addChild(player);

    // 渲染UI信息
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

    // 渲染瞄准线和轨迹预测（仅在玩家阶段显示）
    if (state.currentEvent === GameEventType.PLAYER_ACTION) {
      // 显示瞄准线（从玩家到鼠标位置）
      if (aimPosition) {
        const aimLine = new PIXI.Graphics();
        aimLine.moveTo(state.player.position.x, state.player.position.y);
        aimLine.lineTo(aimPosition.x, aimPosition.y);
        aimLine.stroke({ width: 2, color: 0x00ff00, alpha: 0.6 });
        container.addChild(aimLine);
        
        // 显示瞄准点
        const aimGraphics = new PIXI.Graphics();
        aimGraphics.circle(aimPosition.x, aimPosition.y, 5);
        aimGraphics.fill({ color: 0x00ff00, alpha: 0.8 });
        container.addChild(aimGraphics);
      }
      
      // 显示轨迹预测
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
      }
    }

    // 游戏结束提示
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

  // 渲染装填场景（缓冲器阵列、弹珠）
  function renderLoadingScene(app: PIXI.Application, container: PIXI.Container, engine: GameEngine) {
    container.removeChildren();
    const state = engine.getState();

    // 背景色
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    bg.fill(0x1a1a2e);
    container.addChild(bg);

    // 标题
    const title = new PIXI.Text({
      text: '⚙️ 子弹装填场景',
      style: {
        fontSize: 32,
        fill: 0x00ffff,
        align: 'center',
        fontWeight: 'bold',
      },
    });
    title.x = GAME_CONFIG.CANVAS_WIDTH / 2 - title.width / 2;
    title.y = 30;
    container.addChild(title);

    // 渲染缓冲器阵列
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
        const color = isReward ? 0xffd700 : (bumper.cooldown > 0 ? COLORS.BUMPER_COOLDOWN : COLORS.BUMPER);
        graphics.circle(bumper.position.x, bumper.position.y, GAME_CONFIG.BUMPER_RADIUS);
        graphics.fill(color);
        graphics.stroke({ width: 3, color: isReward ? 0xffff00 : 0xffffff });
        container.addChild(graphics);
      }

      // 显示模块类型
      const text = new PIXI.Text({
        text: bumper.module.type.substring(0, 3),
        style: {
          fontSize: 12,
          fill: 0xffffff,
          align: 'center',
          stroke: { color: 0x000000, width: 2 },
          fontWeight: 'bold',
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

    // 渲染子弹槽（与战斗场景保持一致）
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

    // 显示待发射弹珠数量
    const marbleCountText = new PIXI.Text({
      text: `待发射弹珠: ${state.marbles.length}`,
      style: {
        fontSize: 20,
        fill: 0x00ffff,
        align: 'center',
      },
    });
    marbleCountText.x = GAME_CONFIG.CANVAS_WIDTH / 2 - marbleCountText.width / 2;
    marbleCountText.y = GAME_CONFIG.CANVAS_HEIGHT - 50;
    container.addChild(marbleCountText);
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
      const eventManager = (engineRef.current as any).eventManager;
      if (eventManager) {
        eventManager.nextPhase();
      }
    }
  };

  const handleUpdateSlot = (slotId: string, modules: any[]) => {
    // 支持 'slot-a', 'slot-b', 'slot-c' 格式
    const slotMap: Record<string, number> = {
      'slot-a': 0,
      'slot-b': 1,
      'slot-c': 2,
    };
    const slotIndex = slotMap[slotId] ?? parseInt(slotId.replace(/\D/g, ''));
    
    // 检查slotIndex是否有效
    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= 3) {
      console.error('Invalid slotId:', slotId, 'parsed as:', slotIndex);
      return;
    }
    
    if (engineRef.current) {
      const state = engineRef.current.getState();
      const slot = state.bulletSlots[slotIndex];
      
      // 检查slot是否存在
      if (!slot || !slot.program || !slot.program.modules) {
        console.error('Slot or program is undefined:', slotIndex);
        return;
      }
      
      // 计算模块差异，返还移除的模块到库存
      const oldModules = slot.program.modules.map((m: any) => m.type);
      const newModules = modules.map((m: any) => m.type);
      
      // 找出被移除的模块
      const removedModules = oldModules.filter((type: string) => {
        const oldCount = oldModules.filter((t: string) => t === type).length;
        const newCount = newModules.filter((t: string) => t === type).length;
        return oldCount > newCount;
      });
      
      // 返还到库存
      for (const moduleType of removedModules) {
        if (state.moduleInventory[moduleType as keyof typeof state.moduleInventory] !== undefined) {
          state.moduleInventory[moduleType as keyof typeof state.moduleInventory]++;
        }
      }
      
      // 找出新添加的模块
      const addedModules = newModules.filter((type: string) => {
        const oldCount = oldModules.filter((t: string) => t === type).length;
        const newCount = newModules.filter((t: string) => t === type).length;
        return newCount > oldCount;
      });
      
      // 从库存中扣除
      for (const moduleType of addedModules) {
        if (state.moduleInventory[moduleType as keyof typeof state.moduleInventory] !== undefined) {
          state.moduleInventory[moduleType as keyof typeof state.moduleInventory]--;
        }
      }
      
      // 更新槽位
      slot.program.modules = modules;
      
      // 强制React重新渲染
      setGameState({...state});
    }
  };

  const handleSelectSlot = (index: number) => {
    if (engineRef.current) {
      const state = engineRef.current.getState();
      state.player.currentBulletSlot = index;
    }
  };



  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">

      <div 
        className="relative rounded-lg border-4 border-blue-500 shadow-2xl"
        style={{
          width: `${GAME_CONFIG.CANVAS_WIDTH}px`,
          height: `${GAME_CONFIG.CANVAS_HEIGHT}px`,
        }}
      >
        <div ref={canvasRef} className="w-full h-full"></div>
        
        {/* 阶段标题提示 */}
        {gameState && gameState.showPhaseTitle && engineRef.current && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="bg-black/80 backdrop-blur-md px-16 py-8 rounded-2xl border-4 border-yellow-400 shadow-2xl animate-in zoom-in-50 duration-300">
              <h2 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 animate-pulse">
                {engineRef.current.getSceneManager().getPhaseTitle(gameState.currentEvent)}
              </h2>
            </div>
          </div>
        )}

      </div>

      <div className="flex flex-wrap gap-3 justify-center mt-6">
        <button
          onClick={handleReset}
          className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all"
        >
          🔄 重新开始
        </button>
        <button
          onClick={handleSpawnBricks}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all"
        >
          🧱 生成砖块
        </button>
        <button
          onClick={handleMoveBricks}
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all"
        >
          ⬇️ 砖块下落
        </button>
        <button
          onClick={handleNextPhase}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all"
        >
          ⏩ 下一阶段
        </button>
        <button
          onClick={() => setIsEditorOpen(true)}
          className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all animate-pulse"
        >
          ⚙️ 子弹编程
        </button>
      </div>

      {/* 状态信息面板 */}
      {gameState && (
        <div className="mt-6 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border-2 border-gray-700 shadow-2xl max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-sm text-gray-400 mb-1">当前阶段</div>
              <div className="text-xl font-bold text-cyan-400">{gameState.currentEvent}</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-sm text-gray-400 mb-1">子弹数量</div>
              <div className="text-xl font-bold text-yellow-400">{gameState.marbles.length}</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-sm text-gray-400 mb-1">砖块数量</div>
              <div className="text-xl font-bold text-red-400">{gameState.bricks.length}</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-sm text-gray-400 mb-1">弹珠数量</div>
              <div className="text-xl font-bold text-blue-400">{gameState.marbles.length}</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 col-span-2">
              <div className="text-sm text-gray-400 mb-1">待装填弹珠</div>
              <div className="text-xl font-bold text-green-400">{gameState.pendingMarbles}</div>
            </div>
          </div>
        </div>
      )}

      {/* 子弹编辑器 */}
      {isEditorOpen && gameState && (
        <BulletEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          bulletSlots={gameState.bulletSlots}
          moduleInventory={gameState.moduleInventory}
          onUpdateSlot={handleUpdateSlot}
          currentSlotIndex={gameState.player.currentBulletSlot}
          onSwitchSlot={handleSelectSlot}
        />
      )}
    </div>
  );
}
