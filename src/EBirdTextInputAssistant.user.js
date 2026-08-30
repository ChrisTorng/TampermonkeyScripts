// ==UserScript==
// @name         eBird Text Input Assistant
// @namespace    http://tampermonkey.net/
// @version      2026-08-30_1.1.4
// @description  Parse compact Taiwan birding notes, use local location presets, and fill eBird forms without submitting them.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/EBirdTextInputAssistant.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/EBirdTextInputAssistant.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ebird.org
// @match        https://ebird.org/*/submit*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    const storageKey = 'ebirdTextInputAssistant:pendingRecord';
    const autoEffortKey = 'ebirdTextInputAssistant:autoEffort';
    const settingsKey = 'ebirdTextInputAssistant:locationPresets';
    const panelId = 'tm-ebird-text-input-assistant';
    const styleId = `${panelId}-style`;

    function getLocationPresets() {
        const stored = typeof GM_getValue === 'function'
            ? GM_getValue(settingsKey, {})
            : JSON.parse(localStorage.getItem(settingsKey) || '{}');
        return stored && typeof stored === 'object' ? stored : {};
    }

    function setLocationPresets(presets) {
        if (typeof GM_setValue === 'function') {
            GM_setValue(settingsKey, presets);
        } else {
            localStorage.setItem(settingsKey, JSON.stringify(presets));
        }
    }

    function saveLocationPreset(alias, values) {
        const normalizedAlias = String(alias || '').trim();
        const locId = String(values.locId || '').trim();
        const pageName = String(values.pageName || '').trim() || normalizedAlias;
        const distanceKm = Number(values.distanceKm);
        const partySize = Number(values.partySize || 1);
        if (!normalizedAlias || !/^L\d+$/.test(locId) || !Number.isFinite(distanceKm) || distanceKm <= 0) {
            throw new Error('請填寫簡稱、L 開頭的 eBird 地點 ID 與大於 0 的預設距離。');
        }
        if (!Number.isInteger(partySize) || partySize < 1) {
            throw new Error('人數必須是大於 0 的整數。');
        }
        const presets = getLocationPresets();
        presets[normalizedAlias] = {
            locId,
            pageName,
            protocol: 'P22',
            distanceKm,
            partySize
        };
        setLocationPresets(presets);
        return presets[normalizedAlias];
    }

    function deleteLocationPreset(alias) {
        const presets = getLocationPresets();
        delete presets[alias];
        setLocationPresets(presets);
    }

    const speciesAliases = Object.freeze({
        '金背': { code: 'ortdov', name: '金背鳩' },
        '金背鳩': { code: 'ortdov', name: '金背鳩' },
        '珠頸': { code: 'spodov', name: '珠頸斑鳩' },
        '珠頸斑鳩': { code: 'spodov', name: '珠頸斑鳩' },
        '紅鳩': { code: 'recdov1', name: '紅鳩' },
        '野鴿': { code: 'rocpig1', name: '野鴿（野化）' },
        '小雨燕': { code: 'houswi1', codes: ['houswi1', 'houswi'], name: '小雨燕' },
        '紅冠': { code: 'commoo3', name: '紅冠水雞' },
        '紅冠水雞': { code: 'commoo3', name: '紅冠水雞' },
        '小環': { code: 'lirplo', name: '小環頸鴴' },
        '小環頸鴴': { code: 'lirplo', name: '小環頸鴴' },
        '磯鷸': { code: 'comsan', name: '磯鷸' },
        '白腰草鷸': { code: 'grnsan', name: '白腰草鷸' },
        '夜鷺': { code: 'bcnher', name: '夜鷺' },
        '小白': { code: 'litegr', name: '小白鷺' },
        '小白鷺': { code: 'litegr', name: '小白鷺' },
        '黃頭鷺': { code: 'categr2', name: '黃頭鷺' },
        '喜鵲': { code: 'orimag1', name: '喜鵲' },
        '樹鵲': { code: 'grytre1', name: '樹鵲' },
        '大卷尾': { code: 'bladro1', name: '大卷尾' },
        '褐頭鷦鶯': { code: 'plapri1', name: '褐頭鷦鶯' },
        '家燕': { code: 'barswa', name: '家燕' },
        '洋燕': { code: 'pacswa1', name: '洋燕' },
        '白頭翁': { code: 'livbul1', name: '白頭翁' },
        '斯氏': { code: 'swiwhe1', name: '斯氏繡眼' },
        '斯氏繡眼': { code: 'swiwhe1', name: '斯氏繡眼' },
        '黑領': { code: 'bkcsta1', name: '黑領椋鳥' },
        '黑領椋鳥': { code: 'bkcsta1', name: '黑領椋鳥' },
        '家八': { code: 'commyn', name: '家八哥' },
        '家八哥': { code: 'commyn', name: '家八哥' },
        '白尾': { code: 'whvmyn', name: '白尾八哥' },
        '白尾八哥': { code: 'whvmyn', name: '白尾八哥' },
        '鵲鴝': { code: 'magrob', name: '鵲鴝' },
        '麻雀': { code: 'eutspa', name: '麻雀' },
        '斑文鳥': { code: 'nutman', name: '斑文鳥' },
        '黑頭文鳥': { code: 'chemun', name: '黑頭文鳥' },
        '灰鶺鴒': { code: 'grywag', name: '灰鶺鴒' },
        '白面': { code: 'whiwag8', name: '白鶺鴒（白面）' },
        '白鶺鴒（白面）': { code: 'whiwag8', name: '白鶺鴒（白面）' }
    });

    function parseDate(line, fallbackDate) {
        const match = line && line.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
        if (match) {
            return {
                value: { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) },
                consumed: true
            };
        }
        return {
            value: {
                year: fallbackDate.getFullYear(),
                month: fallbackDate.getMonth() + 1,
                day: fallbackDate.getDate()
            },
            consumed: false
        };
    }

    function parseRecord(text, fallbackDate = new Date(), locationPresets = getLocationPresets()) {
        const normalizedSource = String(text || '')
            .replace(/&(?:#x20|#32|nbsp);/gi, ' ')
            .replace(/\u00a0/g, ' ');
        const lines = normalizedSource
            .replace(/\r/g, '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        const errors = [];
        const warnings = [];
        let index = 0;

        const parsedDate = parseDate(lines[index], fallbackDate);
        const date = parsedDate.value;
        if (parsedDate.consumed) {
            index += 1;
        } else {
            warnings.push('未提供日期，已使用今天。');
        }

        const location = lines[index++] || '';
        const preset = locationPresets[location];
        if (!preset) {
            errors.push(`尚未設定的地點：${location || '（未填）'}`);
        }

        const effortLine = lines[index++] || '';
        const effortMatch = effortLine.match(/^(\d{1,2})[：:](\d{1,2})\s*開始\s*(\d+)\s*分鐘$/);
        const effort = effortMatch ? {
            hour: Number(effortMatch[1]),
            minute: Number(effortMatch[2]),
            durationMinutes: Number(effortMatch[3]),
            protocol: preset ? preset.protocol : 'P22',
            distanceKm: preset ? preset.distanceKm : null,
            partySize: preset ? preset.partySize : 1
        } : null;
        if (!effortMatch) {
            errors.push(`無法解析開始時間與分鐘：${effortLine || '（未填）'}`);
        } else if (effort.hour > 23 || effort.minute > 59 || effort.durationMinutes < 1) {
            errors.push(`時間或分鐘不合理：${effortLine}`);
        }

        const observations = [];
        const observationsByCode = new Map();
        for (; index < lines.length; index += 1) {
            const line = lines[index];
            const match = line.match(/^(.+?)\s+(\d+)(?:\s+(.*))?$/);
            if (!match) {
                errors.push(`無法解析物種紀錄：${line}`);
                continue;
            }
            const alias = match[1].trim();
            const species = speciesAliases[alias];
            if (!species) {
                errors.push(`不確定的物種：${alias}`);
                continue;
            }
            const count = Number(match[2]);
            const details = (match[3] || '').replace(/，/g, ',').trim();
            const explicitHeard = details.match(/(?:^|,)\s*(\d+)\s*聽到/);
            const heardCount = details.includes('聽到')
                ? (explicitHeard ? Number(explicitHeard[1]) : count)
                : null;
            const breedingCode = details.includes('一對') ? 'P' : (details.includes('唱歌') ? 'S' : null);
            const unknownDetails = details
                .replace(/唱歌/g, '')
                .replace(/一對/g, '')
                .replace(/(?:^|,)\s*\d*\s*聽到/g, '')
                .replace(/^[,\s]+|[,\s]+$/g, '');
            if (unknownDetails) {
                warnings.push(`未套用的細節「${unknownDetails}」：${line}`);
            }

            const observation = {
                alias,
                code: species.code,
                codes: species.codes || [species.code],
                name: species.name,
                count,
                breedingCode,
                comments: heardCount === null ? '' : `Heard ${heardCount}`
            };
            const existing = observationsByCode.get(species.code);
            if (existing) {
                const same = existing.count === observation.count
                    && existing.breedingCode === observation.breedingCode
                    && existing.comments === observation.comments;
                if (same) {
                    warnings.push(`重複的相同紀錄已保留一次：${alias} ${count}`);
                } else {
                    errors.push(`同一物種出現不同紀錄，請確認：${existing.alias}／${alias}`);
                }
                continue;
            }
            observationsByCode.set(species.code, observation);
            observations.push(observation);
        }

        if (observations.length === 0) {
            errors.push('沒有可填入的物種紀錄。');
        }

        return { date, location, effort, observations, errors, warnings, source: normalizedSource.trim() };
    }

    function dispatchValueEvents(element) {
        ['input', 'change', 'blur'].forEach((type) => {
            const event = typeof Event === 'function'
                ? new Event(type, { bubbles: true })
                : { type, bubbles: true };
            element.dispatchEvent(event);
        });
    }

    function setValue(id, value) {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`找不到 eBird 欄位：${id}`);
        }
        element.value = String(value);
        dispatchValueEvents(element);
        return element;
    }

    function setCountValue(id, value) {
        const element = setValue(id, value);
        if (typeof element.focus === 'function') {
            element.focus();
        }
        element.click();
        const keyup = typeof Event === 'function'
            ? new Event('keyup', { bubbles: true })
            : { type: 'keyup', bubbles: true };
        element.dispatchEvent(keyup);
        if (typeof element.blur === 'function') {
            element.blur();
        }
        return element;
    }

    function selectOption(select, values, texts = []) {
        const normalizedValues = values.map((value) => String(value).toLowerCase());
        const normalizedTexts = texts.map((text) => String(text).trim().toLowerCase());
        const option = Array.from(select.options || []).find((item) => {
            const value = String(item.value).toLowerCase();
            const text = item.textContent.trim().toLowerCase();
            return normalizedValues.includes(value) || normalizedTexts.includes(text);
        });
        if (!option) {
            throw new Error(`找不到選項：${texts[0] || values[0]}`);
        }
        select.value = option.value;
        dispatchValueEvents(select);
    }

    function waitForElement(id, timeoutMs = 4000) {
        const started = Date.now();
        return new Promise((resolve, reject) => {
            function check() {
                const element = document.getElementById(id);
                if (element) {
                    resolve(element);
                    return;
                }
                if (Date.now() - started >= timeoutMs) {
                    reject(new Error(`等待 eBird 欄位逾時：${id}`));
                    return;
                }
                setTimeout(check, 50);
            }
            check();
        });
    }

    function waitForObservationField(observation, timeoutMs = 4000) {
        const codes = Array.from(new Set(observation.codes || [observation.code]));
        const started = Date.now();
        return new Promise((resolve, reject) => {
            function check() {
                const code = codes.find((candidate) => document.getElementById(candidate));
                if (code) {
                    resolve({ code, element: document.getElementById(code) });
                    return;
                }
                if (Date.now() - started >= timeoutMs) {
                    reject(new Error(`等待 eBird 欄位逾時：${codes.join('／')}`));
                    return;
                }
                setTimeout(check, 50);
            }
            check();
        });
    }

    function fillDate(date) {
        const month = document.getElementById('p-month');
        const day = document.getElementById('p-day');
        const year = document.getElementById('p-year');
        if (!month || !day || !year) {
            throw new Error('找不到 eBird 日期欄位。');
        }
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        selectOption(month, [date.month, String(date.month).padStart(2, '0')], [monthNames[date.month - 1], `${date.month}月`]);
        selectOption(day, [date.day, String(date.day).padStart(2, '0')], [String(date.day), `${date.day}日`]);
        selectOption(year, [date.year], [String(date.year), `${date.year}年`]);
    }

    async function fillEffort(record, options = {}) {
        if (record.errors.length > 0) {
            throw new Error(record.errors.join('\n'));
        }
        const preset = getLocationPresets()[record.location];
        if (!preset) {
            throw new Error(`尚未設定的地點：${record.location}`);
        }
        const currentLocId = new URLSearchParams(location.search).get('locID');
        const pageText = document.body ? document.body.textContent : '';
        const locationMatches = currentLocId
            ? currentLocId === preset.locId
            : pageText.includes(preset.pageName);
        if (!options.skipLocationCheck && !locationMatches) {
            throw new Error(`目前 eBird 地點不是「${record.location}」，請先選對地點。`);
        }
        fillDate(record.date);
        document.getElementById(record.effort.protocol).click();
        await waitForElement('p-shared-hr');
        const isAfternoon = record.effort.hour >= 12;
        const twelveHour = record.effort.hour % 12 || 12;
        setValue('p-shared-hr', twelveHour);
        setValue('p-shared-min', String(record.effort.minute).padStart(2, '0'));
        selectOption(
            document.getElementById('p-shared-ampm'),
            isAfternoon ? ['PM', 'pm', 'P'] : ['AM', 'am', 'A'],
            isAfternoon ? ['PM', '下午'] : ['AM', '上午']
        );
        setValue('p-dur-hrs', Math.floor(record.effort.durationMinutes / 60));
        setValue('p-dur-min', record.effort.durationMinutes % 60);
        setValue('p-dist', record.effort.distanceKm);
        setValue('p-party-size', record.effort.partySize);
        sessionStorage.setItem(storageKey, JSON.stringify(record));
        sessionStorage.removeItem(autoEffortKey);

        if (options.continueToSpecies !== false) {
            document.getElementById('btn-eff-continue').click();
        }
    }

    function startRecord(record) {
        if (record.errors.length > 0) {
            throw new Error(record.errors.join('\n'));
        }
        const preset = getLocationPresets()[record.location];
        if (!preset) {
            throw new Error(`尚未設定的地點：${record.location}`);
        }
        sessionStorage.setItem(storageKey, JSON.stringify(record));
        sessionStorage.setItem(autoEffortKey, 'true');
        const match = location.pathname.match(/^(.*?)\/submit(?:\/|$)/);
        const portalPrefix = match ? match[1] : '';
        location.assign(`${location.origin}${portalPrefix}/submit/effort?locID=${encodeURIComponent(preset.locId)}`);
    }

    async function applyObservationDetails(observation) {
        if (!observation.breedingCode && !observation.comments) {
            return;
        }
        const detailLink = await waitForElement(`add_${observation.code}`);
        detailLink.click();
        if (observation.breedingCode) {
            const breedingSelect = await waitForElement(`p-${observation.code}_bcode`);
            const option = Array.from(breedingSelect.options || []).find((item) => {
                const text = item.textContent.trim();
                return text === observation.breedingCode || text.startsWith(`${observation.breedingCode} `);
            });
            if (!option) {
                throw new Error(`找不到 ${observation.name} 的繁殖代碼 ${observation.breedingCode}。`);
            }
            breedingSelect.value = option.value;
            dispatchValueEvents(breedingSelect);
        }
        if (observation.comments) {
            setValue(`p-${observation.code}_comments`, observation.comments);
        }
    }

    function revealAdditionalSpeciesSections() {
        const controls = Array.from(document.querySelectorAll('button, a, label, summary, [role="button"]'));
        const sectionPattern = /^(?:show\s+)?(?:rarities|rare species|uncommon|not observed|no observations|不常見|稀有|稀有鳥種|無觀察紀錄|顯示稀有鳥種)$/i;
        let clicked = 0;
        controls.forEach((control) => {
            const text = control.textContent.replace(/\s+/g, ' ').trim();
            if (!sectionPattern.test(text)) {
                return;
            }
            const expanded = control.getAttribute('aria-expanded');
            const input = control.matches('input') ? control : control.querySelector('input[type="checkbox"]');
            if (expanded === 'true' || (input && input.checked)) {
                return;
            }
            control.click();
            clicked += 1;
        });
        return clicked;
    }

    async function fillSpecies(record, options = {}) {
        if (record.errors.length > 0) {
            throw new Error(record.errors.join('\n'));
        }
        const errors = [];
        const filledObservations = [];
        const missingBeforeReveal = record.observations.some((observation) => {
            const codes = observation.codes || [observation.code];
            return !codes.some((code) => document.getElementById(code));
        });
        if (missingBeforeReveal) {
            revealAdditionalSpeciesSections();
        }
        const countResults = await Promise.allSettled(record.observations.map(async (observation) => {
            const resolved = await waitForObservationField(observation, options.elementTimeoutMs ?? 4000);
            setCountValue(resolved.code, observation.count);
            return { ...observation, code: resolved.code };
        }));
        countResults.forEach((result, index) => {
            const observation = record.observations[index];
            if (result.status === 'fulfilled') {
                filledObservations.push(result.value);
            } else {
                errors.push(`${observation.name}（${observation.code}）：找不到數量欄位`);
            }
        });
        for (const observation of filledObservations) {
            try {
                await applyObservationDetails(observation);
            } catch (error) {
                errors.push(`${observation.name}（${observation.code}）：${error.message}`);
            }
        }
        const complete = document.getElementById('all-spp-y');
        if (!complete) {
            errors.push('找不到完整清單選項');
        } else if (errors.length === 0) {
            complete.click();
        }
        const submit = document.getElementById('btn-continue');
        if (submit) {
            submit.dataset.tmEbirdManualOnly = 'true';
            submit.title = 'Tampermonkey 未按下此按鈕；請人工確認後自行送出。';
        }
        return {
            filledCount: filledObservations.length,
            totalCount: record.observations.length,
            errors
        };
    }

    function addStyle() {
        if (document.getElementById(styleId)) {
            return;
        }
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            #${panelId} { box-sizing: border-box; position: fixed; z-index: 2147483647; right: 12px; top: 12px; width: min(390px, calc(100vw - 24px)); max-height: calc(100vh - 24px); max-height: calc(100dvh - 24px); overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding: 12px; border: 2px solid #2f7f45; border-radius: 8px; background: #fff; color: #222; box-shadow: 0 4px 18px #0004; font: 14px/1.45 sans-serif; }
            #${panelId} textarea { box-sizing: border-box; width: 100%; min-height: min(210px, 32vh); margin: 8px 0; padding: 8px; resize: vertical; }
            #${panelId} button { padding: 7px 12px; border: 0; border-radius: 5px; background: #2f7f45; color: #fff; cursor: pointer; }
            #${panelId} button:disabled { opacity: .55; cursor: default; }
            #${panelId} input, #${panelId} select { box-sizing: border-box; width: 100%; padding: 6px; }
            #${panelId} label { display: block; margin-top: 7px; font-size: 12px; }
            #${panelId} .tm-ebird-settings { margin-top: 10px; padding-top: 10px; border-top: 1px solid #bbb; }
            #${panelId} .tm-ebird-settings-body[hidden] { display: none; }
            #${panelId} .tm-ebird-settings-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
            #${panelId} .tm-ebird-secondary { background: #666; }
            #${panelId} .tm-ebird-danger { background: #9a2929; }
            #${panelId} .tm-ebird-local-note { margin: 6px 0; color: #555; font-size: 12px; }
            #${panelId} .tm-ebird-status { margin-top: 8px; white-space: pre-wrap; }
            #${panelId} .tm-ebird-error { color: #a40000; }
            #${panelId} .tm-ebird-ok { color: #176b2c; }
        `;
        document.head.appendChild(style);
    }

    function detectCurrentLocationName() {
        const link = document.getElementById('href_changeLoc') || document.getElementById('href_loc');
        if (!link) {
            return '';
        }
        const container = link.parentElement || link;
        return container.textContent.replace(link.textContent, '').trim();
    }

    function createSettingsEditor() {
        const section = document.createElement('div');
        section.className = 'tm-ebird-settings';
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'tm-ebird-secondary';
        toggle.textContent = '管理本機地點';
        const body = document.createElement('div');
        body.className = 'tm-ebird-settings-body';
        body.hidden = true;
        const note = document.createElement('p');
        note.className = 'tm-ebird-local-note';
        note.textContent = '先在 eBird 選擇地點並進到日期／努力量頁，再按「帶入目前地點」。設定只儲存在 Tampermonkey，不會上傳。';
        const existing = document.createElement('select');

        function addInput(labelText, type = 'text') {
            const label = document.createElement('label');
            label.textContent = labelText;
            const input = document.createElement('input');
            input.type = type;
            label.appendChild(input);
            body.appendChild(label);
            return input;
        }

        body.append(note, existing);
        const alias = addInput('文字紀錄中的地名簡稱');
        const locId = addInput('eBird 地點 ID（L 開頭）');
        const pageName = addInput('eBird 顯示名稱（可留白）');
        const distanceKm = addInput('預設距離（公里）', 'number');
        distanceKm.min = '0.01';
        distanceKm.step = '0.01';
        const partySize = addInput('預設人數', 'number');
        partySize.min = '1';
        partySize.step = '1';
        partySize.value = '1';
        const actions = document.createElement('div');
        actions.className = 'tm-ebird-settings-actions';
        const capture = document.createElement('button');
        capture.type = 'button';
        capture.className = 'tm-ebird-secondary';
        capture.textContent = '帶入目前地點';
        const save = document.createElement('button');
        save.type = 'button';
        save.textContent = '儲存地點設定';
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'tm-ebird-danger';
        remove.textContent = '刪除';
        const status = document.createElement('div');
        status.className = 'tm-ebird-status';
        actions.append(capture, save, remove);
        body.append(actions, status);

        function loadPreset(selectedAlias) {
            const preset = getLocationPresets()[selectedAlias];
            alias.value = selectedAlias || '';
            locId.value = preset ? preset.locId : '';
            pageName.value = preset ? preset.pageName : '';
            distanceKm.value = preset ? preset.distanceKm : '';
            partySize.value = preset ? preset.partySize : '1';
            remove.disabled = !preset;
        }

        function refresh(selectedAlias = '') {
            existing.textContent = '';
            const addOption = document.createElement('option');
            addOption.value = '';
            addOption.textContent = '新增地點…';
            existing.appendChild(addOption);
            Object.keys(getLocationPresets()).sort().forEach((name) => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                existing.appendChild(option);
            });
            existing.value = selectedAlias;
            loadPreset(selectedAlias);
        }

        toggle.addEventListener('click', () => {
            body.hidden = !body.hidden;
        });
        existing.addEventListener('change', () => loadPreset(existing.value));
        capture.addEventListener('click', () => {
            const currentLocId = new URLSearchParams(location.search).get('locID');
            if (!currentLocId) {
                status.textContent = '目前網址沒有 locID。請在 eBird「提交觀察紀錄」先選擇地點並繼續到日期／努力量頁，或直接手動填入 L 開頭的地點 ID。';
                status.className = 'tm-ebird-status tm-ebird-error';
                return;
            }
            locId.value = currentLocId;
            const detectedName = detectCurrentLocationName();
            if (detectedName) {
                pageName.value = detectedName;
            }
            status.textContent = '已帶入目前地點 ID；請填簡稱與預設距離後儲存。';
            status.className = 'tm-ebird-status tm-ebird-ok';
        });
        save.addEventListener('click', () => {
            try {
                saveLocationPreset(alias.value, {
                    locId: locId.value,
                    pageName: pageName.value,
                    distanceKm: distanceKm.value,
                    partySize: partySize.value
                });
                refresh(alias.value.trim());
                status.textContent = `已在本機儲存「${alias.value}」。`;
                status.className = 'tm-ebird-status tm-ebird-ok';
            } catch (error) {
                status.textContent = error.message;
                status.className = 'tm-ebird-status tm-ebird-error';
            }
        });
        remove.addEventListener('click', () => {
            const selectedAlias = existing.value;
            if (!selectedAlias) {
                return;
            }
            deleteLocationPreset(selectedAlias);
            refresh();
            status.textContent = `已刪除「${selectedAlias}」。`;
            status.className = 'tm-ebird-status tm-ebird-ok';
        });

        refresh();
        section.append(toggle, body);
        return section;
    }

    function appendRecordInput(panel, status, actionText, action) {
        const textarea = document.createElement('textarea');
        textarea.placeholder = '貼上日期、地點、時間與物種紀錄';
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = actionText;
        button.addEventListener('click', async () => {
            const record = parseRecord(textarea.value);
            status.textContent = [...record.errors, ...record.warnings].join('\n');
            status.className = `tm-ebird-status ${record.errors.length ? 'tm-ebird-error' : ''}`;
            if (record.errors.length) {
                return;
            }
            button.disabled = true;
            try {
                await action(record);
            } catch (error) {
                status.textContent = error.message;
                status.className = 'tm-ebird-status tm-ebird-error';
                button.disabled = false;
            }
        });
        panel.append(textarea, button, status);
        return { textarea, button };
    }

    function createPanel() {
        if (document.getElementById(panelId)) {
            return document.getElementById(panelId);
        }
        addStyle();
        const panel = document.createElement('section');
        panel.id = panelId;
        const title = document.createElement('strong');
        title.textContent = 'eBird 文字輸入助手';
        const status = document.createElement('div');
        status.className = 'tm-ebird-status';
        panel.appendChild(title);

        const isEffortPage = location.pathname.endsWith('/submit/effort');
        const isChecklistPage = location.pathname.endsWith('/submit/checklist');
        if (isChecklistPage) {
            const pending = sessionStorage.getItem(storageKey);
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = '重新填入物種';
            panel.append(button, status);
            if (!pending) {
                status.textContent = '沒有待填紀錄；請回到日期與努力量頁貼上文字。';
                status.className = 'tm-ebird-status tm-ebird-error';
                button.disabled = true;
            } else {
                const record = JSON.parse(pending);
                const run = async () => {
                    button.disabled = true;
                    try {
                        const result = await fillSpecies(record);
                        if (result.errors.length > 0) {
                            status.textContent = `已填入數量 ${result.filledCount}/${result.totalCount} 種；以下項目未完成：\n- ${result.errors.join('\n- ')}\n\n未勾選完整清單，也未送出。`;
                            status.className = 'tm-ebird-status tm-ebird-error';
                        } else {
                            status.textContent = `已完整填入 ${result.filledCount} 種。尚未送出，請人工確認 Submit。`;
                            status.className = 'tm-ebird-status tm-ebird-ok';
                        }
                    } catch (error) {
                        status.textContent = error.message;
                        status.className = 'tm-ebird-status tm-ebird-error';
                    } finally {
                        button.disabled = false;
                    }
                };
                button.addEventListener('click', run);
                setTimeout(run, 0);
            }
        } else if (isEffortPage) {
            const controls = appendRecordInput(panel, status, '解析、填入並前往物種', fillEffort);
            panel.appendChild(createSettingsEditor());
            const pending = sessionStorage.getItem(storageKey);
            if (pending && sessionStorage.getItem(autoEffortKey) === 'true') {
                sessionStorage.removeItem(autoEffortKey);
                const record = JSON.parse(pending);
                controls.textarea.value = record.source;
                controls.button.disabled = true;
                setTimeout(async () => {
                    try {
                        await fillEffort(record);
                    } catch (error) {
                        status.textContent = error.message;
                        status.className = 'tm-ebird-status tm-ebird-error';
                        controls.button.disabled = false;
                    }
                }, 0);
            }
        } else {
            appendRecordInput(panel, status, '解析並前往設定地點', startRecord);
            panel.appendChild(createSettingsEditor());
        }
        document.body.appendChild(panel);
        return panel;
    }

    const api = {
        getLocationPresets,
        saveLocationPreset,
        deleteLocationPreset,
        speciesAliases,
        parseRecord,
        startRecord,
        fillEffort,
        fillSpecies,
        revealAdditionalSpeciesSections,
        storageKey,
        autoEffortKey
    };
    globalThis.__ebirdTextInputAssistant = api;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createPanel, { once: true });
    } else {
        createPanel();
    }
})();
