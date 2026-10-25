import { Fragment, type ReactNode } from "react";
import { safeURL } from "../library/model";
// Deliberately small, escaped Markdown reader. Raw HTML is never interpreted.
function inline(text: string): ReactNode[] {
  return text
    .split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g)
    .map((part, i) => {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
      if (link && safeURL(link[2]))
        return (
          <a key={i} href={safeURL(link[2])!} target="_blank" rel="noreferrer">
            {link[1]}
          </a>
        );
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("`") && part.endsWith("`"))
        return <code key={i}>{part.slice(1, -1)}</code>;
      return <Fragment key={i}>{part}</Fragment>;
    });
}
export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n"),
    blocks: ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const code = [];
      while (++i < lines.length && !lines[i].startsWith("```"))
        code.push(lines[i]);
      blocks.push(
        <pre key={i}>
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) {
      const Tag = `h${h[1].length}` as "h1" | "h2" | "h3";
      blocks.push(<Tag key={i}>{inline(h[2])}</Tag>);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      do {
        items.push(
          <li key={i}>{inline(lines[i].replace(/^\s*[-*]\s+/, ""))}</li>,
        );
        i++;
      } while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]));
      i--;
      blocks.push(<ul key={i}>{items}</ul>);
      continue;
    }
    if (line.startsWith("> ")) {
      blocks.push(<blockquote key={i}>{inline(line.slice(2))}</blockquote>);
      continue;
    }
    if (line.trim()) blocks.push(<p key={i}>{inline(line)}</p>);
  }
  return <div className="prose">{blocks}</div>;
}
