/** Already published contact; displaying it does not attest to integration readiness. */
export const publicContactEmail = 'rahul@quickintell.com';

/** Public build-time integration settings; never put credentials in these variables. */
export function loadGrowthConfig(env = process.env) {
  const flag = (key) => {
    const value = env[key];
    if (value !== undefined && value !== '' && value !== '0' && value !== '1')
      throw new Error(`${key} must be 0 or 1.`);
    return value === '1';
  };
  const pilotEnabled = flag('MARKETING_PILOT_ENABLED');
  const analyticsEnabled = flag('MARKETING_ANALYTICS_ENABLED');
  const privacyReviewed = flag('MARKETING_PRIVACY_REVIEWED');
  const operationsReady = flag('MARKETING_OPERATIONS_READY');
  const formVerified = flag('MARKETING_FORMSPREE_VERIFIED');
  const analyticsVerified = flag('MARKETING_GA4_VERIFIED');
  const formId = (env.MARKETING_FORMSPREE_ID || '').trim();
  const measurementId = (env.MARKETING_GA4_ID || '').trim();
  const contactEmail = (env.MARKETING_CONTACT_EMAIL || '').trim();
  if (formId && !/^[a-zA-Z0-9]{8,32}$/.test(formId))
    throw new Error(
      'MARKETING_FORMSPREE_ID must be a public Formspree form ID, not a URL or secret.',
    );
  if (measurementId && !/^G-[A-Z0-9]{6,16}$/.test(measurementId))
    throw new Error('MARKETING_GA4_ID must be a GA4 measurement ID (G-...), not a property ID.');
  if (
    contactEmail &&
    (!/^[^\s@<>"'&]+@[^\s@<>"'&]+\.[a-zA-Z]{2,}$/.test(contactEmail) || contactEmail.length > 254)
  )
    throw new Error('MARKETING_CONTACT_EMAIL must be a valid public contact email.');
  if (
    pilotEnabled &&
    !(formId && formVerified && contactEmail && privacyReviewed && operationsReady)
  )
    throw new Error(
      'Pilot release requires MARKETING_FORMSPREE_ID, MARKETING_FORMSPREE_VERIFIED=1, MARKETING_CONTACT_EMAIL, MARKETING_PRIVACY_REVIEWED=1 and MARKETING_OPERATIONS_READY=1.',
    );
  if (analyticsEnabled && !(measurementId && analyticsVerified && privacyReviewed && contactEmail))
    throw new Error(
      'Analytics release requires MARKETING_GA4_ID, MARKETING_GA4_VERIFIED=1, MARKETING_CONTACT_EMAIL and MARKETING_PRIVACY_REVIEWED=1.',
    );
  return Object.freeze({
    pilotEnabled,
    analyticsEnabled,
    contactEmail,
    displayContactEmail: contactEmail || publicContactEmail,
    // Omit unverified integration identifiers entirely from generated pages.
    formEndpoint: pilotEnabled ? `https://formspree.io/f/${formId}` : '',
    measurementId: analyticsEnabled ? measurementId : '',
  });
}
export const growthConfig = loadGrowthConfig();

export const pilotCtaLabel = (settings = growthConfig) =>
  settings.pilotEnabled ? 'Request a discovery conversation' : 'Check discovery availability';
