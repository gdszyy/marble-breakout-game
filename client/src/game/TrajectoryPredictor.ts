// 轨迹预测器 - 预测子弹飞行路径

import { GAME_CONFIG } from './config';
import type { Brick } from '../types/game';

export interface TrajectoryPoint {
  x: number;
  y: number;
}

export interface TrajectorySegment {
  points: TrajectoryPoint[];
  isBounce: boolean; // 是否是反弹段
}

export class TrajectoryPredictor {
  /**
   * 预测子弹轨迹
   * @param startPos 起始位置
   * @param direction 方向向量
   * @param bounceCount 反弹次数
   * @param bricks 砖块列表
   * @param maxSteps 最大预测步数
   */
  static predict(
    startPos: { x: number; y: number },
    direction: { x: number; y: number },
    bounceCount: number,
    bricks: Brick[],
    maxSteps: number = 100
  ): TrajectorySegment[] {
    const segments: TrajectorySegment[] = [];
    let currentPos = { ...startPos };
    let currentDir = { ...direction };
    let remainingBounces = bounceCount;
    let currentSegment: TrajectoryPoint[] = [{ ...currentPos }];

    const stepSize = 5; // 每步移动的距离

    for (let step = 0; step < maxSteps; step++) {
      // 移动一小步
      currentPos.x += currentDir.x * stepSize;
      currentPos.y += currentDir.y * stepSize;

      currentSegment.push({ ...currentPos });

      // 检查是否碰到边界
      let bounced = false;

      // 左右边界
      if (currentPos.x <= 0 || currentPos.x >= GAME_CONFIG.CANVAS_WIDTH) {
        currentDir.x *= -1;
        currentPos.x = Math.max(0, Math.min(GAME_CONFIG.CANVAS_WIDTH, currentPos.x));
        bounced = true;
      }

      // 上边界
      if (currentPos.y <= 0) {
        currentDir.y *= -1;
        currentPos.y = 0;
        bounced = true;
      }

      // 下边界（子弹消失）
      if (currentPos.y >= GAME_CONFIG.CANVAS_HEIGHT) {
        segments.push({ points: currentSegment, isBounce: false });
        break;
      }

      // 检查是否碰到砖块
      const hitBrick = this.checkBrickCollision(currentPos, bricks);
      if (hitBrick) {
        // 计算反弹方向
        const brickCenter = {
          x: hitBrick.position.x + hitBrick.size.width / 2,
          y: hitBrick.position.y + hitBrick.size.height / 2,
        };

        const dx = currentPos.x - brickCenter.x;
        const dy = currentPos.y - brickCenter.y;

        // 简化反弹：根据碰撞位置决定反弹方向
        if (Math.abs(dx) > Math.abs(dy)) {
          currentDir.x *= -1;
        } else {
          currentDir.y *= -1;
        }

        bounced = true;
      }

      // 如果发生反弹
      if (bounced) {
        segments.push({ points: currentSegment, isBounce: false });
        currentSegment = [{ ...currentPos }];

        if (remainingBounces > 0) {
          remainingBounces--;
        } else {
          // 没有反弹次数了，轨迹结束
          break;
        }
      }
    }

    // 添加最后一段
    if (currentSegment.length > 1) {
      segments.push({ points: currentSegment, isBounce: false });
    }

    return segments;
  }

  /**
   * 检查与砖块的碰撞
   */
  private static checkBrickCollision(
    pos: { x: number; y: number },
    bricks: Brick[]
  ): Brick | null {
    const radius = GAME_CONFIG.BULLET_RADIUS;

    for (const brick of bricks) {
      const closestX = Math.max(brick.position.x, Math.min(pos.x, brick.position.x + brick.size.width));
      const closestY = Math.max(brick.position.y, Math.min(pos.y, brick.position.y + brick.size.height));

      const distanceX = pos.x - closestX;
      const distanceY = pos.y - closestY;
      const distanceSquared = distanceX * distanceX + distanceY * distanceY;

      if (distanceSquared < radius * radius) {
        return brick;
      }
    }

    return null;
  }

  /**
   * 简化轨迹点（减少渲染点数）
   */
  static simplifyTrajectory(segments: TrajectorySegment[], interval: number = 3): TrajectorySegment[] {
    return segments.map((segment) => ({
      ...segment,
      points: segment.points.filter((_, index) => index % interval === 0 || index === segment.points.length - 1),
    }));
  }
}
