// 场景管理器 - 管理战斗场景和装填场景的切换

import { GameEventType } from '../types/game';

export enum Scene {
  BATTLE = 'BATTLE',      // 战斗场景（砖块生成、玩家行动、砖块行动）
  LOADING = 'LOADING',    // 装填场景（子弹装填）
}

export interface SceneTransition {
  from: Scene;
  to: Scene;
  progress: number;  // 0-1
  duration: number;  // ms
}

export class SceneManager {
  private currentScene: Scene = Scene.BATTLE;
  private transition: SceneTransition | null = null;
  
  getCurrentScene(): Scene {
    return this.currentScene;
  }
  
  getTransition(): SceneTransition | null {
    return this.transition;
  }
  
  isTransitioning(): boolean {
    return this.transition !== null;
  }
  
  // 根据游戏阶段判断应该在哪个场景
  getSceneForEvent(event: GameEventType): Scene {
    switch (event) {
      case GameEventType.BRICK_SPAWN:
      case GameEventType.PLAYER_ACTION:
      case GameEventType.BRICK_ACTION:
        return Scene.BATTLE;
      case GameEventType.BULLET_LOADING:
        return Scene.LOADING;
      default:
        return Scene.BATTLE;
    }
  }
  
  // 开始场景切换
  startTransition(to: Scene, duration: number = 800): void {
    if (this.transition) return; // 已经在切换中
    
    this.transition = {
      from: this.currentScene,
      to,
      progress: 0,
      duration,
    };
  }
  
  // 更新场景切换进度
  updateTransition(deltaTime: number): void {
    if (!this.transition) return;
    
    this.transition.progress += deltaTime / this.transition.duration;
    
    if (this.transition.progress >= 1) {
      this.currentScene = this.transition.to;
      this.transition = null;
    }
  }
  
  // 获取阶段标题
  getPhaseTitle(event: GameEventType): string {
    switch (event) {
      case GameEventType.BRICK_SPAWN:
        return '砖块生成';
      case GameEventType.BULLET_LOADING:
        return '子弹装填';
      case GameEventType.PLAYER_ACTION:
        return '玩家行动';
      case GameEventType.BRICK_ACTION:
        return '砖块行动';
      default:
        return '';
    }
  }
}
