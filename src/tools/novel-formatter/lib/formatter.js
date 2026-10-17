// ========== 排版引擎核心: 29 条格式化规则 ==========

import { CJK_UNIFIED, CJK_EXT_A, CJK_COMPAT, ANS, ANS_EXT, isCJK, isCJKPunct } from './charUtils';

function isRuleEnabled() {
  return true;
}

export function format(text) {
  let t = text;

  // 统一换行符
  t = t.replace(/\r\n/g, '\n');
  t = t.replace(/\r/g, '\n');

  // ========================================
  // 阶段1: 字符级转换 (不依赖上下文)
  // ========================================

  // 1.1 全角数字转半角
  if (isRuleEnabled('fullwidth-number')) {
    t = t.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  }

  // 1.2 全角字母转半角
  if (isRuleEnabled('fullwidth-letter')) {
    t = t.replace(/[Ａ-Ｚａ-ｚ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  }

  // 1.3 间隔号统一
  if (isRuleEnabled('interpunct-unify')) {
    t = t.replace(/[\u2022\u2027\u30FB]/g, '\u00B7');
  }

  // ========================================
  // 阶段2: 标点统一 (基于上下文)
  // ========================================

  // 2.1 中文标点转全角
  if (isRuleEnabled('fullwidth-punct')) {
    const arr = Array.from(t);
    const protected_ = new Set();

    for (let i = 0; i < arr.length; i++) {
      const ch = arr[i];
      // 保护小数: 数字.数字
      if (ch === '.' && i > 0 && i < arr.length - 1) {
        if (/\d/.test(arr[i - 1]) && /\d/.test(arr[i + 1])) {
          protected_.add(i);
        }
      }
      // 保护时间: 数字:数字
      if (ch === ':' && i > 0 && i < arr.length - 1) {
        if (/\d/.test(arr[i - 1]) && /\d/.test(arr[i + 1])) {
          protected_.add(i);
        }
      }
      // 保护URL
      if (ch === ':' && i > 0 && i < arr.length - 1) {
        if (arr[i - 1] === 's' && arr[i + 1] === '/' && i > 1 && arr[i - 2] === 'p')
          protected_.add(i);
        if (arr[i - 1] === 's' && arr[i + 1] === '/' && i > 1 && arr[i - 2] === 's')
          protected_.add(i);
      }
      if (ch === '/' && i > 0 && i < arr.length - 1) {
        if (arr[i - 1] === ':' && arr[i + 1] === '/') {
          protected_.add(i);
          protected_.add(i - 1);
          protected_.add(i + 1);
        }
      }
    }

    for (let i = 0; i < arr.length; i++) {
      if (protected_.has(i)) continue;
      const ch = arr[i];
      const prev = i > 0 ? arr[i - 1] : '';
      const next = i < arr.length - 1 ? arr[i + 1] : '';

      const inCJKContext =
        isCJK(prev) || isCJK(next) || (prev === '' && isCJK(next)) || (next === '' && isCJK(prev));

      if (!inCJKContext) continue;

      if (ch === ',') arr[i] = '\uFF0C';
      else if (ch === ';') arr[i] = '\uFF1B';
      else if (ch === ':') arr[i] = '\uFF1A';
      else if (ch === '?') arr[i] = '\uFF1F';
      else if (ch === '!') arr[i] = '\uFF01';
      else if (ch === '.') arr[i] = '\u3002';
      else if (ch === '(') arr[i] = '\uFF08';
      else if (ch === ')') arr[i] = '\uFF09';
    }
    t = arr.join('');
  }

  // 2.2 省略号统一
  if (isRuleEnabled('ellipsis-unify')) {
    t = t.replace(/\.{3,}/g, '\u2026\u2026');
    t = t.replace(/．{3,}/g, '\u2026\u2026');
    t = t.replace(/\u3002{3,}/g, '\u2026\u2026');
    t = t.replace(/[.\u3002\uff0e]{3,}/g, '\u2026\u2026');
    t = t.replace(/[\u2026]{1}/g, '\u2026\u2026');
    t = t.replace(/(\u2026\u2026)+/g, '\u2026\u2026');
  }

  // 2.3 破折号统一
  if (isRuleEnabled('dash-unify')) {
    t = t.replace(/-{2,}/g, '\u2014\u2014');
    t = t.replace(/[\u2013]{2,}/g, '\u2014\u2014');
    t = t.replace(/[\u2014]{1}/g, '\u2014\u2014');
    t = t.replace(/(\u2014\u2014)+/g, '\u2014\u2014');
  }

  // 2.4 引号统一 (状态机)
  if (isRuleEnabled('quote-unify')) {
    const arr2 = Array.from(t);
    let insideDouble = false;
    let insideSingle = false;

    function isOpeningPrev(c) {
      if (!c) return false;
      return /^[\uff08\u300e\u300c\u300a\uff3b\uff5b\u201c\u2018]$/.test(c);
    }

    for (let i = 0; i < arr2.length; i++) {
      const ch = arr2[i];

      // 段落边界重置引号状态
      if (ch === '\n' && i > 0 && i < arr2.length - 1 && arr2[i - 1] === '\n') {
        insideDouble = false;
        insideSingle = false;
      }

      // 处理双引号
      if (ch === '"' || ch === '\u0022') {
        const prev = i > 0 ? arr2[i - 1] : '';
        const next = i < arr2.length - 1 ? arr2[i + 1] : '';

        const inCJKContext =
          isCJK(prev) ||
          isCJK(next) ||
          isCJKPunct(prev) ||
          isCJKPunct(next) ||
          isOpeningPrev(prev) ||
          insideDouble ||
          (prev === '\n' && (isCJK(next) || isCJKPunct(next)));

        if (inCJKContext) {
          if (!insideDouble) {
            arr2[i] = '\u201C';
            insideDouble = true;
          } else {
            arr2[i] = '\u201D';
            insideDouble = false;
          }
        }
      }

      // 处理单引号
      if (ch === "'" || ch === '\u0027') {
        const prev = i > 0 ? arr2[i - 1] : '';
        const next = i < arr2.length - 1 ? arr2[i + 1] : '';

        const inCJKContext =
          isCJK(prev) ||
          isCJK(next) ||
          isCJKPunct(prev) ||
          isCJKPunct(next) ||
          isOpeningPrev(prev) ||
          insideSingle ||
          (prev === '\n' && (isCJK(next) || isCJKPunct(next)));

        if (inCJKContext) {
          if (!insideSingle) {
            arr2[i] = '\u2018';
            insideSingle = true;
          } else {
            arr2[i] = '\u2019';
            insideSingle = false;
          }
        }
      }
    }
    t = arr2.join('');
  }

  // 2.5 波浪号统一
  if (isRuleEnabled('tilde-unify')) {
    t = t.replace(/(?<=\d)\s*~\s*(?=\d)/g, '\uFF5E');
    t = t.replace(/~\uFF5E/g, '\uFF5E');
    t = t.replace(/~(?=[\u4e00-\u9fff])/g, '\uFF5E');
    t = t.replace(/(?<=[\u4e00-\u9fff])~/g, '\uFF5E');
  }

  // 2.6 连接号规范
  if (isRuleEnabled('connector-unify')) {
    t = t.replace(/-\u2014/g, '\u2014');
    t = t.replace(/\u2014-/g, '\u2014');
  }

  // 2.6.5 书名号统一
  if (isRuleEnabled('bookmark-unify')) {
    t = t.replace(/<<\s*/g, '\u300A');
    t = t.replace(/\s*>>/g, '\u300B');
  }

  // 2.6.5b 书名号嵌套规范
  if (isRuleEnabled('nested-bookmark')) {
    t = t.replace(/\u300A\u300A/g, '\u300A\u3008');
    t = t.replace(/\u300B\u300B/g, '\u3009\u300B');
  }

  // 2.6.6 竖线统一
  if (isRuleEnabled('vbar-unify')) {
    t = t.replace(
      /(?<=[\u4e00-\u9fff\uff00-\uffef])\s*\|\s*(?=[\u4e00-\u9fff\uff00-\uffef])/g,
      '\uFF5C'
    );
    t = t.replace(/(?<=[\u4e00-\u9fff\uff00-\uffef])\s*\|\s*(?=[\dA-Za-z])/g, '\uFF5C');
    t = t.replace(/(?<=[\dA-Za-z])\s*\|\s*(?=[\u4e00-\u9fff\uff00-\uffef])/g, '\uFF5C');
  }

  // 2.7 重复标点合并
  if (isRuleEnabled('repeat-punct')) {
    t = t.replace(/([\uff01！]){2,}/g, '\uff01');
    t = t.replace(/([\uff1f？]){2,}/g, '\uff1f');
    t = t.replace(/([\uff1f？][\uff01！]){2,}/g, '\uff1f\uff01');
    t = t.replace(/([\uff01！][\uff1f？]){2,}/g, '\uff01\uff1f');
  }

  // 2.7b 重复标点扩展
  if (isRuleEnabled('repeat-punct-ext')) {
    t = t.replace(/[\uff0c，]{2,}/g, '\uff0c');
    t = t.replace(/[\uff1b；]{2,}/g, '\uff1b');
    t = t.replace(/[\uff1a：]{2,}/g, '\uff1a');
  }

  // ========================================
  // 阶段3: 空格处理
  // ========================================

  // 3.1 中英文之间加空格
  if (isRuleEnabled('space-cjk')) {
    t = t.replace(
      new RegExp(
        `([${CJK_UNIFIED}${CJK_EXT_A}${CJK_COMPAT}\u3100-\u312f\u31a0-\u31bf\u3040-\u309f\u30a0-\u30ff\u31f0-\u31ff])([${ANS}${ANS_EXT}(])`,
        'gu'
      ),
      '$1 $2'
    );
    t = t.replace(
      new RegExp(
        `([${ANS}${ANS_EXT})])([${CJK_UNIFIED}${CJK_EXT_A}${CJK_COMPAT}\u3100-\u312f\u31a0-\u31bf\u3040-\u309f\u30a0-\u30ff\u31f0-\u31ff])`,
        'gu'
      ),
      '$1 $2'
    );
  }

  // 3.2 数字与中文单位加空格
  if (isRuleEnabled('space-number-unit')) {
    const hexStore = [];
    t = t.replace(/(#[0-9A-Fa-f]{3,8})/g, function (m) {
      hexStore.push(m);
      return '\x00H' + (hexStore.length - 1) + '\x00';
    });
    t = t.replace(
      /(\d)((?!px\b|ms\b|em\b|vh\b|vw\b|ch\b|ex\b|pt\b|cm\b|mm\b|in\b)[A-Za-z]{2,})/g,
      '$1 $2'
    );
    t = t.replace(/\x00H\d+\x00/g, function (m) {
      return hexStore[parseInt(m.replace(/[^\d]/g, ''))];
    });
  }

  // 3.3 全角标点周围去空格
  if (isRuleEnabled('no-space-fullwidth')) {
    t = t.replace(
      / +([\uff0c\uff0e\uff01\uff1f\uff1a\uff1b\u3001\u3002\u201d\uff09\u300d\u300f\u300b\uff3d\uff5d])/g,
      '$1'
    );
    t = t.replace(/([\uff08\u201c\u300e\u300c\u300a\uff3b\uff5b]) +/g, '$1');
    t = t.replace(/ +\u2026\u2026/g, '\u2026\u2026');
    t = t.replace(/ +\u2014\u2014/g, '\u2014\u2014');
  }

  // 3.4 中文字符之间的空格移除
  if (isRuleEnabled('no-space-cjk')) {
    t = t.replace(
      new RegExp(
        `([${CJK_UNIFIED}${CJK_EXT_A}${CJK_COMPAT}]) +(?=[${CJK_UNIFIED}${CJK_EXT_A}${CJK_COMPAT}])`,
        'gu'
      ),
      '$1'
    );
  }

  // 3.5 括号间距
  if (isRuleEnabled('space-bracket')) {
    t = t.replace(new RegExp(`([${CJK_UNIFIED}${CJK_EXT_A}${CJK_COMPAT}])([([])`, 'gu'), '$1 $2');
    t = t.replace(new RegExp(`([)\\]])([${CJK_UNIFIED}${CJK_EXT_A}${CJK_COMPAT}])`, 'gu'), '$1 $2');
  }

  // 3.6 & 符号间距
  if (isRuleEnabled('space-ampersand')) {
    t = t.replace(
      new RegExp(
        `([${CJK_UNIFIED}${CJK_EXT_A}${CJK_COMPAT}])\\s*&\\s*(?=[${CJK_UNIFIED}${CJK_EXT_A}${CJK_COMPAT}])`,
        'gu'
      ),
      '$1 & '
    );
    t = t.replace(
      new RegExp(
        `([${CJK_UNIFIED}${CJK_EXT_A}${CJK_COMPAT}])\\s*&(?=[^\\s${CJK_UNIFIED}${CJK_EXT_A}${CJK_COMPAT}])`,
        'gu'
      ),
      '$1 &'
    );
    t = t.replace(
      new RegExp(
        `([^\\s${CJK_UNIFIED}${CJK_EXT_A}${CJK_COMPAT}])&\\s*(?=[${CJK_UNIFIED}${CJK_EXT_A}${CJK_COMPAT}])`,
        'gu'
      ),
      '$1 &'
    );
  }

  // 3.7 拆行保护
  if (isRuleEnabled('line-breaking')) {
    t = t.replace(/\u2014\n\u2014/g, '\u2014\u2014');
    t = t.replace(/\u2026\n\u2026/g, '\u2026\u2026');
    t = t.replace(/(?<=\S)\u2014\n(?=\S)/g, '');
    t = t.replace(/(?<=\S)\u2026\n(?=\S)/g, '');
  }

  // ========================================
  // 阶段4: 段落/行级处理
  // ========================================

  // 4.1 行首行尾去多余空格
  if (isRuleEnabled('trim-lines')) {
    const lines = t.split('\n');
    for (let i = 0; i < lines.length; i++) {
      lines[i] = lines[i].replace(/^[ \t]+/, '').replace(/[ \t]+$/, '');
    }
    t = lines.join('\n');
  }

  // 4.1b 全角空格规范化
  if (isRuleEnabled('fullwidth-space-norm')) {
    const lines2 = t.split('\n');
    for (let i = 0; i < lines2.length; i++) {
      const m = lines2[i].match(/^(\u3000*)(.*)/);
      if (m) lines2[i] = m[1] + m[2].replace(/\u3000/g, ' ');
    }
    t = lines2.join('\n');
  }

  // 4.2 合并多余空行
  if (isRuleEnabled('blank-lines')) {
    t = t.replace(/\n{3,}/g, '\n\n');
    t = t.replace(/^\n+/, '').replace(/\n+$/, '\n');
  }

  // 4.3 多余半角空格压缩
  if (isRuleEnabled('space-normalize')) {
    t = t.replace(/ {2,}/g, ' ');
  }

  // 4.4 首行缩进
  if (isRuleEnabled('auto-indent')) {
    const lines3 = t.split('\n');
    for (let i = 0; i < lines3.length; i++) {
      const line = lines3[i];
      if (!line || /^[\u3000\s]*$/.test(line)) continue;
      if (/^\u3000{2}/.test(line)) continue;
      if (/^第[一二三四五六七八九十百千零〇０-９\d]+[章节卷部节回集篇]/.test(line)) continue;
      if (/^Chapter\s/i.test(line)) continue;
      if (/^[\*\—\-\·\*\s]+$/.test(line) && line.replace(/\s/g, '').length >= 3) continue;
      lines3[i] = '\u3000\u3000' + line;
    }
    t = lines3.join('\n');
  }

  // 4.5 章节标题识别
  if (isRuleEnabled('chapter-heading')) {
    const chapPattern =
      /^(第[一二三四五六七八九十百千零〇０-９\d]+[章节卷部回集篇].*|Chapter\s+\d+.*)$/im;
    t = t.replace(new RegExp(`(?<!\\n\\n)${chapPattern.source}`, 'gm'), '\n$1');
    t = t.replace(new RegExp(`${chapPattern.source}(?!\\n\\n)`, 'gm'), '$1\n');
    t = t.replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n');
  }

  // 4.6 段落去重
  if (isRuleEnabled('dedup-paragraphs')) {
    const lines4 = t.split('\n');
    const result = [];
    let prevLine = null;
    for (let i = 0; i < lines4.length; i++) {
      const trimmed = lines4[i].trim();
      if (trimmed === '') {
        result.push(lines4[i]);
        prevLine = null;
      } else if (trimmed !== prevLine) {
        result.push(lines4[i]);
        prevLine = trimmed;
      }
    }
    t = result.join('\n');
  }

  // 4.7 对话格式检测
  if (isRuleEnabled('dialogue-format')) {
    const speechTags =
      '(?:说|道|问|答|喊|叫|吼|嚷|笑|叹|哭|骂|怒|吼道|叫道|笑道|叹道|问道|答道|低声说|大声说|小声说|冷冷地说|轻声说)';
    t = t.replace(
      new RegExp(`([，。])\\u201D(${speechTags})\\uFF0C\\u201C`, 'g'),
      '\uFF0C\u201D$2\uFF0C\u201C'
    );
    t = t.replace(new RegExp(`([：。])\\u201D(${speechTags})\\u3002`, 'g'), '\uFF0C\u201D$2\u3002');
  }

  return t;
}
