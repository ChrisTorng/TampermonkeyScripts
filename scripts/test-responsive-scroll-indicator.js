const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'ResponsiveScrollIndicator.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');
const indiewebFixturePath = path.join(repoRoot, 'tests', 'Responsive Scroll Position Indicator', 'indieweb.org_POSSE.html');
const mastodonFixturePath = path.join(repoRoot, 'tests', 'Responsive Scroll Position Indicator', 'mastodon.social_firefoxwebdevs_115740500373677782.html');
const indiewebFixtureHtml = fs.readFileSync(indiewebFixturePath, 'utf8');
const mastodonFixtureHtml = fs.readFileSync(mastodonFixturePath, 'utf8');

function executeResponsiveScrollIndicator(url, setupDom = null) {
    const harness = createHarness({
        url,
        readyState: 'loading',
        computedStyle(element) {
            return {
                overflowX: element.dataset.overflowX || 'visible',
                overflowY: element.dataset.overflowY || 'visible',
                display: element.dataset.display || 'block',
                visibility: element.dataset.visibility || 'visible',
                opacity: element.dataset.opacity || '1',
                contentVisibility: element.dataset.contentVisibility || 'visible',
                contain: element.dataset.contain || 'none'
            };
        }
    });

    harness.window.innerWidth = 1280;
    harness.window.innerHeight = 720;
    harness.window.visualViewport.width = 1280;
    harness.window.visualViewport.height = 720;
    harness.document.documentElement.clientWidth = 1280;
    harness.document.documentElement.clientHeight = 720;
    harness.document.documentElement.scrollHeight = 2400;
    harness.document.documentElement.scrollTop = 600;
    harness.document.body.clientWidth = 1280;
    harness.document.body.clientHeight = 2400;

    if (typeof setupDom === 'function') {
        setupDom(harness);
    }

    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    harness.dispatchDocumentEvent('DOMContentLoaded');
    harness.flushAnimationFrames();
    return harness;
}

function createScrollablePanel(harness, rect) {
    const panel = harness.document.createElement('section');
    panel.dataset.overflowY = 'auto';
    panel.clientHeight = 300;
    panel.scrollHeight = 900;
    panel.scrollTop = 150;
    panel.clientWidth = 320;
    panel._rect = rect;
    harness.appendToBody(panel);
    return panel;
}

