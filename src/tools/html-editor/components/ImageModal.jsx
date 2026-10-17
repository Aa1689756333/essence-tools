'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload } from 'lucide-react';
import Modal from '@/components/ui/Modal';

/**
 * 插入图片模态框
 * @param {boolean} isOpen - 是否显示
 * @param {function} onConfirm - 确认回调，参数为 { url, alt, isBase64 }
 * @param {function} onCancel - 取消回调
 * @param {object} theme - 主题对象
 */
export default function ImageModal({ isOpen, onConfirm, onCancel, theme }) {
  const [tab, setTab] = useState('upload'); // 'upload' | 'url'
  const [url, setUrl] = useState('https://');
  const [alt, setAlt] = useState('');
  const [isBase64, setIsBase64] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTab('upload');
      setUrl('https://');
      setAlt('');
      setIsBase64(false);
    }
  }, [isOpen]);

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUrl(event.target?.result);
        setIsBase64(true);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="插入图片">
      <div className="space-y-3">
        {/* Tab 切换 */}
        <div className="flex gap-1 p-1 bg-bg rounded-lg">
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-all ${
              tab === 'upload'
                ? 'bg-card text-text shadow-sm'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            本地上传
          </button>
          <button
            onClick={() => setTab('url')}
            className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-all ${
              tab === 'url' ? 'bg-card text-text shadow-sm' : 'text-text-secondary hover:text-text'
            }`}
          >
            网络图片
          </button>
        </div>

        {/* 本地上传 */}
        {tab === 'upload' && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className="border-2 border-dashed border-border-light rounded-lg p-8 text-center cursor-pointer hover:border-text-tertiary transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-text-tertiary" />
              <p className="text-[13px] text-text-secondary mb-1">
                {url && isBase64 ? '已选择图片' : '点击选择或拖拽图片到此处'}
              </p>
              <p className="text-[12px] text-text-tertiary">支持 JPG、PNG、GIF 等格式</p>
              {url && isBase64 && (
                <div className="mt-3">
                  <img
                    src={url}
                    alt="预览"
                    className="max-w-[200px] max-h-[150px] mx-auto rounded border border-border"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 网络图片 */}
        {tab === 'url' && (
          <div>
            <label className="block text-[13px] text-text-secondary mb-1.5">图片地址</label>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setIsBase64(false);
              }}
              className="w-full h-[36px] px-3 rounded-lg border border-border text-[13px] focus:outline-none focus:border-border-light"
              placeholder="https://"
            />
            {url && !isBase64 && url !== 'https://' && (
              <div className="mt-3">
                <img
                  src={url}
                  alt="预览"
                  className="max-w-[200px] max-h-[150px] mx-auto rounded border border-border"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-[13px] text-text-secondary mb-1.5">替代文本 (可选)</label>
          <input
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="w-full h-[36px] px-3 rounded-lg border border-border text-[13px] focus:outline-none focus:border-border-light"
            placeholder="图片描述"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onConfirm({ url, alt, isBase64 })}
            disabled={!url || (tab === 'url' && url === 'https://')}
            className="flex-1 h-[36px] rounded-lg text-[13px] font-semibold text-white cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
