export interface DiffToken {
  type: "added" | "removed" | "equal";
  value: string;
}

export interface LineDiff {
  type: "added" | "removed" | "equal" | "modified";
  value: string;
  originalValue?: string;
  charDiff?: DiffToken[];
}

/**
 * Calculates a simple LCS-based similarity score between two strings, ranging from 0 to 1.
 */
function getStringSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  const n = s1.length;
  const m = s2.length;
  
  if (n * m > 10000) return 0; // Prevent performance issues for large words

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[n][m] / Math.max(n, m);
}

/**
 * Detailed character-level diff for similar words.
 */
function diffCharacters(orig: string, mod: string): DiffToken[] {
  const list1 = Array.from(orig);
  const list2 = Array.from(mod);
  const n = list1.length;
  const m = list2.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (list1[i - 1] === list2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffToken[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && list1[i - 1] === list2[j - 1]) {
      result.unshift({ type: "equal", value: list1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", value: list2[j - 1] });
      j--;
    } else {
      result.unshift({ type: "removed", value: list1[i - 1] });
      i--;
    }
  }
  return result;
}

/**
 * Performs a hybrid word-and-character level diff.
 */
export function diffWordsOrChars(orig: string, mod: string, charLevel = false): DiffToken[] {
  // If charLevel is explicitly true, do character diff directly
  if (charLevel) {
    return diffCharacters(orig, mod);
  }

  // Split by words, spaces, and punctuation marks to preserve delimiters
  const list1 = orig.split(/(\s+|[.,/#!$%\^&\*;:{}=\-_`~()\[\]"'])/).filter(Boolean);
  const list2 = mod.split(/(\s+|[.,/#!$%\^&\*;:{}=\-_`~()\[\]"'])/).filter(Boolean);

  const n = list1.length;
  const m = list2.length;

  if (n * m > 4000000) {
    return [
      { type: "removed", value: orig },
      { type: "added", value: mod }
    ];
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (list1[i - 1] === list2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const rawTokens: DiffToken[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && list1[i - 1] === list2[j - 1]) {
      rawTokens.unshift({ type: "equal", value: list1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawTokens.unshift({ type: "added", value: list2[j - 1] });
      j--;
    } else {
      rawTokens.unshift({ type: "removed", value: list1[i - 1] });
      i--;
    }
  }

  // Post-process the tokens to do sub-word character diffs only when words are highly similar.
  // This solves "SecurityError" vs "the" partial matching issues perfectly.
  const finalTokens: DiffToken[] = [];
  for (let k = 0; k < rawTokens.length; k++) {
    const current = rawTokens[k];
    const next = rawTokens[k + 1];

    if (
      current.type === "removed" && 
      next && 
      next.type === "added" && 
      current.value.trim().length > 0 && 
      next.value.trim().length > 0
    ) {
      const similarity = getStringSimilarity(current.value, next.value);
      if (similarity >= 0.4) {
        // Highly similar words (e.g. "SecurityError" vs "ScurityError"), do fine-grained character diff
        const charTokens = diffCharacters(current.value, next.value);
        finalTokens.push(...charTokens);
      } else {
        // Very different words (e.g. "SecurityError" vs "the"), show full word replace
        finalTokens.push(current);
        finalTokens.push(next);
      }
      k++; // skip next as it is processed
    } else {
      finalTokens.push(current);
    }
  }

  return finalTokens;
}

/**
 * Diff two multi-line texts line-by-line, combining adjacent removals/additions into "modified" blocks.
 */
export function diffLines(origText: string, modText: string): LineDiff[] {
  const lines1 = origText.split(/\r?\n/);
  const lines2 = modText.split(/\r?\n/);

  const n = lines1.length;
  const m = lines2.length;

  if (n * m > 1000000) {
    const result: LineDiff[] = [];
    const max = Math.max(n, m);
    for (let idx = 0; idx < max; idx++) {
      const l1 = lines1[idx];
      const l2 = lines2[idx];
      if (l1 === undefined) {
        result.push({ type: "added", value: l2 });
      } else if (l2 === undefined) {
        result.push({ type: "removed", value: l1 });
      } else if (l1 === l2) {
        result.push({ type: "equal", value: l1 });
      } else {
        result.push({
          type: "modified",
          value: l2,
          originalValue: l1,
          charDiff: diffWordsOrChars(l1, l2, false)
        });
      }
    }
    return result;
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (lines1[i - 1] === lines2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const rawDiff: LineDiff[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
      rawDiff.unshift({ type: "equal", value: lines1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.unshift({ type: "added", value: lines2[j - 1] });
      j--;
    } else {
      rawDiff.unshift({ type: "removed", value: lines1[i - 1] });
      i--;
    }
  }

  const processed: LineDiff[] = [];
  for (let k = 0; k < rawDiff.length; k++) {
    const current = rawDiff[k];
    const next = rawDiff[k + 1];
    if (current.type === "removed" && next && next.type === "added") {
      processed.push({
        type: "modified",
        value: next.value,
        originalValue: current.value,
        charDiff: diffWordsOrChars(current.value, next.value, false)
      });
      k++; // skip next since it's merged
    } else {
      processed.push(current);
    }
  }

  return processed;
}
