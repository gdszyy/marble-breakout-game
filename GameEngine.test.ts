import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../GameEngine';
import { GameStateFactory } from '../GameStateFactory';
import { GameEventType, BulletModuleType } from '@/types/game';
import { BulletModuleRegistry } from '../BulletModuleRegistry';

describe('GameEngine', () => {
  let engine: GameEngine;
  
  beforeEach(() => {
    const initialState = GameStateFactory.createDefaultState();
    engine = new GameEngine(initialState);
  });
  
  describe('初始化', () => {
    it('应该创建游戏引擎实例', () => {
      expect(engine).toBeDefined();
    });
    
    it('应该有正确的初始游戏状态', () => {
      const state = engine.getState();
      expect(state.player.health).toBe(10);
      expect(state.round).toBe(0);
      expect(state.score).toBe(0);
      expect(state.isGameOver).toBe(false);
      expect(state.currentEvent).toBe(GameEventType.BRICK_SPAWN);
    });
  });
  
  describe('玩家移动', () => {
    it('应该能向左移动', () => {
      const initialX = engine.getState().player.position.x;
      engine.movePlayer('left');
      const newX = engine.getState().player.position.x;
      expect(newX).toBeLessThan(initialX);
    });
    
    it('应该能向右移动', () => {
      const initialX = engine.getState().player.position.x;
      engine.movePlayer('right');
      const newX = engine.getState().player.position.x;
      expect(newX).toBeGreaterThan(initialX);
    });
    
    it('不应该移动到画布外', () => {
      // 向左移动很多次
      for (let i = 0; i < 100; i++) {
        engine.movePlayer('left');
      }
      const leftX = engine.getState().player.position.x;
      expect(leftX).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('子弹槽位切换', () => {
    it('应该能切换子弹槽位', () => {
      expect(engine.getState().player.currentBulletSlot).toBe(0);
      engine.switchBulletSlot(1);
      expect(engine.getState().player.currentBulletSlot).toBe(1);
      engine.switchBulletSlot(2);
      expect(engine.getState().player.currentBulletSlot).toBe(2);
    });
    
    it('不应该切换到无效的槽位', () => {
      engine.switchBulletSlot(0);
      expect(engine.getState().player.currentBulletSlot).toBe(0);
      engine.switchBulletSlot(999);
      expect(engine.getState().player.currentBulletSlot).toBe(0); // 保持不变
    });
  });
  
  describe('事件系统', () => {
    it('应该能切换到下一个事件', () => {
      const state = engine.getState();
      expect(state.currentEvent).toBe(GameEventType.BRICK_SPAWN);
      
      engine.nextEvent();
      expect(engine.getState().currentEvent).toBe(GameEventType.BULLET_LOADING);
      
      engine.nextEvent();
      expect(engine.getState().currentEvent).toBe(GameEventType.PLAYER_ACTION);
      
      engine.nextEvent();
      expect(engine.getState().currentEvent).toBe(GameEventType.BRICK_ACTION);
      
      engine.nextEvent();
      expect(engine.getState().currentEvent).toBe(GameEventType.BRICK_SPAWN);
    });
    
    it('砖块生成事件应该增加回合数', () => {
      const initialRound = engine.getState().round;
      // 初始状态已经是BRICK_SPAWN,需要循环一圈回到BRICK_SPAWN
      engine.nextEvent(); // BULLET_LOADING
      engine.nextEvent(); // PLAYER_ACTION
      engine.nextEvent(); // BRICK_ACTION
      engine.nextEvent(); // BRICK_SPAWN
      expect(engine.getState().round).toBe(initialRound + 1);
    });
  });
  
  describe('子弹发射', () => {
    it('应该能在玩家行动阶段发射子弹', () => {
      // 切换到玩家行动阶段
      engine.setState({ currentEvent: GameEventType.PLAYER_ACTION });
      
      const initialBulletCount = engine.getState().bullets.length;
      engine.shootBullet();
      const newBulletCount = engine.getState().bullets.length;
      
      expect(newBulletCount).toBeGreaterThan(initialBulletCount);
    });
    
    it('不应该在非玩家行动阶段发射子弹', () => {
      engine.setState({ currentEvent: GameEventType.BRICK_SPAWN });
      
      const initialBulletCount = engine.getState().bullets.length;
      engine.shootBullet();
      const newBulletCount = engine.getState().bullets.length;
      
      expect(newBulletCount).toBe(initialBulletCount);
    });
  });
  
  describe('游戏状态更新', () => {
    it('应该能更新游戏状态', () => {
      engine.setState({ score: 100 });
      expect(engine.getState().score).toBe(100);
      
      engine.setState({ round: 5 });
      expect(engine.getState().round).toBe(5);
    });
  });
});
