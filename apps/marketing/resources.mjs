import { walkthrough } from './walkthroughs.mjs';
import { esc, url } from './config.mjs';
import { picture, caption } from './components.mjs';
import { clusters } from './registry.mjs';
import { displayRows } from './documents.mjs';
import { scheduleRecords } from './schedule-assets.mjs';
import { growthConfig, pilotCtaLabel } from './growth-config.mjs';
import { verifiedReview } from './editorial-review.mjs';

const list = (items) => `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
const paragraphs = (items) => items.map((text) => `<p>${esc(text)}</p>`).join('');
const formatLabel = (page) =>
  [...new Set((page.downloads || []).map((download) => download.format.toUpperCase()))].join(
    ' / ',
  ) || page.format.toUpperCase();

function reviewCredit(page) {
  const review = verifiedReview(page);
  if (!review)
    return '<p>Authored by OpenLintel with AI assistance. Examples are illustrative and have not received independent professional review. Adapt the structure to your practice and verify project-specific information. No legal agreement, regulatory compliance, or construction readiness is represented.</p>';
  return `<p>Authored by OpenLintel with AI assistance. Illustrative educational material <span data-reviewed-revision="${esc(review.reviewedRevision)}">reviewed by ${esc(review.reviewerName)}</span>, ${esc(review.reviewerRole)}, on <time datetime="${esc(review.reviewedAt)}">${editorialDate(review.reviewedAt)}</time>, for the revision dated ${editorialDate(page.modified)}.</p><p>Review scope: ${esc(review.scope)}. Reference check completed ${editorialDate(review.sourcesCheckedAt)}. This credit is published with the reviewer’s permission and covers only the identified resource revision. It does not verify a client project, legal agreement, regulatory compliance, or construction readiness.</p>`;
}
export function editorialDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || ''))
    throw new Error('An editorial date must use YYYY-MM-DD.');
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new Error(`Invalid editorial date: ${value}`);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
function teachingTable(table) {
  if (!table) return '';
  return `<div class="table-scroll resource-table" tabindex="0" role="region" aria-label="${esc(table.caption)}; scroll horizontally"><table><caption>${esc(table.caption)}</caption><thead><tr>${table.headers.map((header) => `<th scope="col">${esc(header)}</th>`).join('')}</tr></thead><tbody>${table.rows.map((row) => `<tr>${row.map((value, i) => (i === 0 ? `<th scope="row">${esc(value)}</th>` : `<td>${esc(value)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function authoredSection(section) {
  return `<section id="${esc(section.id)}"><h2>${esc(section.title)}</h2>${paragraphs(section.paragraphs || [])}${section.items?.length ? list(section.items) : ''}${teachingTable(section.table)}${section.links?.length ? `<ul>${section.links.map((link) => `<li><a href="${url(link.href)}">${esc(link.label)}</a></li>`).join('')}</ul>` : ''}</section>`;
}
export function breadcrumbs(page) {
  const parent = page.kind === 'template' ? 'templates' : 'resources';
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="${url()}">Home</a></li>${page.kind === 'hub' ? '' : `<li><a href="${url(`${parent}/`)}">${parent === 'templates' ? 'Templates' : 'Resources'}</a></li>`}<li aria-current="page">${esc(page.kind === 'hub' ? (page.id === 'templates' ? 'Templates' : 'Resources') : page.title)}</li></ol></nav>`;
}
function card(page) {
  return `<article class="resource-card"><p class="resource-kind">${page.kind === 'template' ? `Downloads: ${formatLabel(page)}` : 'Practical guide'}</p><h3><a href="${url(page.path)}">${esc(page.title)}</a></h3><p>${esc(page.description)}</p><span class="resource-card-link" aria-hidden="true">${page.kind === 'template' ? 'Preview & download' : 'Read the guide'} →</span></article>`;
}
export function hub(page, registry) {
  const templatesOnly = page.id === 'templates';
  const leaves = registry.filter(
    (p) => ['guide', 'template'].includes(p.kind) && (!templatesOnly || p.kind === 'template'),
  );
  return `<div class="wrap resource-page">${breadcrumbs(page)}<header class="resource-hero"><div><p class="eyebrow">For residential design professionals</p><h1>${templatesOnly ? 'Interior design templates.<br><em>Made to be adapted.</em>' : 'Interior design resources.<br>From brief to <em>handoff.</em>'}</h1><p class="lede">${esc(page.description)}</p><p class="resource-disclosure">${templatesOnly ? 'Free, ungated downloads. XLSX workbooks, DOCX outlines, editable PowerPoint decks, and printable PDFs. No account or upload required.' : 'One connected library: discovery, design, documentation, and handoff. Start with the task in front of you.'}</p></div><aside class="resource-start"><p class="eyebrow">A place to start</p><h2>${templatesOnly ? 'Before the first meeting' : 'Follow the thread'}</h2><p>${templatesOnly ? 'A clear questionnaire turns a discovery conversation into information you can use. Preview the questions, then adapt the editable document.' : 'See how one illustrative room connects a brief, a selected direction, drawings, and material references. Then adapt the resources to your own process.'}</p><a class="text-link" href="${url(templatesOnly ? 'templates/interior-design-client-questionnaire/' : 'sample-project/')}">${templatesOnly ? 'Client questionnaire' : 'Explore the sample project'}</a></aside></header><nav class="resource-topics" aria-label="Resource topics">${clusters.map((c) => `<a href="#${c.id}">${esc(c.title)}</a>`).join('')}<a href="${url(templatesOnly ? 'resources/' : 'templates/')}">${templatesOnly ? 'All resources' : 'Editable templates'}</a></nav>${clusters
    .map(
      (cluster, index) =>
        `<section class="resource-cluster" id="${cluster.id}"><div class="cluster-heading"><span class="cluster-number">0${index + 1}</span><div><h2>${esc(cluster.title)}</h2><p>${esc(cluster.description)}</p></div></div><div class="resource-grid">${leaves
          .filter((p) => p.cluster === cluster.id)
          .map(card)
          .join('')}</div></section>`,
    )
    .join(
      '',
    )} ${templatesOnly ? walkthrough('template-workflow') : ''}<section class="resource-editorial"><h2>Adapt the structure. Verify the project.</h2><p>These are educational planning resources, not legal agreements, construction documents, or professional certification. Worked examples are clearly labeled teaching extensions of The Window Room. Replace them with your own verified information and obtain appropriate project review.</p><p>Guides are authored by OpenLintel with AI assistance. Each resource states its review status; a named review covers only the identified revision and scope. We cite external references where used; original examples are illustrative, not completed client work.</p><p><a href="${url('editorial-policy/')}">Read our editorial and review policy</a></p></section></div>`;
}
function visual(page, project) {
  if (page.visual === 'mood-boards')
    return `<div class="board-pair assembled-boards">${project.concepts.map((concept) => `<figure class="annotated-board"><a href="${url(`assets/diagrams/mood-board-${concept.selected ? 'quiet-oak' : 'deep-olive'}.svg`)}" aria-label="Open ${esc(concept.name)} mood board at full size"><img src="${url(`assets/diagrams/mood-board-${concept.selected ? 'quiet-oak' : 'deep-olive'}.svg`)}" width="1280" height="720" alt="${esc(concept.name)} mood board: illustrative room reference, palette swatches, material relationships, rationale, and unresolved product decisions" loading="eager" decoding="async"></a>${caption(concept.name, concept.selected ? 'Selected illustrative direction' : 'Alternative study only')}<p>${esc(concept.description)}</p></figure>`).join('')}</div><p class="figure-note">Original assembled boards use owned AI-generated imagery and editable palette and annotation elements. They communicate atmosphere; no depicted product, finish, supplier, or physical sample has been verified. ${'<a href="' + url('templates/interior-design-presentation/') + '">Adapt the editable board slides in the presentation deck</a>'}.</p>`;
  if (page.visual === 'materials')
    return `<figure class="resource-figure">${picture('materials', 'AI-generated material still life illustrating the Quiet Oak palette', { hero: true })}${caption('Quiet Oak / material relationships')}<div class="material-key">${project.materials.map((m) => `<span><i style="--swatch:${m.color}" aria-hidden="true"></i>${esc(m.id)} · ${esc(m.name)}</span>`).join('')}</div></figure>`;
  if (page.visual === 'concept')
    return `<figure class="resource-figure">${picture('room', 'Quiet Oak, an AI-generated concept illustration of The Window Room', { hero: true })}${caption('Brief → direction → review')}<p class="figure-note">Retain the floor and openings. Connect reading, conversation, and storage. Develop Quiet Oak; keep Deep Olive identifiable as an alternative.</p></figure>`;
  if (['plan', 'elevation'].includes(page.visual))
    return `<figure class="resource-figure"><img src="${url(`assets/downloads/window-room-${page.visual}.svg`)}" width="900" height="700" alt="${page.visual === 'plan' ? 'WR-01 furnished plan with F-01 seating, F-02 chair, J-01 storage, and nominal room dimensions' : 'WR-02 west-wall J-01 elevation with three nominal 800 mm modules'}; illustrative and pending review">${caption(page.visual === 'plan' ? 'WR-01 / Read the relationships and references' : 'WR-02 / Read dimensions, then follow references', 'Illustrative drawing · Do not scale')}</figure>`;
  return `<figure class="resource-figure"><img src="${url(`assets/diagrams/${page.visual}.svg`)}" width="1000" height="620" alt="${esc(diagramLabels[page.visual])}">${caption('OpenLintel / Authored teaching diagram', 'Illustrative · Not a project deliverable')}</figure>`;
}
export const diagramLabels = {
  measure:
    'Nominal 5000 by 4000 mm room outline with diagonal-check reminders and a 20 m² floor-footprint calculation',
  process:
    'Design workflow: discovery, concept, development, and handoff, each with a review decision',
  procurement:
    'Procurement states: proposed selection, supplier confirmation, authorized order, and receipt; the sample is not ordered',
  decisions:
    'A decision record connecting the unresolved F-01 sofa model to dimensions, budget, timeline, and review ownership',
  'drawing-index':
    'Illustrative package index: WR-01 furnished plan and WR-02 joinery elevation, both revision R0 and pending review',
  ffe: 'Three linked records: plan location F-01, FF&E schedule quantity one, and product specification with model still unresolved',
  rcp: 'Notional reflected ceiling plan showing a room outline, an illustrative lighting symbol, an unresolved coordination zone, and an unverified 2800 mm ceiling height',
};
export function diagramSvg(type) {
  const label = diagramLabels[type];
  let body;
  if (type === 'measure' || type === 'rcp') {
    body = `<rect x="90" y="150" width="440" height="352" fill="none" stroke="#252722" stroke-width="4"/>`;
    if (type === 'measure')
      body += `<path d="M90 150L530 502M530 150L90 502" stroke="#914f38" stroke-dasharray="9 7" fill="none"/><text x="240" y="130">5000 mm nominal</text><text x="100" y="535">4000 mm nominal depth</text><text x="595" y="190" class="heading">Check, don’t assume</text><text x="595" y="235">Diagonals not surveyed.</text><text x="595" y="270">Confirm every opening.</text><text x="595" y="305">Record source and units.</text><text x="595" y="385" class="heading">5 m × 4 m = 20 m²</text><text x="595" y="425">Floor footprint only.</text><text x="595" y="460">Not a wall-area takeoff.</text>`;
    else
      body += `<circle cx="310" cy="310" r="22" fill="none" stroke="#914f38" stroke-width="3"/><path d="M288 310H332M310 288V332" stroke="#914f38" stroke-width="2"/><rect x="385" y="190" width="90" height="110" fill="none" stroke="#914f38" stroke-dasharray="8 6"/><text x="110" y="465">Ceiling: 2800 mm nominal</text><text x="580" y="190" class="heading">Read the legend</text><text x="580" y="235">Circle: notional lighting only.</text><text x="580" y="275">Dashed zone: interface to review.</text><text x="580" y="350">No fixture or location specified.</text><text x="580" y="390">No services design represented.</text><text x="580" y="430">New teaching diagram, not WR-03.</text>`;
  } else {
    const records = {
      process: [
        ['01 / DISCOVERY', 'Agreed brief', 'Needs, constraints, open questions'],
        ['02 / CONCEPT', 'Selected direction', 'Review the idea before the details'],
        ['03 / DEVELOPMENT', 'Coordinated information', 'Connect drawings and schedules'],
        ['04 / HANDOFF', 'Current issue + actions', 'Name recipients and intended use'],
      ],
      procurement: [
        ['01 / SELECTION', 'Proposed item', 'Identity and dimensions to review'],
        ['02 / SUPPLIER', 'Current information', 'Confirm source, quote, availability'],
        ['03 / ORDER', 'Agreed responsibility', 'Not represented in the sample'],
        ['04 / RECEIPT', 'Record the delivery', 'Not represented in the sample'],
      ],
      decisions: [
        ['DECISION', 'F-01 final sofa model', 'Unresolved in the sample'],
        ['INPUT', 'Dimensions + supplier', 'No verified product selected'],
        ['IMPACT', 'Plan, budget, timeline', 'Review affected records together'],
        ['OWNER / REVIEW', 'To appoint', 'Do not invent approval or dates'],
      ],
      'drawing-index': [
        ['WR-01 / R0', 'Furnished plan', 'Illustrative; pending review'],
        ['WR-02 / R0', 'Joinery elevation', 'Illustrative; pending review'],
        ['SEPARATE TEACHING VIEW', 'RCP guide diagram', 'Not in the original project issue'],
        ['ISSUE LIMIT', 'Do not scale or build', 'Professional development required'],
      ],
      ffe: [
        ['PLAN', 'F-01 location', 'Conversation area'],
        ['ROOM REGISTER', 'One proposed sofa', 'FF&E schedule quantity: 1 item'],
        ['SPECIFICATION', 'Model not specified', 'Dimensions and supplier unresolved'],
        ['PURCHASING', 'Not ordered', 'Selection is pending review'],
      ],
    }[type];
    body = records
      .map(([tag, title, note], i) => {
        const x = 60 + (i % 2) * 470,
          y = 135 + Math.floor(i / 2) * 190;
        return `<g transform="translate(${x} ${y})"><rect width="410" height="160" fill="#ece7dd"/><text x="24" y="36" class="tag">${esc(tag)}</text><text x="24" y="78" class="heading">${esc(title)}</text><text x="24" y="118" class="note">${esc(note)}</text></g>`;
      })
      .join('');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 620" role="img" aria-labelledby="title desc"><title id="title">${esc(label)}</title><desc id="desc">Illustrative teaching diagram, not a site record or construction instruction.</desc><rect width="1000" height="620" fill="#f5f1e9"/><style>text{font-family:Arial,sans-serif;font-size:20px;fill:#252722}.heading{font-size:25px}.tag{font-size:14px;letter-spacing:1px;fill:#914f38}.note{font-size:18px}</style><text x="60" y="65" class="tag">OPENLINTEL / ${esc(type.replaceAll('-', ' ').toUpperCase())}</text>${body}<path d="M60 565H940" stroke="#d8d1c5"/><text x="60" y="595" class="tag">ILLUSTRATIVE TEACHING DIAGRAM · PENDING REVIEW · NOT FOR CONSTRUCTION</text></svg>`;
}
function templatePreview(page) {
  if (page.recordLayout)
    return `<div class="document-preview"><p class="resource-kind">Worked example preview · XLSX and PDF</p>${scheduleRecords(
      page,
    )
      .map(
        (record) =>
          `<section><h3>Record ${record.number}</h3>${record.sections.map((section) => `<h4>${esc(section.title)}</h4><dl>${section.fields.map((field) => `<div><dt>${esc(field.label)}</dt><dd class="example-answer">${field.value === '' ? 'Unresolved / not entered' : esc(field.value)}</dd></div>`).join('')}</dl>`).join('')}</section>`,
      )
      .join('')}</div>`;
  if (page.format === 'docx')
    return `<div class="document-preview"><p class="resource-kind">Worked example preview · DOCX</p><dl>${page.fields.map((f) => `<div><dt>${esc(f.label)}</dt><dd><p>${esc(f.help)}</p><p class="example-answer">${esc(f.example)}</p></dd></div>`).join('')}</dl></div>`;
  return `<div class="table-scroll resource-table" tabindex="0" role="region" aria-label="Worked example spreadsheet; scroll horizontally"><table><caption>${esc(page.title)} · Worked Example sheet${page.budget ? ' · USD teaching figures only' : ''}</caption><thead><tr>${page.columns.map((c) => `<th scope="col">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${displayRows(
    page,
  )
    .map(
      (row) =>
        `<tr>${page.columns.map((c, i) => `<${i === 0 ? 'th scope="row"' : 'td'}>${row[i] == null || row[i] === '' ? 'Not entered' : esc(typeof row[i] === 'number' && ['money', 'formula'].includes(c.type) ? row[i].toFixed(2) : row[i])}</${i === 0 ? 'th' : 'td'}>`).join('')}</tr>`,
    )
    .join('')}</tbody></table></div>`;
}
function downloads(page) {
  const instructions =
    page.id === 'presentation'
      ? 'Editable PowerPoint decks include separate image and text elements, two mood-board directions, and decision slides. Choose the blank deck or illustrative example; use the PDF to preview the example and the DOCX companion to plan its story.'
      : page.format === 'xlsx'
        ? esc(
            page.workbookDescription ||
              'One workbook with Instructions, Blank Template, and Worked Example sheets. Twenty editable rows; duplicate or extend the template for your project.',
          )
        : 'Separate blank and worked-example documents. Edit the blank copy in Word or a compatible document editor. Any PDF is a printable companion, not an interactive form.';
  return `<section id="download" class="download-panel"><h2>Make it your own</h2><p>${instructions}</p><div class="download-actions">${page.downloads.map((d, i) => `<a class="${i === 0 ? 'button' : 'text-link'}" data-resource-download data-resource-id="${esc(page.id)}" data-resource-format="${d.format.toLowerCase()}" data-resource-variant="${esc(d.variant || (d.format.toLowerCase() === 'xlsx' ? 'workbook' : i === 0 ? 'blank' : 'example'))}" href="${url(d.path)}" download>${esc(d.label)} <span class="download-size">${d.format} · ${(d.size / 1024).toFixed(1)} KB</span></a>`).join('')}</div><p class="micro">Free download · No account · No information uploaded to OpenLintel</p></section>`;
}
export function resourcePage(page, registry, project, settings = growthConfig) {
  const template = page.kind === 'template';
  const sections = template
    ? [
        { id: 'preview', title: 'Worked example & fields' },
        { id: 'use', title: 'How to use it' },
        ...(page.sections || []),
        { id: 'review', title: 'Review before use' },
        { id: 'download', title: 'Editable download' },
      ]
    : page.sections;
  const article = template
    ? `<section id="preview"><h2>Worked example & fields</h2><p class="sample-notice">${esc(page.exampleNotice || 'Illustrative teaching extension of The Window Room. Pending review; not a client record, supplier quote, site survey, or construction-ready document.')}</p>${templatePreview(page)}${page.columns ? `<h3>What each field records</h3><dl class="field-guide">${page.columns.map((c) => `<div><dt>${esc(c.label)}</dt><dd>${esc(c.help)}</dd></div>`).join('')}</dl>` : ''}</section>
       <section id="use"><h2>How to use this template</h2><p>${esc(page.use)}</p><ol>${page.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></section>
       ${(page.sections || []).map(authoredSection).join('')}
       <section id="review"><h2>Review before use</h2>${list(page.mistakes)}${page.unitsNote ? `<h3>Units, source information, and US use</h3><p>${esc(page.unitsNote)}</p>` : ''}</section>${downloads(page)}`
    : `${visual(page, project)}${page.sections.map(authoredSection).join('')}<section id="checklist"><h2>Before you move on</h2>${list(page.checklist)}</section>`;
  return `<div class="wrap resource-page">${breadcrumbs(page)}
    <header class="article-header"><p class="eyebrow">${esc(clusters.find((c) => c.id === page.cluster).title)} / ${template ? `Downloads: ${formatLabel(page)}` : 'Practical guide'}</p><h1>${esc(page.title)}</h1><p class="lede">${esc(page.intro)}</p><p class="article-meta">By <a href="${url('about/')}">OpenLintel</a> · Updated <time datetime="${esc(page.modified)}">${editorialDate(page.modified)}</time> · Educational resource</p>${template ? '<p class="micro">Preview below, then download an editable copy. No sign-up required.</p>' : ''}</header>
    <div class="article-layout"><aside class="article-toc"><nav aria-label="On this page"><p class="eyebrow">On this page</p><ol>${sections.map((s) => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`).join('')}${template ? '' : '<li><a href="#checklist">Review checklist</a></li>'}</ol></nav></aside>
    <article class="resource-body">${article}
      <section class="article-sources"><h2>About this resource</h2>${reviewCredit(page)}<p><a href="${url('editorial-policy/')}">Authorship, review boundaries, sources, and corrections</a></p>${page.sources.length ? `<h3>References</h3><ul>${page.sources.map((s) => `<li><a href="${esc(s.url)}">${esc(s.title)}</a></li>`).join('')}</ul>` : ''}</section>
      ${page.exampleBridge ? `<section class="sample-bridge"><h2>${esc(page.exampleBridge.title)}</h2><p>${esc(page.exampleBridge.description)}</p><a class="text-link" href="${url(page.exampleBridge.path)}">${esc(page.exampleBridge.label)}</a></section>` : `<section class="sample-bridge"><h2>See the information connect</h2><p>Follow the corresponding chapter of The Window Room: one illustrative brief, one selected direction, and coordinated sample references.</p><a class="text-link" data-sample-link data-source-page-id="${esc(page.id)}" href="${url(`sample-project/#${page.sample}`)}">Explore the sample ${page.sample === 'handoff' ? 'handoff' : page.sample}</a></section>`}
      <section class="sample-bridge"><h2>Discuss your studio’s workflow</h2><p>${esc(settings.pilotEnabled ? page.pilot || 'Discuss documentation and coordination challenges in a discovery conversation. OpenLintel is in active development.' : 'Discovery requests are not open yet. Check current availability and what a future conversation could cover. Every resource remains available without signing up.')}</p><a class="text-link" data-pilot-cta data-source-page-id="${esc(page.id)}" href="${url('pilot/')}">${pilotCtaLabel(settings)}</a></section>
    </article></div>
    <section class="related-resources"><h2>The next useful step</h2><div class="resource-grid">${[
      ...new Set([...page.related, ...(page.programmaticRelated || [])]),
    ]
      .map((id) => registry.find((p) => p.id === id))
      .map(card)
      .join(
        '',
      )}</div><a class="text-link" href="${url(template ? 'templates/' : 'resources/')}">Back to ${template ? 'all templates' : 'all resources'}</a></section></div>`;
}
