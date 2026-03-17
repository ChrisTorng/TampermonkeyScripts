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
        buttonsArea,
        emojiWrapper,
        appsWrapper,
        separator,
        sendContainer,
        sendButtonContainer,
        sendButton,
    };
}

function executeBetterDiscord(url) {
    const harness = createHarness({ url, readyState: 'loading' });
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
});
