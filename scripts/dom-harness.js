class StyleDeclaration {
    constructor() {
        this._values = new Map();
        this._priorities = new Map();
        this.cssText = '';
    }

    setProperty(name, value, priority = '') {
        const normalizedValue = String(value);
        const normalizedPriority = String(priority);
        this._values.set(name, normalizedValue);
        this._priorities.set(name, normalizedPriority);
        this[name] = normalizedValue;
    }

    getPropertyValue(name) {
        return this._values.get(name) || '';
    }

    getPropertyPriority(name) {
        return this._priorities.get(name) || '';
    }

    removeProperty(name) {
        this._values.delete(name);
        this._priorities.delete(name);
        delete this[name];
    }
}

class ClassList {
    constructor(element) {
        this.element = element;
    }

    _getTokens() {
        return this.element.className ? this.element.className.split(/\s+/).filter(Boolean) : [];
    }

    add(...tokens) {
        const next = new Set(this._getTokens());
        tokens.forEach((token) => next.add(token));
        this.element.className = Array.from(next).join(' ');
    }

    remove(...tokens) {
        const toRemove = new Set(tokens);
        this.element.className = this._getTokens().filter((token) => !toRemove.has(token)).join(' ');
    }

    contains(token) {
        return this._getTokens().includes(token);
    }

    toggle(token, force) {
        if (force === true) {
            this.add(token);
            return true;
        }
        if (force === false) {
            this.remove(token);
            return false;
        }
        if (this.contains(token)) {
            this.remove(token);
            return false;
        }
        this.add(token);
        return true;
    }
}

class RelList {
    constructor(element) {
        this.element = element;
    }

    add(...tokens) {
        const next = new Set((this.element.rel || '').split(/\s+/).filter(Boolean));
        tokens.forEach((token) => next.add(token));
        this.element.rel = Array.from(next).join(' ');
    }
}

class BasicNode {
    constructor(nodeType) {
        this.nodeType = nodeType;
        this.parentNode = null;
        this.parentElement = null;
        this.ownerDocument = null;
        this.children = [];
        this.eventListeners = new Map();
        this.isConnected = false;
    }

    appendChild(child) {
        child.parentNode = this;
        child.parentElement = this.nodeType === 1 ? this : null;
        child.ownerDocument = this.ownerDocument || this;
        this.children.push(child);
        child._setConnected(this.isConnected);
        return child;
    }

    append(...nodes) {
        nodes.forEach((node) => this.appendChild(node));
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index === -1) {
            return child;
        }
        this.children.splice(index, 1);
        child.parentNode = null;
        child.parentElement = null;
        child._setConnected(false);
        return child;
    }

    insertBefore(newNode, referenceNode) {
        const index = this.children.indexOf(referenceNode);
        if (index === -1) {
            return this.appendChild(newNode);
        }
        newNode.parentNode = this;
        newNode.parentElement = this.nodeType === 1 ? this : null;
        newNode.ownerDocument = this.ownerDocument || this;
        this.children.splice(index, 0, newNode);
        newNode._setConnected(this.isConnected);
        return newNode;
    }

    addEventListener(type, listener) {
        if (!this.eventListeners.has(type)) {
            this.eventListeners.set(type, []);
        }
        this.eventListeners.get(type).push(listener);
    }

    removeEventListener(type, listener) {
        if (!this.eventListeners.has(type)) {
            return;
        }
        this.eventListeners.set(
            type,
            this.eventListeners.get(type).filter((entry) => entry !== listener)
        );
    }

    dispatchEvent(event) {
        const listeners = this.eventListeners.get(event.type) || [];
        event.target = event.target || this;
        event.currentTarget = this;
        listeners.forEach((listener) => listener.call(this, event));
        return !event.defaultPrevented;
    }

    _setConnected(isConnected) {
        this.isConnected = isConnected;
        this.children.forEach((child) => child._setConnected(isConnected));
    }
}

class BasicElement extends BasicNode {
    constructor(tagName) {
        super(1);
        this.tagName = String(tagName).toUpperCase();
        this.attributes = new Map();
        this.style = new StyleDeclaration();
        this.dataset = createDatasetProxy(this);
        this.className = '';
        this.id = '';
        this.textContent = '';
        this.rel = '';
        this.target = '';
        this.href = '';
        this.title = '';
        this.type = '';
        this.disabled = false;
        this.offsetWidth = 32;
        this.offsetHeight = 32;
        this.offsetLeft = 0;
        this.offsetTop = 0;
        this.clientWidth = 1280;
        this.clientHeight = 720;
        this.scrollHeight = 720;
        this.scrollTop = 0;
        this.hidden = false;
        this.shadowRoot = null;
        this.classList = new ClassList(this);
        this.relList = new RelList(this);
        this.scrollIntoViewCallCount = 0;
        this.scrollIntoViewArgs = [];
    }

