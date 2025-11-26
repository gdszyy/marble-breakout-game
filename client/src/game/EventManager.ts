// 事件管理器 - 控制游戏四阶段循环

import { GameEventType } from '../types/game';
import type { GameState } from '../types/game';

export class EventManager {
  private state: GameState;
  private eventHandlers: Map<GameEventType, () => void>;

  constructor(state: GameState) {
    this.state = state;
    this.eventHandlers = new Map();
  }

  /**
   * 注册事件处理器
   */
  registerHandler(event: GameEventType, handler: () => void) {
    this.eventHandlers.set(event, handler);
  }

  /**
   * 切换到下一个阶段
   */
  nextPhase(skipTitle: boolean = false) {
    const currentEvent = this.state.currentEvent;

    // 四阶段循环: BRICK_SPAWN → BULLET_LOADING → PLAYER_ACTION → BRICK_ACTION → BRICK_SPAWN
    const phaseOrder: GameEventType[] = [
      GameEventType.BRICK_SPAWN,
      GameEventType.BULLET_LOADING,
      GameEventType.PLAYER_ACTION,
      GameEventType.BRICK_ACTION,
    ];

    const currentIndex = phaseOrder.indexOf(currentEvent);
    const nextIndex = (currentIndex + 1) % phaseOrder.length;
    const nextEvent = phaseOrder[nextIndex];

    // 如果完成一个完整循环，回合数+1
    if (nextEvent === GameEventType.BRICK_SPAWN && currentEvent === GameEventType.BRICK_ACTION) {
      this.state.round++;
    }

    this.switchTo(nextEvent, skipTitle);
  }

  /**
   * 切换到指定阶段
   */
  switchTo(event: GameEventType, skipTitle: boolean = false) {
    console.log(`[EventManager] Switching from ${this.state.currentEvent} to ${event}`);
    
    this.state.currentEvent = event;
    this.state.showPhaseTitle = !skipTitle;
    this.state.phaseTitleTimer = 0;

    // 执行对应的事件处理器
    const handler = this.eventHandlers.get(event);
    if (handler) {
      handler();
    }

    // 记录到调试日志
    this.state.debugLog.push(`[${Date.now()}] Phase: ${event}, Round: ${this.state.round}`);
  }

  /**
   * 获取当前阶段
   */
  getCurrentPhase(): GameEventType {
    return this.state.currentEvent;
  }

  /**
   * 检查当前阶段是否完成，应该自动切换到下一阶段
   */
  isPhaseComplete(): boolean {
    const currentEvent = this.state.currentEvent;

    switch (currentEvent) {
      case GameEventType.BRICK_SPAWN:
        // 砖块生成阶段：检查是否有新砖块生成（简化：直接返回true，由handler处理）
        // 实际上砖块生成是瞬时的，所以可以立即切换
        return true;

      case GameEventType.BULLET_LOADING:
        // 子弹装填阶段：检查所有弹珠是否都已装填完成
        return this.state.marbles.length === 0;

      case GameEventType.PLAYER_ACTION:
        // 玩家行动阶段：检查所有子弹是否都已发射并消失
        return this.state.bullets.length === 0;

      case GameEventType.BRICK_ACTION:
        // 砖块下沉阶段：砖块下沉是瞬时的，可以立即切换
        return true;

      case GameEventType.GAME_OVER:
        // 游戏结束，不能切换
        return false;

      default:
        return false;
    }
  }

  /**
   * 检查是否可以进入下一阶段
   * 用于手动切换（开发测试）
   */
  canAdvance(): boolean {
    const currentEvent = this.state.currentEvent;

    switch (currentEvent) {
      case GameEventType.GAME_OVER:
        // 游戏结束，不能进入下一阶段
        return false;

      default:
        // 所有其他阶段都允许手动推进
        return true;
    }
  }
}
