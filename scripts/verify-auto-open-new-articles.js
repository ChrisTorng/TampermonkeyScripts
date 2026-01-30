const urls = [
    {
        name: 'TAM News Photo',
        url: 'https://tam.gov.taipei/News_Photo.aspx?n=EF86D8AF23B9A85B',
        type: 'tam',
        listId: 'EF86D8AF23B9A85B',
    },
    {
        name: 'TAM News Link Pic',
        url: 'https://tam.gov.taipei/News_Link_pic.aspx?n=B64052C7930D4913',
        type: 'tam',
        listId: 'B64052C7930D4913',
    },
    {
        name: 'The Neuron Daily',
        url: 'https://www.theneurondaily.com/',
        type: 'neuron',
    },
];

function extractTamLinks(html, listId) {
    const regex = /href="([^"]*News_Content\.aspx[^"]*)"/gi;
    const links = [];
    let match;

    while ((match = regex.exec(html)) !== null) {
        const href = match[1];
        if (href.includes(`n=${listId}`)) {
            links.push(href);
        }
    }

    return links;
}

function extractNeuronLinks(html) {
    const regex = /href="(\/p\/[^"#?]+)"/gi;
    const links = new Set();
    let match;

    while ((match = regex.exec(html)) !== null) {
        links.add(match[1]);
    }

    return Array.from(links);
}

const { execSync } = require('node:child_process');

function fetchHtml(url) {
    const command = `curl -L --max-time 20 -s -A \"Mozilla/5.0 (compatible; AutoOpenNewArticles/1.0; +https://github.com/ChrisTorng/TampermonkeyScripts)\" \"${url}\"`;
    const text = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { status: 200, text };
}

async function run() {
    let hasFailure = false;

    for (const target of urls) {
        console.log(`\n== ${target.name} ==`);
        const { status, text } = fetchHtml(target.url);
        console.log(`Status: ${status}`);

        if (target.type === 'tam') {
            const links = extractTamLinks(text, target.listId);
            console.log(`Found ${links.length} TAM news links for list ${target.listId}.`);
            if (links.length === 0) {
                console.log('ERROR: No TAM news links found.');
                hasFailure = true;
            } else {
                console.log(`Sample: ${links[0]}`);
            }
            continue;
        }

        if (text.includes('Just a moment...') || text.includes('cf_chl')) {
            console.log('WARNING: Cloudflare challenge detected; skipping Neuron Daily link extraction.');
            continue;
        }

        const links = extractNeuronLinks(text);
        console.log(`Found ${links.length} Neuron Daily /p/ links.`);
        if (links.length === 0) {
            console.log('ERROR: No Neuron Daily links found.');
            hasFailure = true;
        } else {
            console.log(`Sample: ${links[0]}`);
        }
    }

    if (hasFailure) {
        process.exitCode = 1;
    }
}

run();
