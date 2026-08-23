'use client';

import { useEffect } from 'react';

/**
 * 点击元素外部时触发回调（常用于关闭下拉菜单、弹层等）
 * @param {import('react').RefObject<HTMLElement>} ref - 目标元素的 ref
 * @param {(event: MouseEvent) => void} callback - 点击外部时执行的回调
 * @param {boolean} [enabled=true] - 是否启用监听，false 时不绑定事件
 */
export function useClickOutside(ref, callback, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        callback(e);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, callback, enabled]);
}

export default useClickOutside;
