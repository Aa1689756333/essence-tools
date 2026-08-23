'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * 对值进行防抖，value 变化后延迟 delay 毫秒才更新返回值
 * @template T
 * @param {T} value - 需要防抖的值
 * @param {number} [delay=300] - 延迟时间（毫秒）
 * @returns {T} - 防抖后的值
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 返回一个防抖化的回调函数，多次调用时仅在停止调用 delay 毫秒后执行一次
 * @param {Function} fn - 要防抖的回调
 * @param {number} [delay=300] - 延迟时间（毫秒）
 * @returns {Function} - 防抖后的回调（附带 cancel 方法）
 */
export function useDebouncedCallback(fn, delay = 300) {
  const fnRef = useRef(fn);
  const timerRef = useRef(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const debounced = useCallback((...args) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fnRef.current(...args);
    }, delay);
  }, [delay]);

  useEffect(() => cancel, [cancel]);

  debounced.cancel = cancel;
  return debounced;
}

export default useDebounce;
