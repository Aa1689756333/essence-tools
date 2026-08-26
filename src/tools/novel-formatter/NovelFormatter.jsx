'use client';

import './styles.css';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import EditorPanel from './components/EditorPanel';
import OutputPanel from './components/OutputPanel';
import ActionBar from './components/ActionBar';
import DiffStats from './components/DiffStats';
import ProgressPanel from './components/ProgressPanel';
import { format } from './lib/formatter';
import { normalizeForMatch } from './lib/charUtils';
import { sampleText } from './lib/sampleText';
import { useHighlight } from './hooks/useHighlight';
import { useSyncScroll } from './hooks/useSyncScroll';
import { safeGetItem, safeSetItemWithRetry, safeRemoveItem } from '@/lib/storage';

export default function NovelFormatter() {
  const [inputText, setInputText] = useState('');
  const [formattedText, setFormattedText] = useState('');
  const [inputCount, setInputCount] = useState(0);
  const [outputCount, setOutputCount] = useState(0);
  const [diffStats, setDiffStats] = useState(null);
  const [canCopy, setCanCopy] = useState(false);
  const [copyLabel, setCopyLabel] = useState('复制结果');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePhase, setActivePhase] = useState(0);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [saveError, setSaveError] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const textareaRef = useRef(null);
  const overlayRef = useRef(null);
  const outputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const savedContentRef = useRef(null);
  const restoreConfirmBtnRef = useRef(null);

  const {
    onInputMouseMove,
    onInputMouseLeave,
    onOutputMouseOver,
    onOutputMouseLeave,
  } = useHighlight(textareaRef, overlayRef, outputRef);

  useSyncScroll(textareaRef, overlayRef, outputRef);

  // 启动时检测未保存的内容
  useEffect(() => {
    const saved = safeGetItem('nf-input');
    if (saved) {
      savedContentRef.current = saved;
      setShowRestoreModal(true);
    }
  }, []);

  // 恢复弹窗自动聚焦确认按钮
  useEffect(() => {
    if (showRestoreModal) {
      setTimeout(() => restoreConfirmBtnRef.current?.focus(), 50);
    }
  }, [showRestoreModal]);

  // 自动保存：输入变化 2 秒防抖写入 localStorage
  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (inputText) {
        const result = safeSetItemWithRetry('nf-input', inputText);
        if (result.ok) {
          setLastSavedTime(new Date());
          setSaveError(false);
        } else {
          setSaveError(true);
        }
      }
    }, 2000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [inputText]);

  // 实时更新 overlay: 保持与 textarea 内容同步
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const text = textareaRef.current?.value || '';
    const lines = text.split('\n');
    overlay.innerHTML = '';

    for (let i = 0; i < lines.length; i++) {
      const div = document.createElement('div');
      div.className = 'line';
      div.dataset.line = i;
      div.textContent = lines[i] || '\u200B';
      overlay.appendChild(div);
    }
  }, [inputText]);

  const [outputParagraphs, setOutputParagraphs] = useState([]);
  const workerRef = useRef(null);
  const promiseMapRef = useRef(new Map());
  const workerMsgId = useRef(0);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./lib/formatter.worker.js', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e) => {
      const { type, paragraphs, formatted, id } = e.data;
      if (type === 'paragraphs_result') {
        setOutputParagraphs(paragraphs);
      } else if (type === 'format_result') {
        if (promiseMapRef.current.has(id)) {
          promiseMapRef.current.get(id)(formatted);
          promiseMapRef.current.delete(id);
        }
      }
    };
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // 声明式计算输出段落 (带内容匹配, 用于悬停高亮联动)
  useEffect(() => {
    if (!formattedText || formattedText === '排版结果将显示在这里...' ||
        formattedText === '请先在左侧输入文本...') {
      setOutputParagraphs([]);
      return;
    }
    workerRef.current?.postMessage({
      type: 'compute_paragraphs',
      payload: { inputText, formattedText }
    });
  }, [formattedText, inputText]);

  // textarea input 事件
  const handleInput = useCallback((e) => {
    const text = e.target.value;
    setInputText(text);
    setInputCount(text.length);
  }, []);

  // 一键排版 (带 4 阶段进度动画)
  const handleFormat = useCallback(() => {
    const raw = textareaRef.current?.value || '';
    if (!raw.trim()) {
      setFormattedText('请先在左侧输入文本...');
      setOutputCount(0);
      setDiffStats(null);
      setCanCopy(false);
      return;
    }

    const before = raw.length;
    const isLarge = raw.length > 50000;

    setDiffStats(null);
    setIsProcessing(true);
    setActivePhase(0);

    const formatPromise = new Promise(resolve => {
      const id = ++workerMsgId.current;
      promiseMapRef.current.set(id, resolve);
      workerRef.current?.postMessage({
        type: 'format',
        id,
        payload: { text: raw }
      });
    });

    if (!isLarge) {
      // 小文本：异步计算，进度动画快速闪过（~500ms 总时长，避免无意义等待）
      const fastPhase = 120;
      setTimeout(() => setActivePhase(1), fastPhase);
      setTimeout(() => setActivePhase(2), fastPhase * 2);
      setTimeout(() => setActivePhase(3), fastPhase * 3);
      
      Promise.all([
        formatPromise,
        new Promise(r => setTimeout(r, fastPhase * 4 + 60))
      ]).then(([formatted]) => {
        const after = formatted.length;
        const diff = after - before;
        setFormattedText(formatted);
        setOutputCount(after);
        setCanCopy(true);
        setDiffStats({ before, after, diff });
        setIsProcessing(false);
      });
      return;
    }

    // 大文本：后台 Worker 计算，避免卡死主线程
    const phaseDuration = 700;
    const finalDelay = 400;
    setTimeout(() => setActivePhase(1), phaseDuration);
    setTimeout(() => setActivePhase(2), phaseDuration * 2);
    setTimeout(() => setActivePhase(3), phaseDuration * 3);
    
    Promise.all([
      formatPromise,
      new Promise(r => setTimeout(r, phaseDuration * 4 + finalDelay))
    ]).then(([formatted]) => {
      const after = formatted.length;
      const diff = after - before;
      setFormattedText(formatted);
      setOutputCount(after);
      setCanCopy(true);
      setDiffStats({ before, after, diff });
      setIsProcessing(false);
    });
  }, []);

  // 清空
  // 恢复未保存的内容
  const handleRestoreConfirm = useCallback(() => {
    if (savedContentRef.current !== null) {
      const text = savedContentRef.current;
      if (textareaRef.current) textareaRef.current.value = text;
      setInputText(text);
      setInputCount(text.length);
    }
    setShowRestoreModal(false);
    savedContentRef.current = null;
  }, []);

  const handleRestoreDismiss = useCallback(() => {
    safeRemoveItem('nf-input');
    setShowRestoreModal(false);
    savedContentRef.current = null;
  }, []);

  const handleClear = useCallback(() => {
    if (inputText.trim()) {
      if (!window.confirm('确定要清空输入和排版结果吗？')) {
        return;
      }
    }
    if (textareaRef.current) {
      textareaRef.current.value = '';
    }
    setInputText('');
    setFormattedText('');
    setInputCount(0);
    setOutputCount(0);
    setDiffStats(null);
    setCanCopy(false);
    setCopyLabel('复制结果');
    setIsProcessing(false);
    setSaveError(false);
    safeRemoveItem('nf-input');
  }, [inputText]);

  // 复制结果
  const handleCopy = useCallback(() => {
    if (!canCopy) return;
    const text = formattedText;
    if (!text || text === '排版结果将显示在这里...') return;

    navigator.clipboard.writeText(text).then(() => {
      setCopyLabel('已复制!');
      setTimeout(() => setCopyLabel('复制结果'), 1500);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopyLabel('已复制!');
      setTimeout(() => setCopyLabel('复制结果'), 1500);
    });
  }, [canCopy, formattedText]);

  // 测试文本
  const handleSample = useCallback(() => {
    if (inputText.trim()) {
      if (!window.confirm('加载示例会覆盖当前的输入内容，确定要继续吗？')) {
        return;
      }
    }
    if (textareaRef.current) {
      textareaRef.current.value = sampleText;
    }
    setInputText(sampleText);
    setInputCount(sampleText.length);
    setFormattedText('');
    setOutputCount(0);
    setDiffStats(null);
    setCanCopy(false);
  }, [inputText]);

  return (
    <div className="w-full">
      {/* 页面标题 */}
      <div className="mb-4 md:mb-5 lg:mb-6">
        <h1 className="text-[22px] font-bold text-text mb-1.5 tracking-tight">小说排版器</h1>
        <p className="text-[13.5px] text-text-secondary leading-relaxed">
          一键规范化标点、间距、段落，29 条排版规则让小说格式更规范。
        </p>
      </div>

      {saveError && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[12.5px] text-amber-600 dark:text-amber-400" title="localStorage 配额超限或被禁用，输入内容不会自动保存">
          自动保存已暂停（存储空间不足），请及时复制或排版后复制结果
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 h-[calc(100vh-240px)] min-h-[380px] max-md:min-h-[250px] max-md:max-h-[42vh]">
        <EditorPanel
          textareaRef={textareaRef}
          overlayRef={overlayRef}
          inputCount={inputCount}
          onInput={handleInput}
          onMouseMove={onInputMouseMove}
          onMouseLeave={onInputMouseLeave}
        />
        <OutputPanel
          outputRef={outputRef}
          paragraphs={outputParagraphs}
          outputText={formattedText}
          outputCount={outputCount}
          onMouseOver={onOutputMouseOver}
          onMouseLeave={onOutputMouseLeave}
        />
      </div>

      <DiffStats stats={diffStats} />

      {isProcessing && <ProgressPanel activePhase={activePhase} />}

      {showRestoreModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={handleRestoreDismiss}>
          <div
            className="bg-card border border-border rounded-xl shadow-2xl min-w-[320px] max-w-[90vw] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-modal-title"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 id="restore-modal-title" className="text-[15px] font-semibold text-text">恢复未保存的内容</h2>
            </div>
            <div className="p-5">
              <p className="text-[13px] text-text-secondary mb-4 leading-relaxed">检测到上次未保存的输入内容，是否恢复？</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleRestoreDismiss}
                  className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-text-secondary border border-border bg-card cursor-pointer hover:bg-bg hover:text-text transition-colors"
                >
                  放弃
                </button>
                <button
                  ref={restoreConfirmBtnRef}
                  onClick={handleRestoreConfirm}
                  className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-white cursor-pointer transition-colors"
                  style={{ backgroundColor: 'var(--theme-accent, #34d399)' }}
                >
                  恢复
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ActionBar
        onFormat={handleFormat}
        onSample={handleSample}
        onClear={handleClear}
        onCopy={handleCopy}
        canCopy={canCopy}
        copyLabel={copyLabel}
        disabled={isProcessing}
      />
    </div>
  );
}
