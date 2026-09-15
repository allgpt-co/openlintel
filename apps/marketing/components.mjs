import { config, url, absolute, esc } from './config.mjs';
import { renderGrowthChrome, renderGrowthFooterLinks } from './growth-pages.mjs';
export const arrow = '<span aria-hidden="true">↗</span>';
export const mark =
  '<svg class="brand-mark" viewBox="0 0 34 34" fill="none" aria-hidden="true"><path d="M5 29V8h24v21M1 5h32M11 29V14h12v15" stroke="currentColor" stroke-width="1.6"/></svg>';
export const button = (text, href, kind = '') =>
  `<a class="button ${esc(kind)}" href="${esc(url(href))}">${esc(text)}${arrow}</a>`;
export const textLink = (text, href) =>
  `<a class="text-link" href="${esc(url(href))}">${esc(text)}${arrow}</a>`;
export const eyebrow = (text, number = '') =>
  `<p class="eyebrow">${number ? `<span>${number}</span>` : ''}${text}</p>`;
export function picture(
  name,
  alt,
  { hero = false, sizes = '(max-width: 700px) 100vw, 65vw', cls = '' } = {},
) {
  return `<img class="photo ${cls}" src="${url(`assets/images/${name}-960.webp`)}" srcset="${[480, 960, 1536].map((size) => `${url(`assets/images/${name}-${size}.webp`)} ${size}w`).join(', ')}" sizes="${sizes}" width="1536" height="1024" alt="${esc(alt)}" ${hero ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'} decoding="async">`;
}
export function caption(left, right = 'AI-generated concept illustration') {
  return `<figcaption><span>${left}</span><span>${right}</span></figcaption>`;
}
export function cta() {
  return `<section class="closing wrap"><div>${eyebrow('An invitation to look closer')}<h2>See how the details<br>come <em>together.</em></h2></div><div class="closing-action"><p>A room. Five chapters.<br>A clearer picture of the work.</p>${button('Explore a sample project', 'sample-project/')}<span class="micro">Illustrative project · No sign-up needed</span></div></section>`;
}
export function pageIntro(kicker, title, description, extra = '') {
  return `<header class="page-intro wrap">${eyebrow(kicker)}<h1>${title}</h1><div class="intro-bottom"><p class="lede">${description}</p>${extra}</div></header>`;
}
export function materialTable(project) {
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="Sample material schedule, scroll horizontally on small screens"><table><caption>${esc(project.name)} · Quiet Oak · Sample material schedule</caption><thead><tr><th scope="col">Reference / selection</th><th scope="col">Application</th><th scope="col">Sample quantity</th><th scope="col">Review note</th></tr></thead><tbody>${project.materials.map((m) => `<tr><th scope="row"><span class="material-ref"><i style="--swatch:${m.color}" aria-hidden="true"></i><span><small>${m.id}</small>${m.name}</span></span></th><td>${m.application}</td><td>${m.quantity ?? 'To survey'}${m.quantity !== null ? ` ${m.unit}` : ''}</td><td>${m.note}</td></tr>`).join('')}</tbody></table></div>`;
}
export function shell(page, content) {
  const active = (path) => (page.path === path ? ' aria-current="page"' : '');
  const organizationId = absolute('#organization');
  const websiteId = absolute('#website');
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': websiteId,
      name: 'OpenLintel',
      url: absolute(),
      publisher: { '@id': organizationId },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': organizationId,
      name: 'OpenLintel',
      url: absolute(),
      sameAs: [config.repo],
      publishingPrinciples: absolute('editorial-policy/'),
    },
  ];
  const isResource = ['hub', 'guide', 'template'].includes(page.kind);
  if (isResource) {
    const parent = page.kind === 'template' ? 'templates/' : 'resources/';
    const crumbs = [{ name: 'Home', item: absolute() }];
    if (page.kind !== 'hub')
      crumbs.push({
        name: page.kind === 'template' ? 'Templates' : 'Resources',
        item: absolute(parent),
      });
    crumbs.push({
      name:
        page.kind === 'hub' ? (page.id === 'templates' ? 'Templates' : 'Resources') : page.title,
      item: absolute(page.path),
    });
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        ...item,
      })),
    });
    schema.push({
      '@context': 'https://schema.org',
      '@type':
        page.kind === 'guide' ? 'Article' : page.kind === 'hub' ? 'CollectionPage' : 'WebPage',
      name: page.title,
      headline: page.title,
      description: page.description,
      '@id': absolute(page.path) + '#webpage',
      url: absolute(page.path),
      dateModified: page.modified,
      datePublished: page.published,
      isPartOf: { '@id': websiteId },
      image: absolute('assets/images/materials-1536.webp'),
      inLanguage: 'en',
      ...(page.kind === 'guide'
        ? {
            author: {
              '@type': 'Organization',
              '@id': organizationId,
              name: 'OpenLintel',
              url: absolute('about/'),
            },
            publisher: { '@id': organizationId },
            mainEntityOfPage: absolute(page.path),
          }
        : {}),
    });
  }
  const socialImage = isResource ? 'materials' : 'room';
  const socialAlt = isResource
    ? 'AI-generated illustrative material palette for the OpenLintel resource library'
    : 'The Window Room, an illustrative OpenLintel interior concept';
  const robots =
    !config.indexable || !page.indexable ? '<meta name="robots" content="noindex,follow">' : '';
  return `<!DOCTYPE html>
<html lang="en"><head><script>document.documentElement.classList.add('js')</script><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${robots}<meta name="theme-color" content="#f5f1e9"><title>${esc(page.title)} — OpenLintel</title><meta name="description" content="${esc(page.description)}"><link rel="canonical" href="${esc(absolute(page.path))}"><meta property="og:type" content="${page.kind === 'guide' ? 'article' : 'website'}"><meta property="og:site_name" content="OpenLintel"><meta property="og:title" content="${esc(page.title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:url" content="${esc(absolute(page.path))}"><meta property="og:image" content="${esc(absolute(`assets/images/${socialImage}-1536.webp`))}"><meta property="og:image:alt" content="${esc(socialAlt)}"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="${url('assets/favicon.svg')}" type="image/svg+xml"><link rel="preload" href="${url('assets/fonts/cormorant-400.woff2')}" as="font" type="font/woff2" crossorigin><link rel="preload" href="${url('assets/fonts/manrope-400.woff2')}" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="${url('assets/site.css')}"><script type="module" src="${url('assets/site.js')}"></script><link rel="stylesheet" href="${url('assets/growth.css')}"><script type="module" src="${url('assets/growth.js')}"></script><script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script></head>
<body class="${page.path ? 'inner-page' : 'home'}"><a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><div class="nav-wrap"><a class="brand" href="${url()}" aria-label="OpenLintel home">${mark}<span>OpenLintel<span class="brand-dot">.</span></span></a><button class="menu-toggle" aria-expanded="false" aria-controls="main-nav"><span>Menu</span><svg width="20" height="16" viewBox="0 0 20 16" aria-hidden="true"><path d="M0 3h20M0 12h20" stroke="currentColor"/></svg></button><nav id="main-nav" aria-label="Main navigation"><a href="${url('how-it-works/')}"${active('how-it-works/')}>How it works</a><details class="nav-disclosure"><summary>For professionals <span aria-hidden="true">⌄</span></summary><div class="nav-dropdown"><a href="${url('for-design-studios/')}"${active('for-design-studios/')}>Interior design studios</a><a href="${url('for-architects/')}"${active('for-architects/')}>Residential architects</a></div></details><a href="${url('open-source/')}"${active('open-source/')}>Open source</a><a href="${url('resources/')}"${active('resources/')}>Resources</a>${button('Explore a sample project', 'sample-project/', 'nav-cta')}</nav></div></header>
<main id="main">${content}</main>
<footer class="site-footer"><div class="wrap footer-top"><div><a class="brand" href="${url()}">${mark}<span>OpenLintel<span class="brand-dot">.</span></span></a><p>Your vision. In every detail.</p></div><div><p class="eyebrow">Explore</p><a href="${url('how-it-works/')}">How it works</a><a href="${url('sample-project/')}">The Window Room</a><a href="${url('resources/')}">Resource library</a><a href="${url('templates/')}">Editable templates</a></div><div><p class="eyebrow">For professionals</p><a href="${url('for-design-studios/')}">Design studios</a><a href="${url('for-architects/')}">Residential architects</a></div><div><p class="eyebrow">Open by design</p><a href="${url('open-source/')}">The open-source project</a><a href="${config.repo}">GitHub ↗</a><a href="${config.repo}/blob/main/docs/development.md">Development guide ↗</a></div></div><nav class="wrap" aria-label="Project and privacy">${renderGrowthFooterLinks()}</nav><div class="wrap footer-bottom"><span>© ${new Date().getUTCFullYear()} OpenLintel</span><span>Thoughtfully connected. Openly built.</span><a href="${config.repo}/blob/main/LICENSE">AGPL-3.0 license ↗</a></div></footer>
${renderGrowthChrome(page)}</body></html>`;
}
