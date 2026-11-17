// Vercel serverless function (Node.js runtime, CommonJS — no package.json
// exists in this project, so no "type": "module" and no bundler step; this
// file is picked up automatically at /api/meta-capi by Vercel's zero-config
// file-system routing).
//
// Implements Meta's server-side Conversions API (CAPI) for the "Lead" event,
// as a companion to the client-side Meta Pixel fbq('track', 'Lead', ...)
// call fired in shared.js. Both calls share the same event_id so Meta
// deduplicates them into a single Lead instead of double-counting.
//
// Required environment variables (set in Vercel project settings — NEVER
// hardcode these, and never log them):
//   META_CAPI_TOKEN  — a Meta Conversions API access token (System User
//                      token from Events Manager > Settings > Conversions API).
//   META_PIXEL_ID    — the same Pixel ID used client-side
//                      (window.ATIVAK_CONFIG.META_PIXEL_ID in config.js).
//                      It is NOT a secret (it's public in every pixel
//                      request already), but it's also read from env here
//                      so this function has no build-time dependency on the
//                      static config.js file.
//
// Meta's spec requires em (email) and ph (phone) in user_data to be
// SHA-256 hashed: email lowercased + trimmed before hashing; phone
// normalized to digits-only (with country code, no leading +) before
// hashing.

const crypto = require('crypto');

function sha256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function hashEmail(email) {
    if (!email) return undefined;
    return sha256(email.trim().toLowerCase());
}

function hashPhone(phone) {
    if (!phone) return undefined;
    // Normalize to E.164-ish digits-only (strip +, spaces, dashes, parens).
    const digitsOnly = String(phone).replace(/[^\d]/g, '');
    if (!digitsOnly) return undefined;
    return sha256(digitsOnly);
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, error: 'method_not_allowed' });
        return;
    }

    try {
        const pixelId = process.env.META_PIXEL_ID;
        const token = process.env.META_CAPI_TOKEN;

        if (!pixelId || !token) {
            // Never throw a raw error that might include env values — just
            // report a generic config failure.
            res.status(500).json({ ok: false, error: 'capi_not_configured' });
            return;
        }

        const body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
        const { name, email, whatsapp, service, budget, event_id } = body || {};

        const forwardedFor = req.headers['x-forwarded-for'] || '';
        const clientIp = Array.isArray(forwardedFor)
            ? forwardedFor[0]
            : String(forwardedFor).split(',')[0].trim();
        const clientUserAgent = req.headers['user-agent'] || '';

        const userData = {};
        const emHash = hashEmail(email);
        const phHash = hashPhone(whatsapp);
        if (emHash) userData.em = [emHash];
        if (phHash) userData.ph = [phHash];
        if (clientIp) userData.client_ip_address = clientIp;
        if (clientUserAgent) userData.client_user_agent = clientUserAgent;

        const eventPayload = {
            data: [
                {
                    event_name: 'Lead',
                    event_time: Math.floor(Date.now() / 1000),
                    event_id: event_id || undefined,
                    action_source: 'website',
                    user_data: userData,
                    custom_data: {
                        service: service || undefined,
                        budget: budget || undefined
                    }
                }
            ]
        };

        const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`;

        const fbRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventPayload)
        });

        const fbJson = await fbRes.json().catch(() => ({}));

        if (!fbRes.ok) {
            // Report failure without leaking the access token (it only ever
            // appears in the outbound URL, never in this response).
            res.status(502).json({ ok: false, error: 'meta_capi_request_failed' });
            return;
        }

        res.status(200).json({ ok: true, events_received: fbJson.events_received || 0 });
    } catch (err) {
        // err could in theory stringify request internals — never forward
        // err.message or err.stack to the client, and never include name
        // referencing the token.
        res.status(500).json({ ok: false, error: 'internal_error' });
    }
};
