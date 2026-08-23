import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function loadCheckinCore() {
  const source = read('src/lib/checkin-core.js').replaceAll('export ', '');
  const factory = new Function(`${source}; return { getCycleDay, computeEarned };`);
  return factory();
}

function loadCheckinSchema() {
  const source = read('src/lib/validate.js')
    .replace(/^import .*$/m, '')
    .replaceAll('export ', '');
  const factory = new Function('z', `${source}; return { checkinConfigSchema };`);
  return factory(z).checkinConfigSchema;
}

const milestones = [
  { day: 7, bonus: 3 },
  { day: 14, bonus: 6 },
  { day: 21, bonus: 10 },
  { day: 30, bonus: 20 },
];

const validConfig = {
  mode: 'B',
  capped: {
    basePoints: 3,
    bonusRules: [
      { minDays: 3, maxDays: 6, extraPoints: 2 },
      { minDays: 7, maxDays: 99, extraPoints: 4 },
    ],
    dailyCap: 7,
    milestones,
  },
  tiered: {
    dailyTiers: [
      { minDays: 1, maxDays: 6, dailyPoints: 1 },
      { minDays: 7, maxDays: 13, dailyPoints: 2 },
      { minDays: 14, maxDays: 20, dailyPoints: 3 },
      { minDays: 21, maxDays: 30, dailyPoints: 4 },
    ],
    milestones,
  },
  daily: {
    days: [1, 1, 1, 1, 1, 1, 5, 2, 2, 2, 2, 2, 2, 9, 3, 3, 3, 3, 3, 3, 14, 4, 4, 4, 4, 4, 4, 4, 4, 24],
  },
  cycleLength: 30,
  cycleReset: true,
  absoluteDailyCap: 50,
};

test('P2：周期日计算和第 31 天重置', () => {
  const { getCycleDay } = loadCheckinCore();
  assert.equal(getCycleDay(1, 30, true), 1);
  assert.equal(getCycleDay(30, 30, true), 30);
  assert.equal(getCycleDay(31, 30, true), 1);
  assert.equal(getCycleDay(31, 30, false), 31);
  assert.equal(getCycleDay(0, 30, true), 1);
});

test('P2：B 模式关键日发放 1/5/9/14/24', () => {
  const { computeEarned } = loadCheckinCore();
  for (const [day, expected] of [[1, 1], [7, 5], [14, 9], [21, 14], [30, 24]]) {
    assert.equal(computeEarned('B', validConfig, day).totalEarned, expected, `day ${day}`);
  }
});

test('P2：C 模式默认逐日配置与 B 模式一致', () => {
  const { computeEarned } = loadCheckinCore();
  for (const day of [1, 7, 14, 21, 30]) {
    assert.equal(computeEarned('C', validConfig, day).totalEarned, computeEarned('B', validConfig, day).totalEarned);
  }
});

test('P2：A 模式日常封顶，里程碑奖励单独叠加', () => {
  const { computeEarned } = loadCheckinCore();
  const result = computeEarned('A', validConfig, 7);
  assert.deepEqual(result, { dailyEarned: 7, milestoneBonus: 3, totalEarned: 10 });
});

test('P2：绝对日上限最终截断总发放', () => {
  const { computeEarned } = loadCheckinCore();
  assert.equal(computeEarned('B', { ...validConfig, absoluteDailyCap: 5 }, 30).totalEarned, 5);
});

test('P4：合法 v2 配置通过校验', () => {
  assert.equal(loadCheckinSchema().safeParse(validConfig).success, true);
});

test('P4：非法模式、负数和 daily.days 长度错误被拦截', () => {
  const schema = loadCheckinSchema();
  assert.equal(schema.safeParse({ ...validConfig, mode: 'D' }).success, false);
  assert.equal(schema.safeParse({ ...validConfig, absoluteDailyCap: -1 }).success, false);
  assert.equal(schema.safeParse({ ...validConfig, daily: { days: [1] } }).success, false);
});

test('P3/P6：签到 API 和弹窗已移除旧配置与写死文案', () => {
  const route = read('src/app/api/user/checkin/route.js');
  const modal = read('src/components/auth/CheckInModal.jsx');
  assert.match(route, /normalizeCheckinConfig/);
  assert.match(route, /computeEarned/);
  assert.match(route, /checkInLog\.create/);
  assert.match(route, /MILESTONE_BONUS/);
  assert.doesNotMatch(modal, /\+3~7/);
  assert.match(modal, /todayExpected/);
  assert.match(modal, /nextMilestone/);
});

test('P0：CheckInLog 包含用户日期唯一约束', () => {
  const schema = read('prisma/schema.prisma');
  assert.match(schema, /model CheckInLog/);
  assert.match(schema, /@@unique\(\[userId, date\]\)/);
});
