# Current updates: install and verify

Updated: 2026-10-28

Open this page on the PR's Vercel preview to install that preview's version. After merging, the same page lists the production update. Click the installation link below, confirm the version in Tampermonkey, then reload a test page.

## Updated userscripts (1)

### Auto Open New Articles — 2026-10-28_1.7.1

**[Install / update AutoOpenNewArticles.user.js](src/AutoOpenNewArticles.user.js)**

**UI changes:** Hacker News Summary has two distinct navigation states. Dated archives display the selected month and day; the live home page displays **Latest**. The right arrow from the newest dated archive leads to **Latest**, even when the dated archive is from today. On **Latest**, the left arrow returns to the newest dated archive and the right arrow is disabled. Top and bottom navigation behave identically; article read states and collapse buttons are unchanged.

Test pages:

- [Latest (live homepage)](https://hackernews.betacat.io/)
- [Dated archive (2026-10-26)](https://hackernews.betacat.io/daily/2026-10-26)
- [Older dated archive (2026-03-07)](https://hackernews.betacat.io/daily/2026-03-07)

Verification:

1. On the homepage, both navigation bars must show **Latest** in the center. The left control must point to the newest available dated archive; the right control must be disabled.
2. Follow the left control to that archive. Its center must show the selected date, while the right control must show **Latest ›** and link back to `/`.
3. Follow **Latest ›**. Confirm the homepage is shown with **Latest** (not a date), and the left control returns to that same dated archive.
4. On older dated archives, both arrows must move between available dates without skipping gaps. The earliest available archive must disable its previous arrow.
5. Confirm existing read states, collapse controls, and both navigation bars remain functional.

## Verification notes

Automated DOM tests cover Latest and dated archive boundaries, the transition between them, navigation in both top and bottom controls, and the existing read/collapse behavior. The site's current archive menu supplies the available dates; browser navigation should be checked manually against the live website.
