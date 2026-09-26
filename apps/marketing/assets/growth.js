// Public marketing integrations: no tag, attribution, or pre-consent event queue.
const settingsElement = document.getElementById('growth-config');
const settings = settingsElement ? JSON.parse(settingsElement.textContent) : {};
const CONSENT_KEY = 'openlintel.analytics-consent.v1';
const ATTRIBUTION_KEY = 'openlintel.acquisition.v1';
const DAY = 86400000;
const panel = document.getElementById('analytics-preferences');
const preferenceButtons = [...document.querySelectorAll('[data-analytics-preferences]')];
const safeId = (value) => (/^[a-z0-9][a-z0-9-]{0,99}$/.test(value || '') ? value : undefined);
const analyticsEnabled =
  settings.analyticsEnabled === true && /^G-[A-Z0-9]{6,16}$/.test(settings.measurementId || '');
let consent;
let analyticsFrame;
let consentExpiryTimer;
let previousFocus;
let attribution;
let currentChapter;
let pageMeasured = false;
let formStarted = false;
const storage = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* No storage: memory-only choice. */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* Storage may be unavailable. */
    }
  },
};
function validConsent(value) {
  return ['accepted', 'rejected'].includes(value?.choice) &&
    Number.isFinite(value.expires) &&
    value.expires > Date.now() &&
    value.expires <= Date.now() + 181 * DAY
    ? value
    : null;
}
function acquisition() {
  // Only categorized values survive. No query value, referrer URL, client detail, or search term is retained.
  const medium = new URL(location.href).searchParams.get('utm_medium')?.toLowerCase();
  if (['cpc', 'ppc', 'paidsearch', 'paid-search'].includes(medium))
    return { channel: 'paid-search', provider: 'campaign' };
  if (['paid-social', 'paidsocial'].includes(medium))
    return { channel: 'paid-social', provider: 'campaign' };
  if (medium === 'email') return { channel: 'email', provider: 'campaign' };
  if (medium === 'social') return { channel: 'social', provider: 'campaign' };
  let hostname = '';
  try {
    hostname = new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    /* No referrer. */
  }
  if (!hostname || hostname === location.hostname.replace(/^www\./, ''))
    return { channel: 'direct', provider: 'none' };
  if (
    [
      'google.com',
      'google.co.uk',
      'google.ca',
      'google.com.au',
      'google.co.in',
      'google.de',
      'google.fr',
      'google.co.jp',
    ].includes(hostname)
  )
    return { channel: 'organic-search', provider: 'google' };
  if (['bing.com', 'duckduckgo.com', 'search.yahoo.com', 'search.brave.com'].includes(hostname))
    return {
      channel: 'organic-search',
      provider:
        hostname === 'bing.com'
          ? 'bing'
          : hostname === 'duckduckgo.com'
            ? 'duckduckgo'
            : hostname === 'search.yahoo.com'
              ? 'yahoo'
              : 'brave',
    };
  if (
    [
      'chatgpt.com',
      'perplexity.ai',
      'claude.ai',
      'gemini.google.com',
      'copilot.microsoft.com',
    ].includes(hostname)
  )
    return { channel: 'ai-referral', provider: 'ai-assistant' };
  return { channel: 'referral', provider: 'other' };
}
const channels = [
  'paid-search',
  'paid-social',
  'email',
  'social',
  'direct',
  'organic-search',
  'ai-referral',
  'referral',
];
const providers = [
  'campaign',
  'none',
  'google',
  'bing',
  'duckduckgo',
  'yahoo',
  'brave',
  'ai-assistant',
  'other',
];
function validAttribution(value) {
  if (
    !value ||
    !Number.isFinite(value.at) ||
    value.at > Date.now() ||
    Date.now() - value.at >= 90 * DAY ||
    !channels.includes(value.channel) ||
    !providers.includes(value.provider) ||
    !safeId(value.landingPage)
  )
    return null;
  return {
    at: value.at,
    channel: value.channel,
    provider: value.provider,
    landingPage: value.landingPage,
    organicAssisted: value.organicAssisted === true,
  };
}
function rememberAttribution() {
  if (consent?.choice !== 'accepted') return;
  const current = acquisition();
  attribution = validAttribution(storage.get(ATTRIBUTION_KEY)) || {
    ...current,
    at: Date.now(),
    landingPage: safeId(settings.pageId) || 'unknown',
    organicAssisted: false,
  };
  if (current.channel === 'organic-search' && attribution.channel !== 'organic-search')
    attribution.organicAssisted = true;
  storage.set(ATTRIBUTION_KEY, attribution);
}
function clearCookies() {
  // Delete this site's GA cookies across host/domain/path variants. Do not touch application cookies.
  const domains = [
    '',
    ...location.hostname
      .split('.')
      .map((_, i, parts) => parts.slice(i).join('.'))
      .filter((host) => host.includes('.')),
  ];
  const paths = [
    '/',
    ...location.pathname.split('/').map((_, i, parts) => `${parts.slice(0, i + 1).join('/')}/`),
  ];
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.trim().split('=')[0];
    if (!/^olmarketing_/.test(name)) continue;
    for (const domain of domains)
      for (const path of paths)
        document.cookie = `${name}=; Max-Age=0; path=${path};${domain ? ` domain=${domain};` : ''} SameSite=Lax`;
  }
}
function stopAnalytics() {
  if (analyticsFrame?.contentWindow) {
    const frameWindow = analyticsFrame.contentWindow;
    frameWindow[`ga-disable-${settings.measurementId}`] = true;
    if (frameWindow.dataLayer) frameWindow.dataLayer.length = 0;
  }
  // Destroy the tag's whole browsing context, including timers/listeners, rather than just its script node.
  analyticsFrame?.remove();
  analyticsFrame = undefined;
  attribution = undefined;
  storage.remove(ATTRIBUTION_KEY);
  clearCookies();
  pageMeasured = false;
  currentChapter = undefined;
  formStarted = false;
}
function startAnalytics() {
  if (!analyticsEnabled || consent?.choice !== 'accepted' || analyticsFrame) return;
  rememberAttribution();
  analyticsFrame = document.createElement('iframe');
  analyticsFrame.hidden = true;
  analyticsFrame.title = 'Optional analytics';
  analyticsFrame.setAttribute('aria-hidden', 'true');
  analyticsFrame.tabIndex = -1;
  analyticsFrame.dataset.analyticsFrame = '';
  analyticsFrame.referrerPolicy = 'no-referrer';
  document.body.append(analyticsFrame);
  const frameWindow = analyticsFrame.contentWindow;
  const frameDocument = analyticsFrame.contentDocument;
  const referrerMeta = frameDocument.createElement('meta');
  referrerMeta.name = 'referrer';
  referrerMeta.content = 'no-referrer';
  frameDocument.head.append(referrerMeta);
  frameWindow.dataLayer = [];
  frameWindow.gtag = function () {
    frameWindow.dataLayer.push(arguments);
  };
  frameWindow.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  frameWindow.gtag('js', new Date());
  const current = acquisition();
  const campaign = {
    'organic-search': [current.provider, 'organic'],
    'paid-search': ['campaign', 'cpc'],
    'paid-social': ['campaign', 'paid-social'],
    email: ['campaign', 'email'],
    social: ['campaign', 'social'],
    'ai-referral': ['ai-assistant', 'referral'],
    referral: ['other', 'referral'],
    direct: ['(direct)', '(none)'],
  }[current.channel];
  frameWindow.gtag('config', settings.measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    campaign_source: campaign[0],
    campaign_medium: campaign[1],
    page_location: settings.canonical,
    page_referrer: '',
    page_title: settings.pageTitle,
    cookie_prefix: 'olmarketing',
    cookie_domain: location.hostname,
    cookie_path: settings.basePath,
    cookie_expires: 90 * 86400,
    cookie_flags: 'SameSite=Lax;Secure',
    ignore_referrer: true,
    // Enhanced measurement MUST ALSO be disabled in the verified GA4 stream before release.
  });
  const script = frameDocument.createElement('script');
  script.async = true;
  script.referrerPolicy = 'no-referrer';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${settings.measurementId}`;
  frameDocument.head.append(script);
  measurePage();
}
const allowedParams = {
  page_view: ['page_id'],
  resource_download: ['page_id', 'resource_id', 'resource_format', 'resource_variant'],
  sample_project_start: ['page_id'],
  sample_chapter_view: ['page_id', 'chapter_id'],
  pilot_cta_click: ['page_id', 'source_page_id'],
  pilot_form_start: ['page_id'],
  generate_lead: ['page_id', 'method'],
  repository_click: ['page_id', 'destination'],
};
function measure(name, params = {}) {
  if (
    !analyticsEnabled ||
    consent?.choice !== 'accepted' ||
    !analyticsFrame ||
    !allowedParams[name]
  )
    return;
  if (consent.expires <= Date.now()) {
    applyConsent(null);
    return;
  }
  const safe = {
    page_location: settings.canonical,
    page_referrer: '',
    page_title: settings.pageTitle,
    send_to: settings.measurementId,
  };
  for (const [key, value] of Object.entries({ page_id: settings.pageId, ...params }))
    if (allowedParams[name].includes(key) && safeId(value)) safe[key] = value;
  attribution = validAttribution(attribution) || undefined;
  if (!attribution) storage.remove(ATTRIBUTION_KEY);
  if (attribution) {
    safe.acquisition_channel = attribution.channel;
    safe.acquisition_provider = attribution.provider;
  }
  analyticsFrame.contentWindow.gtag('event', name, safe);
}
function measureChapter() {
  if (settings.pageId !== 'sample-project') return;
  const hash = location.hash.slice(1);
  const chapter = ['brief', 'design', 'drawings', 'materials', 'handoff'].includes(hash)
    ? hash
    : 'brief';
  if (chapter !== currentChapter && consent?.choice === 'accepted') {
    currentChapter = chapter;
    measure('sample_chapter_view', { chapter_id: chapter });
  }
}
function measurePage() {
  if (pageMeasured) return;
  pageMeasured = true;
  measure('page_view');
  if (settings.pageId === 'sample-project') {
    measure('sample_project_start');
    measureChapter();
  }
}
function updatePreferenceUI() {
  if (!panel) return;
  panel.querySelector('[data-consent-status]').textContent = consent
    ? `Current choice: analytics ${consent.choice === 'accepted' ? 'accepted' : 'rejected'}.`
    : 'No analytics choice has been saved.';
  panel.querySelector('[data-close-preferences]').hidden = !consent;
  for (const button of preferenceButtons) button.hidden = false;
}
function applyConsent(value) {
  consent = validConsent(value);
  clearTimeout(consentExpiryTimer);
  if (consent?.choice === 'accepted') startAnalytics();
  else stopAnalytics();
  if (consent) {
    // setTimeout is limited to 2^31−1 ms; periodically recheck long-lived tabs.
    consentExpiryTimer = setTimeout(
      () => applyConsent(validConsent(storage.get(CONSENT_KEY))),
      Math.min(consent.expires - Date.now(), 2147483647),
    );
  }
  if (panel) panel.hidden = Boolean(consent);
  updatePreferenceUI();
}
if (analyticsEnabled) {
  applyConsent(validConsent(storage.get(CONSENT_KEY)));
  for (const button of preferenceButtons)
    button.addEventListener('click', () => {
      previousFocus = button;
      panel.hidden = false;
      panel.focus();
    });
  panel?.querySelectorAll('[data-consent]').forEach((button) =>
    button.addEventListener('click', () => {
      const value = { choice: button.dataset.consent, expires: Date.now() + 180 * DAY };
      storage.set(CONSENT_KEY, value);
      applyConsent(value);
      previousFocus?.focus();
    }),
  );
  panel?.querySelector('[data-close-preferences]')?.addEventListener('click', () => {
    panel.hidden = true;
    previousFocus?.focus();
  });
  window.addEventListener('storage', (event) => {
    if (event.key === CONSENT_KEY || event.key === null)
      applyConsent(validConsent(storage.get(CONSENT_KEY)));
  });
  window.addEventListener('pageshow', () => applyConsent(validConsent(storage.get(CONSENT_KEY))));
} else {
  // A release disabled after a previous visit must not leave an attribution record behind.
  stopAnalytics();
}
window.addEventListener('hashchange', measureChapter);

document.addEventListener('click', (event) => {
  const anchor = event.target.closest('a[href]');
  if (!anchor) return;
  const target = new URL(anchor.href, location.href);
  if (anchor.hasAttribute('data-resource-id')) {
    measure('resource_download', {
      resource_id: anchor.dataset.resourceId,
      resource_format: anchor.dataset.resourceFormat?.toLowerCase(),
      resource_variant: anchor.dataset.resourceVariant,
    });
  } else if (
    target.origin === location.origin &&
    target.pathname.startsWith(`${settings.basePath}assets/downloads/`)
  ) {
    const filename = target.pathname.split('/').pop();
    const [id, format] = filename.split('.');
    measure('resource_download', {
      resource_id: id,
      resource_format: format,
      resource_variant: 'sample',
    });
  }
  if (
    settings.pilotEnabled &&
    target.origin === location.origin &&
    target.pathname === `${settings.basePath}pilot/`
  )
    measure('pilot_cta_click', {
      source_page_id: safeId(anchor.dataset.sourcePageId) || settings.pageId,
    });
  if (target.href === settings.repository || target.href.startsWith(`${settings.repository}/`))
    measure('repository_click', {
      destination: target.pathname.includes('/docs/')
        ? 'documentation'
        : target.pathname.includes('/issues')
          ? 'issues'
          : 'repository',
    });
});

const form = document.querySelector('[data-pilot-form]');
if (
  form &&
  settings.pilotEnabled &&
  /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]{8,32}$/.test(settings.formEndpoint || '') &&
  form.action === settings.formEndpoint
) {
  const submit = form.querySelector('[type=submit]');
  const status = form.querySelector('.growth-form-status');
  const success = document.querySelector('[data-pilot-success]');
  const fields = [
    ...form.querySelectorAll('input:not([type=hidden]):not([name="_gotcha"]),select,textarea'),
  ];
  let inFlight = false;
  let completed = false;
  const showFieldError = (field, text) => {
    const error = document.getElementById(`${field.id}-error`);
    if (error) error.textContent = text;
    field.setAttribute('aria-invalid', text ? 'true' : 'false');
  };
  const validate = (field) => {
    const emptyRequired = field.required && !field.value.trim();
    const text = emptyRequired
      ? 'Please complete this field.'
      : !field.validity.valid
        ? field.validationMessage
        : '';
    showFieldError(field, text);
    return !text;
  };
  form.noValidate = true;
  for (const field of fields) {
    field.addEventListener('blur', () => validate(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validate(field);
    });
  }
  form.addEventListener('focusin', (event) => {
    if (fields.includes(event.target) && !formStarted && consent?.choice === 'accepted') {
      formStarted = true;
      measure('pilot_form_start');
    }
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (inFlight || completed) return;
    const invalid = fields.filter((field) => !validate(field));
    if (invalid.length) {
      status.textContent = 'Check the highlighted fields. Your request has not been sent.';
      invalid[0].focus();
      return;
    }
    if (consent && !validConsent(consent)) applyConsent(null);
    // Keep provider honeypot handling authoritative; do not show fabricated success for spam.
    const data = new FormData(form);
    if (consent?.choice === 'accepted' && attribution) {
      const known = validAttribution(attribution);
      if (known)
        data.set(
          'source_evidence',
          JSON.stringify({
            channel: known.channel,
            provider: known.provider,
            landing_page: known.landingPage,
            first_known_date: new Date(known.at).toISOString().slice(0, 10),
            organic_assisted: known.organicAssisted,
          }),
        );
    } else data.set('source_evidence', 'unknown');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    inFlight = true;
    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Sending your request…';
    try {
      const response = await fetch(settings.formEndpoint, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      // Formspree's documented client accepts { next: string }; older endpoints may return { ok: true }.
      // Do not navigate the provider's untrusted next URL or mistake an explicit error for acceptance.
      const accepted =
        response.ok &&
        body?.ok !== false &&
        !body?.errors &&
        !body?.error &&
        (body?.ok === true || (typeof body?.next === 'string' && body.next.trim().length > 0));
      if (!accepted) {
        for (const error of Array.isArray(body?.errors) ? body.errors : []) {
          const field = fields.find((candidate) => candidate.name === error.field);
          if (field)
            showFieldError(field, 'Please check this value. The form service did not accept it.');
        }
        throw new Error(response.status === 429 ? 'rate-limit' : 'not-accepted');
      }
      completed = true;
      measure('generate_lead', { method: 'formspree' });
      form.hidden = true;
      success.hidden = false;
      success.focus();
      form.reset();
    } catch (error) {
      status.textContent =
        error.name === 'AbortError'
          ? 'We could not confirm the result in time. Your details are still here. Check for a confirmation before retrying to avoid a duplicate request.'
          : error.message === 'rate-limit'
            ? 'Too many attempts. Please wait before trying again. Your details are still here.'
            : 'We could not confirm acceptance. Your details are still here. Check your connection and try again, or use the contact on our privacy page.';
      status.focus();
    } finally {
      clearTimeout(timeout);
      inFlight = false;
      submit.disabled = completed;
      form.removeAttribute('aria-busy');
    }
  });
}
