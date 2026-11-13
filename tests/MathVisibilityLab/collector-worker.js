// Temporary, test-only report receiver. No cookies, IP or headers stored.
// Submitted reports contain only DOM data of the public Math Visibility Lab.
export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';
        let allowed = false;
        try {
            const url = new URL(origin);
            const host = url.hostname.toLowerCase();
            allowed = url.protocol === 'https:' &&
                (host.endsWith('.vercel.app') || host === 'christorng.idv.tw' ||
                 host.endsWith('.christorng.idv.tw') || host.endsWith('.github.io'));
        } catch (_) {}
        const cors = allowed ? {
            'Access-Control-Allow-Origin': origin,
            'Vary': 'Origin',
            'Access-Control-Allow-Methods': 'POST,OPTIONS,GET',
            'Access-Control-Allow-Headers': 'Content-Type'
        } : {};
        const reply = (body, status = 200) => new Response(JSON.stringify(body), {
            status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
        });
        const path = new URL(request.url).pathname;
        if (request.method === 'GET' && path === '/health') return reply({ service: 'tm-math-translation-lab', ready: true });
        if (request.method === 'OPTIONS' && allowed) return new Response(null, { headers: cors });
        if (request.method !== 'POST' || path !== '/report') return reply({ error: 'not-found' }, 404);
        if (!allowed) return reply({ error: 'forbidden-origin' }, 403);
        const length = Number(request.headers.get('Content-Length') || 0);
        if (length > 350000) return reply({ error: 'too-large' }, 413);
        const raw = await request.text();
        if (raw.length > 350000) return reply({ error: 'too-large' }, 413);
        let entry;
        try { entry = JSON.parse(raw); } catch (_) { return reply({ error: 'invalid-json' }, 400); }
        if (entry.version !== 1 || !/^[a-f0-9-]{16,48}$/i.test(entry.session || '') ||
            !/^(baseline|output|source|paragraph|image)$/.test(entry.method || '') ||
            !['dom', 'image'].includes(entry.kind) || !entry.report || typeof entry.report !== 'object') {
            return reply({ error: 'invalid-schema' }, 400);
        }
        if (entry.kind === 'image' &&
            (!/^data:image\/png;base64,/.test(entry.report.png || '') || entry.report.png.length > 300000)) {
            return reply({ error: 'invalid-image' }, 400);
        }
        // Random suffix avoids overwriting events from the same timestamp.
        const key = ['lab', entry.session, Date.now(), crypto.randomUUID().slice(0, 8), entry.kind].join(':');
        const payload = {
            createdAt: new Date().toISOString(),
            method: entry.method, session: entry.session, kind: entry.kind,
            report: entry.report
        };
        await env.LAB_RESULTS.put(key, JSON.stringify(payload), { expirationTtl: 172800 });
        return reply({ saved: true, key, retentionHours: 48 });
    }
};
