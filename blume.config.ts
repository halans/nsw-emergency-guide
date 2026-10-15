import { defineConfig } from 'blume';
import { orama } from 'blume/search';
const localInter = { name: 'Inter', variants: [400, 500, 600, 700].map(weight => ({ src: `./fonts/inter-${weight}.woff2`, weight })) };
// Set SITE_URL to your stable production origin before the final build.
const site = process.env.SITE_URL;
if (site && !/^https:\/\/[^/]+\/?$/.test(site)) throw new Error('SITE_URL must be an HTTPS origin without a path.');
export default defineConfig({
  title: 'Emergency Ready',
  description: 'An independent guide to official Australian and NSW emergency contacts, warnings, preparation and recovery resources.',
  content: { root: 'docs' },
  theme: { accent: { light: '#075985', dark: '#7dd3fc' }, radius: 'md', mode: 'light', fonts: { display: localInter, body: localInter, mono: localInter } },
  banner: { content: 'Life-threatening emergency? Call 000.', link: { text: 'Call 000', href: 'tel:000' }, dismissible: false },
  navigation: { cta: { label: 'Urgent help', href: '/urgent-help' }, featured: [{ label: 'Official warning links', href: '/warnings', icon: 'triangle-alert' }], repo: false },
  search: orama(),
  ai: { openInChat: false },
  feedback: false,
  export: { pdf: true, epub: false },
  markdown: { externalLinks: false },
  footer: { links: [{ label: 'Independent directory · not a live alert service', href: '/about' }, { label: 'Sources & review dates', href: '/sources' }] },
  agents: { catalog: false, skillMd: false, mcp: { enabled: false } },
  seo: { og: { enabled: false }, sitemap: Boolean(site), robots: true },
  deployment: site ? { site } : {},
});
