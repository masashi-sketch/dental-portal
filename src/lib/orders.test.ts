import { describe, expect, it } from 'vitest';
import { canTransitionOrderStatus } from './orders';

describe('canTransitionOrderStatus', () => {
  it('受付から準備中、準備完了から受け取り済みへ進める', () => {
    expect(canTransitionOrderStatus('received', 'preparing')).toBe(true);
    expect(canTransitionOrderStatus('ready', 'completed')).toBe(true);
  });

  it('完了後の巻き戻しと段階の飛び越しを拒否する', () => {
    expect(canTransitionOrderStatus('completed', 'preparing')).toBe(false);
    expect(canTransitionOrderStatus('received', 'completed')).toBe(false);
  });

  it('同じ状態への更新は冪等として許可する', () => {
    expect(canTransitionOrderStatus('preparing', 'preparing')).toBe(true);
  });

  it('医院受け取りを配送中、自宅配送を準備完了にはできない', () => {
    expect(canTransitionOrderStatus('preparing', 'shipped', 'pickup')).toBe(false);
    expect(canTransitionOrderStatus('preparing', 'ready', 'delivery')).toBe(false);
  });
});
