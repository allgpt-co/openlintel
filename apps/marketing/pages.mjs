import { url, config, esc } from './config.mjs';
import {
  arrow,
  button,
  textLink,
  eyebrow,
  picture,
  caption,
  cta,
  pageIntro,
  materialTable,
} from './components.mjs';

const roomAlt =
  'Quiet Oak concept: oak storage, linen seating, and warm daylight in The Window Room';
const chapterResources = {
  brief: ['templates/interior-design-client-questionnaire/', 'Client questionnaire'],
  design: ['resources/interior-design-mood-board-examples/', 'Annotated mood-board examples'],
  drawings: ['resources/interior-design-drawing-checklist/', 'Drawing review checklist'],
  materials: ['templates/interior-design-spec-sheet/', 'Editable specification sheet'],
  handoff: ['resources/interior-design-project-management/', 'Project handoff guide'],
};
const stageNames = ['The brief', 'The design', 'The drawings', 'The materials', 'The handoff'];

function professionalResources(kind = 'studio') {
  const architect = kind === 'architect';
  const resources = architect
    ? [
        [
          'Record the room',
          'Separate observed information from assumptions before developing a drawing.',
          'templates/room-data-sheet/',
          'Room data sheet',
        ],
        [
          'Review the drawing set',
          'Check references, revision status, and outstanding coordination questions.',
          'resources/interior-design-drawing-checklist/',
          'Drawing review checklist',
        ],
        [
          'Coordinate finishes',
          'Give each surface a finish reference and an explicit review status.',
          'templates/finish-schedule/',
          'Finish schedule',
        ],
      ]
    : [
        [
          'Agree the brief',
          'Turn the client conversation into recorded priorities and unresolved questions.',
          'templates/interior-design-client-questionnaire/',
          'Client questionnaire',
        ],
        [
          'Describe the selection',
          'Record the product reference, requirements, and information still to confirm.',
          'templates/interior-design-spec-sheet/',
          'Specification sheet',
        ],
        [
          'Connect the schedule',
          'Carry item references into a room-by-room FF&E register.',
          'templates/ffe-schedule/',
          'FF&E schedule',
        ],
      ];
  return `<section class="wrap source-resources"><div class="section-heading"><div>${eyebrow('Useful before any pilot')}<h2>Start with the<br><em>information.</em></h2></div><p>Editable resources with blank and illustrative worked examples. Free to use without an account.</p></div><div class="practice-grid">${resources.map(([heading, text, path, label], index) => `<article><span class="big-number">0${index + 1}</span><h3>${heading}</h3><p>${text}</p>${textLink(label, path)}</article>`).join('')}</div><div class="license-note"><span class="eyebrow">An early-stage conversation</span><p>Does your residential practice struggle to keep drawings, selections, or revisions aligned? Learn about pilot discovery, current availability, and the work still in development.</p>${textLink('Pilot discovery', 'pilot/')}</div></section>`;
}

