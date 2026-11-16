/**
 * HTML → Markdown converter
 * Chuyển đổi HTML (từ contentEditable) sang cú pháp Markdown chuẩn.
 * Hỗ trợ: headings, paragraphs, bold/italic/strikethrough, links, images,
 * code blocks, blockquotes, lists (lồng nhau), tables, hr.
 */

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";
  return processChildren(root as HTMLElement, 0)
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
}

function processChildren(el: HTMLElement, listDepth: number): string {
  return Array.from(el.childNodes)
    .map((child) => processNode(child, listDepth))
    .join("");
}

function processNode(node: Node, listDepth: number): string {
  // Text node
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const children = () => processChildren(el, listDepth);

  switch (tag) {
    // Headings
    case "h1": return `\n# ${children().trim()}\n\n`;
    case "h2": return `\n## ${children().trim()}\n\n`;
    case "h3": return `\n### ${children().trim()}\n\n`;
    case "h4": return `\n#### ${children().trim()}\n\n`;
    case "h5": return `\n##### ${children().trim()}\n\n`;
    case "h6": return `\n###### ${children().trim()}\n\n`;

    // Block elements
    case "p": return `${children().trim()}\n\n`;
    case "div": {
      const c = children().trim();
      return c ? `${c}\n` : "";
    }
    case "br": return "\n";
    case "hr": return "\n---\n\n";

    // Inline formatting
    case "strong": case "b": return `**${children()}**`;
    case "em": case "i": return `*${children()}*`;
    case "del": case "s": case "strike": return `~~${children()}~~`;
    case "u": return `<u>${children()}</u>`;
    case "sub": return `<sub>${children()}</sub>`;
    case "sup": return `<sup>${children()}</sup>`;
    case "mark": return `<mark>${children()}</mark>`;

    // Links & Images
    case "a": {
      const href = el.getAttribute("href") || "";
      const text = children();
      return href ? `[${text}](${href})` : text;
    }
    case "img": {
      const alt = el.getAttribute("alt") || "";
      const src = el.getAttribute("src") || "";
      return `![${alt}](${src})`;
    }

    // Code
    case "code": {
      if (el.parentElement?.tagName.toLowerCase() === "pre") {
        return el.textContent || "";
      }
      return `\`${children()}\``;
    }
    case "pre": {
      const codeEl = el.querySelector("code");
      const langMatch = codeEl?.className?.match(/language-(\w+)/);
      const lang = langMatch ? langMatch[1] : "";
      const content = codeEl ? (codeEl.textContent || "") : (el.textContent || "");
      return `\n\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
    }

    // Blockquote
    case "blockquote": {
      const content = children().trim();
      const lines = content.split("\n");
      return "\n" + lines.map((l) => `> ${l}`).join("\n") + "\n\n";
    }

    // Lists
    case "ul": return "\n" + processListItems(el, "ul", listDepth) + "\n";
    case "ol": return "\n" + processListItems(el, "ol", listDepth) + "\n";
    case "li": return children();

    // Table
    case "table": return "\n" + processTable(el) + "\n";
    case "thead": case "tbody": case "tfoot": return children();
    case "tr": case "th": case "td": return children();

    // Pass-through containers
    case "span": case "section": case "article": case "main":
    case "header": case "footer": case "nav": case "aside":
    case "figure": case "figcaption": case "details": case "summary":
    case "label":
      return children();

    // Checkbox (task list)
    case "input": {
      const type = el.getAttribute("type");
      if (type === "checkbox") {
        return (el as HTMLInputElement).checked ? "[x] " : "[ ] ";
      }
      return "";
    }

    default:
      return children();
  }
}

function processListItems(el: HTMLElement, type: "ul" | "ol", depth: number): string {
  const items = Array.from(el.children).filter(
    (c) => c.tagName.toLowerCase() === "li"
  );
  const indent = "  ".repeat(depth);

  return items
    .map((li, idx) => {
      const prefix = type === "ol" ? `${idx + 1}. ` : "- ";
      let content = "";
      let nested = "";

      for (const child of Array.from(li.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const childTag = (child as HTMLElement).tagName.toLowerCase();
          if (childTag === "ul" || childTag === "ol") {
            nested += processListItems(child as HTMLElement, childTag, depth + 1);
            continue;
          }
        }
        content += processNode(child, depth);
      }

      let result = `${indent}${prefix}${content.trim()}`;
      if (nested) result += "\n" + nested;
      return result;
    })
    .join("\n");
}

function processTable(table: HTMLElement): string {
  const rows = Array.from(table.querySelectorAll("tr"));
  if (rows.length === 0) return "";

  const matrix: string[][] = [];
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll("th, td"));
    matrix.push(
      cells.map((cell) =>
        processChildren(cell as HTMLElement, 0).trim().replace(/\|/g, "\\|")
      )
    );
  }
  if (matrix.length === 0 || matrix[0].length === 0) return "";

  const colCount = Math.max(...matrix.map((r) => r.length));
  const padded = matrix.map((row) => {
    while (row.length < colCount) row.push("");
    return row;
  });

  let result = "| " + padded[0].join(" | ") + " |\n";
  result += "| " + padded[0].map(() => "---").join(" | ") + " |\n";
  for (let i = 1; i < padded.length; i++) {
    result += "| " + padded[i].join(" | ") + " |\n";
  }
  return result;
}
