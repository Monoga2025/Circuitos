// Bundles dist/ into ONE self-contained HTML fragment (inline JS + CSS) for hosting
// as a claude.ai Artifact (the host adds <html>/<head>/<body>). Run after `vite build`.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const js = [...html.matchAll(/<script[^>]*src="\.?\/?([^"]+)"[^>]*><\/script>/g)].map((m) => readFileSync(join(dist, m[1]), 'utf8'));
const css = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="\.?\/?([^"]+)"[^>]*>/g)].map((m) => readFileSync(join(dist, m[1]), 'utf8'));
const title = /<title>(.*?)<\/title>/.exec(html)?.[1] ?? 'Circuit Quest';
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
const out = `<title>${title}</title>
<style>${css.join('\n')}</style>
<div id="root"></div>
<script type="module">${safe(js.join('\n'))}</script>
`;
writeFileSync(join(dist, 'circuit-quest.html'), out);
console.log(`dist/circuit-quest.html ${(out.length / 1024).toFixed(0)} kB`);
