import { useCallback, useEffect, useRef, useState } from 'react';

export default function useFindReplace({ editor, updateEmptyState }) {
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findMatches, setFindMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const findInputRef = useRef(null);

  const highlightMatch = useCallback((match) => {
    if (!editor || !editor.view.dom) return;
    const editorDom = editor.view.dom;
    const text = editorDom.innerText || '';
    const beforeText = text.substring(0, match.index);
    const lines = beforeText.split('\n');
    const lineIndex = lines.length - 1;
    const charIndex = lines[lineIndex].length;
    void charIndex;

    const range = document.createRange();
    const walker = document.createTreeWalker(editorDom, NodeFilter.SHOW_TEXT);
    let currentOffset = 0;
    let targetNode = null;
    let targetOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nodeLength = node.textContent.length;
      if (currentOffset + nodeLength > match.index) {
        targetNode = node;
        targetOffset = match.index - currentOffset;
        break;
      }
      currentOffset += nodeLength;
    }

    if (targetNode) {
      try {
        range.setStart(targetNode, targetOffset);
        range.setEnd(targetNode, targetOffset + match.length);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        const rect = range.getBoundingClientRect();
        const editorRect = editorDom.getBoundingClientRect();
        if (rect.top < editorRect.top || rect.bottom > editorRect.bottom) {
          range.startContainer.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (error) {
        console.error('Highlight error:', error);
      }
    }
  }, [editor]);

  const performFind = useCallback(() => {
    if (!findText || !editor || !editor.view.dom) {
      setFindMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }
    const text = editor.view.dom.innerText || '';
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(String(findText).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({ index: match.index, length: match[0].length, text: match[0] });
    }
    setFindMatches(matches);
    setCurrentMatchIndex(matches.length > 0 ? 0 : -1);
    if (matches.length > 0) highlightMatch(matches[0]);
  }, [caseSensitive, editor, findText, highlightMatch]);

  useEffect(() => {
    if (!showFindReplace) return undefined;
    const timer = setTimeout(performFind, 250);
    return () => clearTimeout(timer);
  }, [findText, caseSensitive, showFindReplace, performFind]);

  const findPrevious = useCallback(() => {
    if (findMatches.length === 0) return;
    const newIndex = currentMatchIndex <= 0 ? findMatches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(newIndex);
    highlightMatch(findMatches[newIndex]);
  }, [currentMatchIndex, findMatches, highlightMatch]);

  const findNext = useCallback(() => {
    if (findMatches.length === 0) return;
    const newIndex = currentMatchIndex >= findMatches.length - 1 ? 0 : currentMatchIndex + 1;
    setCurrentMatchIndex(newIndex);
    highlightMatch(findMatches[newIndex]);
  }, [currentMatchIndex, findMatches, highlightMatch]);

  const replaceCurrent = useCallback(() => {
    if (currentMatchIndex < 0 || !editor || !editor.view.dom) return;
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const match = findMatches[currentMatchIndex];
    if (range.toString() === match.text) {
      range.deleteContents();
      range.insertNode(document.createTextNode(replaceText));
      // Tiptap needs to sync dom changes
      editor.commands.setContent(editor.view.dom.innerHTML, false);
      performFind();
    }
  }, [currentMatchIndex, editor, findMatches, performFind, replaceText]);

  const replaceAll = useCallback(() => {
    if (findMatches.length === 0 || !editor || !editor.view.dom) return;
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const walker = document.createTreeWalker(editor.view.dom, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(node => {
      const original = node.textContent;
      node.textContent = original.replace(regex, replaceText);
    });
    // Tiptap needs to sync dom changes
    editor.commands.setContent(editor.view.dom.innerHTML, false);
    updateEmptyState();
    setFindMatches([]);
    setCurrentMatchIndex(-1);
  }, [caseSensitive, editor, findMatches, findText, replaceText, updateEmptyState]);

  const closeFindReplace = useCallback(() => {
    setShowFindReplace(false);
    setFindText('');
    setReplaceText('');
    setFindMatches([]);
    setCurrentMatchIndex(-1);
  }, []);

  return {
    showFindReplace,
    setShowFindReplace,
    findText,
    setFindText,
    replaceText,
    setReplaceText,
    findMatches,
    currentMatchIndex,
    caseSensitive,
    setCaseSensitive,
    findInputRef,
    performFind,
    findNext,
    findPrevious,
    replaceCurrent,
    replaceAll,
    closeFindReplace,
  };
}
