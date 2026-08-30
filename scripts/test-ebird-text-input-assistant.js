const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'EBirdTextInputAssistant.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');

const testLocationPresets = {
    '測試公園': {
        locId: 'L10000001',
        pageName: '測試公園正式名稱',
        protocol: 'P22',
        distanceKm: 1,
        partySize: 1
    },
    '測試河段': {
        locId: 'L10000002',
        pageName: '測試河段正式名稱',
        protocol: 'P22',
        distanceKm: 0.2,
        partySize: 1
    }
};

const syntheticRecords = [
    `2000.01.01
測試公園
6：00 開始 20 分鐘
珠頸 3 唱歌，1 聽到
紅鳩 2 一對
麻雀 5
白頭翁 2
白尾 1
白面 1
白腰草鷸 1
磯鷸 1
家八 2
小雨燕 1
樹鵲 1 聽到
黑領 1 聽到唱歌`,
    `2000.01.02
測試河段
14：30 開始 10 分鐘
金背 1
野鴿 1
紅冠 1
小環 2
夜鷺 1
小白 1
黃頭鷺 2
喜鵲 1
大卷尾 1
褐頭鷦鶯 1
家燕 1
洋燕 2
斯氏 2
黑頭文鳥 1
斑文鳥 3
灰鶺鴒 1
鵲鴝 2 一對`,
    `2000.01.03
測試河段
8：30 開始 9 分鐘
小環 2
小環 2
麻雀 4`
];

function loadAssistant(options = {}) {
    const harness = createHarness({
        url: 'https://ebird.org/atlastw/submit/checklist',
        readyState: options.readyState || 'loading'
    });
    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    const gmStorage = new Map();
    harness.context.GM_getValue = (key, fallback) => gmStorage.has(key) ? gmStorage.get(key) : fallback;
    harness.context.GM_setValue = (key, value) => gmStorage.set(key, value);
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    return { harness, api: harness.context.__ebirdTextInputAssistant, gmStorage };
}

function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

describe('eBird compact note parser', () => {
    test('parses representative synthetic records without unresolved fields', () => {
        const { api } = loadAssistant();
        const parsed = syntheticRecords.map((record) => plain(api.parseRecord(record, new Date(2000, 0, 1), testLocationPresets)));

        assert.deepEqual(parsed.map((item) => item.errors), [[], [], []]);
        assert.deepEqual(parsed.map((item) => item.observations.length), [12, 17, 2]);
        assert.deepEqual(parsed.map((item) => item.effort.distanceKm), [1, 0.2, 0.2]);
        assert.deepEqual(parsed.map((item) => item.effort.durationMinutes), [20, 10, 9]);
        assert.match(parsed[2].warnings.join('\n'), /重複的相同紀錄.*小環 2/);
    });

    test('maps singing, pair, heard counts, and white-faced wagtail details', () => {
        const { api } = loadAssistant();
        const first = plain(api.parseRecord(syntheticRecords[0], new Date(2000, 0, 1), testLocationPresets));
        const second = plain(api.parseRecord(syntheticRecords[1], new Date(2000, 0, 1), testLocationPresets));
        const spottedDove = first.observations.find((item) => item.code === 'spodov');
        const redCollaredDove = first.observations.find((item) => item.code === 'recdov1');
        const treepie = first.observations.find((item) => item.code === 'grytre1');
        const starling = first.observations.find((item) => item.code === 'bkcsta1');
        const wagtail = first.observations.find((item) => item.code === 'whiwag8');
        const robin = second.observations.find((item) => item.code === 'magrob');

        assert.deepEqual(
            [spottedDove.count, spottedDove.breedingCode, spottedDove.comments],
            [3, 'S', 'Heard 1']
        );
        assert.equal(redCollaredDove.breedingCode, 'P');
        assert.equal(treepie.comments, 'Heard 1');
        assert.deepEqual([starling.breedingCode, starling.comments], ['S', 'Heard 1']);
        assert.equal(wagtail.name, '白鶺鴒（白面）');
        assert.equal(robin.breedingCode, 'P');
    });

    test('uses the current date when omitted and blocks unknown locations or species', () => {
        const { api } = loadAssistant();
        const fallback = new Date(2000, 0, 4);
        const noDate = plain(api.parseRecord('測試河段\n7：00 開始 8 分鐘\n麻雀 2', fallback, testLocationPresets));
        const unknown = plain(api.parseRecord('2000.01.04\n不確定地點\n7：00 開始 8 分鐘\n神秘鳥 1', fallback, testLocationPresets));

        assert.deepEqual(noDate.date, { year: 2000, month: 1, day: 4 });
        assert.match(noDate.warnings.join('\n'), /未提供日期/);
        assert.match(unknown.errors.join('\n'), /尚未設定的地點/);
        assert.match(unknown.errors.join('\n'), /不確定的物種/);
    });

    test('accepts slash dates followed by encoded clipboard spaces', () => {
        const { api } = loadAssistant();
        const record = plain(api.parseRecord(
            '2000/1/4&#x20;\n測試公園\n7：00 開始 8 分鐘\n麻雀 2',
            new Date(1999, 0, 1),
            testLocationPresets
        ));

        assert.deepEqual(record.date, { year: 2000, month: 1, day: 4 });
        assert.deepEqual(record.errors, []);
    });

    test('stores editable location presets only in Tampermonkey storage', () => {
        const { api } = loadAssistant();

        api.saveLocationPreset('測試公園', {
            locId: 'L10000001',
            pageName: '',
            distanceKm: '1.25',
            partySize: '2'
        });

        assert.deepEqual(plain(api.getLocationPresets()), {
            '測試公園': {
                locId: 'L10000001',
                pageName: '測試公園',
                protocol: 'P22',
                distanceKm: 1.25,
                partySize: 2
            }
        });
        api.deleteLocationPreset('測試公園');
        assert.deepEqual(plain(api.getLocationPresets()), {});
    });

    test('routes a parsed record to its configured location without submitting', () => {
        const { harness, api } = loadAssistant();
        api.saveLocationPreset('測試公園', testLocationPresets['測試公園']);
        const record = api.parseRecord(syntheticRecords[0]);

        api.startRecord(record);

        assert.equal(harness.location.href, 'https://ebird.org/atlastw/submit/effort?locID=L10000001');
        assert.equal(harness.sessionStorage.getItem(api.autoEffortKey), 'true');
        assert.equal(JSON.parse(harness.sessionStorage.getItem(api.storageKey)).location, '測試公園');
    });
});