export function home(project) {
  return `<section class="hero wrap"><div class="hero-copy">${eyebrow('For the people who shape spaces')}<h1>Your vision.<br>In every <em>detail.</em></h1><p class="hero-description">AI-assisted interior design workflows for residential studios. Explore how a brief, drawings, and material references can connect—with professional judgment at each step.</p><div class="hero-actions">${button('Explore a sample project', 'sample-project/')}${textLink('See how it works', 'how-it-works/')}</div><p class="hero-footnote"><span class="status-dot"></span> Open source · Active development · Illustrative examples</p></div><figure class="hero-visual">${picture('room', roomAlt, { hero: true, sizes: '(max-width: 800px) 100vw, 60vw' })}<div class="image-label"><span class="label-line"></span>The Window Room<span class="micro">A study in light, space & everyday life</span></div><span class="image-index">ILLUSTRATIVE PROJECT / 001</span></figure><div class="hero-baseline"><span>Design is in the details. Keep them connected.</span><a href="#the-story">Discover the story <span aria-hidden="true">↓</span></a></div></section>
  <div class="chapter-strip"><div class="wrap"><span class="eyebrow">One connected perspective</span><div>${stageNames.map((name, i) => `<a href="${url(`sample-project/#${project.chapters[i].id}`)}"><span>0${i + 1}</span>${name}</a>`).join('')}</div></div></div>
  <section class="story-section wrap" id="the-story"><div class="story-heading">${eyebrow('The beginning', '01 /')}<h2>“A place to read.<br>A place to <em>gather.</em>”</h2><p>Every project begins with something wonderfully human. A way of living. A feeling to come home to. Your work gives it form.</p></div><div class="brief-composition"><figure>${picture('existing', 'The same room before furnishing, with the existing oak floor and window retained')}${caption('FIG. 01 — THE ROOM, AS IT IS')}</figure><div class="brief-note"><span class="eyebrow">From the project brief</span><p>Keep the floor.<br>Make room for books.<br>Let the light lead.</p><span class="note-bottom">The Window Room <span>20 m²</span></span></div></div></section>
  <section class="decision-section"><div class="wrap"><div class="section-heading"><div>${eyebrow('The work behind the room', '02 /')}<h2>Every detail begins<br>with a <em>decision.</em></h2></div><p>The room takes shape through the choices you make. Give those choices a clear thread through the project.</p></div><div class="decision-grid"><article><figure>${picture('detail', 'Detail of the oak reading chair and linen beside the window')}${caption('01 / FIND THE MOMENT', 'Concept illustration')}</figure><h3>A corner that invites you in.</h3><p>The reading chair follows the light. Its position becomes part of the furnished plan.</p></article><article><figure>${picture('materials', 'Oak, linen, mineral finish, and wool samples arranged on an ivory worktable')}${caption('02 / SET THE MATERIAL LANGUAGE', 'Concept illustration')}</figure><h3>A palette you can put into words.</h3><p>Oak, linen, and warm mineral tones. Each selection gets a reference and a place in the schedule.</p></article><article><figure class="drawing-card"><img src="${url('assets/downloads/window-room-elevation.svg')}" width="900" height="700" loading="lazy" alt="Illustrative oak joinery elevation with three 800 mm modules">${caption('03 / RESOLVE THE DETAIL', 'Illustrative drawing')}</figure><h3>Storage with a sense of proportion.</h3><p>Three joinery modules turn a visual idea into a dimensioned discussion.</p></article></div></div></section>
  <section class="connection-section wrap"><div>${eyebrow('From intention to information', '03 /')}<h2>Give each decision<br>a place to <em>go.</em></h2><p class="body-copy">The concept, the drawing, the material reference. This worked example connects them through shared references. OpenLintel is developing that approach into software, designed to keep professional review at each step.</p>${textLink('Explore the workflow', 'how-it-works/')}<div class="reference-note"><span class="eyebrow">A detail, connected</span><p>Oak storage <span>→</span> J-01 <span>→</span> Drawing WR-02</p></div></div><figure class="plan-figure"><img src="${url('assets/downloads/window-room-plan.svg')}" width="900" height="700" loading="lazy" alt="The Window Room furnished plan with linked material and furniture references">${caption('FIG. 02 — QUIET OAK / FURNISHED PLAN', 'Illustrative · Pending review')}</figure></section>
  <section class="sample-banner"><div class="sample-banner-image">${picture('room', roomAlt)}</div><div class="sample-banner-copy">${eyebrow('Inside a sample project')}<h2>One room.<br>Every chapter.</h2><p>Follow The Window Room from its first brief to a coordinated sample handoff. Take a closer look at the decisions along the way.</p>${button('Step inside The Window Room', 'sample-project/', 'light')}<span class="micro">Illustrative sample project · No sign-up needed</span></div></section>
  <section class="audiences wrap"><div class="section-heading"><div>${eyebrow('For your practice', '04 /')}<h2>Made for the work<br><em>around the design.</em></h2></div><p>For the people developing the ideas, resolving the details, and making the project understandable.</p></div><div class="audience-grid"><a class="audience-link" href="${url('for-design-studios/')}"><span class="eyebrow">Interior design studios</span><h3>Keep the whole<br>room in view.</h3><p>Connect concepts, selections, and project information as your residential work develops.</p><span class="text-link">For design studios ${arrow}</span></a><a class="audience-link" href="${url('for-architects/')}"><span class="eyebrow">Residential architects</span><h3>Carry spatial intent<br>into the detail.</h3><p>Communicate interior decisions through plans, elevations, and material references.</p><span class="text-link">For residential architects ${arrow}</span></a></div></section>
  <section class="open-band"><div class="wrap"><div class="open-symbol" aria-hidden="true">[ &nbsp; ]</div><div>${eyebrow('Open by design')}<h2>An open foundation<br>for your practice.</h2></div><div><p>Explore the source. Understand the project. Help shape what comes next.</p>${textLink('Meet the open-source project', 'open-source/')}</div></div></section>${professionalResources()}${cta()}`;
}

