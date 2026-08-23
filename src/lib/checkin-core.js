export function getCycleDay(continuousCheckIn, cycleLength, cycleReset) {
  if (!Number.isFinite(continuousCheckIn) || continuousCheckIn < 1) return 1;
  if (!cycleReset || !Number.isFinite(cycleLength) || cycleLength < 1) {
    return continuousCheckIn;
  }
  return ((continuousCheckIn - 1) % cycleLength) + 1;
}

function getMilestoneBonus(milestones, cycleDay) {
  return (milestones || [])
    .filter((milestone) => milestone.day === cycleDay)
    .reduce((sum, milestone) => sum + (milestone.bonus || 0), 0);
}

function getCappedEarned(config, cycleDay) {
  let dailyEarned = config.basePoints || 0;

  for (const rule of config.bonusRules || []) {
    const minDays = rule.minDays || 0;
    const maxDays = rule.maxDays ?? Infinity;
    if (cycleDay >= minDays && cycleDay <= maxDays) {
      dailyEarned += rule.extraPoints || 0;
    }
  }

  return {
    dailyEarned: Math.min(dailyEarned, config.dailyCap ?? dailyEarned),
    milestoneBonus: getMilestoneBonus(config.milestones, cycleDay),
  };
}

function getTieredEarned(config, cycleDay) {
  const tier = (config.dailyTiers || []).find(
    ({ minDays, maxDays }) => cycleDay >= minDays && cycleDay <= maxDays
  );

  return {
    dailyEarned: tier?.dailyPoints || 0,
    milestoneBonus: getMilestoneBonus(config.milestones, cycleDay),
  };
}

function getDailyEarned(config, cycleDay) {
  return {
    dailyEarned: config.days?.[cycleDay - 1] || 0,
    milestoneBonus: 0,
  };
}

export function computeEarned(mode, config, cycleDay) {
  let earned;

  if (mode === 'A') {
    earned = getCappedEarned(config.capped || {}, cycleDay);
  } else if (mode === 'B') {
    earned = getTieredEarned(config.tiered || {}, cycleDay);
  } else if (mode === 'C') {
    earned = getDailyEarned(config.daily || {}, cycleDay);
  } else {
    earned = { dailyEarned: 0, milestoneBonus: 0 };
  }

  const dailyEarned = Math.max(0, earned.dailyEarned);
  const milestoneBonus = Math.max(0, earned.milestoneBonus);
  const totalEarned = Math.min(
    dailyEarned + milestoneBonus,
    Math.max(0, config.absoluteDailyCap ?? dailyEarned + milestoneBonus)
  );

  return { dailyEarned, milestoneBonus, totalEarned };
}
