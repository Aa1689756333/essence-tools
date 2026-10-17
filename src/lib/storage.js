// ========== 安全的 localStorage 封装 ==========
// 统一处理 QuotaExceededError、隐私模式（localStorage 禁用）、SSR 等场景，
// 避免异常中断业务逻辑。所有需要持久化的工具应使用本模块而非直接调用 localStorage。

// 检测 localStorage 是否可用（隐私模式 / 禁用 / SSR 时不可用）
let storageAvailable = null;
function isStorageAvailable() {
  if (storageAvailable !== null) return storageAvailable;
  if (typeof window === 'undefined') return (storageAvailable = false);
  try {
    const testKey = '__essence_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  return storageAvailable;
}

/**
 * 安全写入 localStorage
 * @param {string} key
 * @param {string} value
 * @returns {{ ok: boolean, reason?: string, quota?: boolean }}
 *   - ok: 是否写入成功
 *   - reason: 失败原因（'unavailable' | 'QuotaExceededError' | 异常名）
 *   - quota: 是否因配额超限失败
 */
export function safeSetItem(key, value) {
  if (!isStorageAvailable()) return { ok: false, reason: 'unavailable' };
  try {
    window.localStorage.setItem(key, value);
    return { ok: true };
  } catch (e) {
    const reason = e?.name || 'UnknownError';
    const quota = reason === 'QuotaExceededError' || reason === 'NS_ERROR_DOM_QUOTA_REACHED';
    return { ok: false, reason, quota };
  }
}

/**
 * 安全读取 localStorage
 * @param {string} key
 * @returns {string | null} 值；不可用或不存在时返回 null
 */
export function safeGetItem(key) {
  if (!isStorageAvailable()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * 安全删除 localStorage 项
 * @param {string} key
 */
export function safeRemoveItem(key) {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

/**
 * 清除指定 key 的旧内容后重试写入一次（用于配额超限时的降级）
 * @param {string} key
 * @param {string} value
 * @returns {{ ok: boolean, reason?: string, quota?: boolean }}
 */
export function safeSetItemWithRetry(key, value) {
  const first = safeSetItem(key, value);
  if (first.ok) return first;
  // 仅在配额超限时尝试：先清除旧值再重试
  if (first.quota) {
    safeRemoveItem(key);
    return safeSetItem(key, value);
  }
  return first;
}
