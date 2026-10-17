import { format as formatNovel } from './formatter';
import { normalizeForMatch } from './charUtils';

self.onmessage = function (e) {
  const { type, payload, id } = e.data;

  if (type === 'format') {
    const formatted = formatNovel(payload.text);
    self.postMessage({ type: 'format_result', id, formatted });
  } else if (type === 'compute_paragraphs') {
    const { inputText, formattedText } = payload;
    const inputLines = inputText.split('\n');
    const inputNorms = inputLines.map((l) => normalizeForMatch(l));
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
    self.postMessage({ type: 'paragraphs_result', id, paragraphs });
  }
};
