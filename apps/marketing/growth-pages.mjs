import { config, url, absolute, esc } from './config.mjs';
import { growthConfig, publicContactEmail, pilotCtaLabel } from './growth-config.mjs';

const page = (id, path, title, description, indexable = true) => ({
  id,
  path,
  title,
  description,
  kind: 'growth',
  status: 'published',
  indexable,
  ...(id === 'pilot-thanks' ? {} : { modified: '2026-09-26' }),
});
export const growthPages = [
  page(
    'pilot',
    'pilot/',
    'Discuss a residential design pilot',
    'Explore a pilot discovery conversation about residential design documentation, specification changes, and handoff. OpenLintel is in active development.',
  ),
  page(
    'product-status',
    'product-status/',
    'OpenLintel product status and limitations',
    'What is available to inspect, what is illustrative, and what is not yet verified in the OpenLintel interior design project.',
  ),
  page(
    'about',
    'about/',
    'About the OpenLintel project',
    'OpenLintel is an open-source project exploring AI-assisted interior design workflows for residential design professionals.',
  ),
  page(
    'editorial-policy',
    'editorial-policy/',
    'How OpenLintel resources are made and reviewed',
    'Our approach to illustrative examples, AI assistance, evidence, corrections, and professional review of interior design resources.',
  ),
  page(
    'privacy',
    'privacy/',
    'Privacy and analytics choices',
    'How OpenLintel handles Google sign-in, hosted project data, AI requests, optional website analytics, and privacy choices.',
  ),
  page(
    'pilot-thanks',
    'pilot/thanks/',
    'What happens after a pilot request',
    'What to expect after a successfully accepted OpenLintel pilot discovery request.',
    false,
  ),
];
const link = (text, path) => `<a href="${url(path)}">${text}</a>`;
const intro = (label, title, text) =>
  `<header class="page-intro wrap"><p class="eyebrow">${label}</p><h1>${title}</h1><div class="intro-bottom"><p class="lede">${text}</p></div></header>`;
const section = (title, body, id = '') =>
  `<section class="growth-section"${id ? ` id="${id}"` : ''}><h2>${title}</h2>${body}</section>`;
const contact = (settings) => {
  const email = settings.displayContactEmail || settings.contactEmail || publicContactEmail;
  return `<a href="mailto:${esc(email)}">${esc(email)}</a>`;
};

