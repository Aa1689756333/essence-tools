'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';

/**
 * 插入链接模态框
 * @param {boolean} isOpen - 是否显示
 * @param {function} onConfirm - 确认回调，参数为 { url, text }
 * @param {function} onCancel - 取消回调
 * @param {object} initialData - 初始数据 { url, text }
 * @param {object} theme - 主题对象
 */
export default function LinkModal({ isOpen, onConfirm, onCancel, initialData = {}, theme }) {
  const [url, setUrl] = useState('https://');
  const [text, setText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUrl(initialData.url || 'https://');
      setText(initialData.text || '');
    }
  }, [isOpen, initialData.url, initialData.text]);

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="插入链接">
      <div className="space-y-3">
        <div>
          <label className="block text-[13px] text-text-secondary mb-1.5">链接地址</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full h-[36px] px-3 rounded-lg border border-border text-[13px] focus:outline-none focus:border-border-light"
            placeholder="https://"
          />
        </div>
        {text && (
          <div>
            <label className="block text-[13px] text-text-secondary mb-1.5">链接文本</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-[36px] px-3 rounded-lg border border-border text-[13px] focus:outline-none focus:border-border-light"
            />
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onConfirm({ url, text })}
            className="flex-1 h-[36px] rounded-lg text-[13px] font-semibold text-white cursor-pointer transition-all"
            style={{ backgroundColor: theme.accent }}
          >
            确定
          </button>
          <button
            onClick={onCancel}
            className="flex-1 h-[36px] rounded-lg text-[13px] font-semibold text-text-secondary bg-card border border-border cursor-pointer hover:bg-bg transition-all"
          >
            取消
          </button>
        </div>
      </div>
    </Modal>
  );
}