export function workflow(project) {
  const steps = [
    [
      'Start with the room you have.',
      'Room information, a brief, and constraints establish the context for design exploration.',
      'Room dimensions, floor-plan information, and project requirements',
      'A shared room brief and constraints',
      'Confirm measured information and the client’s priorities.',
      'existing',
    ],
    [
      'Explore a considered direction.',
      'Develop design variants around a style, budget tier, and the constraints that matter to the project.',
      'Room brief and design preferences',
      'Design concepts and structured specifications',
      'Evaluate the options and develop the selected direction.',
      'room',
    ],
    [
      'Describe what the idea means.',
      'Develop drawing references that make room layouts and interior details easier to discuss.',
      'Room information and a selected design variant',
      'SVG drawing previews and drawing metadata',
      'Review dimensions, assumptions, and detail before further use.',
      'drawing',
    ],
    [
      'Put selections in context.',
      'Organize materials by application and connect them to the design work they support.',
      'Design information and material choices',
      'An illustrative material register with quantities and assumptions to review',
      'Validate quantities and confirm specifications and local pricing.',
      'materials',
    ],
    [
      'Give the next conversation a foundation.',
      'Gather the information that explains the selected direction and the decisions still to resolve.',
      'Reviewed project information and selected artifacts',
      'A clear set of references for discussion',
      'Agree what is ready to share and what needs further development.',
      'detail',
    ],
  ];
  const faqs = [
    [
      'Is The Window Room a real client project?',
      'It is an illustrative project created to explain the workflow. The room images are AI-generated concepts. The sample drawings and material schedule are authored examples, rather than outputs from a live project session.',
    ],
    [
      'Where does professional judgment fit?',
      'The designer reviews the brief, selects a direction, and checks the drawings and materials. The sample drawings are authored illustrations, not verified application exports or construction instructions.',
    ],
    [
      'What information do I need to begin?',
      'Start with a room brief, dimensions, and the constraints you want the design to respect. The repository contains workflows for room and floor-plan information as well as design variants. Individual capabilities depend on your configured installation.',
    ],
    [
      'Can I use the sample drawings for a building project?',
      'The downloads explain this fictional room. They are marked illustrative and pending review, and are intended for exploring the sample rather than construction or fabrication.',
    ],
    [
      'How do I get started with OpenLintel?',
      `Visit the <a href="${config.repo}/blob/main/docs/development.md">development guide</a> for setup instructions and service requirements. OpenLintel is in active development; a production hosted application is not offered through this website.`,
    ],
  ];
  return `${pageIntro('The connected workflow', 'From a brief<br>to the <em>details.</em>', 'This illustrative workflow shows how information can carry between stages. It is not a demonstration of an automated end-to-end application. Your judgment and project-specific review remain essential.', button('See the sample project', 'sample-project/'))}<div class="workflow-list wrap">${steps.map((step, i) => `<section class="workflow-step"><div class="workflow-number">0${i + 1}</div><div class="workflow-copy">${eyebrow(project.chapters[i].name)}<h2>${step[0]}</h2><p>${step[1]}</p><dl class="workflow-io"><div><dt>Start with</dt><dd>${step[2]}</dd></div><div><dt>Develop</dt><dd>${step[3]}</dd></div><div><dt>Your role</dt><dd>${step[4]}</dd></div></dl>${textLink(`Explore this chapter`, `sample-project/#${project.chapters[i].id}`)}</div><figure>${step[5] === 'drawing' ? `<img class="photo" src="${url('assets/downloads/window-room-plan.svg')}" width="900" height="700" alt="Illustrative furnished plan" loading="lazy">` : picture(step[5], `${project.chapters[i].name}: The Window Room illustrative project`)}${caption('THE WINDOW ROOM', 'Illustrative example')}</figure></section>`).join('')}</div><section class="faq-section wrap"><div>${eyebrow('A few useful details')}<h2>Before you<br><em>begin.</em></h2></div><div>${faqs.map(([question, answer]) => `<details class="faq"><summary>${question}<span aria-hidden="true">+</span></summary><div>${answer}</div></details>`).join('')}</div></section>${cta()}`;
}

