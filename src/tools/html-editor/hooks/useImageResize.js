import { useCallback, useEffect, useRef, useState } from 'react';

export default function useImageResize({ editor, updateEmptyState }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const dragStateRef = useRef(null);
  const imageToolbarRef = useRef(null);

  const handleEditorClick = useCallback(
    (event) => {
      const target = event.target;
      if (target.tagName === 'IMG' && editor?.view?.dom?.contains(target)) {
        setSelectedImage(target);
        setImageSize({ width: target.offsetWidth, height: target.offsetHeight });
      } else {
        setSelectedImage(null);
      }
    },
    [editor]
  );

  const handleEditorScroll = useCallback(() => {
    if (!selectedImage || !editor || !editor.view.dom) return;
    const editorDom = editor.view.dom;
    const imgRect = selectedImage.getBoundingClientRect();
    const editorRect = editorDom.getBoundingClientRect();
    const left = imgRect.left - editorRect.left;
    const top = imgRect.top - editorRect.top + editorDom.scrollTop;

    const borderEl = document.getElementById('image-selected-border');
    if (borderEl) {
      borderEl.style.left = `${left}px`;
      borderEl.style.top = `${top}px`;
      borderEl.style.width = `${imgRect.width}px`;
      borderEl.style.height = `${imgRect.height}px`;
    }

    ['nw', 'ne', 'sw', 'se'].forEach((corner) => {
      const handleEl = document.getElementById(`image-resize-handle-${corner}`);
      if (!handleEl) return;
      const isTop = corner.includes('n');
      const isLeft = corner.includes('w');
      handleEl.style.left = isLeft ? `${left - 6}px` : `${left + imgRect.width - 6}px`;
      handleEl.style.top = isTop ? `${top - 6}px` : `${top + imgRect.height - 6}px`;
    });

    if (imageToolbarRef.current) {
      const toolbarHeight = 36;
      const margin = 12;
      const spaceBelow = window.innerHeight - imgRect.bottom;
      const toolbarTop =
        spaceBelow >= toolbarHeight + margin
          ? imgRect.bottom + margin
          : imgRect.top - toolbarHeight - margin;
      let toolbarLeft = imgRect.left + imgRect.width / 2;
      const actualToolbarWidth = imageToolbarRef.current.offsetWidth || 280;
      const halfWidth = actualToolbarWidth / 2;
      const padding = 8;
      if (toolbarLeft - halfWidth < padding) {
        toolbarLeft = halfWidth + padding;
      } else if (toolbarLeft + halfWidth > window.innerWidth - padding) {
        toolbarLeft = window.innerWidth - halfWidth - padding;
      }
      imageToolbarRef.current.style.left = `${toolbarLeft}px`;
      imageToolbarRef.current.style.top = `${toolbarTop}px`;
    }
  }, [editor, selectedImage]);

  useEffect(() => {
    handleEditorScroll();
  }, [handleEditorScroll, imageSize]);

  const handleResizeStart = useCallback(
    (event, corner) => {
      event.preventDefault();
      event.stopPropagation();
      if (!selectedImage) return;

      const rect = selectedImage.getBoundingClientRect();
      dragStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startWidth: rect.width,
        startHeight: rect.height,
        aspectRatio: rect.width / rect.height,
        corner,
      };

      const handleMouseMove = (moveEvent) => {
        if (!dragStateRef.current || !selectedImage || !editor || !editor.view.dom) return;
        const { startX, startWidth, aspectRatio, corner } = dragStateRef.current;
        const deltaX = moveEvent.clientX - startX;
        let newWidth =
          corner === 'se' || corner === 'ne' ? startWidth + deltaX : startWidth - deltaX;
        const maxWidth = editor.view.dom.offsetWidth || 800;
        newWidth = Math.max(50, Math.min(newWidth, maxWidth));
        const newHeight = newWidth / aspectRatio;
        selectedImage.style.width = `${newWidth}px`;
        selectedImage.style.height = `${newHeight}px`;
        setImageSize({ width: Math.round(newWidth), height: Math.round(newHeight) });
      };

      const handleMouseUp = () => {
        dragStateRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        if (editor && editor.view.dom) {
          editor.commands.setContent(editor.view.dom.innerHTML, false);
        }
        updateEmptyState();
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [editor, selectedImage, updateEmptyState]
  );

  const handleImagePresetSize = useCallback(
    (percent) => {
      if (!selectedImage || !editor || !editor.view.dom) return;
      const newWidth = Math.max(50, (editor.view.dom.clientWidth * percent) / 100);
      const aspectRatio = selectedImage.offsetWidth / selectedImage.offsetHeight;
      const newHeight = newWidth / aspectRatio;
      /* eslint-disable react-hooks/immutability -- selectedImage 是存进 state 的 DOM 节点引用，此处为有意的命令式改样式，并非修改 React state；尺寸状态由下方 setImageSize 负责 */
      selectedImage.style.width = `${newWidth}px`;
      selectedImage.style.height = `${newHeight}px`;
      /* eslint-enable react-hooks/immutability */
      setImageSize({ width: Math.round(newWidth), height: Math.round(newHeight) });
      editor.commands.setContent(editor.view.dom.innerHTML, false);
      updateEmptyState();
    },
    [editor, selectedImage, updateEmptyState]
  );

  const handleImageAlign = useCallback(
    (align) => {
      if (!selectedImage) return;
      /* eslint-disable react-hooks/immutability -- 同上：直接操作选中的 <img> DOM 节点来落实对齐样式，是 TipTap 画布的命令式行为，不是修改 React state */
      const image = selectedImage;
      image.removeAttribute('align');
      if (align === 'left') {
        image.style.cssText = image.style.cssText
          .replace(/margin[^;]+;?/g, '')
          .replace(/display[^;]+;?/g, '');
        image.style.float = 'left';
        image.style.margin = '0 12px 8px 0';
      } else if (align === 'right') {
        image.style.cssText = image.style.cssText
          .replace(/margin[^;]+;?/g, '')
          .replace(/display[^;]+;?/g, '');
        image.style.float = 'right';
        image.style.margin = '0 0 8px 12px';
      } else {
        image.style.cssText = image.style.cssText
          .replace(/float[^;]+;?/g, '')
          .replace(/margin[^;]+;?/g, '');
        image.style.display = 'block';
        image.style.margin = '1em auto';
      }
      /* eslint-enable react-hooks/immutability */
      if (editor && editor.view.dom) {
        editor.commands.setContent(editor.view.dom.innerHTML, false);
      }
      updateEmptyState();
    },
    [editor, selectedImage, updateEmptyState]
  );

  return {
    selectedImage,
    imageSize,
    imageToolbarRef,
    handleResizeStart,
    handleImagePresetSize,
    handleImageAlign,
    handleEditorClick,
    handleEditorScroll,
  };
}
