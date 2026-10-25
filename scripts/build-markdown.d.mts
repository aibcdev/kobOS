export type MarkdownPage = { path: string; title: string; description: string; markdown: string };
export function markdownPathFor(path: string): string;
export function pageToMarkdown(html: string, pagePath: string): Omit<MarkdownPage, "path">;
export function llmsTxt(pages: MarkdownPage[]): string;
export function llmsFullTxt(pages: MarkdownPage[]): string;
