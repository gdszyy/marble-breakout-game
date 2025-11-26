import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { GameEngine } from '../game/GameEngine';
import { GAME_CONFIG, COLORS } from '../game/config';
import { lerpColor } from '../game/utils';

export default function Game() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new PIXI.Application();
    
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

    for (const brick of state.bricks) {
      const graphics = new PIXI.Graphics();
      
      const healthPercent = brick.health / brick.maxHealth;
      const color = lerpColor(COLORS.BRICK_LOW_HEALTH, COLORS.BRICK_HIGH_HEALTH, 1 - healthPercent);
      
      graphics.rect(brick.position.x, brick.position.y, brick.size.width, brick.size.height);
      graphics.fill(color);
      graphics.stroke({ width: 2, color: 0xffffff });
      
      const text = new PIXI.Text({
        text: brick.health.toString(),
        style: {
          fontSize: 14,
          fill: 0xffffff,
          align: 'center',
        },
      });
      text.x = brick.position.x + brick.size.width / 2 - text.width / 2;
      text.y = brick.position.y + brick.size.height / 2 - text.height / 2;
      
      container.addChild(graphics);
      container.addChild(text);
    }

    for (const bullet of state.bullets) {
      const graphics = new PIXI.Graphics();
      graphics.circle(bullet.position.x, bullet.position.y, bullet.radius);
      graphics.fill(COLORS.BULLET_NORMAL);
      container.addChild(graphics);
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
      </div>

      {gameState && (
        <div className="mt-4 text-white text-sm">
          <p>子弹数量: {gameState.bullets.length}</p>
          <p>砖块数量: {gameState.bricks.length}</p>
        </div>
      )}
    </div>
  );
}