describe('ResponsiveScrollIndicator on captured pages', () => {
    test('fixtures contain captured scrollable page content', () => {
        assert.match(indiewebFixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(indiewebFixtureHtml, /POSSE/);
        assert.match(mastodonFixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(mastodonFixtureHtml, /mastodon/i);
    });

    test('root page indicator is created and positioned for long pages', () => {
        const harness = executeResponsiveScrollIndicator('https://indieweb.org/POSSE');
        const rootIndicator = harness.document.getElementById('tm-scroll-indicator-root');

        assert(rootIndicator, 'Expected root indicator element to exist.');
        assert.equal(rootIndicator.style.display, '');
        assert.equal(rootIndicator.style.top, '0px');
        assert.equal(rootIndicator.style.left, '1270px');
        assert.equal(rootIndicator.style.height, '720px');

        const viewportMarker = rootIndicator.querySelector('.tm-viewport');
        assert(viewportMarker, 'Expected root indicator viewport marker.');
        assert.match(viewportMarker.style.height, /^\d+px$/);
        assert.match(viewportMarker.style.transform, /^translateY\(\d+px\)$/);
    });

    test('root indicator uses body page height and window scroll position when html disagrees', () => {
        const harness = executeResponsiveScrollIndicator('https://www.pangram.com/blog/introducing-pangram-image-1-0',
            (currentHarness) => {
                currentHarness.document.documentElement.scrollHeight = 720;
                currentHarness.document.documentElement.scrollTop = 0;
                currentHarness.document.body.scrollHeight = 2800;
                currentHarness.window.scrollY = 800;
            });
        const root = harness.document.getElementById('tm-scroll-indicator-root');
        assert(root);
        assert.equal(root.style.display, '');
        assert.equal(root.style.left, '1270px', 'Insetting the root marker leaves room for native overlay scrollbars.');
        const transform = root.querySelector('.tm-viewport').style.transform;
        assert.notEqual(transform, 'translateY(0px)', 'Window scrolling advances the root marker.');
    });

    test('full-screen app scrollport becomes one root marker when html/body cannot scroll', () => {
        let app;
        const harness = executeResponsiveScrollIndicator('https://www.pangram.com/blog/introducing-pangram-image-1-0',
            (currentHarness) => {
                currentHarness.document.documentElement.scrollHeight = 720;
                currentHarness.document.body.scrollHeight = 720;
                currentHarness.document.documentElement.dataset.overflowY = 'hidden';
                currentHarness.document.body.dataset.overflowY = 'hidden';
                app = createScrollablePanel(currentHarness, {
                    left: 0, top: 0, right: 1280, bottom: 720, width: 1280, height: 720
                });
                app.clientWidth = 1280;
                app.clientHeight = 720;
                app.scrollHeight = 4800;
                app.scrollTop = 1100;
            });
        const indicators = harness.document.querySelectorAll('[data-tm-scroll-indicator]');
        const root = harness.document.getElementById('tm-scroll-indicator-root');
        const nested = indicators.find((el) => el !== root);

        assert.equal(indicators.length, 2);
        assert.equal(root.style.display, '', 'App-backed page scrolling still gets an outer marker.');
        assert.equal(root.style.left, '1270px');
        assert.notEqual(root.querySelector('.tm-viewport').style.transform, 'translateY(0px)');
        assert.equal(nested.style.display, 'none', 'Do not duplicate the outer page marker inside the app.');

        app.scrollTop = 2200;
        harness.runAllIntervals();
        harness.flushAnimationFrames();
        assert.equal(nested.style.display, 'none');
        assert.equal(root.style.display, '');
    });

    test('visible nested scrollers get their own indicators', () => {
        const harness = executeResponsiveScrollIndicator(
            'https://mastodon.social/@firefoxwebdevs/115740500373677782',
            (currentHarness) => {
                createScrollablePanel(currentHarness, {
                    top: 80,
                    left: 900,
                    right: 1220,
                    bottom: 380,
                    width: 320,
                    height: 300
                });
            }
        );

        const indicators = harness.document.querySelectorAll('[data-tm-scroll-indicator]');
        const panelIndicator = indicators.find((element) => element !== harness.document.getElementById('tm-scroll-indicator-root'));

        assert.equal(indicators.length, 2);
        assert(panelIndicator, 'Expected a nested indicator to be created.');
        assert.equal(panelIndicator.style.display, '');
        assert.equal(panelIndicator.style.top, '80px');
        assert.equal(panelIndicator.style.left, '1220px');
        assert.equal(panelIndicator.style.height, '300px');
    });

    test('collapsed scrollable menus hide their markers and restore them when expanded', () => {
        let wrapper;
        const harness = executeResponsiveScrollIndicator(
            'https://www.pangram.com/blog/introducing-pangram-image-1-0',
            (currentHarness) => {
                wrapper = currentHarness.document.createElement('div');
                wrapper.dataset.overflowY = 'hidden';
                wrapper.dataset.overflowX = 'hidden';
                wrapper.offsetWidth = 500;
                wrapper.offsetHeight = 0;
                wrapper.clientWidth = 500;
                wrapper.clientHeight = 0;
                wrapper._rect = { top: 180, left: 60, right: 560, bottom: 180, width: 500, height: 0 };

                const menu = currentHarness.document.createElement('nav');
                menu.dataset.overflowY = 'auto';
                menu.clientHeight = 300;
                menu.scrollHeight = 1300;
                menu.scrollTop = 300;
                menu._rect = { top: 200, left: 80, right: 540, bottom: 500, width: 460, height: 300 };
                wrapper.appendChild(menu);
                currentHarness.appendToBody(wrapper);
            }
        );
        const root = harness.document.getElementById('tm-scroll-indicator-root');
        const marker = harness.document.querySelectorAll('[data-tm-scroll-indicator]')
            .find((element) => element !== root);

        assert(marker, 'The menu has a scrollable DOM even while collapsed.');
        assert.equal(marker.style.display, 'none', 'The collapsed ancestor clips its marker.');
        assert.equal(root.style.display, '', 'The page indicator is independent of the menu.');

        wrapper.offsetHeight = 360;
        wrapper.clientHeight = 360;
        wrapper._rect = { top: 180, left: 60, right: 560, bottom: 540, width: 500, height: 360 };
        harness.triggerMutation([], { type: 'attributes', target: wrapper, attributeName: 'class' });
        harness.flushAnimationFrames();

        assert.equal(marker.style.display, '', 'Expanded content has an indicator.');
        assert.equal(marker.style.top, '200px');
        assert.equal(marker.style.left, '540px');
        assert.equal(marker.style.height, '300px');

        wrapper.offsetHeight = 0;
        wrapper.clientHeight = 0;
        wrapper._rect = { top: 180, left: 60, right: 560, bottom: 180, width: 500, height: 0 };
        harness.triggerMutation([], { type: 'attributes', target: wrapper, attributeName: 'class' });
        harness.flushAnimationFrames();
        assert.equal(marker.style.display, 'none', 'Closing the menu hides the same marker again.');
        assert.equal(root.style.display, '', 'Closing the menu must not hide the page marker.');
    });

    test('nested overflow clips both the marker position and its height', () => {
        const harness = executeResponsiveScrollIndicator('https://indieweb.org/POSSE', (currentHarness) => {
            const clip = currentHarness.document.createElement('div');
            clip.dataset.overflowX = 'hidden';
            clip.dataset.overflowY = 'clip';
            clip.offsetWidth = 600;
            clip.offsetHeight = 400;
            clip.clientLeft = 10;
            clip.clientTop = 10;
            clip.clientWidth = 500;
            clip.clientHeight = 300;
            clip._rect = { top: 120, left: 80, right: 380, bottom: 320, width: 300, height: 200 };

            const scroller = currentHarness.document.createElement('section');
            scroller.dataset.overflowY = 'auto';
            scroller.clientHeight = 300;
            scroller.scrollHeight = 900;
            scroller._rect = { top: 0, left: 0, right: 560, bottom: 400, width: 560, height: 400 };
            clip.appendChild(scroller);
            currentHarness.appendToBody(clip);
        });
        const root = harness.document.getElementById('tm-scroll-indicator-root');
        const marker = harness.document.querySelectorAll('[data-tm-scroll-indicator]')
            .find((element) => element !== root);

        assert(marker);
        assert.equal(marker.style.display, '');
        assert.equal(marker.style.top, '125px');
        assert.equal(marker.style.left, '335px');
        assert.equal(marker.style.height, '150px');
    });

    test('non-painted ancestors hide marker despite the target retaining layout geometry', () => {
        let wrapper;
        const harness = executeResponsiveScrollIndicator('https://indieweb.org/POSSE', (currentHarness) => {
            wrapper = currentHarness.document.createElement('div');
            wrapper._rect = { top: 50, left: 50, right: 650, bottom: 550, width: 600, height: 500 };
            wrapper.offsetWidth = 600;
            wrapper.offsetHeight = 500;
            wrapper.clientWidth = 600;
            wrapper.clientHeight = 500;
            const scroller = currentHarness.document.createElement('div');
            scroller.dataset.overflowY = 'auto';
            scroller.clientHeight = 300;
            scroller.scrollHeight = 1000;
            scroller._rect = { top: 100, left: 100, right: 600, bottom: 400, width: 500, height: 300 };
            wrapper.appendChild(scroller);
            currentHarness.appendToBody(wrapper);
        });
        const root = harness.document.getElementById('tm-scroll-indicator-root');
        const marker = harness.document.querySelectorAll('[data-tm-scroll-indicator]')
            .find((element) => element !== root);
        assert(marker);
        assert.equal(marker.style.display, '');

        for (const [field, value] of [
            ['opacity', '0'],
            ['display', 'none'],
            ['contentVisibility', 'hidden']
        ]) {
            wrapper.dataset[field] = value;
            harness.triggerMutation([], { type: 'attributes', target: wrapper, attributeName: 'style' });
            harness.flushAnimationFrames();
            assert.equal(marker.style.display, 'none', field + ' must hide a descendant marker.');
            delete wrapper.dataset[field];
            harness.triggerMutation([], { type: 'attributes', target: wrapper, attributeName: 'style' });
            harness.flushAnimationFrames();
            assert.equal(marker.style.display, '', field + ' removal must restore it.');
        }
    });

    test('clip-path or overlapping content does not leave a floating marker behind', () => {
        let menu;
        let scrollport;
        let article;
        let open = false;
        const harness = executeResponsiveScrollIndicator(
            'https://www.pangram.com/blog/introducing-pangram-image-1-0',
            (currentHarness) => {
                menu = currentHarness.document.createElement('div');
                menu._rect = { top: 240, left: 60, right: 640, bottom: 780, width: 580, height: 540 };
                menu.offsetWidth = 580;
                menu.offsetHeight = 540;
                menu.clientWidth = 580;
                menu.clientHeight = 540;
                scrollport = currentHarness.document.createElement('div');
                scrollport.dataset.overflowY = 'auto';
                scrollport.clientHeight = 400;
                scrollport.scrollHeight = 1500;
                scrollport._rect = { top: 380, left: 85, right: 605, bottom: 780, width: 520, height: 400 };
                menu.appendChild(scrollport);
                currentHarness.appendToBody(menu);
                article = currentHarness.document.createElement('article');
                currentHarness.appendToBody(article);

                // Layout dimensions are unchanged while the menu is paint-clipped.
                currentHarness.document.elementFromPoint = (x, y) => {
                    assert(Number.isFinite(x) && Number.isFinite(y), 'Hit-test coordinates must be finite.');
                    return open ? (y < 560 ? article : scrollport) : article;
                };
            }
        );
        const root = harness.document.getElementById('tm-scroll-indicator-root');
        const marker = harness.document.querySelectorAll('[data-tm-scroll-indicator]')
            .find((element) => element !== root);
        assert(marker);
        assert.equal(marker.style.display, 'none', 'A paint-clipped popup leaves no marker.');
        assert.equal(root.style.display, '', 'The page marker remains present.');

        open = true;
        harness.triggerMutation([], { type: 'attributes', target: menu, attributeName: 'class' });
        harness.flushAnimationFrames();
        assert.equal(marker.style.display, '', 'The revealed popup becomes eligible.');
        assert(Number.parseInt(marker.style.top, 10) >= 550, 'The marker starts below the occluding overlay.');
        assert.equal(marker.style.left, '605px');
        assert(Number.parseInt(marker.style.height, 10) < 230, 'Occluded sections are excluded.');

        open = false;
        harness.runAllIntervals();
        harness.flushAnimationFrames();
        assert.equal(marker.style.display, 'none', 'Painting changes are rechecked without layout changes.');
    });

    test('semantic closed state and aria-hidden hide a scrollport before animation ends', () => {
        let menu;
        const harness = executeResponsiveScrollIndicator('https://indieweb.org/POSSE', (currentHarness) => {
            menu = currentHarness.document.createElement('div');
            menu.dataset.state = 'closed';
            const scrollport = currentHarness.document.createElement('div');
            scrollport.dataset.overflowY = 'auto';
            scrollport.clientHeight = 320;
            scrollport.scrollHeight = 900;
            scrollport._rect = { top: 100, left: 80, right: 380, bottom: 420, width: 300, height: 320 };
            menu.appendChild(scrollport);
            currentHarness.appendToBody(menu);
        });
        const root = harness.document.getElementById('tm-scroll-indicator-root');
        const marker = harness.document.querySelectorAll('[data-tm-scroll-indicator]')
            .find((element) => element !== root);
        assert.equal(marker.style.display, 'none');
        menu.dataset.state = 'open';
        harness.triggerMutation([], { type: 'attributes', target: menu, attributeName: 'data-state' });
        harness.flushAnimationFrames();
        assert.equal(marker.style.display, '');
        menu.setAttribute('aria-hidden', 'true');
        harness.triggerMutation([], { type: 'attributes', target: menu, attributeName: 'aria-hidden' });
        harness.flushAnimationFrames();
        assert.equal(marker.style.display, 'none');
    });

    test('class-triggered overflow changes discover scrollports without adding children', () => {
        let panel;
        const harness = executeResponsiveScrollIndicator('https://indieweb.org/POSSE', (currentHarness) => {
            panel = createScrollablePanel(currentHarness, {
                top: 80, left: 700, right: 1020, bottom: 380, width: 320, height: 300
            });
            panel.dataset.overflowY = 'visible';
        });
        assert.equal(harness.document.querySelectorAll('[data-tm-scroll-indicator]').length, 1);

        panel.dataset.overflowY = 'auto';
        harness.triggerMutation([], { type: 'attributes', target: panel, attributeName: 'class' });
        harness.flushAnimationFrames();

        const markers = harness.document.querySelectorAll('[data-tm-scroll-indicator]');
        assert.equal(markers.length, 2);
        assert.equal(markers[1].style.display, '');
    });

    test('mutation observer discovers scrollable elements added later', () => {
        const harness = executeResponsiveScrollIndicator('https://indieweb.org/POSSE');
        const beforeCount = harness.document.querySelectorAll('[data-tm-scroll-indicator]').length;
        const latePanel = createScrollablePanel(harness, {
            top: 120,
            left: 860,
            right: 1180,
            bottom: 420,
            width: 320,
            height: 300
        });

        harness.triggerMutation([latePanel]);
        harness.flushAnimationFrames();

        const indicators = harness.document.querySelectorAll('[data-tm-scroll-indicator]');
        assert.equal(beforeCount, 1);
        assert.equal(indicators.length, 2);
    });
});