function field(
  name,
  label,
  {
    type = 'text',
    required = false,
    max = 160,
    autocomplete = '',
    hint = '',
    options,
    multiline = false,
  } = {},
) {
  const attrs = `id="pilot-${name}" name="${name}"${required ? ' required' : ''} aria-describedby="${hint ? `pilot-${name}-hint ` : ''}pilot-${name}-error"${autocomplete ? ` autocomplete="${autocomplete}"` : ''}`;
  const input = options
    ? `<select ${attrs}><option value="">Choose an option</option>${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select>`
    : multiline
      ? `<textarea ${attrs} rows="5" maxlength="${max}"></textarea>`
      : `<input ${attrs} type="${type}" maxlength="${max}">`;
  return `<div class="growth-field${multiline ? ' growth-field-wide' : ''}"><label for="pilot-${name}">${label}${required ? ' <span>(required)</span>' : ' <span>(optional)</span>'}</label>${hint ? `<p class="growth-hint" id="pilot-${name}-hint">${hint}</p>` : ''}${input}<p class="growth-error" id="pilot-${name}-error"></p></div>`;
}
function pilotForm(settings) {
  if (!settings.pilotEnabled)
    return `<div class="growth-notice" id="pilot-request"><h2>Requests are not open yet</h2><p>The pilot intake is not currently accepting submissions. You can still explore the ${link('illustrative sample project', 'sample-project/')} and use every ${link('editable template', 'templates/')} without signing up.</p><p>Availability will be updated here when a monitored request channel is ready. The experimental hosted application is separate from discovery intake; access and pilot admission are not guaranteed.</p></div>`;
  return `<section class="growth-section" id="pilot-request"><h2>Request a discovery conversation</h2><p>Tell us about a documentation or coordination problem in your practice. Required fields are marked. Personal email addresses are welcome.</p><form class="growth-form" id="pilot-form" action="${esc(settings.formEndpoint)}" method="POST" data-pilot-form><div class="growth-fields">${field('name', 'Name', { required: true, autocomplete: 'name' })}${field('email', 'Email', { required: true, type: 'email', autocomplete: 'email', max: 254 })}${field('studio', 'Studio name', { required: true, autocomplete: 'organization' })}${field(
    'role',
    'Professional role',
    {
      required: true,
      options: [
        ['interior-designer', 'Interior designer'],
        ['residential-architect', 'Residential architect'],
        ['studio-operations', 'Studio operations'],
        ['other-professional', 'Other design professional'],
      ],
    },
  )}${field('challenge', 'Which workflow would you like to improve?', { required: true, multiline: true, max: 2000, hint: 'A brief description is enough. Do not include client names, home addresses, confidential project details, or sensitive financial information.' })}${field('website', 'Studio website', { type: 'url', autocomplete: 'url', max: 300, hint: 'Include https:// if you provide a website.' })}${field('country', 'Country', { autocomplete: 'country-name', max: 100 })}${field(
    'timing',
    'Project timing',
    {
      options: [
        ['current', 'Current project'],
        ['next-three-months', 'Within three months'],
        ['later', 'Later or exploratory'],
      ],
    },
  )}${field('discovery', 'How did you hear about OpenLintel?', {
    options: [
      ['search', 'Search engine'],
      ['ai-assistant', 'AI assistant'],
      ['colleague', 'Colleague or recommendation'],
      ['publication', 'Article or newsletter'],
      ['social', 'Social media'],
      ['github', 'GitHub'],
      ['other', 'Other'],
    ],
  })}</div><div class="growth-honeypot" aria-hidden="true"><label for="pilot-website-check">Leave this field empty</label><input id="pilot-website-check" name="_gotcha" tabindex="-1" autocomplete="off"></div><input type="hidden" name="source_evidence" value="unknown"><p class="growth-form-note">Your request goes to Formspree and the OpenLintel team for manual review and follow-up. It does not subscribe you to marketing or guarantee access. ${link('Privacy and data handling', 'privacy/')}.</p><p class="growth-form-note" data-attribution-note>Analytics is optional and is never required to submit this request.</p><div class="growth-form-actions"><button type="submit" class="button">Request a discovery conversation</button><p class="growth-form-status" role="status" aria-live="polite" tabindex="-1"></p></div><noscript><p>The form works without JavaScript. Formspree will show the submission result on its website. No website analytics will run.</p></noscript></form><div class="growth-notice" data-pilot-success hidden tabindex="-1"><h3>Request accepted</h3><p>Formspree has accepted your request for review. The team aims to respond within one business day. This is not a confirmed booking or pilot admission.</p><p>${link('What happens next', 'pilot/thanks/')} · ${link('Continue with the resource library', 'resources/')}</p></div></section>`;
}

