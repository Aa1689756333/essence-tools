import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useDebounce, { useDebouncedCallback } from '@/hooks/useDebounce';

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebounce', () => {
  it('停止变化 delay 后才更新返回值', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 200), {
      initialProps: { value: 'a' },
    });

    expect(result.current).toBe('a');

    rerender({ value: 'b' });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(result.current).toBe('b');
  });
});

describe('useDebouncedCallback', () => {
  it('返回可调用的函数，且带有 cancel 方法', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(spy, 300));

    // 回归点：cancel 原先靠就地修改 useCallback 的返回值挂载，
    // React 冻结 hook 结果时该属性会丢失，改为模块级工厂后必须始终存在。
    expect(typeof result.current).toBe('function');
    expect(typeof result.current.cancel).toBe('function');

    result.current(1, 2);
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(1, 2);
  });

  it('cancel 阻止尚未触发的调用', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(spy, 300));

    result.current();
    result.current.cancel();

    vi.advanceTimersByTime(500);
    expect(spy).not.toHaveBeenCalled();
  });

  it('卸载时自动取消待执行的调用', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(spy, 300));

    result.current();
    unmount();

    vi.advanceTimersByTime(500);
    expect(spy).not.toHaveBeenCalled();
  });

  it('delay 不变时跨渲染保持同一引用', () => {
    const spy = vi.fn();
    const { result, rerender } = renderHook(({ delay }) => useDebouncedCallback(spy, delay), {
      initialProps: { delay: 300 },
    });

    const first = result.current;
    rerender({ delay: 300 });

    expect(result.current).toBe(first);
    expect(result.current.cancel).toBe(first.cancel);
  });
});