    setAttribute(name, value) {
        const normalizedValue = String(value);
        this.attributes.set(name, normalizedValue);
        if (name === 'id') {
            this.id = normalizedValue;
        }
        if (name === 'class') {
            this.className = normalizedValue;
        }
        if (name === 'href') {
            this.href = normalizedValue;
        }
    }

    getAttribute(name) {
        if (name === 'id') {
            return this.id || null;
        }
        if (name === 'class') {
            return this.className || null;
        }
        if (name === 'href') {
            return this.href || null;
        }
        return this.attributes.get(name) || null;
    }

    hasAttribute(name) {
        return this.getAttribute(name) !== null;
    }

    removeAttribute(name) {
        this.attributes.delete(name);
        if (name === 'id') {
            this.id = '';
        }
        if (name === 'class') {
            this.className = '';
        }
        if (name === 'href') {
            this.href = '';
        }
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
    }

    querySelectorAll(selector) {
        const selectors = selector.split(',').map((item) => item.trim()).filter(Boolean);
        const results = [];

        const visit = (node) => {
            if (!(node instanceof BasicElement)) {
                return;
            }

            if (selectors.some((entry) => matchesSelector(node, entry))) {
                results.push(node);
            }

            node.children.forEach(visit);
        };

        this.children.forEach(visit);
        return results;
    }

    matches(selector) {
        return matchesSelector(this, selector);
    }

    insertAdjacentElement(position, element) {
        if (position !== 'afterend' || !this.parentNode) {
            return element;
        }

        const siblings = this.parentNode.children;
        const currentIndex = siblings.indexOf(this);
        if (currentIndex === -1) {
            return this.parentNode.appendChild(element);
        }

        element.parentNode = this.parentNode;
        element.parentElement = this.parentElement;
        element.ownerDocument = this.ownerDocument;
        siblings.splice(currentIndex + 1, 0, element);
        element._setConnected(this.isConnected);
        return element;
    }

    scrollIntoView() {
        this.scrollIntoViewCallCount += 1;
        this.scrollIntoViewArgs.push(arguments[0]);
    }

    click() {
        const event = createMouseEvent('click');
        this.dispatchEvent(event);
        return event;
    }

    remove() {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    }

    closest(selector) {
        let current = this;
        while (current) {
            if (current instanceof BasicElement && current.matches(selector)) {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    }

    getBoundingClientRect() {
        if (this._rect) {
            return this._rect;
        }
        return {
            top: this.offsetTop,
            left: this.offsetLeft,
            right: this.offsetLeft + this.clientWidth,
            bottom: this.offsetTop + this.clientHeight,
            width: this.clientWidth,
            height: this.clientHeight
        };
    }

    getClientRects() {
        const rect = this.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            return [];
        }
        return [rect];
    }

    get firstChild() {
        return this.children[0] || null;
    }

    get previousElementSibling() {
        if (!this.parentElement) {
            return null;
        }
        const siblings = this.parentElement.children.filter((child) => child instanceof BasicElement);
        const index = siblings.indexOf(this);
        if (index <= 0) {
            return null;
        }
        return siblings[index - 1];
    }

    get nextElementSibling() {
        if (!this.parentElement) {
            return null;
        }
        const siblings = this.parentElement.children.filter((child) => child instanceof BasicElement);
        const index = siblings.indexOf(this);
        if (index === -1 || index + 1 >= siblings.length) {
            return null;
        }
        return siblings[index + 1];
    }
}

class BasicDocumentFragment extends BasicNode {
    constructor() {
        super(11);
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
    }

