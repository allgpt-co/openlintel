import process from 'node:process';
import { URL } from 'node:url';
export function loadSiteConfig(env = process.env) {
  const base = env.MARKETING_BASE_PATH || '/';
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]*$/.test(base))
    throw new Error('MARKETING_BASE_PATH must contain only absolute, unencoded path segments.');
  const rawOrigin = env.MARKETING_ORIGIN || 'https://openlintel.com';
  let origin;
  try {
    origin = new URL(rawOrigin);
  } catch {
    throw new Error('MARKETING_ORIGIN must be an absolute HTTPS origin.');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  if (
    !/^https?:\/\/[^/?#]+\/?$/i.test(rawOrigin) ||
    /[\s<>"'\\]/.test(rawOrigin) ||
    (origin.protocol !== 'https:' && !(local && origin.protocol === 'http:')) ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  )
    throw new Error(
      'MARKETING_ORIGIN must be an HTTPS origin without credentials, path, query, or hash (HTTP localhost is allowed).',
    );
  if (env.MARKETING_NOINDEX && !['true', 'false'].includes(env.MARKETING_NOINDEX))
    throw new Error('MARKETING_NOINDEX must be true or false.');
  return {
    origin: origin.origin,
    base: `${base.replace(/\/+$/, '')}/`,
    repo: 'https://github.com/allgpt-co/openlintel',
    indexable: env.MARKETING_NOINDEX !== 'true',
  };
}
export const config = loadSiteConfig();
export const url = (path = '') => config.base + path.replace(/^\/+/, '');
export const absolute = (path = '') => config.origin + url(path);
export const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const pages = [
  {
    path: '',
    title: 'AI-assisted interior design workflows',
    description:
      'AI-assisted design exploration, drawings, and material planning for residential design professionals. Follow one room from brief to sample handoff.',
  },
  {
    path: 'how-it-works/',
    title: 'How OpenLintel works: design, drawings & materials',
    description:
      'Explore an illustrative OpenLintel workflow connecting room information, concepts, drawings, and materials. Software is in active development; professional review is required.',
  },
  {
    path: 'sample-project/',
    title: 'The Window Room — an illustrative project',
    description:
      'Explore a 20 m² living room through five chapters: the brief, design concepts, drawings, materials, and an illustrative handoff.',
  },
  {
    path: 'for-design-studios/',
    title: 'Interior design workflows for residential studios',
    description:
      'Explore editable resources and an illustrative connected workflow for residential design studios. OpenLintel is in active development.',
  },
  {
    path: 'for-architects/',
    title: 'Interior design coordination for architects',
    description:
      'Develop and communicate interior spatial intent through room information, design options, plans, elevations, and material references.',
  },
  {
    path: 'open-source/',
    title: 'Open-source interior design software',
    description:
      'Explore OpenLintel’s open-source interior design software, setup requirements, illustrative workflow, and editable resources for residential design professionals.',
  },
];
