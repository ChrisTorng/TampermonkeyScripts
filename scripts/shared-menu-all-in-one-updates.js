    // A single small official-main metadata check on each top-level page load.
    // Never reload the document, and never fetch unmerged PR branches.
    if (window === window.top && typeof GM_xmlhttpRequest === 'function') {
        const installedVersion = __ALL_IN_ONE_VERSION__;
        const installUrl = __ALL_IN_ONE_INSTALL_URL__;
        const metaUrl = __ALL_IN_ONE_META_URL__;
        function isNewer(next, installed) {
            const a = next.split(/[._-]/).map(Number);
            const b = installed.split(/[._-]/).map(Number);
            if (a.some(Number.isNaN) || b.some(Number.isNaN)) return false;
            for (let i = 0; i < Math.max(a.length, b.length); i++) {
                if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
            }
            return false;
        }
        function showUpdate(next) {
            function attach() {
                const root = document.getElementById('tm-shared-floating-menu');
                if (!root) return false;
                if (root.querySelector('#tm-shared-menu-bundle-update')) return true;
                const toggle = root.querySelector('[data-floating-toggle]');
                if (toggle) {
                    toggle.style.setProperty('outline', '2px solid #f3ca49', 'important');
                    toggle.title = '整合腳本有新版：' + next;
                }
                const button = document.createElement('button');
                button.id = 'tm-shared-menu-bundle-update';
                button.type = 'button';
                button.textContent = '↥';
                button.title = '立即更新整合腳本：' + next;
                button.setAttribute('aria-label', '立即更新整合腳本 ' + next);
                button.setAttribute('data-floating-tool', 'bundle-update');
                button.setAttribute('data-floating-available', 'true');
                button.hidden = root.getAttribute('data-floating-expanded') !== 'true';
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const url = installUrl + '?update=' + encodeURIComponent(next);
                    if (typeof GM_openInTab === 'function') {
                        GM_openInTab(url, { active: true, insert: true });
                    } else {
                        window.open(url, '_blank', 'noopener');
                    }
                }, true);
                root.appendChild(button);
                return true;
            }
            if (!attach()) {
                document.addEventListener('DOMContentLoaded', attach, { once: true });
                setTimeout(attach, 2500);
            }
        }
        function showInstalledStatus() {
            function attach() {
                const root = document.getElementById('tm-shared-floating-menu');
                if (!root || !document.body) return false;
                const status = document.createElement('span');
                status.textContent = '已安裝 ' + installedVersion;
                status.setAttribute('role', 'status');
                status.style.cssText = 'position:absolute;right:42px;top:0;white-space:nowrap;' +
                    'font:12px system-ui,sans-serif;padding:4px 7px;border-radius:5px;' +
                    'background:#333;color:#fff;pointer-events:none;';
                root.appendChild(status);
                setTimeout(() => status.remove(), 3500);
                return true;
            }
            if (!attach()) {
                document.addEventListener('DOMContentLoaded', attach, { once: true });
                setTimeout(attach, 2500);
            }
        }
        try {
            Promise.resolve(GM_getValue('tm-bundle-last-installed-version', '')).then((previous) => {
                if (previous === installedVersion) return;
                GM_setValue('tm-bundle-last-installed-version', installedVersion);
                showInstalledStatus();
            }).catch(() => {});
        } catch (_) { /* No persisted status when storage is unavailable. */ }
        try {
            GM_xmlhttpRequest({
                method: 'GET',
                url: metaUrl + '?check=' + Date.now(),
                timeout: 8000,
                onload: (response) => {
                    if (response.status !== 200) return;
                    const match = String(response.responseText || '').match(/^\/\/ @version\s+(\S+)/m);
                    if (match && isNewer(match[1], installedVersion)) showUpdate(match[1]);
                }
            });
        } catch (_) { /* A failed check must not affect the article. */ }
    }