export function renderGrowthPage(record, settings = growthConfig) {
  switch (record.id) {
    case 'pilot':
      return (
        intro(
          'For residential design professionals',
          'A conversation about<br>the <em>work between.</em>',
          'Design decisions are only part of the work. We want to understand where specifications, revisions, and handoffs become difficult for your studio.',
        ) +
        `<div class="wrap growth-layout"><div>${section('What we would discuss', '<ul><li>How your practice carries a client brief into drawings and material records.</li><li>Where changes lose context or need to be entered twice.</li><li>Which handoff information still needs checking, ownership, or approval.</li></ul><p>A discovery conversation is an opportunity to compare needs—not a sales demonstration of a finished platform.</p>')}${section('Who this is for', '<p>Residential interior designers, residential architects, and people coordinating a studio’s project information. US practices are the initial focus; relevant professional requests from other countries are welcome.</p>')}${section('What to expect', '<ol><li>Describe the problem without sharing confidential project information.</li><li>If requests are open, the team reviews your submission and contacts suitable prospects to arrange a conversation.</li><li>Any pilot scope, availability, and next steps are agreed separately.</li></ol>')}<aside class="growth-notice"><h2>Active development</h2><p>The experimental application has a separate sign-in at app.openlintel.com. A reachable sign-in page does not establish a working design workflow or an offered trial. The Window Room is a fictional, illustrative example, not a live application export or customer case study.</p><p>${link('Read the product status', 'product-status/')}</p></aside></div><div>${pilotForm(settings)}</div></div>`
      );
    case 'product-status':
      return (
        intro(
          'A clear boundary',
          'What you can<br><em>inspect today.</em>',
          'A public resource, an illustrative workflow, and application source code are different kinds of evidence. Here is how to tell them apart.',
        ) +
        `<div class="wrap growth-prose">${section('Available on this website', '<ul><li>Editable DOCX, XLSX, and PowerPoint resources, with printable PDFs, blank templates, and illustrative examples where listed.</li><li>Guides explaining residential design documentation and coordination.</li><li>The Window Room, a fictional example with drawings and a partial material schedule.</li><li>Public source code and development documentation.</li></ul><p>Check each download label for its actual format. The presentation resource includes editable PowerPoint decks, a PDF preview, and a DOCX planning companion. It is not a Canva template.</p>')}${section('Illustrative, not verified application output', '<p>The sample room, AI-generated concept imagery, quantities, prices, drawings, and records are teaching examples. They do not establish that the application generates a complete coordinated package or has been used on a customer project.</p><p>Unresolved fields and pending-review labels are part of the example. Do not use it for construction, purchasing, permitting, or a site-specific technical decision.</p>')}${section('Experimental hosted application', '<p>The application landing page and sign-in are reachable at <a href="https://app.openlintel.com/">app.openlintel.com</a>. It remains in active development. Public reachability does not verify account access, a complete design workflow, export quality, or a supported hosted trial.</p><p>Review the privacy notice before providing account or project information. Discovery conversations and any pilot access are arranged separately.</p>')}${section('In active development', `<p>OpenLintel explores connections between room inputs, design exploration, drawings, and material information. Source modules are not a promise that every workflow, export, integration, or provider is production-ready.</p><p>Before evaluating a capability, check the current <a href="${config.repo}">repository</a> and development documentation, pin a revision, and reproduce the specific workflow. A working result should be labeled with its version and limitations.</p>`)}${section('Not offered or established here', '<ul><li>A verified end-to-end hosted trial, guaranteed pilot admission, or guaranteed support service.</li><li>Permit-ready or construction-ready output, compliance certification, or exact quantities.</li><li>Verified customer outcomes, adoption figures, testimonials, or time-saving claims.</li><li>Private or offline AI merely because the code can be self-hosted; configured providers may receive data.</li></ul>')}${section('Next step', `<p>Explore the ${link('sample project', 'sample-project/')}, inspect the ${link('open-source project', 'open-source/')}, or read about a ${link('pilot discovery conversation', 'pilot/')}.</p>`)}</div>`
      );
    case 'about':
      return (
        intro(
          'The open-source project',
          'Design intent.<br><em>Documented clearly.</em>',
          'OpenLintel is exploring how residential design professionals can keep design decisions, drawings, and material information connected—with professional review at each stage.',
        ) +
        `<div class="wrap growth-prose">${section('Why this project exists', '<p>A room moves through conversations, visual directions, drawings, specifications, and approvals. The project focuses on the information between those steps: what is known, what changed, and what still needs review.</p><p>The resource library provides editable starting points and worked examples while the application remains in active development.</p>')}${section('Who is accountable', `<p>OpenLintel is maintained through its <a href="${config.repo}">public source repository</a>. The <a href="${config.repo}/graphs/contributors">contribution history</a> records public code contributions; it should not be read as a list of qualified design reviewers.</p><p>Reviewer credits identify the person, the resource revision, and the scope actually reviewed. A code contribution does not establish professional review. Staff biographies and review credits are published only with the people’s permission and accurate details of their involvement.</p>`)}${section('Contact and corrections', `<p>For a public, non-confidential project issue, use <a href="${config.repo}/issues">GitHub issues</a>. For a private website or privacy question, contact ${contact(settings)}. Do not use public issues for personal or confidential information.</p><p>Read our ${link('editorial policy', 'editorial-policy/')} and ${link('product status', 'product-status/')} before relying on a resource.</p>`)}</div>`
      );
    case 'editorial-policy':
      return (
        intro(
          'Editorial policy',
          'Useful examples.<br><em>Honest boundaries.</em>',
          'Our resources should help you inspect a workflow, not mistake an illustrative document for a professionally approved deliverable.',
        ) +
        `<div class="wrap growth-prose">${section('Authorship and AI assistance', '<p>OpenLintel is accountable for the resources it publishes. AI assistance is used in drafting and example creation. AI-generated imagery is labeled, and fictional projects and teaching figures are identified as illustrative.</p><p>AI assistance is not evidence of expertise. We do not invent author biographies, credentials, reviewer endorsements, or customer results.</p>')}${section('Professional review status', '<p>Unless a page identifies a named reviewer and describes the work reviewed, do not assume independent professional review has taken place. Resources without such a credit should be treated as unreviewed educational material.</p><p>Future reviewer credits will identify the person’s relevant experience, the resource and revision reviewed, the date, and the limits of the review. Reviewing an article will not certify project-specific output.</p>')}${section('Evidence and examples', '<p>Guides distinguish general explanations from site-specific judgments. Sources support the claims beside them; links are not endorsements. Examples keep assumptions, unresolved information, units, and review requirements visible.</p><p>Prices and quantities in worked examples are teaching figures, not quotations or current market estimates. Local rules and project requirements need appropriately qualified assessment.</p>')}${section('Corrections and meaningful updates', `<p>Report a resource problem through ${contact(settings)}. Include the page or filename and the issue, but no client information. A substantive correction should update the visible revision date and related downloads together.</p><p>Dates represent actual editorial revisions, not automated freshness claims. A page will not acquire a reviewer credit or case-study label without supporting evidence.</p>`)}${section('How to use the library', `<p>Adapt each ${link('editable template', 'templates/')} to your own project and practice. Record its owner and revision, resolve missing information, and obtain the professional and client reviews appropriate to the task.</p><p>These resources are not legal contracts, engineering guidance, code-compliance determinations, or construction instructions.</p>`)}</div>`
      );
    case 'privacy':
      return (
        intro(
          'Privacy',
          'Your choices.<br><em>Clearly stated.</em>',
          'Public resources do not require an account or analytics consent. This notice also covers the hosted application at app.openlintel.com. Updated September 26, 2026.',
        ) +
        `<div class="wrap growth-prose">${section('Google sign-in and your account', '<p>The hosted application uses Google to verify your identity. With your consent, OpenLintel receives your Google account identifier, name, email address, email verification status, and profile image. It stores account and provider-link records, including authentication token metadata, to create your account and maintain access. Essential session cookies keep you signed in.</p><p>The sign-in integration requests only basic identity, email, and profile access. It does not request access to Gmail, Google Drive, contacts, or calendars. Google account data is used for sign-in and account identification, not advertising. <a href="https://policies.google.com/privacy">Google’s privacy policy</a> describes Google’s processing.</p>')}${section('Projects, uploads, and AI requests', '<p>When you use the hosted application, OpenLintel stores the project and room details, files, design requests, generated results, and collaboration content you provide or create. Application records are stored in the hosted database; uploaded files are stored in private Amazon S3 storage. Authorized project access and temporary signed file links are used to retrieve files.</p><p>Submitting an AI design or image-processing request sends the relevant prompt, room information, and any selected image or file content to the configured AI service. Core design requests use Amazon Bedrock. Vision features that require your OpenAI API key send the relevant request to OpenAI when invoked. Review the provider and content before submitting a request, and upload only information you are authorized to share. Self-hosting the software does not make a configured cloud AI request private or offline.</p><p>Application operators and hosting, network, storage, and AI providers process the data needed to operate these features. Operational logs may contain request information and errors. Billing is disabled for this release; the application does not request payment card details.</p>')}${section('Retention and account questions', `<p>Stored account and project information remains available until it is removed. Backups can retain earlier copies after data is removed from the active application. Signing out or removing OpenLintel from your Google account stops or limits future authentication access; it does not automatically delete previously stored project or account data.</p><p>For access, correction, deletion, or other privacy questions about the hosted application, contact ${contact(settings)}. We need to verify the account and scope of a request before changing records. Do not include passwords, API keys, confidential project files, or personal details in public repository issues.</p>`)}${section('This website and hosting', '<p>The marketing website at openlintel.com is a public static website, separate from the hosted application. Hosting and network providers may process ordinary connection information, such as IP addresses and requested files, to deliver it. The marketing website does not accept project uploads or provide private project workspaces.</p><p>Links to GitHub, Google, Formspree, or other external websites are governed by those services when you visit them.</p>')}${section('Pilot requests', settings.pilotEnabled ? `<p>The request form sends the name, email, studio, professional role, and workflow challenge you provide to Formspree. Website, country, timing, and how you found us are optional. Submission is independent of analytics consent.</p><p>The OpenLintel team reviews accepted requests, follows up manually, and maintains a restricted lead register. Submitting does not subscribe you to marketing. Do not include confidential client information or sensitive financial details.</p><p>If you accepted analytics, the request also includes limited first-known source evidence: channel category, recognized source category, landing-page identifier, date, and whether an organic search was observed later. Without consent this is recorded as unknown; an optional self-reported discovery answer stays separate.</p><p>We use request information for qualification, follow-up, and pilot decisions—not to publish your details. Contact ${contact(settings)} to ask about access, correction, retention, or deletion. The team must verify a request before changing or removing records.</p><p><a href="https://formspree.io/legal/privacy-policy/">Formspree’s privacy policy</a> describes its processing. A successfully sent request cannot be recalled by changing your browser’s analytics preference.</p>` : '<p>The pilot form is not enabled in this build, and this website does not currently transmit pilot requests to a form provider. No request account, email subscription, or project upload is created by browsing the site.</p>')}${section('Optional analytics', settings.analyticsEnabled ? '<p>Google Analytics is available only after you choose “Accept analytics.” Before that choice, or after rejection, this website does not load Google’s analytics tag or send Google measurement requests. There are no advertising integrations.</p><p>With consent, we measure page visits, initiated downloads, sample chapters, pilot invitations, form starts, accepted requests, and repository-link clicks. A download event means a click, not successful use of a file. Form answers and personal contact details are not sent to Google Analytics.</p><p>Measured page URLs come from our published page metadata, not your query string or fragment. Analytics receives limited page, event, and acquisition categories. Google may also process connection and device information under its own policies.</p><p>The Google tag may store first-party analytics cookies. We retain consented first-known attribution in this browser for up to 90 days and your analytics preference for 180 days. The attribution is not a record of everything you browse.</p><p>Reject or withdraw using “Analytics preferences” in the footer. Withdrawal stops subsequent collection, removes this site’s Google tag and analytics cookies, and clears its local attribution, including in other open tabs when storage events are available. It does not delete information already submitted to a provider.</p><p><a href="https://policies.google.com/privacy">Google’s privacy policy</a> provides more information. Browser blocking or unavailable storage may limit measurement; you can still use the resources and form.</p><button type="button" class="button light" data-analytics-preferences>Analytics preferences</button>' : '<p>Google Analytics is not enabled in this build. This website does not load Google’s measurement tag, send analytics events, or create marketing-attribution records. Resources and sample chapters remain available without tracking.</p>')}${section('Contact', `<p>For private website or privacy questions, contact ${contact(settings)}. Do not send project documents unless a separate, appropriate handling arrangement has been agreed. Do not post privacy requests or personal details to public repository issues.</p>`)}</div>`
      );
    case 'pilot-thanks':
      return (
        intro(
          'After a request',
          'A conversation,<br><em>not a commitment.</em>',
          'If Formspree confirmed that your request was accepted, it is ready for the team’s review. Visiting this page alone does not submit a request or confirm a booking.',
        ) +
        `<div class="wrap growth-prose">${section('What happens next', settings.pilotEnabled ? `<p>The team aims to respond within one business day. Relevant requests may lead to an invitation to arrange a discovery conversation; pilot scope and availability are agreed separately.</p><p>If you are unsure whether the form succeeded, check the result shown after submission before sending again. For help, contact ${contact(settings)}.</p>` : '<p>Pilot intake is not currently enabled. This page does not indicate that a submission has been received.</p>')}${section('While you explore', `<p>Use the ${link('resource library', 'resources/')} and ${link('editable templates', 'templates/')} without signing up. The ${link('sample project', 'sample-project/')} shows an illustrative connected workflow, not verified application output.</p>`)}</div>`
      );
    default:
      throw new Error(`Unknown growth page: ${record.id}`);
  }
}

