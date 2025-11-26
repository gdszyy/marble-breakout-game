/**
 * UIManager - 管理Canvas内的所有UI元素
 */

import * as PIXI from 'pixi.js';
import { GameState, GameEventType } from '../types/game';

export interface UIButton {
  container: PIXI.Container;
  graphics: PIXI.Graphics;
  text: PIXI.Text;
  onClick: () => void;
  bounds: { x: number; y: number; width: number; height: number };
}

export class UIManager {
  private app: PIXI.Application;
  private container: PIXI.Container;
  private buttons: UIButton[] = [];
  
  // UI元素
  private topBar: PIXI.Container | null = null;
  private statusText: PIXI.Text | null = null;
  private pauseMenu: PIXI.Container | null = null;
  private phaseTitle: PIXI.Container | null = null;
  
  // 状态
  private isPaused: boolean = false;
  private phaseTitleTimer: NodeJS.Timeout | null = null;
  
  // 回调函数
  private onPauseCallback: (() => void) | null = null;
  private onResumeCallback: (() => void) | null = null;
  private onRestartCallback: (() => void) | null = null;
  private onOpenEditorCallback: (() => void) | null = null;
  private onToggleAudioCallback: (() => void) | null = null;

  constructor(app: PIXI.Application, container: PIXI.Container) {
    this.app = app;
    this.container = container;
    
    // 初始化顶部状态栏
    this.initTopBar();
  }

  /**
   * 初始化顶部状态栏
   */
  private initTopBar(): void {
    this.topBar = new PIXI.Container();
    
    // 背景
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, this.app.screen.width, 40);
    bg.fill({ color: 0x000000, alpha: 0.6 });
    this.topBar.addChild(bg);
    
