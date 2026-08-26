'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';

/**
 * 插入表格模态框
 * @param {boolean} isOpen - 是否显示
 * @param {function} onConfirm - 确认回调，参数为 { rows, cols }
 * @param {function} onCancel - 取消回调
 * @param {object} theme - 主题对象
 */
export default function TableModal({ isOpen, onConfirm, onCancel, theme }) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  useEffect(() => {
    if (isOpen) {
      setRows(3);
      setCols(3);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="插入表格">
      <div className="space-y-3">
        <div>
          <label className="block text-[13px] text-text-secondary mb-1.5">行数</label>
          <input
            type="number"
            value={rows}
            onChange={(e) => setRows(e.target.value)}
            className="w-full h-[36px] px-3 rounded-lg border border-border text-[13px] focus:outline-none focus:border-border-light"
            min="1"
            max="20"
          />
        </div>
        <div>
          <label className="block text-[13px] text-text-secondary mb-1.5">列数</label>
          <input
            type="number"
            value={cols}
            onChange={(e) => setCols(e.target.value)}
            className="w-full h-[36px] px-3 rounded-lg border border-border text-[13px] focus:outline-none focus:border-border-light"
            min="1"
            max="10"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onConfirm({ rows, cols })}
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