export function renderGrowthFooterLinks() {
  return `<div class="growth-footer-links"><a href="${url('pilot/')}">${pilotCtaLabel()}</a><a href="${url('product-status/')}">Product status</a><a href="${url('about/')}">About</a><a href="${url('editorial-policy/')}">Editorial policy</a><a href="${url('privacy/')}">Privacy</a>${growthConfig.analyticsEnabled ? '<button type="button" data-analytics-preferences hidden>Analytics preferences</button>' : ''}</div>`;
}
export function renderGrowthChrome(record, settings = growthConfig) {
  const publicConfig = {
    ...settings,
    basePath: config.base,
    pageId: (record.id || 'home').replace(/\/+$/, '').replaceAll('/', '-'),
    pagePath: url(record.path),
    canonical: absolute(record.path),
    pageTitle: record.title,
    repository: config.repo,
  };
  return `<script type="application/json" id="growth-config">${JSON.stringify(publicConfig).replaceAll('<', '\\u003c')}</script>${settings.analyticsEnabled ? `<section class="analytics-preferences" id="analytics-preferences" aria-labelledby="analytics-heading" hidden tabindex="-1"><div><h2 id="analytics-heading">Optional analytics</h2><p>Help us understand which resources are useful. Downloads and requests work either way. ${link('Privacy details', 'privacy/')}</p><p class="growth-hint" data-consent-status></p></div><div class="analytics-actions"><button type="button" class="button light" data-consent="rejected">Reject analytics</button><button type="button" class="button light" data-consent="accepted">Accept analytics</button><button type="button" class="analytics-close" data-close-preferences hidden>Keep current choice</button></div></section>` : ''}`;
}
