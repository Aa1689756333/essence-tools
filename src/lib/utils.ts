/**
 * 公共工具函数库
 */

/**
 * 字数统计：中文单字 + 英文单词
 * @param {string} text - 要统计的文本
 * @returns {{ words: number, chars: number }} - 返回字数和字符数
 */
export function countWords(text: string): { words: number; chars: number } {
  if (!text) return { words: 0, chars: 0 };

  // 计算字符数（不包括纯空格，但包括标点符号）
  const chars = text.replace(/\s/g, '').length;

  // 计算字数：中文单字算作一个字，连续英文/数字算作一个词
  // 1. 匹配中文字符、韩文、日文等
  const cjkMatches = text.match(/[\u4e00-\u9fa5\uac00-\ud7a3\u0800-\u4e00]/g) || [];

  // 2. 匹配英文单词、数字序列
  const wordMatches = text.match(/[a-zA-Z0-9_]+/g) || [];

  const words = cjkMatches.length + wordMatches.length;

  return { words, chars };
}

/**
 * 防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} - 防抖后的函数
 */
export function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * 节流函数
 * @param {Function} fn - 要节流的函数
 * @param {number} delay - 间隔时间（毫秒）
 * @returns {Function} - 节流后的函数
 */
export function throttle(fn, delay) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
}

/**
 * 日期格式化
 * @param {Date} date - 日期对象
 * @param {string} format - 格式字符串，支持 YYYY MM DD HH mm ss
 * @returns {string} - 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 获取本地时区日期字符串（YYYY-MM-DD）
 * @param {Date} date - 日期对象，默认为当前时间
 * @returns {string} - 日期字符串
 */
export function getLocalDateStr(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
