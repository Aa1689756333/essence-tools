'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const mobileMql = window.matchMedia('(max-width: 767px)');
    const tabletMql = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    
    const handleMobileChange = (e) => setIsMobile(e.matches);
    const handleTabletChange = (e) => {
      setIsTablet(e.matches);
      if (e.matches) {
        setCollapsed(true);
      }
    };
    
    setIsMobile(mobileMql.matches);
    setIsTablet(tabletMql.matches);
    if (tabletMql.matches) {
      setCollapsed(true);
    }
    
    mobileMql.addEventListener('change', handleMobileChange);
    tabletMql.addEventListener('change', handleTabletChange);
    return () => {
      mobileMql.removeEventListener('change', handleMobileChange);
      tabletMql.removeEventListener('change', handleTabletChange);
    };
  }, []);

  const toggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen(prev => !prev);
    } else {
      setCollapsed(prev => !prev);
    }
  }, [isMobile]);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, mobileOpen, closeMobile, isMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
