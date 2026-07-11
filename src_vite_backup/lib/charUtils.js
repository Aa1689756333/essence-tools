// ========== 字符分类工具函数 ==========

// CJK 统一汉字范围常量
export const CJK_UNIFIED = '\u4e00-\u9fff';
export const CJK_EXT_A = '\u3400-\u4dbf';
export const CJK_EXT_B = '\u{20000}-\u{2a6df}';
export const CJK_EXT_C = '\u{2a700}-\u{2b73f}';
export const CJK_EXT_D = '\u{2b740}-\u{2b81f}';
export const CJK_EXT_E = '\u{2b820}-\u{2ceaf}';
export const CJK_EXT_F = '\u{2ceb0}-\u{2ebef}';
export const CJK_COMPAT = '\uf900-\ufaff';
export const CJK_RADICAL = '\u2e80-\u2eff\u2f00-\u2fdf';
export const CJK_SPECIAL = '\u3000-\u303f\u31c0-\u31ef\u3200-\u32ff\u3300-\u33ff\ufe30-\ufe4f\uff00-\uffef';

export const CJK = `${CJK_UNIFIED}${CJK_EXT_A}${CJK_RADICAL}${CJK_SPECIAL}${CJK_COMPAT}`;
export const ANS = '\u0041-\u005a\u0061-\u007a\u0030-\u0039';   // A-Z a-z 0-9
export const ANS_EXT = '\u00c0-\u024f';  // Latin extended
export const DIGIT = '\u0030-\u0039';

// 判断是否为 CJK 字符
export function isCJK(c) {
  if (!c) return false;
  const code = c.codePointAt(0);
  if (code === undefined) return false;
  // 基本 CJK
  if (code >= 0x4E00 && code <= 0x9FFF) return true;
  if (code >= 0x3400 && code <= 0x4DBF) return true;
  if (code >= 0xF900 && code <= 0xFAFF) return true;
  // 部首
  if (code >= 0x2E80 && code <= 0x2EFF) return true;
  if (code >= 0x2F00 && code <= 0x2FDF) return true;
  // 标点和特殊符号 (全角)
  if (code >= 0x3000 && code <= 0x303F) return true;
  if (code >= 0x3200 && code <= 0x33FF) return true;
  if (code >= 0xFF00 && code <= 0xFFEF) return true;
  if (code >= 0xFE30 && code <= 0xFE4F) return true;
  // 注音符号 / 平假名 / 片假名
  if (code >= 0x3100 && code <= 0x312F) return true;
  if (code >= 0x31A0 && code <= 0x31BF) return true;
  if (code >= 0x3040 && code <= 0x309F) return true;
  if (code >= 0x30A0 && code <= 0x30FF) return true;
  if (code >= 0x31F0 && code <= 0x31FF) return true;
  // CJK 扩展 (超出 BMP)
  if (code >= 0x20000 && code <= 0x2EBEF) return true;
  // 其他全角字符
  if (code >= 0xFF01 && code <= 0xFF5E) return true;
  if (code === 0x3000) return true; // 全角空格
  return false;
}

// 判断是否为半角英文/数字
export function isHalfwidth(c) {
  if (!c) return false;
  const code = c.charCodeAt(0);
  return (code >= 0x30 && code <= 0x39) ||
    (code >= 0x41 && code <= 0x5A) ||
    (code >= 0x61 && code <= 0x7A);
}

// 判断是否为全角标点(含括号引号)
export function isFullwidthPunct(c) {
  if (!c) return false;
  const code = c.charCodeAt(0);
  return (code >= 0x3000 && code <= 0x303F) ||
    (code >= 0xFF01 && code <= 0xFF0F) ||
    (code >= 0xFF1A && code <= 0xFF20) ||
    (code >= 0xFF3B && code <= 0xFF40) ||
    (code >= 0xFF5B && code <= 0xFF65) ||
    (code >= 0xFE30 && code <= 0xFE4F);
}

// 判断是否为中文排版中使用的标点符号
export function isCJKPunct(c) {
  if (!c) return false;
  const code = c.charCodeAt(0);
  return isFullwidthPunct(c) ||
    code === 0x2014 || // — EM DASH
    code === 0x2015 || // ― HORIZONTAL BAR
    code === 0x2018 || // ' LEFT SINGLE QUOTATION MARK
    code === 0x2019 || // ' RIGHT SINGLE QUOTATION MARK
    code === 0x201C || // " LEFT DOUBLE QUOTATION MARK
    code === 0x201D || // " RIGHT DOUBLE QUOTATION MARK
    code === 0x2026 || // … HORIZONTAL ELLIPSIS
    code === 0x2027 || // ‧ HYPHENATION POINT
    code === 0x2500 || // ─ BOX DRAWINGS HORIZONTAL
    code === 0x203C || // ‼ DOUBLE EXCLAMATION
    code === 0x2047 || // ⁇ DOUBLE QUESTION
    code === 0x2048 || // ⁈ EXCLAMATION QUESTION
    code === 0x2049 || // ⁉ QUESTION EXCLAMATION
    code === 0xFF5E;   // ～ FULLWIDTH TILDE
}

// 归一化文本: 全角转半角后只保留中日韩字符和字母数字, 用于内容匹配
export function normalizeForMatch(s) {
  let t = s.replace(/[\uff10-\uff19\uff21-\uff3a\uff41-\uff5a]/g,
    ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  return t.replace(/[^\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\da-zA-Z]/g, '');
}
