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
                (host.endsWith('.vercel.app') || host === 'tm-math-translation-lab.christorng.workers.dev' || host === 'christorng.idv.tw' ||
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
        // Live, non-cached article proxy: preserve the COMPLETE current HTML, CSS,
        // scripts, MathJax configuration and block positions rather than making
        // synthetic first/second paragraph fixtures. Allowlist only known test
        // articles; never permit arbitrary destination URLs or user-provided HTML.
        const fullArticles = {
            alexwang: 'https://alexwang.ai/posts/reasoning-as-pathfinding/',
            plover: 'https://blog.plover.com/math/ordinals/02-wellfoundedness.html',
            mathjaxdocs: 'https://docs.mathjax.org/en/stable/output/linebreaks.html'
        };
        if (request.method === 'GET' && path === '/full/telemetry.js') {
            const upstream = await fetch(
                'https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/1876f6d3a2bc46aba1a1bc8f7e85899785b1374c/tests/MathVisibilityLab/full-article-telemetry.js'
            );
            if (!upstream.ok) return reply({error:'telemetry-not-found',status:upstream.status},502);
            return new Response(await upstream.text(),{headers:{
                'Content-Type':'application/javascript; charset=utf-8',
                'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'
            }});
        }
        if (request.method === 'GET' && path === '/full/guard.js') {
            // Same production candidate except for test mirror hostname check.
            const upstream = await fetch(
                'https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/fix/math-inline-order-separation-20261113/src/MathTranslationGuard.user.js',
                {headers:{'Cache-Control':'no-cache'}}
            );
            if (!upstream.ok) return reply({error:'guard-not-found',status:upstream.status},502);
            const original = await upstream.text();
            const lookup = "if (location.hostname === 'alexwang.ai' || location.hostname.endsWith('.alexwang.ai')) {";
            if (!original.includes(lookup)) return reply({error:'guard-domain-hook-missing'},500);
            const adapted = original.replace(lookup,
                "if (location.pathname === '/full/article/alexwang') {");
            return new Response(adapted,{headers:{
                'Content-Type':'application/javascript; charset=utf-8',
                'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'
            }});
        }
        const fullMatch = path.match(/^\/full\/article\/([a-z]+)$/);
        if (request.method === 'GET' && fullMatch) {
            const id=fullMatch[1], sourceUrl=fullArticles[id];
            if (!sourceUrl) return reply({error:'article-not-allowlisted'},404);
            const params=new URL(request.url).searchParams;
            const variant = params.get('isolated') === '1' && id === 'alexwang' ? 'isolated' :
                (params.get('guard') === '1' ? 'guard' : 'baseline');
            let original;
            try {
                original=await fetch(sourceUrl,{headers:{
                    'Accept':'text/html,application/xhtml+xml',
                    'Cache-Control':'no-cache'
                }});
            } catch(e) { return reply({error:'article-source-fetch-failed',message:String(e).slice(0,130)},502); }
            if (!original.ok) return reply({error:'article-source-status',status:original.status},502);
            const type=original.headers.get('content-type')||'';
            if (!type.includes('text/html')) return reply({error:'unexpected-article-content-type',type},502);
            const html=await original.text();
            // Inline the observer and optional Guard before the original
            // scripts: a network-blocking <script src> would itself change
            // MathJax/Edge timing and invalidate the experiment.
            const telemetrySourceUrl='https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/fab1481133e715b24d0f7c708680b7c41418ef5a/tests/MathVisibilityLab/full-article-telemetry.js';
            const guardRef='513c59dbadb66cfabe9e32be4694e68b09c4f455';
            const guardSourceUrl='https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/'+guardRef+'/src/MathTranslationGuard.user.js';
            const isolateRef='be4adce62be081b5aa6c103f9e2a77e98784afcc';
            const isolateSourceUrl='https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/'+isolateRef+'/tests/MathVisibilityLab/isolated-article.js';
            const [diagResponse,guardResponse,isolateResponse]=await Promise.all([
                fetch(telemetrySourceUrl),
                variant==='guard'&&id==='alexwang' ? fetch(guardSourceUrl):Promise.resolve(null),
                variant==='isolated'&&id==='alexwang' ? fetch(isolateSourceUrl):Promise.resolve(null)
            ]);
            if (!diagResponse.ok || (guardResponse && !guardResponse.ok) ||
                (isolateResponse && !isolateResponse.ok))
                return reply({error:'lab-instrumentation-source-unavailable'},502);
            const diagScript=(await diagResponse.text()).replace(/<\/script/gi,'<\\/script');
            let guardScript='';
            if (guardResponse) {
                const raw=await guardResponse.text();
                const lookup="if (location.hostname === 'alexwang.ai' || location.hostname.endsWith('.alexwang.ai')) {";
                if (!raw.includes(lookup)) return reply({error:'guard-domain-hook-missing'},500);
                guardScript=raw.replace(lookup,"if (location.pathname === '/full/article/alexwang') {")
                    .replace(/<\/script/gi,'<\\/script');
            }
            const isolateScript=isolateResponse ?
                (await isolateResponse.text()).replace(/<\/script/gi,'<\\/script'):'';
            const config = JSON.stringify({
                article:sourceUrl,variant,
                guardRef:variant==='guard'?guardRef:null,
                isolateRef:variant==='isolated'?isolateRef:null,
                reportUrl:'https://tm-math-translation-lab.christorng.workers.dev/report'
            }).replace(/</g,'\\u003c');
            const meta='<meta name="robots" content="noindex,nofollow,noarchive">';
            const scripts='<script>window.__tmFullMathLab='+config+';<\/script>'+
                '<script>'+diagScript+'<\/script>'+
                (guardScript ? '<script>'+guardScript+'<\/script>':'')+
                (isolateScript ? '<script>'+isolateScript+'<\/script>':'');
            const injection='<base href="'+sourceUrl.replace(/"/g,'&quot;')+'">'+meta+scripts;
            const content=/<head(?:\s[^>]*)?>/i.test(html)
                ?html.replace(/<head(?:\s[^>]*)?>/i,m=>m+injection)
                :html.replace(/<html(?:\s[^>]*)?>/i,m=>m+'<head>'+injection+'</head>');
            return new Response(content,{headers:{
                'Content-Type':'text/html; charset=utf-8',
                'Cache-Control':'no-store, max-age=0',
                'X-Robots-Tag':'noindex, nofollow, noarchive',
                'Referrer-Policy':'strict-origin-when-cross-origin',
                'X-Content-Type-Options':'nosniff',
                'X-TM-Full-Math-Variant':variant,
                'X-TM-Original-Article':sourceUrl
            }});
        }
        // Public self-contained test page. Source remains versioned in GitHub.
        if (request.method === 'GET' && (path === '/' || path === '/index.html' || path === '/lab.js' || path === '/reconstruct.js')) {
            const name = path === '/lab.js' ? 'lab.js' : path === '/reconstruct.js' ? 'reconstruct.js' : 'index.html';
            const upstream = 'https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/8f5f877b05ba30f78252783f501c28eefdfa2f4f/tests/MathVisibilityLab/' + name;
            const source = await fetch(upstream);
            if (!source.ok) return reply({ error: 'fixture-unavailable', status: source.status }, 502);
            return new Response(await source.text(), {
                status: 200, headers: {
                    'Content-Type': name.endsWith('.js') ? 'application/javascript; charset=utf-8' : 'text/html; charset=utf-8',
                    'Cache-Control': 'no-cache',
                    'X-Content-Type-Options': 'nosniff',
                    'Referrer-Policy': 'no-referrer'
                }
            });
        }
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
            !/^(baseline|output|source|paragraph|image|placeholder|engines|full-article)$/.test(entry.method || '') ||
            !['dom', 'image'].includes(entry.kind) || !entry.report || typeof entry.report !== 'object') {
            return reply({ error: 'invalid-schema', acceptedMethods: ['baseline','output','source','paragraph','image','placeholder','engines','full-article'], receivedMethod: typeof entry.method === 'string' ? entry.method.slice(0, 35) : null }, 400);
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
        await env.LAB_RESULTS.put(key, JSON.stringify(payload), {
            expirationTtl: entry.method === 'full-article' ? 604800 : 172800
        });
        return reply({ saved: true, key, retentionHours: entry.method === 'full-article' ? 168 : 48 });
    }
};
