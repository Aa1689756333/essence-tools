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

  const textareaRef = useRef(null);
  const overlayRef = useRef(null);
  const outputRef = useRef(null);

  const {
    onInputMouseMove,
    onInputMouseLeave,
    onOutputMouseOver,
    onOutputMouseLeave,
  } = useHighlight(textareaRef, overlayRef, outputRef);

  useSyncScroll(textareaRef, overlayRef, outputRef);

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

  // 声明式计算输出段落 (带内容匹配, 用于悬停高亮联动)
  const outputParagraphs = useMemo(() => {
    if (!formattedText || formattedText === '排版结果将显示在这里...' ||
        formattedText === '请先在左侧输入文本...') {
      return [];
    }

    const inputLines = inputText.split('\n');
    const inputNorms = inputLines.map(l => normalizeForMatch(l));
    const outputLines = formattedText.split('\n');
    const paragraphs = [];
    let lastMatch = -1;

    for (const line of outputLines) {
      if (line.trim() !== '') {
        const outNorm = normalizeForMatch(line);
        let bestIdx = -1;
        let bestScore = 0;
        const searchFrom = Math.max(0, lastMatch);
        const searchTo = Math.min(inputLines.length, searchFrom + 30);

        for (let j = searchFrom; j < searchTo; j++) {
          if (!inputNorms[j]) continue;
          const len = Math.min(outNorm.length, inputNorms[j].length);
          if (len === 0) continue;
          let score = 0;
          for (let k = 0; k < len; k++) {
            if (outNorm[k] === inputNorms[j][k]) score++;
            else break;
          }
          if (score > bestScore) {
            bestScore = score;
            bestIdx = j;
          }
        }

        if (bestIdx >= 0 && bestScore >= 2) {
          paragraphs.push({ text: line, inputLine: bestIdx });
          lastMatch = bestIdx + 1;
        } else {
          paragraphs.push({ text: line, inputLine: -1 });
        }
      } else {
        paragraphs.push({ text: '', inputLine: -1 });
      }
    }

    return paragraphs;
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

    const formatted = format(raw);
    const before = raw.length;
    const after = formatted.length;
    const diff = after - before;

    setDiffStats(null);
    setIsProcessing(true);
    setActivePhase(0);

    const phaseDuration = 700;
    const finalDelay = 400;

    setTimeout(() => setActivePhase(1), phaseDuration);
    setTimeout(() => setActivePhase(2), phaseDuration * 2);
    setTimeout(() => setActivePhase(3), phaseDuration * 3);
    setTimeout(() => {
      setFormattedText(formatted);
      setOutputCount(after);
      setCanCopy(true);
      setDiffStats({ before, after, diff });
      setIsProcessing(false);
    }, phaseDuration * 4 + finalDelay);
  }, []);

  // 清空
  const handleClear = useCallback(() => {
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
  }, []);

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
    if (textareaRef.current) {
      textareaRef.current.value = sampleText;
    }
    setInputText(sampleText);
    setInputCount(sampleText.length);
    setFormattedText('');
    setOutputCount(0);
    setDiffStats(null);
    setCanCopy(false);
  }, []);

  return (
    <div className="w-full">
      {/* 页面标题 */}
      <div className="mb-4 md:mb-5 lg:mb-6">
        <h1 className="text-[22px] font-bold text-text mb-1.5 tracking-tight">小说排版器</h1>
        <p className="text-[13.5px] text-text-secondary leading-relaxed">
          一键规范化标点、间距、段落，29 条排版规则让小说格式更规范。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 h-[600px] max-md:h-auto">
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
