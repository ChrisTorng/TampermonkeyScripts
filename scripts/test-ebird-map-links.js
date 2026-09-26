const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

test('hotspot map links use direct bird-list and recent-checklists routes', () => {
    const inserted = [];
    const sourceItem = {
        dataset: {},
        insertAdjacentElement(position, item) {
            assert.equal(position, 'afterend');
            inserted.push(item);
        }
    };
    const sourceLink = {
        parentElement: sourceItem,
        pathname: '/hotspot/L36737363/bird-list/bird-list'
    };
    const document = {
        documentElement: {},
        querySelectorAll(selector) {
            assert.equal(selector, 'li > a[href^="/hotspot/L"]');
            return [sourceLink];
        },
        createElement(tagName) {
            return {
                tagName,
                dataset: {},
                children: [],
                appendChild(child) {
                    this.children.push(child);
                },
                insertAdjacentElement(position, item) {
                    assert.equal(position, 'afterend');
                    inserted.push(item);
                }
            };
        }
    };
    let observerCallback;
    class MutationObserver {
        constructor(callback) {
            this.callback = callback;
            observerCallback = callback;
        }

        observe() {}
    }
    const script = fs.readFileSync(
        path.join(__dirname, '..', 'src', 'EBirdScript.user.js'),
        'utf8'
    );

    vm.runInNewContext(script, { document, MutationObserver });

    assert.equal(inserted.length, 2);
    assert.equal(inserted[0].children[0].href, '/hotspot/L36737363/bird-list');
    assert.equal(inserted[0].children[0].textContent, '最近鳥種');
    assert.equal(inserted[1].children[0].href, '/hotspot/L36737363/recent-checklists');
    assert.equal(inserted[1].children[0].textContent, '最近紀錄');
    assert.equal(sourceItem.dataset.ebirdLinksAdded, 'true');
    assert.equal(inserted[0].dataset.ebirdLinksAdded, 'true');
    assert.equal(inserted[1].dataset.ebirdLinksAdded, 'true');

    observerCallback();
    assert.equal(inserted.length, 2);
});
