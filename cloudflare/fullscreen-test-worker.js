// Public HTML test host for Tampermonkey scripts. No visitor data is stored.
const fixture = 'https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/main/tests/ControlButtons/index.html';
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== '/' && url.pathname !== '/index.html') {
      return new Response('Not found', { status: 404 });
    }
    const upstream = await fetch(fixture, { cf: { cacheTtl: 120 } });
    if (!upstream.ok) {
      return new Response('Test fixture unavailable; upstream returned ' + upstream.status, { status: 502 });
    }
    let html = await upstream.text();
    html = html.replace('href="../../CurrentUpdates.html"',
      'href="https://christorng.idv.tw/TampermonkeyScripts/CurrentUpdates.html"');
    html = html.replace('<!-- USERSCRIPT_TEST_INJECTION -->', '');
    return new Response(html, { headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    }});
  }
};
