import { describe, it, expect } from 'vitest';
import { BulletProgramProcessor } from '../BulletProgramProcessor';
import { BulletModuleRegistry } from '../BulletModuleRegistry';
import { BulletModuleType, BulletProgram } from '@/types/game';

describe('BulletProgramProcessor', () => {
  describe('基础子弹', () => {
    it('应该生成普通子弹', () => {
      const program: BulletProgram = {
        modules: [BulletModuleRegistry.createModule(BulletModuleType.NORMAL)!],
      };
      
      const bullets = BulletProgramProcessor.processBulletProgram(
        program,
        { x: 100, y: 100 },
        { x: 0, y: -400 }
      );
      
      expect(bullets).toHaveLength(1);
      expect(bullets[0].damage).toBe(1);
      expect(bullets[0].bounceCount).toBe(0);
    });
    
    it('应该生成穿透子弹', () => {
      const program: BulletProgram = {
        modules: [BulletModuleRegistry.createModule(BulletModuleType.PIERCING)!],
      };
      
      const bullets = BulletProgramProcessor.processBulletProgram(
        program,
        { x: 100, y: 100 },
        { x: 0, y: -400 }
      );
      
      expect(bullets).toHaveLength(1);
      expect(BulletProgramProcessor.isPiercingBullet(bullets[0])).toBe(true);
    });
    
    it('应该生成AOE子弹', () => {
      const program: BulletProgram = {
        modules: [BulletModuleRegistry.createModule(BulletModuleType.AOE)!],
      };
      
      const bullets = BulletProgramProcessor.processBulletProgram(
        program,
        { x: 100, y: 100 },
        { x: 0, y: -400 }
      );
      
      expect(bullets).toHaveLength(1);
      expect(BulletProgramProcessor.isAOEBullet(bullets[0])).toBe(true);
      expect(BulletProgramProcessor.getAOERadius(bullets[0])).toBe(50);
    });
  });
  
  describe('修饰模块', () => {
    it('反弹次数+1应该增加反弹次数', () => {
      const program: BulletProgram = {
        modules: [
          BulletModuleRegistry.createModule(BulletModuleType.BOUNCE_PLUS)!,
          BulletModuleRegistry.createModule(BulletModuleType.NORMAL)!,
        ],
      };
      
      const bullets = BulletProgramProcessor.processBulletProgram(
        program,
        { x: 100, y: 100 },
        { x: 0, y: -400 }
      );
      
      expect(bullets).toHaveLength(1);
      expect(bullets[0].bounceCount).toBe(1);
    });
    
    it('齐射+1应该生成多个子弹', () => {
      const program: BulletProgram = {
        modules: [
          BulletModuleRegistry.createModule(BulletModuleType.VOLLEY_PLUS)!,
          BulletModuleRegistry.createModule(BulletModuleType.NORMAL)!,
        ],
      };
      
      const bullets = BulletProgramProcessor.processBulletProgram(
        program,
        { x: 100, y: 100 },
        { x: 0, y: -400 }
      );
      
      expect(bullets.length).toBeGreaterThan(1);
    });
    
    it('散射应该生成扇形子弹', () => {
      const program: BulletProgram = {
        modules: [
          BulletModuleRegistry.createModule(BulletModuleType.SCATTER)!,
          BulletModuleRegistry.createModule(BulletModuleType.NORMAL)!,
        ],
      };
      
      const bullets = BulletProgramProcessor.processBulletProgram(
        program,
        { x: 100, y: 100 },
        { x: 0, y: -400 }
      );
      
      expect(bullets.length).toBeGreaterThan(1);
      
      // 检查子弹有不同的速度方向
      const velocities = bullets.map(b => Math.atan2(b.velocity.y, b.velocity.x));
      const uniqueVelocities = new Set(velocities);
      expect(uniqueVelocities.size).toBeGreaterThan(1);
    });
  });
  
  describe('复杂组合', () => {
    it('应该正确处理多个修饰模块', () => {
      const program: BulletProgram = {
        modules: [
          BulletModuleRegistry.createModule(BulletModuleType.BOUNCE_PLUS)!,
          BulletModuleRegistry.createModule(BulletModuleType.VOLLEY_PLUS)!,
          BulletModuleRegistry.createModule(BulletModuleType.NORMAL)!,
        ],
      };
      
      const bullets = BulletProgramProcessor.processBulletProgram(
        program,
        { x: 100, y: 100 },
        { x: 0, y: -400 }
      );
      
      expect(bullets.length).toBeGreaterThan(1); // 齐射
      expect(bullets[0].bounceCount).toBeGreaterThan(0); // 反弹
    });
    
    it('修饰模块应该只对右侧第一个子弹生效', () => {
      const program: BulletProgram = {
        modules: [
          BulletModuleRegistry.createModule(BulletModuleType.BOUNCE_PLUS)!,
          BulletModuleRegistry.createModule(BulletModuleType.NORMAL)!,
          BulletModuleRegistry.createModule(BulletModuleType.PIERCING)!, // 这个不应该受影响
        ],
      };
      
      const bullets = BulletProgramProcessor.processBulletProgram(
        program,
        { x: 100, y: 100 },
        { x: 0, y: -400 }
      );
      
      expect(bullets).toHaveLength(2); // 两个基础子弹
    });
  });
  
  describe('边界情况', () => {
    it('空程序应该返回空数组', () => {
      const program: BulletProgram = {
        modules: [],
      };
      
      const bullets = BulletProgramProcessor.processBulletProgram(
        program,
        { x: 100, y: 100 },
        { x: 0, y: -400 }
      );
      
      expect(bullets).toHaveLength(0);
    });
    
    it('只有修饰模块应该返回空数组', () => {
      const program: BulletProgram = {
        modules: [
          BulletModuleRegistry.createModule(BulletModuleType.BOUNCE_PLUS)!,
          BulletModuleRegistry.createModule(BulletModuleType.SCATTER)!,
        ],
      };
      
      const bullets = BulletProgramProcessor.processBulletProgram(
        program,
        { x: 100, y: 100 },
        { x: 0, y: -400 }
      );
      
      expect(bullets).toHaveLength(0);
    });
  });
});
