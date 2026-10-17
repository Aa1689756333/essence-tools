'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

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
 * 给回调挂上 cancel 方法。
 * 必须放在模块作用域：React 把 hook 作用域内新建的函数也视为不可变，
 * 就地赋值会触发 react-hooks/immutability；在进入 React 之前构造完毕则安全，
 * 与 lodash 的 debounce() 返回带 .cancel 的函数是同一种做法。
 * @param {Function} fn - 被包装的函数
 * @param {Function} cancel - 取消方法
 * @returns {Function} - 附带 cancel 的新函数
 */
function attachCancel(fn, cancel) {
  const wrapped = (...args) => fn(...args);
  wrapped.cancel = cancel;
  return wrapped;
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

  const debounced = useCallback(
    (...args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        fnRef.current(...args);
      }, delay);
    },
    [delay]
  );

  useEffect(() => cancel, [cancel]);

  // 不再直接给 useCallback 的返回值挂属性（hook 结果可能被 React 冻结，就地修改会静默失败或抛错），
  // 改由模块级工厂产出带 cancel 的新函数，对外用法 fn(...) / fn.cancel() 保持不变。
  return useMemo(() => attachCancel(debounced, cancel), [debounced, cancel]);
}

export default useDebounce;
