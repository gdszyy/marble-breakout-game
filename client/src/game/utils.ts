// 游戏工具函数

import type { Vector2 } from '../types/game';

export function distance(p1: Vector2, p2: Vector2): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalize(v: Vector2): Vector2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function dot(v1: Vector2, v2: Vector2): number {
  return v1.x * v2.x + v1.y * v2.y;
}

export function reflect(incident: Vector2, normal: Vector2): Vector2 {
  const d = dot(incident, normal);
  return {
    x: incident.x - 2 * d * normal.x,
    y: incident.y - 2 * d * normal.y,
  };
}

export function rotate(v: Vector2, angle: number): Vector2 {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(color1: number, color2: number, t: number): number {
  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;
  
  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;
  
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  
  return (r << 16) | (g << 8) | b;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function circleRectCollision(
  circlePos: Vector2,
  radius: number,
  rectX: number,
  rectY: number,
  rectW: number,
  rectH: number
): boolean {
  const closestX = clamp(circlePos.x, rectX, rectX + rectW);
  const closestY = clamp(circlePos.y, rectY, rectY + rectH);
  const dist = distance(circlePos, { x: closestX, y: closestY });
  return dist < radius;
}

export function circleCircleCollision(
  pos1: Vector2,
  radius1: number,
  pos2: Vector2,
  radius2: number
): boolean {
  return distance(pos1, pos2) < radius1 + radius2;
}
