'use client';

import { useState, useCallback } from 'react';

export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const toggle = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  return { collapsed, toggle };
}
