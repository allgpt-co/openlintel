import { pages as marketingPages } from './config.mjs';
import { templateDefinitions } from './content/templates.mjs';
import { guides } from './content/guides.mjs';
import { growthPages } from './growth-pages.mjs';
import { verifiedReview } from './editorial-review.mjs';
import { approvedProgrammaticPages, assertProgrammaticRelease } from './programmatic-catalog.mjs';

export const clusters = [
  {
    id: 'discover',
    title: 'Discover & define',
    description:
      'Understand the household, record the room, and agree what the project should achieve.',
  },
  {
    id: 'design',
    title: 'Explore & present',
    description:
      'Turn the brief into a spatial and material direction, then make the next decision clear.',
  },
  {
    id: 'coordinate',
    title: 'Specify & coordinate',
    description:
      'Connect selections, surfaces, quantities, and drawings without losing their references.',
  },
  {
    id: 'handoff',
    title: 'Review & hand off',
    description:
      'Keep responsibilities, revisions, and outstanding questions visible through the next issue.',
  },
];
export const hubs = [
  {
    id: 'resources',
    path: 'resources/',
    kind: 'hub',
    status: 'published',
    indexable: true,
    wave: 1,
    modified: '2026-09-26',
    title: 'Interior design resources for a connected workflow',
    description:
      'Practical interior design guides and editable templates, from the first client questionnaire to drawing review and project handoff.',
  },
  {
    id: 'templates',
    path: 'templates/',
    kind: 'hub',
    status: 'published',
    indexable: true,
    wave: 1,
    modified: '2026-09-26',
    title: 'Free interior design templates',
    description:
      'Download editable interior design questionnaires, briefs, proposals, schedules, and budget spreadsheets with blank templates and illustrative examples.',
  },
];

export function validateRegistry(records) {
  const ids = new Set();
  const paths = new Set();
  for (const page of records) {
    if (!page.id || ids.has(page.id)) throw new Error(`Duplicate or missing page ID: ${page.id}`);
    if (
      paths.has(page.path) ||
      (page.path !== '' && !/^[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/.test(page.path))
    )
      throw new Error(`Invalid or duplicate path: ${page.path}`);
    if (!['published', 'draft'].includes(page.status))
      throw new Error(`Invalid status: ${page.id}`);
    if (typeof page.indexable !== 'boolean')
      throw new Error(`Explicit boolean indexable metadata required: ${page.id}`);
    if (!page.title || !page.description) throw new Error(`Missing metadata: ${page.id}`);
    for (const name of ['modified', 'published']) {
      if (
        page[name] !== undefined &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(page[name]) ||
          !Number.isFinite(Date.parse(page[name])) ||
          new Date(page[name]).toISOString().slice(0, 10) !== page[name])
      )
        throw new Error(`Invalid ${name} date: ${page.id}`);
    }
    if (page.published && page.modified && page.published > page.modified)
      throw new Error(`Publication date follows modified date: ${page.id}`);
    verifiedReview(page);
    for (const source of page.sources || []) {
      let parsed;
      try {
        parsed = new URL(source.url);
      } catch {
        throw new Error(`Invalid source URL for ${page.id}.`);
      }
      if (!source.title || parsed.protocol !== 'https:' || parsed.username || parsed.password)
        throw new Error(`Invalid source URL for ${page.id}.`);
    }
    ids.add(page.id);
    paths.add(page.path);
  }
  const publicIds = new Set(records.filter((p) => p.status === 'published').map((p) => p.id));
  for (const page of records.filter((p) => p.status === 'published')) {
    for (const id of [...(page.related || []), ...(page.programmaticRelated || [])])
      if (!publicIds.has(id)) throw new Error(`Broken published related link: ${page.id} -> ${id}`);
    if (['guide', 'template'].includes(page.kind) && !clusters.some((c) => c.id === page.cluster))
      throw new Error(`Unknown cluster: ${page.id}`);
    if (page.programmatic)
      assertProgrammaticRelease(
        page,
        records.filter((entry) => !entry.programmatic),
      );
  }
  return records;
}
export const publishedPages = (records) =>
  validateRegistry(records).filter((page) => page.status === 'published');
export function createRegistry(project) {
  const legacy = [
    ...marketingPages.map((page) => ({
      ...page,
      id: page.path || 'home',
      kind: 'marketing',
      status: 'published',
      indexable: true,
    })),
    {
      id: 'summary',
      kind: 'summary',
      status: 'published',
      indexable: false,
      path: 'sample-project/summary/',
      title: 'The Window Room — printable sample summary',
      description:
        'The illustrative Window Room brief, drawing references, and partial material schedule. Quiet Oak, revision R0, pending review.',
    },
    ...hubs,
    ...growthPages,
    ...templateDefinitions(project).map((page) => ({ indexable: true, ...page })),
    ...guides.map((page) => ({ indexable: true, ...page })),
  ].map((page) => ({
    ...page,
    familyId: page.familyId || 'legacy',
    cohortId: page.cohortId || 'legacy',
    intentKey: page.intentKey || page.id.replace(/\/+$/, '').replaceAll('/', '-'),
  }));
  const approved = approvedProgrammaticPages(project, { legacyPages: legacy });
  for (const page of approved) {
    const contexts =
      page.id === 'purchase-order'
        ? ['procurement', 'spec-sheet']
        : ['spec-sheet', 'finish-schedule'];
    for (const id of contexts) {
      const owner = legacy.find((entry) => entry.id === id);
      if (!owner) throw new Error(`Missing programmatic contextual owner: ${id}`);
      owner.programmaticRelated = [...(owner.programmaticRelated || []), page.id];
    }
  }
  return validateRegistry([...legacy, ...approved]);
}