    // 状态文字（左侧）
    this.statusText = new PIXI.Text({
      text: '生命: 3/3  回合: 1  分数: 0',
      style: {
        fontSize: 16,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.statusText.x = 10;
    this.statusText.y = 10;
    this.topBar.addChild(this.statusText);
    
    // 暂停按钮（右侧）
    const pauseBtn = this.createButton(
      '⏸️ 暂停',
      this.app.screen.width - 160,
      5,
      70,
      30,
      () => this.togglePause()
    );
    this.topBar.addChild(pauseBtn.container);
    this.buttons.push(pauseBtn);
    
    // 编程按钮（右侧）
    const editorBtn = this.createButton(
      '⚙️ 编程',
      this.app.screen.width - 80,
      5,
      70,
      30,
      () => this.onOpenEditorCallback?.()
    );
    this.topBar.addChild(editorBtn.container);
    this.buttons.push(editorBtn);
    
    this.container.addChild(this.topBar);
  }

  /**
   * 创建按钮
   */
  private createButton(
    label: string,
    x: number,
    y: number,
    width: number,
    height: number,
    onClick: () => void
  ): UIButton {
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;
    
    // 按钮背景
    const graphics = new PIXI.Graphics();
    graphics.roundRect(0, 0, width, height, 5);
    graphics.fill({ color: 0x333333 });
    graphics.stroke({ width: 2, color: 0x666666 });
    
    // 按钮文字
    const text = new PIXI.Text({
      text: label,
      style: {
        fontSize: 14,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    text.anchor.set(0.5);
    text.x = width / 2;
    text.y = height / 2;
    
    container.addChild(graphics);
    container.addChild(text);
    
    // 交互
    container.eventMode = 'static';
    container.cursor = 'pointer';
    
    // Hover效果
    container.on('pointerover', () => {
      graphics.clear();
      graphics.roundRect(0, 0, width, height, 5);
      graphics.fill({ color: 0x555555 });
      graphics.stroke({ width: 2, color: 0x888888 });
    });
    
    container.on('pointerout', () => {
      graphics.clear();
      graphics.roundRect(0, 0, width, height, 5);
      graphics.fill({ color: 0x333333 });
      graphics.stroke({ width: 2, color: 0x666666 });
    });
    
    container.on('pointerdown', onClick);
    
    return {
      container,
      graphics,
      text,
      onClick,
      bounds: { x, y, width, height },
    };
  }

  /**
   * 更新状态文字
   */
  updateStatus(state: GameState): void {
    if (this.statusText) {
      this.statusText.text = `生命: ${state.player.health}/${state.player.maxHealth}  回合: ${state.round}  分数: ${state.score}`;
    }
  }

  /**
   * 显示阶段标题
   */
  showPhaseTitle(phase: GameEventType, duration: number = 2000): void {
    // 清除旧的标题
    if (this.phaseTitle) {
      this.container.removeChild(this.phaseTitle);
      this.phaseTitle = null;
    }
    
    if (this.phaseTitleTimer) {
      clearTimeout(this.phaseTitleTimer);
    }
    
    // 创建标题容器
    this.phaseTitle = new PIXI.Container();
    
    // 半透明背景
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, this.app.screen.width, this.app.screen.height);
    bg.fill({ color: 0x000000, alpha: 0.7 });
    this.phaseTitle.addChild(bg);
    
    // 获取阶段标题文字
    const titleText = this.getPhaseTitleText(phase);
    
    // 标题文字
    const text = new PIXI.Text({
      text: titleText,
      style: {
        fontSize: 48,
        fill: 0xffff00,
        stroke: { color: 0xff8800, width: 4 },
        fontWeight: 'bold',
        align: 'center',
      },
    });
    text.anchor.set(0.5);
    text.x = this.app.screen.width / 2;
    text.y = this.app.screen.height / 2;
    this.phaseTitle.addChild(text);
    
    // 添加到容器
    this.container.addChild(this.phaseTitle);
    
    // 淡入动画
    this.phaseTitle.alpha = 0;
    const fadeInDuration = 300;
    const fadeInSteps = 10;
    const fadeInInterval = fadeInDuration / fadeInSteps;
    
    let step = 0;
    const fadeIn = setInterval(() => {
      step++;
      if (this.phaseTitle) {
        this.phaseTitle.alpha = step / fadeInSteps;
      }
      if (step >= fadeInSteps) {
        clearInterval(fadeIn);
        
        // 显示一段时间后淡出
        this.phaseTitleTimer = setTimeout(() => {
          this.hidePhaseTitle();
        }, duration);
      }
    }, fadeInInterval);
  }

  /**
   * 隐藏阶段标题
   */
  private hidePhaseTitle(): void {
    if (!this.phaseTitle) return;
    
    const fadeOutDuration = 300;
    const fadeOutSteps = 10;
    const fadeOutInterval = fadeOutDuration / fadeOutSteps;
    
    let step = fadeOutSteps;
    const fadeOut = setInterval(() => {
      step--;
      if (this.phaseTitle) {
        this.phaseTitle.alpha = step / fadeOutSteps;
      }
      if (step <= 0) {
        clearInterval(fadeOut);
        if (this.phaseTitle) {
          this.container.removeChild(this.phaseTitle);
          this.phaseTitle = null;
        }
      }
    }, fadeOutInterval);
  }

  /**
   * 获取阶段标题文字
   */
  private getPhaseTitleText(phase: GameEventType): string {
    switch (phase) {
      case GameEventType.BRICK_SPAWN:
        return '🧱 砖块生成阶段';
      case GameEventType.BULLET_LOADING:
        return '⚙️ 子弹装填阶段';
      case GameEventType.PLAYER_ACTION:
        return '🎯 玩家行动阶段';
      case GameEventType.BRICK_ACTION:
        return '⬇️ 砖块下沉阶段';
      default:
        return '游戏进行中';
    }
  }

  /**
   * 切换暂停状态
   */
  private togglePause(): void {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * 暂停游戏
   */
  private pause(): void {
    this.isPaused = true;
    this.onPauseCallback?.();
    this.showPauseMenu();
  }

  /**
   * 恢复游戏
   */
  private resume(): void {
    this.isPaused = false;
    this.onResumeCallback?.();
    this.hidePauseMenu();
  }

  /**
   * 显示暂停菜单
   */
  private showPauseMenu(): void {
    if (this.pauseMenu) return;
    
    this.pauseMenu = new PIXI.Container();
    
    // 半透明背景
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, this.app.screen.width, this.app.screen.height);
    bg.fill({ color: 0x000000, alpha: 0.8 });
    this.pauseMenu.addChild(bg);
    
    // 菜单背景
    const menuBg = new PIXI.Graphics();
    const menuWidth = 300;
    const menuHeight = 350;
    const menuX = this.app.screen.width / 2 - menuWidth / 2;
    const menuY = this.app.screen.height / 2 - menuHeight / 2;
    menuBg.roundRect(menuX, menuY, menuWidth, menuHeight, 10);
    menuBg.fill({ color: 0x1a1a2e });
    menuBg.stroke({ width: 4, color: 0xffff00 });
    this.pauseMenu.addChild(menuBg);
    
    // 标题
    const title = new PIXI.Text({
      text: '⏸️ 游戏暂停',
      style: {
        fontSize: 32,
        fill: 0xffff00,
        fontWeight: 'bold',
      },
    });
    title.anchor.set(0.5);
    title.x = this.app.screen.width / 2;
    title.y = menuY + 50;
    this.pauseMenu.addChild(title);
    
    // 按钮
    const buttonWidth = 200;
    const buttonHeight = 50;
    const buttonX = this.app.screen.width / 2 - buttonWidth / 2;
    
    // 继续游戏按钮
    const resumeBtn = this.createMenuButton(
      '▶️ 继续游戏',
      buttonX,
      menuY + 120,
      buttonWidth,
      buttonHeight,
      () => this.resume()
    );
    this.pauseMenu.addChild(resumeBtn.container);
    
    // 重新开始按钮
    const restartBtn = this.createMenuButton(
      '🔄 重新开始',
      buttonX,
      menuY + 180,
      buttonWidth,
      buttonHeight,
      () => {
        this.resume();
        this.onRestartCallback?.();
      }
    );
    this.pauseMenu.addChild(restartBtn.container);
    
    // 音效设置按钮
    const audioBtn = this.createMenuButton(
      '🔊 音效设置',
      buttonX,
      menuY + 240,
      buttonWidth,
      buttonHeight,
      () => this.onToggleAudioCallback?.()
    );
    this.pauseMenu.addChild(audioBtn.container);
    
    this.container.addChild(this.pauseMenu);
  }

  /**
   * 隐藏暂停菜单
   */
  private hidePauseMenu(): void {
    if (this.pauseMenu) {
      this.container.removeChild(this.pauseMenu);
      this.pauseMenu = null;
    }
  }

  /**
   * 创建菜单按钮
   */
  private createMenuButton(
    label: string,
    x: number,
    y: number,
    width: number,
    height: number,
    onClick: () => void
  ): UIButton {
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;
    
    // 按钮背景
    const graphics = new PIXI.Graphics();
    graphics.roundRect(0, 0, width, height, 10);
    graphics.fill({ color: 0x333333 });
    graphics.stroke({ width: 3, color: 0x666666 });
    
    // 按钮文字
    const text = new PIXI.Text({
      text: label,
      style: {
        fontSize: 20,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    text.anchor.set(0.5);
    text.x = width / 2;
    text.y = height / 2;
    
    container.addChild(graphics);
    container.addChild(text);
    
    // 交互
    container.eventMode = 'static';
    container.cursor = 'pointer';
    
    // Hover效果
    container.on('pointerover', () => {
      graphics.clear();
      graphics.roundRect(0, 0, width, height, 10);
      graphics.fill({ color: 0x555555 });
      graphics.stroke({ width: 3, color: 0xffff00 });
    });
    
    container.on('pointerout', () => {
      graphics.clear();
      graphics.roundRect(0, 0, width, height, 10);
      graphics.fill({ color: 0x333333 });
      graphics.stroke({ width: 3, color: 0x666666 });
    });
    
    container.on('pointerdown', onClick);
    
    return {
      container,
      graphics,
      text,
      onClick,
      bounds: { x, y, width, height },
    };
  }

  /**
   * 注册回调函数
   */
  setCallbacks(callbacks: {
    onPause?: () => void;
    onResume?: () => void;
    onRestart?: () => void;
    onOpenEditor?: () => void;
    onToggleAudio?: () => void;
  }): void {
    this.onPauseCallback = callbacks.onPause || null;
    this.onResumeCallback = callbacks.onResume || null;
    this.onRestartCallback = callbacks.onRestart || null;
    this.onOpenEditorCallback = callbacks.onOpenEditor || null;
    this.onToggleAudioCallback = callbacks.onToggleAudio || null;
  }

  /**
   * 获取暂停状态
   */
  isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.phaseTitleTimer) {
      clearTimeout(this.phaseTitleTimer);
    }
    
    if (this.topBar) {
      this.container.removeChild(this.topBar);
    }
    
    if (this.pauseMenu) {
      this.container.removeChild(this.pauseMenu);
    }
    
    if (this.phaseTitle) {
      this.container.removeChild(this.phaseTitle);
    }
    
    this.buttons = [];
  }
}
