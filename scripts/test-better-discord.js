const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'BetterDiscord.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');
const fixturePath = path.join(repoRoot, 'tests', 'Better Discord', 'discord.com_channels_1475861167476965439_1475861168412164149.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

function buildDiscordComposer(harness, options = {}) {
    const { legacyCollapsedSendArea = false, legacyHiddenButtonsArea = false } = options;
    const form = harness.document.createElement('form');
    form.className = 'form_f75fb0';
    const channelBottomBar = harness.document.createElement('div');
    channelBottomBar.className = 'channelBottomBarArea_f75fb0';
    const textArea = harness.document.createElement('div');
    textArea.className = 'channelTextArea_f75fb0';
    const buttonsArea = harness.document.createElement('div');
    buttonsArea.className = 'buttons__74017';
    buttonsArea.style.setProperty('width', legacyHiddenButtonsArea ? '48px' : '32px');
    buttonsArea.style.setProperty('min-width', legacyHiddenButtonsArea ? '48px' : '32px');
    buttonsArea.style.setProperty('padding', '8px');
    buttonsArea.style.setProperty('gap', '8px');
    if (legacyHiddenButtonsArea) {
        buttonsArea.style.setProperty('display', 'none');
    }
    const emojiWrapper = harness.document.createElement('div');
    emojiWrapper.className = 'expression-picker-chat-input-button buttonContainer__74017';
    const emojiButton = harness.document.createElement('div');
    emojiButton.setAttribute('aria-label', 'Add Emoji');
    emojiWrapper.appendChild(emojiButton);
    const appsWrapper = harness.document.createElement('div');
    appsWrapper.className = 'buttonContainer_e6e74f app-launcher-entrypoint';
    const appsButton = harness.document.createElement('div');
    appsButton.setAttribute('aria-label', 'Apps');
    appsWrapper.appendChild(appsButton);
    buttonsArea.appendChild(emojiWrapper);
    buttonsArea.appendChild(appsWrapper);

    const separator = harness.document.createElement('div');
    separator.className = 'separator_aa63ab';
    if (legacyHiddenButtonsArea) {
        separator.style.setProperty('display', 'none');
    }
    const sendContainer = harness.document.createElement('div');
    sendContainer.className = 'container_aa63ab';
    sendContainer.style.margin = '8px';
    sendContainer.style.padding = '8px';
    sendContainer.style.setProperty('width', legacyCollapsedSendArea ? '0px' : '40px');
    sendContainer.style.setProperty('min-width', legacyCollapsedSendArea ? '0px' : '40px');
    const sendButtonContainer = harness.document.createElement('div');
    sendButtonContainer.className = 'buttonContainer_aa63ab';
    sendButtonContainer.style.margin = '8px';
    sendButtonContainer.style.padding = '8px';
    sendButtonContainer.style.setProperty('width', legacyCollapsedSendArea ? '0px' : '32px');
    sendButtonContainer.style.setProperty('min-width', legacyCollapsedSendArea ? '0px' : '32px');
    const sendButton = harness.document.createElement('div');
    sendButton.className = 'button_aa63ab';
    sendButton.setAttribute('aria-label', 'Send Message');
    sendButtonContainer.appendChild(sendButton);
    sendContainer.appendChild(sendButtonContainer);

    textArea.appendChild(buttonsArea);
    textArea.appendChild(separator);
    textArea.appendChild(sendContainer);
    channelBottomBar.appendChild(textArea);
    form.appendChild(channelBottomBar);
    harness.appendToBody(form);

    return {
        form,
        textArea,
        buttonsArea,
        emojiWrapper,
        appsWrapper,
        separator,
        sendContainer,
        sendButtonContainer,
        sendButton,
    };
}

function executeBetterDiscord(url, userAgent = '') {
    const harness = createHarness({ url, readyState: 'loading' });
    if (userAgent) {
        harness.context.navigator = { userAgent };
    }
    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    return harness;
}

describe('BetterDiscord on captured Discord pages', () => {
    test('fixture contains captured Discord chat input content', () => {
        assert.match(fixtureHtml, /CONTENT_CLASS:\s*VALID_NON_ARTICLE_OR_LISTING/);
        assert.match(fixtureHtml, /discord\.com/i);
        assert.match(fixtureHtml, /expression-picker-chat-input-button/);
        assert.match(fixtureHtml, /app-launcher-entrypoint/);
        assert.match(fixtureHtml, /aria-label="Send Message"/);
    });

    test('script hides emoji and app buttons while leaving the send area to Discord', () => {
        const harness = executeBetterDiscord('https://discord.com/channels/1475861167476965439/1475861168412164149');
        const composer = buildDiscordComposer(harness);

        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.equal(composer.emojiWrapper.style.getPropertyValue('display'), 'none');
        assert.equal(composer.appsWrapper.style.getPropertyValue('display'), 'none');
        assert.equal(composer.separator.style.getPropertyValue('display'), 'none');
        assert.equal(composer.buttonsArea.style.getPropertyValue('display'), '');
        assert.equal(composer.buttonsArea.style.getPropertyValue('width'), '');
        assert.equal(composer.buttonsArea.style.getPropertyValue('min-width'), '');
        assert.equal(composer.sendContainer.style.getPropertyValue('margin'), '');
        assert.equal(composer.sendContainer.style.getPropertyValue('padding'), '');
        assert.equal(composer.sendContainer.style.getPropertyValue('width'), '');
        assert.equal(composer.sendContainer.style.getPropertyValue('min-width'), '');
        assert.equal(composer.sendButtonContainer.style.getPropertyValue('margin'), '');
        assert.equal(composer.sendButtonContainer.style.getPropertyValue('padding'), '');
        assert.equal(composer.sendButtonContainer.style.getPropertyValue('width'), '');
        assert.equal(composer.sendButtonContainer.style.getPropertyValue('min-width'), '');
        assert.equal(composer.sendButtonContainer.style.getPropertyValue('display'), '');
        assert.equal(composer.sendButton.style.getPropertyValue('display'), '');
    });

    test('script removes stale collapsed send-area styles left by older versions', () => {
        const harness = executeBetterDiscord('https://discord.com/channels/1475861167476965439/1475861168412164149');
        const composer = buildDiscordComposer(harness, {
            legacyCollapsedSendArea: true,
            legacyHiddenButtonsArea: true,
        });

        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.equal(composer.buttonsArea.style.getPropertyValue('display'), '');
        assert.equal(composer.buttonsArea.style.getPropertyValue('width'), '');
        assert.equal(composer.buttonsArea.style.getPropertyValue('min-width'), '');
        assert.equal(composer.separator.style.getPropertyValue('display'), 'none');
        assert.equal(composer.sendContainer.style.getPropertyValue('width'), '');
        assert.equal(composer.sendContainer.style.getPropertyValue('min-width'), '');
        assert.equal(composer.sendButtonContainer.style.getPropertyValue('width'), '');
        assert.equal(composer.sendButtonContainer.style.getPropertyValue('min-width'), '');
        assert.equal(composer.sendButtonContainer.style.getPropertyValue('display'), '');
        assert.equal(composer.sendButton.style.getPropertyValue('display'), '');
    });

    test('mutation observer applies the same cleanup when the composer appears later', () => {
        const harness = executeBetterDiscord('https://discord.com/channels/1475861167476965439/1475861168412164149');
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const composer = buildDiscordComposer(harness);
        harness.triggerMutation([composer.buttonsArea.parentElement], { target: harness.document.body });

        assert.equal(composer.emojiWrapper.style.getPropertyValue('display'), 'none');
        assert.equal(composer.appsWrapper.style.getPropertyValue('display'), 'none');
        assert.equal(composer.separator.style.getPropertyValue('display'), 'none');
        assert.equal(composer.buttonsArea.style.getPropertyValue('display'), '');
        assert.equal(composer.sendContainer.style.getPropertyValue('margin'), '');
        assert.equal(composer.sendButtonContainer.style.getPropertyValue('width'), '');
        assert.equal(composer.sendButton.style.getPropertyValue('display'), '');
    });

    test('Android Edge closes the measured gap above the software keyboard', () => {
        const harness = executeBetterDiscord('https://discord.com/channels/1475861167476965439/1475861168412164149?bddebug=1', 'Mozilla/5.0 (Linux; Android 16) EdgA/146.0');
        const composer = buildDiscordComposer(harness);
        const editor = harness.document.createElement('div');
        editor.setAttribute('contenteditable', 'true');
        editor.isContentEditable = true;
        composer.textArea.appendChild(editor);
        harness.dispatchDocumentEvent('DOMContentLoaded');
        const fixButton = harness.document.querySelector('section[data-bd-debug] button');
        assert.ok(fixButton, 'the experimental repair is opt-in');
        fixButton.click();
        harness.flushAnimationFrames();

        harness.document.activeElement = editor;
        let unadjustedBottom = 280;
        composer.form.getBoundingClientRect = () => {
            const translate = composer.form.style.getPropertyValue('translate');
            const shift = Number.parseFloat(translate.split(' ')[1]) || 0;
            return { bottom: unadjustedBottom + shift };
        };
        harness.window.visualViewport.height = 360;
        harness.dispatchDocumentEvent('focusin');
        harness.dispatchVisualViewportEvent('resize');
        harness.flushAnimationFrames();
        assert.equal(composer.form.style.getPropertyValue('translate'), '0 80.0px');

        harness.dispatchVisualViewportEvent('scroll');
        harness.flushAnimationFrames();
        assert.equal(composer.form.style.getPropertyValue('translate'), '0 80.0px');

        unadjustedBottom = 285;
        harness.dispatchVisualViewportEvent('resize');
        harness.flushAnimationFrames();
        assert.equal(composer.form.style.getPropertyValue('translate'), '0 75.0px');

        harness.document.activeElement = null;
        harness.dispatchDocumentEvent('focusout');
        harness.flushAnimationFrames();
        assert.equal(composer.form.style.getPropertyValue('translate'), '');
    });

    test('Windows Edge does not apply any Android keyboard positioning', () => {
        const harness = executeBetterDiscord('https://discord.com/channels/1475861167476965439/1475861168412164149', 'Mozilla/5.0 (Windows NT 10.0) Edg/146.0');
        const composer = buildDiscordComposer(harness);
        const editor = harness.document.createElement('div');
        editor.setAttribute('contenteditable', 'true');
        editor.isContentEditable = true;
        composer.textArea.appendChild(editor);
        harness.dispatchDocumentEvent('DOMContentLoaded');
        harness.document.activeElement = editor;
        harness.window.visualViewport.height = 360;
        harness.dispatchVisualViewportEvent('resize');
        harness.flushAnimationFrames();
        assert.equal(composer.form.style.getPropertyValue('translate'), '');
    });

    test('Android Edge expands a short Discord app root instead of moving a clipped form', () => {
        const harness = executeBetterDiscord('https://discord.com/channels/1/2?bddebug=1', 'Mozilla/5.0 (Linux; Android 16) EdgA/146.0');
        const composer = buildDiscordComposer(harness);
        const editor = harness.document.createElement('div');
        editor.setAttribute('contenteditable', 'true');
        editor.isContentEditable = true;
        composer.textArea.appendChild(editor);

        const app = harness.document.createElement('div');
        app.id = 'app-mount';
        harness.document.body.removeChild(composer.form);
        app.appendChild(composer.form);
        harness.appendToBody(app);

        app.getBoundingClientRect = () => {
            const height = Number.parseFloat(app.style.getPropertyValue('height')) || 280;
            return { top: 0, bottom: height, height };
        };
        composer.form.getBoundingClientRect = () => ({
            bottom: app.getBoundingClientRect().bottom,
        });

        harness.dispatchDocumentEvent('DOMContentLoaded');
        const fixButton = harness.document.querySelector('section[data-bd-debug] button');
        assert.ok(fixButton, 'the experimental repair is opt-in');
        fixButton.click();
        harness.document.activeElement = editor;
        harness.window.visualViewport.height = 360;
        harness.dispatchDocumentEvent('focusin');
        harness.dispatchVisualViewportEvent('resize');
        harness.flushAnimationFrames();

        assert.equal(app.style.getPropertyValue('height'), '360px');
        assert.equal(app.style.getPropertyValue('min-height'), '360px');
        assert.equal(app.style.getPropertyValue('max-height'), 'none');
        assert.equal(composer.form.style.getPropertyValue('translate'), '');

        // Repeated scroll/resize events must not accumulate a correction.
        harness.dispatchVisualViewportEvent('scroll');
        harness.flushAnimationFrames();
        assert.equal(app.style.getPropertyValue('height'), '360px');

        harness.document.activeElement = null;
        harness.dispatchDocumentEvent('focusout');
        harness.flushAnimationFrames();
        assert.equal(app.style.getPropertyValue('height'), '');
        assert.equal(app.style.getPropertyValue('min-height'), '');
        assert.equal(app.style.getPropertyValue('max-height'), '');
    });

    test('Android Edge expands the short chat container when its app root is full height', () => {
        const harness = executeBetterDiscord('https://discord.com/channels/1/2?bddebug=1', 'Mozilla/5.0 (Linux; Android 16) EdgA/146.0');
        const composer = buildDiscordComposer(harness);
        const editor = harness.document.createElement('div');
        editor.setAttribute('contenteditable', 'true');
        editor.isContentEditable = true;
        composer.textArea.appendChild(editor);

        const app = harness.document.createElement('div');
        app.id = 'app-mount';
        const chat = harness.document.createElement('section');
        chat.className = 'chat_f75fb0';
        harness.document.body.removeChild(composer.form);
        chat.appendChild(composer.form);
        app.appendChild(chat);
        harness.appendToBody(app);

        app.getBoundingClientRect = () => ({ top: 0, bottom: 360, height: 360 });
        chat.getBoundingClientRect = () => {
            const height = Number.parseFloat(chat.style.getPropertyValue('height')) || 260;
            return { top: 20, bottom: 20 + height, height };
        };
        composer.form.getBoundingClientRect = () => ({
            bottom: chat.getBoundingClientRect().bottom,
        });

        harness.dispatchDocumentEvent('DOMContentLoaded');
        const fixButton = harness.document.querySelector('section[data-bd-debug] button');
        assert.ok(fixButton, 'the experimental repair is opt-in');
        fixButton.click();
        harness.document.activeElement = editor;
        harness.window.visualViewport.height = 360;
        harness.dispatchVisualViewportEvent('resize');
        harness.flushAnimationFrames();

        assert.equal(app.style.getPropertyValue('height'), '');
        assert.equal(chat.style.getPropertyValue('height'), '340px');
        assert.equal(composer.form.style.getPropertyValue('translate'), '');

        harness.document.activeElement = null;
        harness.dispatchDocumentEvent('focusout');
        harness.flushAnimationFrames();
        assert.equal(chat.style.getPropertyValue('height'), '');
    });

    test('Android diagnostic query captures viewport geometry without applying the layout fix', () => {
        const harness = executeBetterDiscord(
            'https://discord.com/channels/1/2?bddebug=1',
            'Mozilla/5.0 (Linux; Android 16) EdgA/146.0');
        const composer = buildDiscordComposer(harness);
        const editor = harness.document.createElement('div');
        editor.setAttribute('contenteditable', 'true');
        editor.isContentEditable = true;
        composer.textArea.appendChild(editor);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const panel = harness.document.querySelector('section[data-bd-debug]');
        assert.ok(panel, 'Android diagnostic panel should be present');
        const buttons = panel.querySelectorAll('button');
        const findButton = (name) => buttons.find((item) => item.textContent === name);
        assert.ok(findButton('Fix: OFF'), 'original geometry should be captured with the fix disabled');
        assert.ok(findButton('Capture'));
        assert.ok(findButton('Copy log'));
        assert.ok(findButton('Save JSON'));

        harness.document.activeElement = editor;
        composer.form.getBoundingClientRect = () => {
            const shift = Number.parseFloat(
                composer.form.style.getPropertyValue('translate').split(' ')[1]) || 0;
            return { top: 220, bottom: 280 + shift, height: 60, width: 320, left: 0, right: 320 };
        };
        harness.window.visualViewport.height = 360;
        harness.dispatchDocumentEvent('focusin');
        harness.dispatchVisualViewportEvent('resize');
        harness.flushAnimationFrames();

        assert.equal(composer.form.style.getPropertyValue('translate'), '');
        const report = panel.querySelector('pre').textContent;
        assert.match(report, /Fix OFF/);
        assert.match(report, /focused true/);
        assert.match(report, /gap 80px/);
        assert.match(report, /vvH 360/);

        findButton('Fix: OFF').click();
        harness.flushAnimationFrames();
        assert.equal(composer.form.style.getPropertyValue('translate'), '0 80.0px');
        assert.ok(findButton('Fix: ON'), 'fix should be switchable on demand');

        findButton('Fix: ON').click();
        harness.flushAnimationFrames();
        assert.equal(composer.form.style.getPropertyValue('translate'), '');
        findButton('Close').click();
        assert.equal(harness.document.querySelector('section[data-bd-debug]'), null);
    });


    test('Android Edge preserves native layout with the experimental fix disabled by default', () => {
        const harness = executeBetterDiscord('https://discord.com/channels/1/2', 'Mozilla/5.0 (Linux; Android 16) EdgA/146.0');
        const composer = buildDiscordComposer(harness);
        const editor = harness.document.createElement('textarea');
        // The lightweight harness does not implement comma-separated Element.matches selectors.
        editor.matches = selector => selector.split(',').some(part => part.trim() === 'textarea');
        composer.textArea.appendChild(editor);
        harness.dispatchDocumentEvent('DOMContentLoaded');
        harness.document.activeElement = editor;
        composer.form.getBoundingClientRect = () => ({ top: 220, bottom: 280, height: 60 });
        harness.window.visualViewport.height = 360;
        harness.dispatchDocumentEvent('focusin');
        harness.dispatchVisualViewportEvent('resize');
        harness.flushAnimationFrames();
        assert.equal(composer.form.style.getPropertyValue('translate'), '');
        assert.equal(composer.form.style.getPropertyValue('height'), '');
    });

    test('closing diagnostics removes an active experimental keyboard correction', () => {
        const harness = executeBetterDiscord('https://discord.com/channels/1/2?bddebug=1', 'Mozilla/5.0 (Linux; Android 16) EdgA/146.0');
        const composer = buildDiscordComposer(harness);
        const editor = harness.document.createElement('textarea');
        // The lightweight harness does not implement comma-separated Element.matches selectors.
        editor.matches = selector => selector.split(',').some(part => part.trim() === 'textarea');
        composer.textArea.appendChild(editor);
        harness.dispatchDocumentEvent('DOMContentLoaded');
        const panel = harness.document.querySelector('section[data-bd-debug]');
        const findButton = name => panel.querySelectorAll('button').find(button => button.textContent === name);
        harness.document.activeElement = editor;
        composer.form.getBoundingClientRect = () => {
            const shift = Number.parseFloat(composer.form.style.getPropertyValue('translate').split(' ')[1]) || 0;
            return { top: 220 + shift, bottom: 280 + shift, height: 60 };
        };
        harness.window.visualViewport.height = 360;
        findButton('Fix: OFF').click();
        harness.flushAnimationFrames();
        assert.equal(composer.form.style.getPropertyValue('translate'), '0 80.0px');
        findButton('Close').click();
        harness.flushAnimationFrames();
        assert.equal(composer.form.style.getPropertyValue('translate'), '');
        harness.dispatchVisualViewportEvent('resize');
        harness.flushAnimationFrames();
        assert.equal(composer.form.style.getPropertyValue('translate'), '');
    });

    test('Windows Edge ignores Android diagnostic URL parameter', () => {
        const harness = executeBetterDiscord(
            'https://discord.com/channels/1/2?bddebug=1',
            'Mozilla/5.0 (Windows NT 10.0) Edg/146.0');
        buildDiscordComposer(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');
        assert.equal(harness.document.querySelector('section[data-bd-debug]'), null);
    });

});
