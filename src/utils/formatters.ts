/**
 * Beautify JSON with 2 spaces
 */
export function beautifyJson(jsonStr: string): string {
  const parsed = JSON.parse(jsonStr);
  return JSON.stringify(parsed, null, 2);
}

/**
 * Minify JSON
 */
export function minifyJson(jsonStr: string): string {
  const parsed = JSON.parse(jsonStr);
  return JSON.stringify(parsed);
}

/**
 * Format HTML with indentation
 */
export function beautifyHtml(html: string): string {
  let result = "";
  let indent = 0;
  const tab = "  ";
  // Clear extra whitespace around tags
  const cleaned = html
    .replace(/\s*<\s*/g, "<")
    .replace(/\s*>\s*/g, ">")
    .replace(/\s+/g, " ");
  
  const tokens = cleaned.split(/(<\/?[a-zA-Z0-9_\-]+[^>]*>)/).filter((x) => x.trim() !== "");

  for (const token of tokens) {
    if (token.startsWith("</")) {
      indent = Math.max(0, indent - 1);
      result += tab.repeat(indent) + token + "\n";
    } else if (token.startsWith("<") && !token.endsWith("/>") && !token.startsWith("<!") && !token.match(/^<(br|hr|img|input|meta|link)/i)) {
      result += tab.repeat(indent) + token + "\n";
      indent++;
    } else if (token.startsWith("<")) {
      result += tab.repeat(indent) + token + "\n";
    } else {
      result += tab.repeat(indent) + token.trim() + "\n";
    }
  }
  return result.trim();
}

/**
 * Minify HTML
 */
export function minifyHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}

/**
 * Format CSS with indentation
 */
export function beautifyCss(css: string): string {
  let formatted = "";
  let indent = 0;
  const tab = "  ";
  const clean = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s*([{\};,])\s*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === "{") {
      indent++;
      formatted += " {\n" + tab.repeat(indent);
    } else if (char === "}") {
      indent = Math.max(0, indent - 1);
      formatted = formatted.trimEnd();
      formatted += "\n" + tab.repeat(indent) + "}\n" + tab.repeat(indent);
    } else if (char === ";") {
      formatted += ";\n" + tab.repeat(indent);
    } else if (char === ",") {
      formatted += ", ";
    } else {
      formatted += char;
    }
  }
  return formatted.replace(/\n\s*\n/g, "\n").replace(/}\s*}/g, "}\n}").trim();
}

/**
 * Minify CSS
 */
export function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{\};:,])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

/**
 * Format Javascript/Typescript
 */
export function beautifyJs(js: string): string {
  let formatted = "";
  let indent = 0;
  const tab = "  ";
  const clean = js.trim();
  let inString = false;
  let stringChar = "";

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];

    if ((char === '"' || char === "'" || char === "`") && clean[i - 1] !== "\\") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (stringChar === char) {
        inString = false;
      }
    }

    if (inString) {
      formatted += char;
      continue;
    }

    if (char === "{") {
      indent++;
      formatted += " {\n" + tab.repeat(indent);
    } else if (char === "}") {
      indent = Math.max(0, indent - 1);
      formatted = formatted.trimEnd();
      formatted += "\n" + tab.repeat(indent) + "}";
      const nextChar = clean[i + 1];
      if (nextChar !== ";" && nextChar !== "," && nextChar !== ")") {
        formatted += "\n" + tab.repeat(indent);
      }
    } else if (char === ";") {
      formatted += ";\n" + tab.repeat(indent);
    } else {
      formatted += char;
    }
  }
  return formatted.replace(/\n\s*\n/g, "\n").replace(/;\s*;/g, ";").trim();
}

/**
 * Minify Javascript
 */
export function minifyJs(js: string): string {
  return js
    .replace(/\/\/.*?\n/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([\{\}\(\)\[\]\+\-\*\/=\?:;,\!<>\|&])\s*/g, "$1")
    .trim();
}

/**
 * Parse CSV format to JS Array
 */
export function csvToJson(csv: string): any[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const data: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    const row: any = {};
    headers.forEach((header, idx) => {
      const key = header ? header.replace(/^["']|["']$/g, "").trim() : `col_${idx}`;
      let cellValue = cells[idx] !== undefined ? cells[idx].replace(/^["']|["']$/g, "").trim() : "";
      row[key] = cellValue;
    });
    data.push(row);
  }
  return data;
}

/**
 * Convert JSON array to CSV string
 */
export function jsonToCsv(jsonArray: any[]): string {
  if (!Array.isArray(jsonArray) || jsonArray.length === 0) return "";
  const headers = Object.keys(jsonArray[0]);
  const rows = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",")];

  for (const obj of jsonArray) {
    const cells = headers.map((header) => {
      const val = obj[header] === undefined || obj[header] === null ? "" : String(obj[header]);
      return `"${val.replace(/"/g, '""')}"`;
    });
    rows.push(cells.join(","));
  }
  return rows.join("\n");
}
