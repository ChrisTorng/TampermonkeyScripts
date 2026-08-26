const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const scriptSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'TranslationCrashGuard.user.js'),
    'utf8'
);

function createStrictNodeClass() {
    return class StrictNode {
        constructor() {
            this.parentNode = null;
            this.children = [];
        }

        appendChild(child) {
            child.parentNode = this;
            this.children.push(child);
            return child;
        }

        removeChild(child) {
            const index = this.children.indexOf(child);
            if (index === -1) {
                throw new DOMException('The node to be removed is not a child of this node.', 'NotFoundError');
            }
            this.children.splice(index, 1);
            child.parentNode = null;
            return child;
        }

        insertBefore(newNode, referenceNode) {
            const index = this.children.indexOf(referenceNode);
            if (index === -1) {
                throw new DOMException('The reference node is not a child of this node.', 'NotFoundError');
            }
            newNode.parentNode = this;
            this.children.splice(index, 0, newNode);
            return newNode;
        }
    };
}

function installGuard() {
    const Node = createStrictNodeClass();
    const warnings = [];
    const context = vm.createContext({
        Node,
        Symbol,
        console: {
            warn: (...args) => warnings.push(args),
            log() {},
            error() {}
        }
    });
    vm.runInContext(scriptSource, context);
    return { Node, context, warnings };
}

test('Translation Crash Guard preserves valid DOM operations', () => {
    const { Node } = installGuard();
    const parent = new Node();
    const first = parent.appendChild(new Node());
    const second = new Node();

    assert.strictEqual(parent.insertBefore(second, first), second);
    assert.deepStrictEqual(parent.children, [second, first]);
    assert.strictEqual(parent.removeChild(second), second);
    assert.deepStrictEqual(parent.children, [first]);
});

test('Translation Crash Guard tolerates nodes moved into translation wrappers', () => {
    const { Node, warnings } = installGuard();
    const applicationParent = new Node();
    const translationWrapper = applicationParent.appendChild(new Node());
    const translatedText = translationWrapper.appendChild(new Node());
    const replacement = new Node();

    assert.doesNotThrow(() => applicationParent.removeChild(translatedText));
    assert.strictEqual(applicationParent.insertBefore(replacement, translatedText), replacement);
    assert.strictEqual(replacement.parentNode, null);
    assert.strictEqual(warnings.length, 2);
});

test('Translation Crash Guard installs only once', () => {
    const { Node, context } = installGuard();
    const patchedRemoveChild = Node.prototype.removeChild;

    vm.runInContext(scriptSource, context);

    assert.strictEqual(Node.prototype.removeChild, patchedRemoveChild);
});
