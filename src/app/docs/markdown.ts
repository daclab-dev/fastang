export type Inline = { kind: 'text' | 'code' | 'strong' | 'link'; text: string; href?: string };
export type Block =
  | { kind: 'heading'; level: 2 | 3; text: string; id: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'code'; language: string; file?: string; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] };
export interface Article { title: string; blocks: Block[]; sections: { text: string; id: string }[] }

export function inline(text: string): Inline[] {
  const parts: Inline[] = [];
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > offset) parts.push({ kind: 'text', text: text.slice(offset, match.index) });
    if (match[1]) parts.push({ kind: 'code', text: match[1] });
    else if (match[2]) parts.push({ kind: 'strong', text: match[2] });
    else if (/^https:\/\//.test(match[4]) || /^[a-z-]+\.md$/.test(match[4])) parts.push({ kind: 'link', text: match[3], href: match[4] });
    else parts.push({ kind: 'text', text: match[3] });
    offset = match.index! + match[0].length;
  }
  if (offset < text.length) parts.push({ kind: 'text', text: text.slice(offset) });
  return parts;
}

/** Deliberately small Markdown subset. HTML is rendered as text, never injected. */
export function parseMarkdown(source: string): Article {
  const lines = source.replaceAll('\r\n', '\n').trim().split('\n');
  if (!lines[0]?.startsWith('# ')) throw new Error('Guide must begin with one H1');
  const title = lines[0].slice(2).trim();
  const blocks: Block[] = [];
  const ids = new Set<string>();
  const cells = (line: string) => line.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
  for (let index = 1; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    const fence = /^```([\w-]+)(?: file=(\S+))?$/.exec(line);
    if (fence) {
      const content: string[] = [];
      index++;
      while (index < lines.length && lines[index] !== '```') content.push(lines[index++]);
      if (index === lines.length) throw new Error('Unclosed code fence');
      blocks.push({ kind: 'code', language: fence[1], ...(fence[2] ? { file: fence[2] } : {}), text: content.join('\n') });
      index++; continue;
    }
    const heading = /^(#{2,3}) (.+)$/.exec(line);
    if (heading) {
      const text = heading[2];
      const base = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      let id = base; let count = 2;
      while (ids.has(id)) id = base + '-' + count++;
      ids.add(id);
      blocks.push({ kind: 'heading', level: heading[1].length as 2 | 3, text, id });
      index++; continue;
    }
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (lines[index]?.startsWith('- ')) items.push(lines[index++].slice(2));
      blocks.push({ kind: 'list', items }); continue;
    }
    if (line.startsWith('|') && /^\|(?:\s*:?-+:?\s*\|)+\s*$/.test(lines[index + 1] ?? '')) {
      const headers = cells(line); const rows: string[][] = [];
      index += 2;
      while (lines[index]?.startsWith('|')) {
        const row = cells(lines[index++]);
        if (row.length !== headers.length) throw new Error('Inconsistent table columns');
        rows.push(row);
      }
      blocks.push({ kind: 'table', headers, rows }); continue;
    }
    if (/^#|^```/.test(line)) throw new Error(`Unsupported Markdown: ${line}`);
    const paragraph = [line]; index++;
    while (index < lines.length && lines[index].trim() && !/^(#|```|- |\|)/.test(lines[index])) paragraph.push(lines[index++]);
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
  }
  return { title, blocks, sections: blocks.filter((block): block is Extract<Block, { kind: 'heading' }> => block.kind === 'heading' && block.level === 2).map(({ text, id }) => ({ text, id })) };
}