export function audience(kind) {
  const studio = kind === 'studio';
  const cards = studio
    ? [
        [
          '01',
          'Give the brief a shared home.',
          'Keep room information, priorities, and constraints close to the work, so each design variant starts with the same context.',
        ],
        [
          '02',
          'Develop the design conversation.',
          'Explore alternatives and use structured design information to explain the material and spatial direction you are proposing.',
        ],
        [
          '03',
          'Stay close to the details.',
          'Bring drawing references and material information into the project as the selected concept becomes more specific.',
        ],
      ]
    : [
        [
          '01',
          'Begin with spatial context.',
          'Room dimensions, openings, and project requirements give interior design exploration a clear starting point.',
        ],
        [
          '02',
          'Make interior intent legible.',
          'Use furnished plans, elevations, and design references to discuss how a room is arranged and how its details relate.',
        ],
        [
          '03',
          'Connect finishes to their use.',
          'Organize material references around the spaces and elements they belong to, with the assumptions available for review.',
        ],
      ];
  return `${pageIntro(studio ? 'For interior design studios' : 'For residential architects', studio ? 'Keep the whole<br>room <em>in view.</em>' : 'Carry spatial intent<br>into the <em>detail.</em>', studio ? 'Your practice brings a point of view to a home. OpenLintel is exploring a shared project workflow for the decisions around it.' : 'A room is understood through its proportions, its light, and the relationships between its elements. Give that understanding a clear expression.', button('Explore the sample project', 'sample-project/'))}<figure class="audience-hero wrap">${picture(studio ? 'room' : 'detail', studio ? roomAlt : 'Reading corner detail showing the relationship between furniture and daylight', { hero: true, sizes: '90vw' })}${caption('THE WINDOW ROOM / A STUDY IN EVERYDAY LIVING')}</figure><section class="wrap audience-body"><div class="section-heading"><div>${eyebrow('A place for the developing work')}<h2>${studio ? 'A considered process.<br>A clearer <em>thread.</em>' : 'From the room<br>to its <em>relationships.</em>'}</h2></div><p>${studio ? 'From a client’s first thought to the selections you put in front of them, the work gains depth through decisions.' : 'Keep the interior conversation grounded in the information that describes the space.'}</p></div><div class="practice-grid">${cards.map(([n, title, desc]) => `<article><span class="big-number">${n}</span><h3>${title}</h3><p>${desc}</p></article>`).join('')}</div></section><section class="practice-example"><div class="wrap connection-section"><figure class="plan-figure"><img src="${url('assets/downloads/window-room-elevation.svg')}" width="900" height="700" loading="lazy" alt="J-01 joinery elevation, illustrative sample pending review">${caption('J-01 / WR-02', 'Illustrative · Pending review')}</figure><div>${eyebrow('A closer look')}<h2>One decision.<br>Several <em>expressions.</em></h2><p class="body-copy">In The Window Room, the oak storage appears in the concept, the furnished plan, the elevation, and the material schedule. Follow that single decision through the sample.</p>${textLink('Follow the joinery detail', 'sample-project/#drawings')}<p class="review-note">${studio ? 'AI-assisted outputs support the process. Your studio reviews and develops the work.' : 'This example concerns interior design development. Project-specific engineering and construction documentation require their own professional work.'}</p></div></div></section>${professionalResources(kind)}${cta()}`;
}

