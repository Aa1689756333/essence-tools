import { useEffect, useRef } from 'react';

// 三面板同步滚动：优先用 data-input-line 行匹配锚点定位（准确），
// 比例映射作兜底（当行号未命中时）。
// - overlay 始终锁定跟随 textarea（两者内容完全一致）
// - textarea ↔ output 按视口中央行号互相定位
export function useSyncScroll(textareaRef, overlayRef, outputRef) {
  const isSyncing = useRef(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    const overlay = overlayRef.current;
    const output = outputRef.current;
    if (!textarea || !overlay || !output) return;

    // 找 overlay 中位于视口中央的行号（dataset.line）
    function getCenterInputLine() {
      const children = overlay.children;
      if (!children.length) return -1;
      const centerY = overlay.scrollTop + overlay.clientHeight / 2;
      for (let i = 0; i < children.length; i++) {
        const el = children[i];
        const top = el.offsetTop;
        if (centerY >= top && centerY < top + el.offsetHeight) {
          const line = parseInt(el.dataset.line, 10);
          return isNaN(line) ? -1 : line;
        }
      }
      const last = children[children.length - 1];
      const line = parseInt(last.dataset.line, 10);
      return isNaN(line) ? -1 : line;
    }

    // 在 output 中找到 data-input-line=inputLine 的 p，滚动使其居中
    function scrollOutputToInputLine(inputLine) {
      if (inputLine < 0) return false;
      const p = output.querySelector('p[data-input-line="' + inputLine + '"]');
      if (!p) return false;
      const targetTop = p.offsetTop - output.clientHeight / 2 + p.offsetHeight / 2;
      output.scrollTop = Math.max(0, targetTop);
      return true;
    }

    // 反向：找 output 视口中央 p 的 data-input-line
    function getCenterOutputInputLine() {
      const ps = output.querySelectorAll('p[data-input-line]');
      if (!ps.length) return -1;
      const centerY = output.scrollTop + output.clientHeight / 2;
      for (let i = 0; i < ps.length; i++) {
        const el = ps[i];
        const top = el.offsetTop;
        if (centerY >= top && centerY < top + el.offsetHeight) {
          const line = parseInt(el.dataset.inputLine, 10);
          return isNaN(line) ? -1 : line;
        }
      }
      const line = parseInt(ps[ps.length - 1].dataset.inputLine, 10);
      return isNaN(line) ? -1 : line;
    }

    // 在 overlay 中找到 data-line=inputLine 的行，滚动 textarea 使其居中
    function scrollInputToInputLine(inputLine) {
      if (inputLine < 0) return false;
      const line = overlay.querySelector('.line[data-line="' + inputLine + '"]');
      if (!line) return false;
      const targetTop = line.offsetTop - textarea.clientHeight / 2 + line.offsetHeight / 2;
      textarea.scrollTop = Math.max(0, targetTop);
      overlay.scrollTop = textarea.scrollTop;
      return true;
    }

    // 比例映射（兜底）
    function ratioMap(source, target) {
      const maxSrc = source.scrollHeight - source.clientHeight;
      const ratio = maxSrc > 0 ? source.scrollTop / maxSrc : 0;
      const maxTarget = target.scrollHeight - target.clientHeight;
      target.scrollTop = ratio * maxTarget;
    }

    function syncFromTextarea() {
      if (isSyncing.current) return;
      isSyncing.current = true;
      // overlay 始终与 textarea 同步
      overlay.scrollTop = textarea.scrollTop;
      // 优先用行匹配定位 output
      const inputLine = getCenterInputLine();
      if (!scrollOutputToInputLine(inputLine)) {
        ratioMap(textarea, output);
      }
      requestAnimationFrame(() => {
        isSyncing.current = false;
      });
    }

    function syncFromOutput() {
      if (isSyncing.current) return;
      isSyncing.current = true;
      const inputLine = getCenterOutputInputLine();
      if (inputLine >= 0 && scrollInputToInputLine(inputLine)) {
        // 行匹配成功
      } else {
        ratioMap(output, textarea);
        overlay.scrollTop = textarea.scrollTop;
      }
      requestAnimationFrame(() => {
        isSyncing.current = false;
      });
    }

    const handleInputScroll = () => syncFromTextarea();
    const handleOutputScroll = () => syncFromOutput();

    textarea.addEventListener('scroll', handleInputScroll);
    output.addEventListener('scroll', handleOutputScroll);

    return () => {
      textarea.removeEventListener('scroll', handleInputScroll);
      output.removeEventListener('scroll', handleOutputScroll);
    };
  }, [textareaRef, overlayRef, outputRef]);
}