describe('eBird species form safety', () => {
    test('fills a Chinese-localized date and effort form with location defaults before continuing', async () => {
        const { harness, api } = loadAssistant();
        api.saveLocationPreset('測試河段', testLocationPresets['測試河段']);
        const record = api.parseRecord(syntheticRecords[1]);

        function addElement(tagName, id) {
            const element = harness.document.createElement(tagName);
            element.id = id;
            harness.appendToBody(element);
            return element;
        }

        function addSelect(id, choices) {
            const select = addElement('select', id);
            select.options = choices.map((choice) => typeof choice === 'string'
                ? { value: choice, textContent: choice }
                : choice);
            return select;
        }

        addSelect('p-month', [{ value: '1', textContent: '1月' }]);
        addSelect('p-day', [{ value: '02', textContent: '2日' }]);
        addSelect('p-year', [{ value: '2000', textContent: '2000年' }]);
        const protocol = addElement('input', 'P22');
        addElement('input', 'p-shared-hr');
        addElement('input', 'p-shared-min');
        addSelect('p-shared-ampm', [
            { value: 'am', textContent: '上午' },
            { value: 'pm', textContent: '下午' }
        ]);
        addElement('input', 'p-dur-hrs');
        addElement('input', 'p-dur-min');
        addElement('input', 'p-dist');
        addElement('input', 'p-party-size');
        addElement('button', 'btn-eff-continue');
        let protocolClicks = 0;
        protocol.addEventListener('click', () => { protocolClicks += 1; });

        await api.fillEffort(record, { skipLocationCheck: true, continueToSpecies: false });

        assert.equal(protocolClicks, 1);
        assert.equal(harness.document.getElementById('p-shared-hr').value, '2');
        assert.equal(harness.document.getElementById('p-shared-min').value, '30');
        assert.equal(harness.document.getElementById('p-shared-ampm').value, 'pm');
        assert.equal(harness.document.getElementById('p-dur-min').value, '10');
        assert.equal(harness.document.getElementById('p-dist').value, '0.2');
        assert.equal(harness.document.getElementById('p-party-size').value, '1');
        assert.equal(JSON.parse(harness.sessionStorage.getItem(api.storageKey)).location, '測試河段');
    });

    test('fills counts and details, marks a complete list, and never clicks Submit', async () => {
        const { harness, api } = loadAssistant();
        const record = api.parseRecord(`2000.01.05
測試河段
7：15 開始 6 分鐘
鵲鴝 2 一對
白頭翁 3 唱歌，1 聽到`, new Date(2000, 0, 1), testLocationPresets);

        function addElement(tagName, id) {
            const element = harness.document.createElement(tagName);
            element.id = id;
            harness.appendToBody(element);
            return element;
        }

        for (const observation of record.observations) {
            const count = addElement('input', observation.code);
            count.addEventListener('click', () => {
                if (!harness.document.getElementById(`add_${observation.code}`)) {
                    addElement('a', `add_${observation.code}`);
                }
            });
            const select = addElement('select', `p-${observation.code}_bcode`);
            select.options = [
                { value: '', textContent: 'Choose the highest possible code...' },
                { value: 'S', textContent: 'S Singing Bird' },
                { value: 'P', textContent: 'P Pair in Suitable Habitat' }
            ];
            addElement('textarea', `p-${observation.code}_comments`);
        }
        const complete = addElement('input', 'all-spp-y');
        const submit = addElement('button', 'btn-continue');
        let completeClicks = 0;
        let submitClicks = 0;
        complete.addEventListener('click', () => { completeClicks += 1; });
        submit.addEventListener('click', () => { submitClicks += 1; });

        const result = await api.fillSpecies(record);

        assert.equal(result.filledCount, 2);
        assert.deepEqual(plain(result.errors), []);
        assert.equal(harness.document.getElementById('magrob').value, '2');
        assert.equal(harness.document.getElementById('p-magrob_bcode').value, 'P');
        assert.equal(harness.document.getElementById('livbul1').value, '3');
        assert.equal(harness.document.getElementById('p-livbul1_bcode').value, 'S');
        assert.equal(harness.document.getElementById('p-livbul1_comments').value, 'Heard 1');
        assert.equal(completeClicks, 1);
        assert.equal(submitClicks, 0);
        assert.equal(submit.dataset.tmEbirdManualOnly, 'true');
    });

    test('continues after missing species fields and reports every known failure', async () => {
        const { harness, api } = loadAssistant();
        const record = api.parseRecord(`2000.01.05
測試公園
7：15 開始 6 分鐘
麻雀 4
小雨燕 2`, new Date(2000, 0, 1), testLocationPresets);

        function addElement(tagName, id) {
            const element = harness.document.createElement(tagName);
            element.id = id;
            harness.appendToBody(element);
            return element;
        }

        addElement('input', 'eutspa');
        const complete = addElement('input', 'all-spp-y');
        const submit = addElement('button', 'btn-continue');
        let completeClicks = 0;
        let submitClicks = 0;
        complete.addEventListener('click', () => { completeClicks += 1; });
        submit.addEventListener('click', () => { submitClicks += 1; });

        const result = await api.fillSpecies(record, { elementTimeoutMs: 0 });

        assert.equal(harness.document.getElementById('eutspa').value, '4');
        assert.deepEqual([result.filledCount, result.totalCount], [1, 2]);
        assert.match(result.errors.join('\n'), /小雨燕（houswi1）/);
        assert.equal(completeClicks, 0);
        assert.equal(submitClicks, 0);
    });

    test('expands a localized uncommon section before looking for missing species', async () => {
        const { harness, api } = loadAssistant();
        const record = api.parseRecord(`2000.01.05
測試公園
7：15 開始 6 分鐘
麻雀 4
小雨燕 2`, new Date(2000, 0, 1), testLocationPresets);

        function addElement(tagName, id) {
            const element = harness.document.createElement(tagName);
            element.id = id;
            harness.appendToBody(element);
            return element;
        }

        addElement('input', 'eutspa');
        const uncommon = addElement('button', 'uncommon-section');
        uncommon.textContent = '不常見';
        uncommon.setAttribute('aria-expanded', 'false');
        uncommon.addEventListener('click', () => {
            uncommon.setAttribute('aria-expanded', 'true');
            addElement('input', 'houswi1');
        });
        const complete = addElement('input', 'all-spp-y');
        let completeClicks = 0;
        complete.addEventListener('click', () => { completeClicks += 1; });

        const result = await api.fillSpecies(record, { elementTimeoutMs: 0 });

        assert.equal(harness.document.getElementById('houswi1').value, '2');
        assert.deepEqual([result.filledCount, result.totalCount], [2, 2]);
        assert.deepEqual(plain(result.errors), []);
        assert.equal(completeClicks, 1);
    });

    test('accepts a legacy candidate taxon code when a portal uses it', async () => {
        const { harness, api } = loadAssistant();
        const record = api.parseRecord(`2000.01.05
測試公園
7：15 開始 6 分鐘
小雨燕 2`, new Date(2000, 0, 1), testLocationPresets);
        const count = harness.document.createElement('input');
        count.id = 'houswi';
        harness.appendToBody(count);
        const complete = harness.document.createElement('input');
        complete.id = 'all-spp-y';
        harness.appendToBody(complete);

        const result = await api.fillSpecies(record, { elementTimeoutMs: 0 });

        assert.equal(count.value, '2');
        assert.equal(result.filledCount, 1);
        assert.deepEqual(plain(result.errors), []);
    });

    test('keeps the fixed assistant panel scrollable within the viewport', () => {
        const { harness } = loadAssistant({ readyState: 'complete' });
        const style = harness.document.getElementById('tm-ebird-text-input-assistant-style');
        const panel = harness.document.getElementById('tm-ebird-text-input-assistant');

        assert.ok(panel);
        assert.match(style.textContent, /max-height:\s*calc\(100dvh - 24px\)/);
        assert.match(style.textContent, /overflow-y:\s*auto/);
    });
});
