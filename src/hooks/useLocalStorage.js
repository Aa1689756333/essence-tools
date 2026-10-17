'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { safeGetItem, safeSetItemWithRetry } from '@/lib/storage';

/**
 * 将状态持久化到 localStorage（基于安全封装 storage.js）。
 *
 * 为避免 Next.js SSR 的 hydration 不一致，首次渲染返回 initialValue，
 * 挂载后再从 localStorage 读取并更新。
 *
 * @template T
 * @param {string} key - localStorage 键名
 * @param {T} initialValue - 初始值（读取不到时使用）
 * @param {object} [options]
 * @param {(value: T) => string} [options.serialize] - 序列化函数，默认 String
 * @param {(raw: string) => T} [options.deserialize] - 反序列化函数，默认原样返回
 * @returns {[T, (value: T | ((prev: T) => T)) => void]} - [值, 更新函数]
 */
export function useLocalStorage(key, initialValue, options = {}) {
  const { serialize, deserialize } = options;
  const serializeRef = useRef(serialize);
  const deserializeRef = useRef(deserialize);

  useEffect(() => {
    serializeRef.current = serialize;
    deserializeRef.current = deserialize;
  });

  const [storedValue, setStoredValue] = useState(initialValue);

  // 挂载后从 localStorage 读取
  useEffect(() => {
    const raw = safeGetItem(key);
    if (raw !== null) {
      const de = deserializeRef.current;
      setStoredValue(de ? de(raw) : raw);
    }
  }, [key]);

  const setValue = useCallback(
    (value) => {
      setStoredValue((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        const se = serializeRef.current;
        safeSetItemWithRetry(key, se ? se(next) : String(next));
        return next;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}

export default useLocalStorage;
