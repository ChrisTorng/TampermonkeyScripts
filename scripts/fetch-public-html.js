// Download a public HTTP response without confusing it with the browser-rendered DOM.
const fs = require('node:fs');
const url = process.argv[2];
const output = process.argv[3] || 'page-response.html';
if (!url || !/^https?:\/\//i.test(url)) {
    console.error('Usage: node scripts/fetch-public-html.js https://public.example/article [output.html]');
    process.exit(2);
}
(async () => {
    const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(20000),
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-GB,en;q=0.9'
        }
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(output, buffer);
    const html = buffer.toString('utf8');
    const markers = {
        translateNo: [...html.matchAll(/\btranslate\s*=\s*["']no["']/gi)].length,
        notranslateClass: [...html.matchAll(/\bnotranslate\b/gi)].length,
        googleMeta: [...html.matchAll(/<meta[^>]+\bname\s*=\s*["']google["'][^>]*>/gi)].length
    };
    console.log(JSON.stringify({
        requestedUrl: url, finalUrl: response.url,
        status: response.status, contentType: response.headers.get('content-type'),
        bytes: buffer.length, title: html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].slice(0, 180) || null,
        containsArticleHeading: html.includes('Teammates are agents for complex'),
        markers,
        output,
        caveat: 'Raw HTTP response only; this does not prove the browser-rendered DOM has the same markers.'
    }, null, 2));
    if (!response.ok || !/text\/html/i.test(response.headers.get('content-type') || '')) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
