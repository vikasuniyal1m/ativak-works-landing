// Ativak Works — public site config.
// Safe to expose publicly: this is a static site with no server, so there is
// no env-var injection step. Anything here is visible in page source — never
// put a secret/API key in this file, only public webhook URLs and IDs.
//
// LEAD_WEBHOOK_URL: where the qualifying lead form (index.html "Get Free
// Blueprint" form, and get-quote.html) POSTs each submission as JSON. Works
// with a Google Apps Script web app "exec" URL, Make.com webhook, Zapier
// "Catch Hook" URL, or any endpoint that accepts a POST with a JSON body.
// Currently pointed at the existing Google Apps Script -> Google Sheet
// endpoint that was already logging leads, so nothing breaks — swap this
// value for a different webhook/CRM endpoint whenever needed, no code edits.
window.ATIVAK_CONFIG = {
    LEAD_WEBHOOK_URL: 'https://script.google.com/macros/s/AKfycbw4lc2MA6dCsZkg6C6LxxPIifEM9dBfe1Bry-7Ee6vBouVKFY0glUvoUF3HAjziRywVFw/exec',

    // Meta Pixel ID — relocated here from the hardcoded literal that used to
    // live inline in each page's Pixel init script. This is the pixel's
    // PUBLIC id (safe to expose; it's visible in every pixel network request
    // anyway) — not a secret. The matching META_CAPI_TOKEN secret for the
    // server-side Conversions API lives only in Vercel's env vars, never here.
    META_PIXEL_ID: '1904427194297712',

    // GA4 Measurement ID — no real property exists yet, so this is left
    // empty on purpose. Every GA4 loader/call in the site is guarded on this
    // being non-empty, so leaving it blank is safe and GA4 simply never
    // loads until a real ID is added here.
    // [ADD REAL: GA4 Measurement ID]
    GA4_ID: ''
};
