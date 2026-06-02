"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// Plugin arrays are module-level constants so their identity never changes —
// otherwise ReactMarkdown would treat every render as a new configuration.
const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];

// [A:MM:SS] / [B:MM:SS] look like Markdown link references to remark, which
// processes them as DOM nodes rather than plain text — breaking splitOnCitations.
// Escaping the brackets first makes remark emit them as literal text characters.
const CITE_MARKER_RE = /\[([AB]):(\d+:\d+)\]/g;

function escapeCitationMarkers(text: string): string {
  return text.replace(CITE_MARKER_RE, "\\[$1:$2\\]");
}

interface MarkdownProps {
  text: string;
  components: Components;
}

export const Markdown = memo(function Markdown({ text, components }: MarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={REHYPE_PLUGINS}
      components={components}
    >
      {escapeCitationMarkers(text)}
    </ReactMarkdown>
  );
});
