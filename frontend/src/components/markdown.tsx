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

interface MarkdownProps {
  text: string;
  components: Components;
}

/**
 * Memoized Markdown renderer. ReactMarkdown re-parses its full input on every
 * render, so during streaming (where the parent re-renders on every token) this
 * memo skips the parse unless `text` or `components` actually changed. Pair with
 * a throttled `text` to bound parse frequency.
 */
export const Markdown = memo(function Markdown({ text, components }: MarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={REHYPE_PLUGINS}
      components={components}
    >
      {text}
    </ReactMarkdown>
  );
});
