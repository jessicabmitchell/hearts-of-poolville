import type { ReactNode } from 'react';

// Small formatting for text volunteers write on the admin page:
// a blank line starts a new paragraph, **text** is bold, and [text](https://...) is a link.
const INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g;

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;
    if (m[1]) out.push(<strong key={key}>{m[1]}</strong>);
    else
      out.push(
        <a key={key} href={m[3]} {...(m[3].startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
          {m[2]}
        </a>,
      );
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function RichText({ text, className }: { text: string; className?: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <>
      {paragraphs.map((p, pi) => (
        <p key={pi} className={className}>
          {p.split('\n').map((line, li) => (
            <span key={li}>
              {li > 0 && <br />}
              {inline(line, `${pi}-${li}`)}
            </span>
          ))}
        </p>
      ))}
    </>
  );
}
