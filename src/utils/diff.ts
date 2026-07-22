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

export interface DiffOptions {
  ignoreCase?: boolean;
  charLevel?: boolean;
}

/**
 * Calculates string similarity using LCS.
 */
function getStringSimilarity(s1: string, s2: string, options?: DiffOptions): number {
  if (!s1 || !s2) return 0;
  
  const str1 = options?.ignoreCase ? s1.toLowerCase() : s1;
  const str2 = options?.ignoreCase ? s2.toLowerCase() : s2;

  if (str1 === str2) return 1;
  const n = str1.length;
  const m = str2.length;
  
  if (n * m > 10000) return 0;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[n][m] / Math.max(n, m);
}

/**
 * Character-level LCS diff with forward prefix preference and case sensitivity control.
 */
export function diffCharacters(orig: string, mod: string, options?: DiffOptions): DiffToken[] {
  const list1 = Array.from(orig);
  const list2 = Array.from(mod);
  const n = list1.length;
  const m = list2.length;

  const isMatch = (c1: string, c2: string) => {
    if (options?.ignoreCase) {
      return c1.toLowerCase() === c2.toLowerCase();
    }
    return c1 === c2;
  };

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (isMatch(list1[i - 1], list2[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack while prioritizing prefix equality to avoid unnatural offsets (e.g. "sss" vs "s" or "sass" vs "ss")
  const result: DiffToken[] = [];
  let i = n, j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && isMatch(list1[i - 1], list2[j - 1])) {
      result.unshift({ type: "equal", value: list2[j - 1] }); // preserve modified value case
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i - 1][j] === dp[i][j - 1] && dp[i - 1][j] === dp[i][j]) {
      // Equal DP values: prefer removing from orig first (keeps prefix match)
      result.unshift({ type: "removed", value: list1[i - 1] });
      i--;
    } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
      result.unshift({ type: "removed", value: list1[i - 1] });
      i--;
    } else {
      result.unshift({ type: "added", value: list2[j - 1] });
      j--;
    }
  }

  // Merge consecutive tokens of same type
  const merged: DiffToken[] = [];
  for (const token of result) {
    const last = merged[merged.length - 1];
    if (last && last.type === token.type) {
      last.value += token.value;
    } else {
      merged.push({ ...token });
    }
  }

  return merged;
}

/**
 * Performs a hybrid word-and-character level diff.
 */
export function diffWordsOrChars(orig: string, mod: string, options?: DiffOptions): DiffToken[] {
  if (options?.charLevel) {
    return diffCharacters(orig, mod, options);
  }

  const isMatch = (s1: string, s2: string) => {
    if (options?.ignoreCase) {
      return s1.toLowerCase() === s2.toLowerCase();
    }
    return s1 === s2;
  };

  // Split by words, spaces, and punctuation
  const list1 = orig.split(/(\s+|[.,/#!$%\^&\*;:{}=\-_`~()\[\]"'])/).filter(Boolean);
  const list2 = mod.split(/(\s+|[.,/#!$%\^&\*;:{}=\-_`~()\[\]"'])/).filter(Boolean);

  const n = list1.length;
  const m = list2.length;

  // Single word or small strings: directly use character diff for maximum precision
  if (n <= 1 && m <= 1) {
    return diffCharacters(orig, mod, options);
  }

  if (n * m > 4000000) {
    return [
      { type: "removed", value: orig },
      { type: "added", value: mod }
    ];
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (isMatch(list1[i - 1], list2[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const rawTokens: DiffToken[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && isMatch(list1[i - 1], list2[j - 1])) {
      rawTokens.unshift({ type: "equal", value: list2[j - 1] });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
      rawTokens.unshift({ type: "removed", value: list1[i - 1] });
      i--;
    } else {
      rawTokens.unshift({ type: "added", value: list2[j - 1] });
      j--;
    }
  }

  // Sub-word character diffs for modified words
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
      const similarity = getStringSimilarity(current.value, next.value, options);
      if (similarity >= 0.3) {
        const charTokens = diffCharacters(current.value, next.value, options);
        finalTokens.push(...charTokens);
      } else {
        finalTokens.push(current);
        finalTokens.push(next);
      }
      k++; // skip next
    } else {
      finalTokens.push(current);
    }
  }

  return finalTokens;
}

/**
 * Diff two multi-line texts line-by-line.
 */
export function diffLines(origText: string, modText: string, options?: DiffOptions): LineDiff[] {
  const lines1 = origText.split(/\r?\n/);
  const lines2 = modText.split(/\r?\n/);

  const n = lines1.length;
  const m = lines2.length;

  const isMatch = (l1: string, l2: string) => {
    if (options?.ignoreCase) {
      return l1.toLowerCase() === l2.toLowerCase();
    }
    return l1 === l2;
  };

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
      } else if (isMatch(l1, l2)) {
        result.push({ type: "equal", value: l2 });
      } else {
        result.push({
          type: "modified",
          value: l2,
          originalValue: l1,
          charDiff: diffWordsOrChars(l1, l2, options)
        });
      }
    }
    return result;
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (isMatch(lines1[i - 1], lines2[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const rawDiff: LineDiff[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && isMatch(lines1[i - 1], lines2[j - 1])) {
      rawDiff.unshift({ type: "equal", value: lines2[j - 1] });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
      rawDiff.unshift({ type: "removed", value: lines1[i - 1] });
      i--;
    } else {
      rawDiff.unshift({ type: "added", value: lines2[j - 1] });
      j--;
    }
  }

  const processed: LineDiff[] = [];
  let k = 0;
  while (k < rawDiff.length) {
    if (rawDiff[k].type === "equal") {
      processed.push(rawDiff[k]);
      k++;
    } else {
      // Collect contiguous block of non-equal items
      const removedList: string[] = [];
      const addedList: string[] = [];
      while (k < rawDiff.length && rawDiff[k].type !== "equal") {
        if (rawDiff[k].type === "removed") {
          removedList.push(rawDiff[k].value);
        } else if (rawDiff[k].type === "added") {
          addedList.push(rawDiff[k].value);
        }
        k++;
      }

      const maxLen = Math.max(removedList.length, addedList.length);
      for (let idx = 0; idx < maxLen; idx++) {
        const origVal = removedList[idx];
        const newVal = addedList[idx];
        if (origVal !== undefined && newVal !== undefined) {
          processed.push({
            type: "modified",
            value: newVal,
            originalValue: origVal,
            charDiff: diffWordsOrChars(origVal, newVal, options)
          });
        } else if (origVal !== undefined) {
          processed.push({ type: "removed", value: origVal });
        } else if (newVal !== undefined) {
          processed.push({ type: "added", value: newVal });
        }
      }
    }
  }

  return processed;
}