    querySelectorAll(selector) {
        const root = new BasicElement('fragment-root');
        this.children.forEach((child) => root.appendChild(child));
        return root.querySelectorAll(selector);
    }
}

class BasicDocument extends BasicNode {
    constructor(url, readyState = 'complete') {
        super(9);
        this.ownerDocument = this;
        this.readyState = readyState;
        this.baseURI = url;
        this.referrer = '';
        this.documentElement = new BasicElement('html');
        this.documentElement.ownerDocument = this;
        this.documentElement._setConnected(true);
        this.head = new BasicElement('head');
        this.body = new BasicElement('body');
        this.documentElement.appendChild(this.head);
        this.documentElement.appendChild(this.body);
        this.documentElement.clientWidth = 1280;
        this.documentElement.clientHeight = 720;
        this.body.clientWidth = 1280;
        this.body.clientHeight = 720;
        this.children = [this.documentElement];
        this.defaultView = null;
        this.URL = url;
        this.scrollingElement = this.documentElement;
    }

    createElement(tagName) {
        const element = new BasicElement(tagName);
        element.ownerDocument = this;
        return element;
    }

    createDocumentFragment() {
        const fragment = new BasicDocumentFragment();
        fragment.ownerDocument = this;
        return fragment;
    }

    createTreeWalker(root) {
        const nodes = [];
        const visit = (node) => {
            if (node instanceof BasicElement) {
                nodes.push(node);
            }
            if (node.children) {
                node.children.forEach(visit);
            }
        };
        visit(root);
        let index = 0;
        return {
            currentNode: root,
            nextNode() {
                if (index >= nodes.length) {
                    return null;
                }
                return nodes[index++];
            }
        };
    }

    getElementById(id) {
        return this.querySelector(`#${id}`);
    }

    querySelector(selector) {
        return this.documentElement.querySelector(selector);
    }

