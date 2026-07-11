import { useEffect, useRef } from 'react';

export function useSyncScroll(textareaRef, overlayRef, outputRef) {
  const isSyncing = useRef(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    const overlay = overlayRef.current;
    const output = outputRef.current;

    if (!textarea || !overlay || !output) return;

    function syncScroll(source) {
      if (isSyncing.current) return;
      isSyncing.current = true;

      const maxSrc = source.scrollHeight - source.clientHeight;
      const ratio = maxSrc > 0 ? source.scrollTop / maxSrc : 0;

      if (source !== textarea) {
        const maxIn = textarea.scrollHeight - textarea.clientHeight;
        textarea.scrollTop = ratio * maxIn;
      }

      // overlay 始终与 textarea 同步
      overlay.scrollTop = textarea.scrollTop;

      if (source !== output) {
        const maxOut = output.scrollHeight - output.clientHeight;
        output.scrollTop = ratio * maxOut;
      }

      requestAnimationFrame(() => {
        isSyncing.current = false;
      });
    }

    const handleInputScroll = () => syncScroll(textarea);
    const handleOutputScroll = () => syncScroll(output);

    textarea.addEventListener('scroll', handleInputScroll);
    output.addEventListener('scroll', handleOutputScroll);

    return () => {
      textarea.removeEventListener('scroll', handleInputScroll);
      output.removeEventListener('scroll', handleOutputScroll);
    };
  }, [textareaRef, overlayRef, outputRef]);
}
