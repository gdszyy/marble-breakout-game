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
   * 检查是否可以进入下一阶段
   * 严格回合制：所有阶段都需要手动点击“下一阶段”按钮
   */
  canAdvance(): boolean {
    const currentEvent = this.state.currentEvent;

    switch (currentEvent) {
      case GameEventType.GAME_OVER:
        // 游戏结束，不能进入下一阶段
        return false;

      default:
        // 所有其他阶段都需要手动推进
        return true;
    }
  }
}
