const PLAN_FREE = 'free';
const PLAN_PRO = 'pro';
const FREE_HISTORY_LIMIT = 100;
const PRO_HISTORY_LIMIT = 2000;

const FREE_FEATURES = new Set([
  'textHistory',
  'search',
  'copyHistory',
  'deleteHistory',
  'favorites',
  'pinning',
  'globalShortcut',
  'quickPanel',
  'basicCategories'
]);

const PRO_FEATURES = new Set([
  'tableTools',
  'textTransforms',
  'imageHistory',
  'fileHistory',
  'advancedCategories',
  'trayClose',
  'largeHistory',
  'templates',
  'sensitiveProtection',
  'backupRestore'
]);

function isProPlan(subscription) {
  return subscription?.plan === PLAN_PRO;
}

function getPlan(subscription) {
  return isProPlan(subscription) ? PLAN_PRO : PLAN_FREE;
}

function canUseFeature(subscription, feature) {
  if (FREE_FEATURES.has(feature)) return true;
  if (PRO_FEATURES.has(feature)) return isProPlan(subscription);
  return false;
}

function getHistoryLimit(subscription) {
  return isProPlan(subscription) ? PRO_HISTORY_LIMIT : FREE_HISTORY_LIMIT;
}

function isProHistoryItem(item) {
  if (!item) return false;
  return ['table', 'code', 'email', 'color', 'image', 'file'].includes(item.type)
    || item.kind === 'image'
    || item.kind === 'file';
}

function getPlanComparison() {
  return [
    { feature: '\u6587\u672c\u526a\u8d34\u677f\u5386\u53f2', free: '\u652f\u6301', pro: '\u652f\u6301' },
    { feature: '\u641c\u7d22\u5386\u53f2', free: '\u652f\u6301', pro: '\u652f\u6301' },
    { feature: '\u6536\u85cf / \u7f6e\u9876', free: '\u652f\u6301', pro: '\u652f\u6301' },
    { feature: '\u5feb\u6377\u9762\u677f / \u5168\u5c40\u5feb\u6377\u952e', free: '\u652f\u6301', pro: '\u652f\u6301' },
    { feature: '\u6700\u5927\u4fdd\u5b58\u6570\u91cf', free: `${FREE_HISTORY_LIMIT} \u6761`, pro: `${PRO_HISTORY_LIMIT} \u6761` },
    { feature: '\u6587\u672c\u589e\u5f3a', free: '\u4e0d\u652f\u6301', pro: '\u652f\u6301' },
    { feature: '\u8868\u683c\u8bc6\u522b\u4e0e\u7c98\u8d34', free: '\u4e0d\u652f\u6301', pro: '\u652f\u6301' },
    { feature: '\u56fe\u7247 / \u6587\u4ef6\u8bb0\u5f55', free: '\u4e0d\u652f\u6301', pro: '\u652f\u6301' },
    { feature: '\u9ad8\u7ea7\u5206\u7c7b', free: '\u4e0d\u652f\u6301', pro: '\u652f\u6301' },
    { feature: '\u5173\u95ed\u9690\u85cf\u5230\u6258\u76d8', free: '\u4e0d\u652f\u6301', pro: '\u652f\u6301' },
    { feature: '\u6a21\u677f\u5e93 / \u5feb\u6377\u77ed\u8bed', free: '\u4e0d\u652f\u6301', pro: '\u652f\u6301' },
    { feature: '\u654f\u611f\u5185\u5bb9\u4fdd\u62a4', free: '\u4e0d\u652f\u6301', pro: '\u652f\u6301' },
    { feature: '\u5907\u4efd\u5bfc\u5165\u5bfc\u51fa', free: '\u4e0d\u652f\u6301', pro: '\u652f\u6301' }
  ];
}

module.exports = {
  PLAN_FREE,
  PLAN_PRO,
  FREE_HISTORY_LIMIT,
  PRO_HISTORY_LIMIT,
  FREE_FEATURES,
  PRO_FEATURES,
  isProPlan,
  getPlan,
  canUseFeature,
  getHistoryLimit,
  isProHistoryItem,
  getPlanComparison
};