export function openSource() {
  return `${pageIntro('Open by design', 'An open foundation<br>for your <em>practice.</em>', 'The source is available to explore. The project is evolving in public. There is room to understand it, work with it, and help it grow.')}<section class="source-feature wrap"><div class="source-emblem" aria-hidden="true"><span>OpenLintel</span><div>[ <i>O</i> ]</div><span>Considered design. Open foundations.</span></div><div>${eyebrow('The project')}<h2>Look inside<br>the <em>work.</em></h2><p>OpenLintel is open-source interior design software for residential workflows. Its repository includes a Next.js web application, backend services, and shared packages.</p><p>It is in active development. Explore the implementation and setup requirements to understand what is available in your environment. This public site is an illustrative workflow and resource library, not a verified hosted signup service.</p><p><a class="text-link" href="${url('product-status/')}">Read the current product status</a> · <a class="text-link" href="${url('pilot/')}">Learn about pilot discovery</a></p><p><a class="text-link" href="${url('resources/')}">Explore the guides and editable templates</a></p><a class="button" href="${config.repo}">Explore the repository ${arrow}</a></div></section><section class="wrap source-resources"><div class="section-heading"><div>${eyebrow('Three ways in')}<h2>Find your<br><em>starting point.</em></h2></div></div><div class="practice-grid"><article><span class="big-number">01</span><h3>Understand the project.</h3><p>Read the overview and explore the code behind the design workflows.</p><a class="text-link" href="${config.repo}#readme">Project overview ${arrow}</a></article><article><span class="big-number">02</span><h3>Set up an environment.</h3><p>The development guide covers local services and configuration. AI features require the relevant provider and service setup.</p><a class="text-link" href="${config.repo}/blob/main/docs/development.md">Development guide ${arrow}</a></article><article><span class="big-number">03</span><h3>Contribute your perspective.</h3><p>Developers, designers, and domain specialists can review the contribution guide and participate through GitHub.</p><a class="text-link" href="${config.repo}/blob/main/CONTRIBUTING.md">Contribution guide ${arrow}</a></article></div><div class="license-note"><span class="eyebrow">Project license</span><p>The repository publishes its license as AGPL-3.0. Read the license text for its terms.</p><a class="text-link" href="${config.repo}/blob/main/LICENSE">Read the license ${arrow}</a></div></section>${cta()}`;
}

