import process from 'node:process';
import { URL } from 'node:url';
const base = process.env.MARKETING_BASE_PATH || '/';
if (!base.startsWith('/') || /[?#\\]|\.\./.test(base))
  throw new Error(
    'MARKETING_BASE_PATH must be an absolute URL path without traversal, query, or hash.',
  );
export const config = {
  origin: new URL(process.env.MARKETING_ORIGIN || 'https://openlintel.com').origin,
  base: `${base.replace(/\/+$/, '')}/`,
  repo: 'https://github.com/allgpt-co/openlintel',
};
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
    title: 'Your vision. In every detail.',
    description:
      'AI-assisted design exploration, drawings, and material planning for residential design professionals. Follow one room from brief to sample handoff.',
  },
  {
    path: 'how-it-works/',
    title: 'From a brief to the details',
    description:
      'See how OpenLintel connects room information, design exploration, drawings, and materials, with the designer reviewing each step.',
  },
  {
    path: 'sample-project/',
    title: 'The Window Room — an illustrative project',
    description:
      'Explore a 20 m² living room through five chapters: the brief, design concepts, drawings, materials, and an illustrative handoff.',
  },
  {
    path: 'for-design-studios/',
    title: 'For interior design studios',
    description:
      'Give residential design decisions a shared home. Explore concepts, drawings, material selections, and project information with OpenLintel.',
  },
  {
    path: 'for-architects/',
    title: 'For residential architects',
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
