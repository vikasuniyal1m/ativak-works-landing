// Ativak Works — shared helpers used by both index.html's lead form and
// get-quote.html's lead form, so the UTM-capture and webhook-submit logic
// lives in exactly one place.

// Reads utm_source / utm_campaign / utm_content from the current page URL.
// Returns empty strings (never undefined) when a param is absent, so callers
// can drop these straight into a payload object or a hidden input's value.
function getUtmParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        utm_source: params.get('utm_source') || '',
        utm_campaign: params.get('utm_campaign') || '',
        utm_content: params.get('utm_content') || ''
    };
}

// Fills any hidden utm_source/utm_campaign/utm_content inputs inside the
// given form with the current page's UTM params, so they travel with the
// form submission even though FormData is read at submit time anyway — this
// also keeps the fields visible/inspectable in the DOM for debugging.
function fillUtmHiddenFields(form) {
    const utm = getUtmParams();
    ['utm_source', 'utm_campaign', 'utm_content'].forEach((key) => {
        const field = form.querySelector(`input[name="${key}"]`);
        if (field) field.value = utm[key];
    });
}

// Country-code -> budget-range option list for the qualifying lead form.
// +91 (India) gets INR bands; every other country code gets USD bands.
const ATIVAK_BUDGET_RANGES = {
    '+91': [
        { value: 'under_50k_inr', label: 'Under ₹50k' },
        { value: '50k_2l_inr', label: '₹50k – ₹2L' },
        { value: '2l_5l_inr', label: '₹2L – ₹5L' },
        { value: '5l_plus_inr', label: '₹5L+' }
    ],
    default: [
        { value: 'under_1k_usd', label: 'Under $1k' },
        { value: '1k_3k_usd', label: '$1k – $3k' },
        { value: '3k_8k_usd', label: '$3k – $8k' },
        { value: '8k_plus_usd', label: '$8k+' }
    ]
};

// Rebuilds a <select> of budget options for the given country code, trying
// to preserve the previously chosen option if it still exists in the new list.
function populateBudgetOptions(selectEl, countryCode) {
    if (!selectEl) return;
    const ranges = ATIVAK_BUDGET_RANGES[countryCode] || ATIVAK_BUDGET_RANGES.default;
    const previousValue = selectEl.value;
    selectEl.innerHTML = '<option value="">Select a range</option>' +
        ranges.map((r) => `<option value="${r.value}">${r.label}</option>`).join('');
    if (ranges.some((r) => r.value === previousValue)) selectEl.value = previousValue;
}

// Honeypot check: a hidden-by-CSS (not type="hidden") field real visitors
// never see or fill, but naive bots filling every input on the page will.
// Returns true when it looks like a bot — callers should silently no-op.
function isHoneypotTripped(form, fieldName) {
    const field = form.querySelector(`[name="${fieldName}"]`);
    return !!(field && field.value && field.value.trim() !== '');
}

// Fires on every WhatsApp CTA across the site (hero, floating button,
// footer, IT-support modal, thank-you page) — tags the click in Meta Pixel,
// GA4 (when configured) and Clarity, so each surface's WhatsApp intent is
// measurable without re-wiring click tracking in three different files.
function trackWhatsAppClick() {
    if (typeof fbq === 'function') fbq('track', 'Contact');
    if (typeof gtag === 'function' && window.ATIVAK_CONFIG && window.ATIVAK_CONFIG.GA4_ID) {
        gtag('event', 'contact', { method: 'whatsapp' });
    }
    if (typeof clarity === 'function') clarity('event', 'whatsapp_click');
}

// Generates a client-side event id to pair one Lead submission across the
// browser-side Meta Pixel call and the server-side Conversions API call, so
// Meta can de-duplicate the two into a single event instead of double
// counting. crypto.randomUUID() isn't available on some older browsers, so
// this falls back to a Math.random-based id in that case.
function generateLeadEventId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }
    return 'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

// Fires the Lead event into Meta Pixel + GA4 (client-side) for a successful
// form submit, using the real selected service/budget/timeline values, then
// fires the matching server-side Conversions API call (fire-and-forget: it
// never blocks the UI thank-you state and never fails the form on error).
// `eventId` must be the SAME id passed to fbq's eventID so Meta dedupes the
// browser + server events instead of counting the Lead twice.
function trackLeadConversion(eventId, { name, email, whatsapp, service, budget, startTime }) {
    if (typeof fbq === 'function') {
        fbq('track', 'Lead', { service, budget, start_time: startTime }, { eventID: eventId });
    }
    if (typeof gtag === 'function' && window.ATIVAK_CONFIG && window.ATIVAK_CONFIG.GA4_ID) {
        gtag('event', 'generate_lead', { service, budget });
    }
    if (typeof clarity === 'function') clarity('event', 'lead_submit');

    // Server-side Conversions API call — best-effort only. Hashing of email
    // and phone happens server-side in api/meta-capi.js (never send raw PII
    // hashing logic to the client); this just ships the raw values over
    // HTTPS to our own serverless function.
    try {
        fetch('/api/meta-capi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, whatsapp, service, budget, event_id: eventId })
        }).catch(() => {});
    } catch (err) { /* never let CAPI dispatch break the lead form */ }
}

// Submits a lead payload to window.ATIVAK_CONFIG.LEAD_WEBHOOK_URL. Resolves
// to { ok: true } on a 2xx response, or { ok: false } on a network error,
// non-2xx response, or an unset/empty webhook URL — callers use this to
// decide between the success state and the "email us directly" fallback.
async function submitLeadToWebhook(payload) {
    const url = (window.ATIVAK_CONFIG && window.ATIVAK_CONFIG.LEAD_WEBHOOK_URL) || '';
    if (!url) return { ok: false, reason: 'no_webhook_configured' };
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        // Apps Script web apps commonly respond 200 regardless; a opaque
        // no-cors-style response (status 0) is treated as success since we
        // can't inspect it, but any explicit non-2xx is a real failure.
        if (res.status && (res.status < 200 || res.status >= 300)) {
            return { ok: false, reason: 'bad_status' };
        }
        return { ok: true };
    } catch (err) {
        return { ok: false, reason: 'network_error' };
    }
}