export function sample(project) {
  const contents = {
    brief: `<figure>${picture('existing', 'The existing empty Window Room with retained oak floor and centered window', { hero: true, sizes: '(max-width: 800px) 100vw, 65vw' })}${caption('THE STARTING POINT', 'AI-generated concept illustration')}</figure><div class="brief-details"><div><h3>A room for everyday life.</h3><p>${project.description}</p></div><dl class="room-facts"><div><dt>Room area</dt><dd>20 m²</dd></div><div><dt>Dimensions</dt><dd>5,000 × 4,000 mm</dd></div><div><dt>Ceiling</dt><dd>2,800 mm</dd></div></dl></div><ul class="constraint-list">${project.constraints.map((c) => `<li><span aria-hidden="true">↳</span>${c}</li>`).join('')}</ul>`,
    design: `<div class="concept-switch" role="group" aria-label="Compare design concepts">${project.concepts.map((c, i) => `<button data-concept="${c.id}" aria-pressed="${i === 0}">${c.name}${c.selected ? '<span>Selected route</span>' : '<span>Alternative study</span>'}</button>`).join('')}</div>${project.concepts.map((c) => `<div class="concept-panel" data-concept-panel="${c.id}"><figure>${picture(c.image, `${c.name}: ${c.description}`)}${caption(c.name.toUpperCase(), 'AI-generated concept illustration')}</figure><div class="concept-description"><span class="eyebrow">${c.selected ? 'The selected sample direction' : 'An alternative material direction'}</span><p>${c.description}</p></div></div>`).join('')}<div class="design-decisions"><div><span>01 / LIGHT</span><p>Give the reading chair a place by the window.</p></div><div><span>02 / MATERIAL</span><p>Build on the warmth of the existing oak floor.</p></div><div><span>03 / STORAGE</span><p>Keep west-wall joinery low and the room open.</p></div></div>`,
    drawings: `<p class="sample-notice">Quiet Oak · Illustrative drawings · Pending review</p><div class="drawing-switch" role="group" aria-label="Choose drawing">${project.drawings.map((d, i) => `<button data-drawing="${d.id}" aria-pressed="${i === 0}">${d.reference} / ${d.name}</button>`).join('')}</div>${project.drawings.map((d) => `<figure class="drawing-panel" data-drawing-panel="${d.id}"><img src="${url(`assets/downloads/${d.filename}`)}" width="900" height="700" alt="${d.name}: ${d.note}. Illustrative sample, pending review."><figcaption><span>${d.note}</span><a class="text-link" href="${url(`assets/downloads/${d.filename}`)}" data-expand-drawing="${d.name}">Expand drawing <span aria-hidden="true">⤢</span></a></figcaption></figure>`).join('')}<div class="artifact-note"><h3>The detail has an address.</h3><p>Reference <strong>J-01</strong> links the oak storage on plan WR-01 to the three 800 mm modules on elevation WR-02 and its entry in the material schedule.</p></div>`,
    materials: `<figure class="materials-hero">${picture('materials', 'Oak veneer, mineral finish, linen, and wool concept samples')}${caption('THE MATERIAL LANGUAGE', 'AI-generated concept illustration')}</figure>${materialTable(project)}<p class="review-note">This is a partial sample schedule. Quantities are illustrative; surface areas, specifications, and procurement quantities need project-specific review.</p>`,
    handoff: `<div class="handoff-cover">${picture('room', roomAlt)}<div><span class="eyebrow">Project 001 / Quiet Oak</span><h3>The Window Room</h3><p>Illustrative sample project<br>20 m² · R0 · Pending review</p></div></div><div class="download-list">${project.drawings.map((d) => `<a href="${url(`assets/downloads/${d.filename}`)}" download><span><small>${d.reference} / SVG</small>${d.name}</span><span aria-hidden="true">↓</span></a>`).join('')}<a href="${url('assets/downloads/window-room-materials.csv')}" download><span><small>SCHEDULE / CSV</small>Sample material schedule</span><span aria-hidden="true">↓</span></a><a href="${url('sample-project/summary/')}" target="_blank" rel="noopener"><span><small>PROJECT SUMMARY / PRINTABLE PAGE</small>Open the project summary</span><span aria-hidden="true">↗</span></a></div><div class="artifact-note"><h3>A starting point for the next conversation.</h3><p>These artifacts explain a fictional room. Use them to explore the relationships between the brief, the chosen concept, and its details.</p><div class="inline-links"><a class="text-link" href="${url('how-it-works/')}">Understand the workflow ${arrow}</a><a class="text-link" data-pilot-cta href="${url('pilot/')}">Discuss a residential design pilot ${arrow}</a><a class="text-link" href="${config.repo}/blob/main/docs/development.md">View the setup guide ${arrow}</a></div></div>`,
  };
  return `<header class="sample-intro wrap">${eyebrow('Project 001 / An invitation to explore')}<div><h1>The Window <em>Room.</em></h1><p class="sample-notice">Illustrative sample project<br><span>Five chapters · No sign-up needed</span></p></div><p>A place to read. A place to gather. Follow the decisions that bring it together.</p></header><div class="sample-layout wrap"><aside class="chapter-nav"><p class="eyebrow">Inside the project</p><nav aria-label="Project chapters">${project.chapters.map((c) => `<a href="#${c.id}" data-chapter-link="${c.id}"><span>${c.number}</span>${c.name}<span class="chapter-arrow" aria-hidden="true">↗</span></a>`).join('')}</nav><label class="mobile-chapter-label" for="chapter-select">Choose a chapter</label><select id="chapter-select">${project.chapters.map((c) => `<option value="${c.id}">${c.number} / ${c.name}</option>`).join('')}</select><div class="sample-sidebar-note">One room.<br>One selected direction.<br>A thread through the details.</div></aside><div class="chapter-content">${project.chapters.map((c, i) => `<section id="${c.id}" class="chapter-panel" data-chapter="${c.id}" aria-labelledby="${c.id}-title">${eyebrow(`Chapter ${c.number} / ${c.name}`)}<h2 id="${c.id}-title" tabindex="-1">${c.title}</h2><p class="chapter-intro">${c.intro}</p>${contents[c.id]}<aside class="chapter-resource-link"><p>Adapt this part of the workflow</p>${textLink(chapterResources[c.id][1], chapterResources[c.id][0])}</aside><div class="chapter-controls">${i ? `<a class="text-link" href="#${project.chapters[i - 1].id}"><span aria-hidden="true">←</span> Previous chapter</a>` : '<span></span>'}<span class="chapter-count">${c.number} / 05</span>${i < project.chapters.length - 1 ? `<a class="button" href="#${project.chapters[i + 1].id}">Next: ${project.chapters[i + 1].name.toLowerCase()} <span aria-hidden="true">→</span></a>` : '<a class="text-link" href="#brief">Return to the brief <span aria-hidden="true">↺</span></a>'}</div></section>`).join('')}</div></div><dialog class="drawing-dialog" aria-labelledby="drawing-dialog-title"><div class="dialog-heading"><h2 id="drawing-dialog-title">Drawing</h2><button data-close-dialog aria-label="Close expanded drawing">Close <span aria-hidden="true">×</span></button></div><div class="drawing-zoom-area"><img width="900" height="700" alt=""></div><p>Illustrative sample · Pending review · Dimensions in mm · Do not scale</p></dialog>`;
}

export function summary(project) {
  return `${pageIntro('Illustrative sample project / Printable summary', 'The Window <em>Room.</em>', project.description, '<button class="button print-button" data-print>Print this summary <span aria-hidden="true">↗</span></button>')}<article class="wrap summary-content"><p class="sample-notice">Quiet Oak · 5,000 × 4,000 × 2,800 mm · 20 m² · R0 · Pending review</p><figure>${picture('room', roomAlt, { hero: true })}${caption('SELECTED CONCEPT / QUIET OAK')}</figure><h2>The brief</h2><ul>${project.constraints.map((c) => `<li>${esc(c)}</li>`).join('')}</ul><h2>Drawing references</h2><div class="summary-drawings">${project.drawings.map((d) => `<figure><img src="${url(`assets/downloads/${d.filename}`)}" width="900" height="700" alt="${d.name}, illustrative and pending review"><figcaption>${d.reference} / ${d.name}</figcaption></figure>`).join('')}</div><h2>Sample material schedule</h2>${materialTable(project)}<p class="review-note">Illustrative sample project. AI-generated room concepts and authored sample artifacts. This partial schedule and these drawings require professional development and review before any project use.</p>${textLink('Back to the guided sample', 'sample-project/#handoff')}</article>`;
}
