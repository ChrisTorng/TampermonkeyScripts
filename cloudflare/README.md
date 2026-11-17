# Universal web diagnostics collector

- Cloudflare Worker: `tm-web-diagnostics` (`https://tm-web-diagnostics.christorng.workers.dev`)
- Private KV binding: `REPORTS`, namespace title `tm-web-diagnostics-private`
- Source: `cloudflare/web-diagnostics-worker.js`
- Tampermonkey script: `src/TranslationDiagnostics.user.js`
- No public report read/list endpoint. Reports are accessible only via the authorized Cloudflare management API.
- Reports expire after seven days; pending pairing requests after one hour.
- Structure-only mode is the default. Public-page text requires explicit opt-in. Inputs, scripts, hydration data and secrets are excluded.
- DOM capture is capped at four million characters, total upload at five MiB. Reports indicate truncation.

## One-time pairing

1. On the user's device, tap **回報 → 建立配對碼**; the UI displays a ten-character pairing code.
2. Through the Cloudflare API, look up `pending:<CODE>` in this Worker KV namespace. Value: `{deviceId,digest,requestedAt}`.
3. Approve by putting the SHA-256 digest (not the original secret) at KV key `device:<deviceId>`.
4. The user taps **確認已配對**. All future reports upload with a single explicit submission.
5. To revoke a device, delete the `device:<deviceId>` entry. To remove a report, delete `report:<reportId>`.

## Reading a report

List KV keys with prefix `report:` via Cloudflare API. Each key's metadata includes page, receivedAt, deviceId and mode. Read `report:<reportId>` via the Cloudflare management API. **There is no public read endpoint.**

Do not quote private page content in public GitHub PRs. Compare translation opt-outs, root `lang`, browser language, rendered article structure and subsequent Console/errors. Console capture begins only after explicit activation or requested capture on next reload; prior DevTools history cannot be retrieved.

## API

- `GET /health`: public non-sensitive status.
- `POST /api/pair`: `{deviceId,secret}` creates a one-hour pairing code.
- `POST /api/status`: `{deviceId,secret}` checks authorization.
- `POST /api/report`: `{deviceId,secret,report}` stores a seven-day report and returns an ID.
- `POST /api/delete`: `{deviceId,secret,reportId}` removes an owned report.

The secret is 256-bit device-generated random data kept in Tampermonkey storage; KV holds only the SHA-256 digest. All requests use HTTPS. CORS is not authentication. The public pairing endpoint has a basic IP-based rate limiter; add a Cloudflare WAF rule if abused.