    querySelectorAll(selector) {
        return this.documentElement.querySelectorAll(selector);
    }
}

function createMouseEvent(type) {
    return {
        type,
        button: 0,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        defaultPrevented: false,
        preventDefault() {
            this.defaultPrevented = true;
        }
    };
}

function createDatasetProxy(element) {
    const store = {};
    return new Proxy(store, {
        get(target, property) {
            return target[property];
        },
        set(target, property, value) {
            target[property] = String(value);
            const attributeName = `data-${String(property).replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`;
            element.attributes.set(attributeName, target[property]);
            return true;
        },
        deleteProperty(target, property) {
            delete target[property];
            const attributeName = `data-${String(property).replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`;
            element.attributes.delete(attributeName);
            return true;
        }
    });
}

function matchesSelector(element, selector) {
    const parts = selector.trim().split(/\s+/).filter(Boolean);
    return matchesSelectorParts(element, parts.length - 1, parts);
}

function matchesSelectorParts(element, partIndex, parts) {
    if (partIndex < 0) {
        return true;
    }

    if (!matchesSimpleSelector(element, parts[partIndex])) {
        return false;
    }

    if (partIndex === 0) {
        return true;
    }

    let current = element.parentElement;
    while (current) {
        if (matchesSelectorParts(current, partIndex - 1, parts)) {
            return true;
        }
        current = current.parentElement;
    }

    return false;
}

function matchesSimpleSelector(element, selector) {
    const attributeMatches = Array.from(selector.matchAll(/\[([^\]=*]+)(\*?=)?(?:"([^"]*)"|'([^']*)')?\]/g));
    const selectorWithoutAttributes = selector.replace(/\[[^\]]+\]/g, '');
    const tagMatch = selectorWithoutAttributes.match(/^[a-zA-Z*][a-zA-Z0-9-]*/);
    const classMatches = Array.from(selectorWithoutAttributes.matchAll(/\.((?:\\.|[a-zA-Z0-9:_-])+)/g))
        .map((match) => match[1].replace(/\\/g, ''));
    const idMatch = selectorWithoutAttributes.match(/#([a-zA-Z0-9_-]+)/);

    if (tagMatch && tagMatch[0] !== '*' && element.tagName.toLowerCase() !== tagMatch[0].toLowerCase()) {
        return false;
    }

    if (idMatch && element.id !== idMatch[1]) {
        return false;
    }

    if (classMatches.some((className) => !element.classList.contains(className))) {
        return false;
    }

    for (const match of attributeMatches) {
        const attributeName = match[1];
        const operator = match[2] || null;
        const expectedValue = match[3] || match[4] || '';
        const actualValue = getAttributeValue(element, attributeName);

        if (actualValue === null) {
            return false;
        }

        if (!operator) {
            continue;
        }

        if (operator === '=' && actualValue !== expectedValue) {
            return false;
        }

        if (operator === '*=' && !actualValue.includes(expectedValue)) {
            return false;
        }
    }

    return true;
}

function getAttributeValue(element, attributeName) {
    if (attributeName === 'class') {
        return element.className || '';
    }
    if (attributeName === 'href') {
        return element.href || '';
    }
    if (attributeName === 'id') {
        return element.id || '';
    }
    return element.getAttribute(attributeName);
}

function createHarness(options) {
    const {
        url,
        readyState = 'complete',
        gmInfo = null,
        matchMedia = null,
        computedFontSize = '16px',
        computedStyle = null,
        referrer = '',
        sessionStorageSeed = {},
        navigationType = 'navigate'
    } = options;

    const document = new BasicDocument(url, readyState);
    document.referrer = referrer;
    const observers = new Set();
    const timeouts = new Map();
    const intervals = new Map();
    const windowEventListeners = new Map();
    let nextTimeoutId = 1;
    let nextIntervalId = 1;
    let nextRafId = 1;
    const animationFrameQueue = new Map();
    const storageState = new Map(Object.entries(sessionStorageSeed));

    const location = {
        href: url,
        hostname: new URL(url).hostname,
        origin: new URL(url).origin,
        pathname: new URL(url).pathname,
        search: new URL(url).search,
        hash: new URL(url).hash,
        replacedUrl: null,
        assignedUrl: null,
        reloadCallCount: 0,
        replace(targetUrl) {
            this.replacedUrl = String(targetUrl);
            updateLocation(String(targetUrl));
        },
        assign(targetUrl) {
            this.assignedUrl = String(targetUrl);
            updateLocation(String(targetUrl));
        },
        reload() {
            this.reloadCallCount += 1;
        }
    };

    function updateLocation(nextUrl) {
        const parsed = new URL(nextUrl);
        location.href = nextUrl;
        location.hostname = parsed.hostname;
        location.origin = parsed.origin;
        location.pathname = parsed.pathname;
        location.search = parsed.search;
        location.hash = parsed.hash;
        document.URL = nextUrl;
        document.baseURI = nextUrl;
    }

    const sessionStorage = {
        getItem(key) {
            return storageState.has(key) ? storageState.get(key) : null;
        },
        setItem(key, value) {
            storageState.set(String(key), String(value));
        },
        removeItem(key) {
            storageState.delete(String(key));
        },
        clear() {
            storageState.clear();
        }
    };

    class MutationObserver {
        constructor(callback) {
            this.callback = callback;
            this.connected = false;
        }

        observe() {
            this.connected = true;
            observers.add(this);
        }

        disconnect() {
            this.connected = false;
            observers.delete(this);
        }
    }

    const visualViewportListeners = new Map();
    const windowObject = {
        document,
        location,
        MutationObserver,
        Element: BasicElement,
        DocumentFragment: BasicDocumentFragment,
        Node: { ELEMENT_NODE: 1 },
        HTMLElement: BasicElement,
        HTMLAnchorElement: BasicElement,
        ShadowRoot: BasicDocumentFragment,
        NodeFilter: { SHOW_ELEMENT: 1 },
        innerWidth: 1280,
        innerHeight: 720,
        visualViewport: {
            offsetTop: 0,
            offsetLeft: 0,
            width: 1280,
            height: 720,
            scale: 1,
            addEventListener(type, listener) {
                if (!visualViewportListeners.has(type)) {
                    visualViewportListeners.set(type, []);
                }
                visualViewportListeners.get(type).push(listener);
            },
            dispatchEvent(event) {
                const listeners = visualViewportListeners.get(event.type) || [];
                listeners.forEach((listener) => listener.call(windowObject.visualViewport, event));
            }
        },
        addEventListener(type, listener) {
            if (!windowEventListeners.has(type)) {
                windowEventListeners.set(type, []);
            }
            windowEventListeners.get(type).push(listener);
        },
        dispatchEvent(event) {
            const listeners = windowEventListeners.get(event.type) || [];
            listeners.forEach((listener) => listener.call(windowObject, event));
        },
        requestAnimationFrame(callback) {
            const id = nextRafId++;
            animationFrameQueue.set(id, callback);
            return id;
        },
        cancelAnimationFrame(id) {
            animationFrameQueue.delete(id);
        },
        setTimeout(callback) {
            const id = nextTimeoutId++;
            timeouts.set(id, callback);
            return id;
        },
        clearTimeout(id) {
            timeouts.delete(id);
        },
        setInterval(callback) {
            const id = nextIntervalId++;
            intervals.set(id, callback);
            return id;
        },
        clearInterval(id) {
            intervals.delete(id);
        },
        matchMedia(query) {
            if (typeof matchMedia === 'function') {
                return matchMedia(query);
            }
            return { matches: false, media: query, addEventListener() {}, removeEventListener() {} };
        },
        getComputedStyle(element) {
            if (typeof computedStyle === 'function') {
                return computedStyle(element);
            }
            if (typeof computedFontSize === 'function') {
                return { fontSize: computedFontSize(element) };
            }
            return { fontSize: computedFontSize };
        },
        openCalls: [],
        open(urlToOpen, target, features) {
            this.openCalls.push({ url: urlToOpen, target, features });
            return null;
        },
        performance: {
            getEntriesByType(type) {
                if (type !== 'navigation') {
                    return [];
                }
                return [{ type: navigationType }];
            }
        }
    };

    windowObject.window = windowObject;
    windowObject.self = windowObject;
    windowObject.top = windowObject;
    document.defaultView = windowObject;

    const consoleMessages = {
        log: [],
        warn: [],
        error: []
    };
    const consoleMock = {
        log(...args) {
            consoleMessages.log.push(args.join(' '));
        },
        warn(...args) {
            consoleMessages.warn.push(args.join(' '));
        },
        error(...args) {
            consoleMessages.error.push(args.join(' '));
        }
    };

    return {
        document,
        window: windowObject,
        location,
        MutationObserver,
        consoleMock,
        consoleMessages,
        context: {
            window: windowObject,
            document,
            location,
        MutationObserver,
        Element: BasicElement,
        DocumentFragment: BasicDocumentFragment,
        Node: { ELEMENT_NODE: 1 },
        HTMLElement: BasicElement,
        HTMLAnchorElement: BasicElement,
        ShadowRoot: BasicDocumentFragment,
        NodeFilter: { SHOW_ELEMENT: 1 },
        console: consoleMock,
        URL,
        URLSearchParams,
        GM_info: gmInfo,
        sessionStorage,
        performance: windowObject.performance,
        globalThis: null,
        global: null,
        setTimeout: windowObject.setTimeout.bind(windowObject),
        clearTimeout: windowObject.clearTimeout.bind(windowObject),
        setInterval: windowObject.setInterval.bind(windowObject),
        clearInterval: windowObject.clearInterval.bind(windowObject),
        requestAnimationFrame: windowObject.requestAnimationFrame.bind(windowObject),
        cancelAnimationFrame: windowObject.cancelAnimationFrame.bind(windowObject),
        getComputedStyle: windowObject.getComputedStyle.bind(windowObject)
    },
        appendToBody(element) {
            document.body.appendChild(element);
            return element;
        },
        appendToHead(element) {
            document.head.appendChild(element);
            return element;
        },
        dispatchDocumentEvent(type) {
            document.dispatchEvent({ type });
        },
        dispatchWindowEvent(type) {
            windowObject.dispatchEvent({ type });
        },
        dispatchVisualViewportEvent(type) {
            windowObject.visualViewport.dispatchEvent({ type });
        },
        triggerMutation(addedNodes, options = {}) {
            const target = options.target || document.body;
            const records = [{
                type: options.type || 'childList',
                target,
                addedNodes,
                removedNodes: options.removedNodes || [],
                attributeName: options.attributeName || null
            }];
            observers.forEach((observer) => {
                if (observer.connected) {
                    observer.callback(records, observer);
                }
            });
        },
        runAllTimeouts() {
            const pending = Array.from(timeouts.entries());
            timeouts.clear();
            pending.forEach(([, callback]) => callback());
        },
        runAllIntervals() {
            const pending = Array.from(intervals.values());
            pending.forEach((callback) => callback());
        },
        flushAnimationFrames() {
            const pending = Array.from(animationFrameQueue.entries());
            animationFrameQueue.clear();
            pending.forEach(([, callback]) => callback());
        },
        sessionStorage
    };
}

function createLink(document, href, options = {}) {
    const link = document.createElement('a');
    link.href = href;
    if (options.className) {
        link.className = options.className;
    }
    if (options.textContent) {
        link.textContent = options.textContent;
    }
    if (options.title) {
        link.title = options.title;
    }
    return link;
}

module.exports = {
    BasicElement,
    BasicDocumentFragment,
    createHarness,
    createLink,
    createMouseEvent
};
