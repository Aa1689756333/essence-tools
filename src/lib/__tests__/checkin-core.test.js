import { describe, expect, it } from 'vitest';
import { computeEarned, getCycleDay } from '../checkin-core';

describe('getCycleDay：连续签到换算周期内第几天', () => {
  it('非法或小于 1 的连续天数按第 1 天处理', () => {
    expect(getCycleDay(0, 7, true)).toBe(1);
    expect(getCycleDay(-3, 7, true)).toBe(1);
    expect(getCycleDay(undefined, 7, true)).toBe(1);
  });

  it('开启周期重置时按周期取模', () => {
    expect(getCycleDay(7, 7, true)).toBe(7);
    expect(getCycleDay(8, 7, true)).toBe(1);
    expect(getCycleDay(15, 7, true)).toBe(1);
  });

  it('未开启周期重置或周期长度非法时保留连续天数', () => {
    expect(getCycleDay(15, 7, false)).toBe(15);
    expect(getCycleDay(15, undefined, true)).toBe(15);
  });
});

describe('computeEarned：模式 A（基础分 + 区间加分 + 上限）', () => {
  const config = {
    capped: {
      basePoints: 2,
      bonusRules: [{ minDays: 1, maxDays: 7, extraPoints: 3 }],
      dailyCap: 4,
      milestones: [{ day: 3, bonus: 10 }],
    },
    absoluteDailyCap: 50,
  };

  it('命中加分区间，但被 dailyCap 截断', () => {
    expect(computeEarned('A', config, 3)).toEqual({
      dailyEarned: 4,
      milestoneBonus: 10,
      totalEarned: 14,
    });
  });

  it('未命中加分区间时只给基础分', () => {
    expect(computeEarned('A', config, 8)).toEqual({
      dailyEarned: 2,
      milestoneBonus: 0,
      totalEarned: 2,
    });
  });

  it('absoluteDailyCap 对当日总额再封一层顶', () => {
    const capped = { ...config, absoluteDailyCap: 5 };
    expect(computeEarned('A', capped, 3).totalEarned).toBe(5);
  });

  it('未配置 absoluteDailyCap 时总额即为日分加里程碑', () => {
    const noCap = { capped: config.capped };
    expect(computeEarned('A', noCap, 3).totalEarned).toBe(14);
  });

  it('负数配置不会产出负积分', () => {
    const negative = {
      capped: { basePoints: -5, bonusRules: [], dailyCap: 10, milestones: [] },
      absoluteDailyCap: 10,
    };
    expect(computeEarned('A', negative, 1)).toEqual({
      dailyEarned: 0,
      milestoneBonus: 0,
      totalEarned: 0,
    });
  });
});

describe('computeEarned：模式 B（按天数区间分档）', () => {
  const config = {
    tiered: {
      dailyTiers: [
        { minDays: 1, maxDays: 6, dailyPoints: 1 },
        { minDays: 7, maxDays: 30, dailyPoints: 5 },
      ],
      milestones: [{ day: 7, bonus: 20 }],
    },
    absoluteDailyCap: 100,
  };

  it('落在哪个区间就用哪一档分值', () => {
    expect(computeEarned('B', config, 3)).toEqual({
      dailyEarned: 1,
      milestoneBonus: 0,
      totalEarned: 1,
    });
    expect(computeEarned('B', config, 7)).toEqual({
      dailyEarned: 5,
      milestoneBonus: 20,
      totalEarned: 25,
    });
  });

  it('超出所有区间时得 0 分', () => {
    expect(computeEarned('B', config, 40)).toEqual({
      dailyEarned: 0,
      milestoneBonus: 0,
      totalEarned: 0,
    });
  });
});

describe('computeEarned：模式 C（逐日配置）', () => {
  it('按下标取当日配置，越界得 0', () => {
    const config = { daily: { days: [1, 2, 3] }, absoluteDailyCap: 100 };
    expect(computeEarned('C', config, 1).dailyEarned).toBe(1);
    expect(computeEarned('C', config, 3).dailyEarned).toBe(3);
    expect(computeEarned('C', config, 5).dailyEarned).toBe(0);
  });

  // 行为记录：模式 C 完全忽略里程碑，即使配置里写了也不参与。
  it('模式 C 不发里程碑奖励', () => {
    const config = {
      daily: { days: [1], milestones: [{ day: 1, bonus: 99 }] },
      absoluteDailyCap: 100,
    };
    expect(computeEarned('C', config, 1).milestoneBonus).toBe(0);
  });
});

describe('computeEarned：兜底', () => {
  it('未知模式一律 0 分', () => {
    expect(computeEarned('D', {}, 1)).toEqual({
      dailyEarned: 0,
      milestoneBonus: 0,
      totalEarned: 0,
    });
  });
});
