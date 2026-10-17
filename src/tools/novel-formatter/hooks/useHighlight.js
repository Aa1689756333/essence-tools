import { useCallback } from 'react';

export function useHighlight(textareaRef, overlayRef, outputRef) {
  const clearHighlight = useCallback(() => {
    if (overlayRef.current) {
      overlayRef.current
        .querySelectorAll('.line.active')
        .forEach((el) => el.classList.remove('active'));
    }
    if (outputRef.current) {
      outputRef.current.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
    }
  }, [overlayRef, outputRef]);

  const onInputMouseMove = useCallback(
    (e) => {
      const overlay = overlayRef.current;
      const output = outputRef.current;
      if (!overlay || !overlay.childElementCount || !output) return;

      const mouseY = e.clientY;
      const children = overlay.children;
      let foundIdx = -1;

      for (let i = 0; i < children.length; i++) {
        const rect = children[i].getBoundingClientRect();
        if (mouseY >= rect.top && mouseY < rect.bottom) {
          foundIdx = i;
          break;
        }
      }

      clearHighlight();

      if (foundIdx >= 0) {
        const line = children[foundIdx];
        line.classList.add('active');
        const p = output.querySelector('p[data-input-line="' + line.dataset.line + '"]');
        if (p) p.classList.add('active');
      }
    },
    [overlayRef, outputRef, clearHighlight]
  );

  const onOutputMouseOver = useCallback(
    (e) => {
      const p = e.target.closest('p[data-input-line]');
      const overlay = overlayRef.current;

      clearHighlight();

      if (p && overlay) {
        p.classList.add('active');
        const line = overlay.querySelector('.line[data-line="' + p.dataset.inputLine + '"]');
        if (line) line.classList.add('active');
      }
    },
    [overlayRef, clearHighlight]
  );

  return {
    onInputMouseMove,
    onInputMouseLeave: clearHighlight,
    onOutputMouseOver,
    onOutputMouseLeave: clearHighlight,
  };
}
