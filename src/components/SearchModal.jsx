'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight } from 'lucide-react';
import { tools } from '@/tools/registry';

export default function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const router = useRouter();

  // 过滤工具列表
  const filteredTools = query.trim()
    ? tools.filter(tool => {
        const searchStr = query.toLowerCase();
        return (
          tool.name.toLowerCase().includes(searchStr) ||
          tool.desc.toLowerCase().includes(searchStr) ||
          tool.tags.some(tag => tag.toLowerCase().includes(searchStr)) ||
          tool.category.toLowerCase().includes(searchStr)
        );
      })
    : [];

  // 自动聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // 键盘导航
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredTools.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredTools.length) % filteredTools.length);
    } else if (e.key === 'Enter' && filteredTools[selectedIndex]) {
      e.preventDefault();
      navigateToTool(filteredTools[selectedIndex].path);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const navigateToTool = (path) => {
    router.push(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* 搜索框 */}
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 搜索输入区 */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <Search className="w-5 h-5 text-text-tertiary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索工具..."
            className="flex-1 bg-transparent text-text text-base placeholder:text-text-tertiary focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-tertiary hover:text-text hover:bg-bg-primary transition-colors"
            aria-label="关闭搜索"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 搜索结果 */}
        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
          {query.trim() === '' ? (
            <div className="px-5 py-8 text-center text-text-tertiary text-sm">
              输入关键词搜索工具
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="px-5 py-8 text-center text-text-tertiary text-sm">
              未找到匹配的工具
            </div>
          ) : (
            <ul className="py-2">
              {filteredTools.map((tool, index) => (
                <li key={tool.id}>
                  <button
                    onClick={() => navigateToTool(tool.path)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-5 py-3 flex items-center gap-4 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-bg-primary'
                        : 'hover:bg-bg-primary/50'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{
                        background: `var(--color-${tool.color}-subtle, rgba(16, 185, 129, 0.1))`,
                      }}
                    >
                      {tool.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-text font-medium truncate">
                        {tool.name}
                      </div>
                      <div className="text-text-secondary text-sm truncate">
                        {tool.desc}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-tertiary shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 快捷键提示 */}
        <div className="px-5 py-3 border-t border-border bg-bg-primary/30 flex items-center justify-between text-xs text-text-tertiary">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-text-secondary">↑↓</kbd>
              {' '}导航
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-text-secondary">↵</kbd>
              {' '}选择
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-text-secondary">esc</kbd>
              {' '}关闭
            </span>
          </div>
          <span>共 {filteredTools.length} 个结果</span>
        </div>
      </div>
    </div>
  );
}
