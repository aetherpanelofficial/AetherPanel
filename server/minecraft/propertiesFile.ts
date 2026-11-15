export interface ParsedPropertyLine {
  type: 'comment' | 'empty' | 'property';
  key?: string;
  value?: string;
  raw: string;
  prefix?: string;
  suffix?: string;
}

export interface ParsedPropertiesFile {
  lines: ParsedPropertyLine[];
  props: Record<string, string>;
  newline: string;
}

export function parsePropertiesFile(content: string): ParsedPropertiesFile {
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const lines: ParsedPropertyLine[] = [];
  const props: Record<string, string> = {};

  for (const raw of content.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed) {
      lines.push({ type: 'empty', raw });
      continue;
    }
    if (trimmed.startsWith('#') || trimmed.startsWith('!')) {
      lines.push({ type: 'comment', raw });
      continue;
    }

    const eqIdx = raw.indexOf('=');
    if (eqIdx === -1) {
      lines.push({ type: 'comment', raw });
      continue;
    }

    const key = raw.slice(0, eqIdx).trim();
    const valuePart = raw.slice(eqIdx + 1);
    const leadingWhitespace = valuePart.match(/^\s*/)?.[0] || '';
    const withoutLeading = valuePart.slice(leadingWhitespace.length);
    const trailingWhitespace = withoutLeading.match(/\s*$/)?.[0] || '';
    const value = withoutLeading.slice(0, withoutLeading.length - trailingWhitespace.length);
    const prefix = `${raw.slice(0, eqIdx + 1)}${leadingWhitespace}`;
    lines.push({ type: 'property', key, value, raw, prefix, suffix: trailingWhitespace });
    props[key] = value;
  }

  return { lines, props, newline };
}

export function serializeProperties(
  parsedLines: ParsedPropertyLine[],
  changes: Record<string, string | boolean | number | null>,
  newline = '\n'
): string {
  const handledKeys = new Set<string>();
  const output: string[] = [];

  for (const line of parsedLines) {
    if (line.type !== 'property' || !line.key || !Object.prototype.hasOwnProperty.call(changes, line.key)) {
      output.push(line.raw);
      continue;
    }

    const value = changes[line.key];
    handledKeys.add(line.key);
    if (value === null) continue;

    const formattedValue = typeof value === 'boolean' ? String(value) : String(value);
    output.push(`${line.prefix || `${line.key}=`}${formattedValue}${line.suffix || ''}`);
  }

  let trailingEmptyLines = 0;
  while (output.length > 0 && output[output.length - 1] === '') {
    output.pop();
    trailingEmptyLines++;
  }

  for (const [key, value] of Object.entries(changes)) {
    if (handledKeys.has(key) || value === null) continue;
    output.push(`${key}=${typeof value === 'boolean' ? String(value) : String(value)}`);
  }

  while (trailingEmptyLines-- > 0) output.push('');
  return output.join(newline);
}
