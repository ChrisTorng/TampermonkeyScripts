// Private web diagnostics collector. No public report-reading endpoint.
// Authentication is per device, approved by an operator after one-time pairing.
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
};
const RETENTION_SECONDS = 24 * 3600;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
const validId = value => typeof value === "string" && /^[a-zA-Z0-9-]{8,100}$/.test(value);
const validSecret = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const encodeHex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
async function sha256(text) {
  return encodeHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))));
}
function randomCode(length = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
async function readJson(request, max = 8192) {
  if (Number(request.headers.get("content-length") || 0) > max) throw new Error("payload too large");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > max) throw new Error("payload too large");
  return JSON.parse(raw);
}
async function isAuthorized(env, deviceId, secret) {
  if (!validId(deviceId) || !validSecret(secret)) return false;
  const expected = await env.REPORTS.get("device:" + deviceId);
  return Boolean(expected && expected === await sha256(secret));
}
async function throttlePair(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = "pair-limit:" + await sha256(ip + ":" + new Date().toISOString().slice(0, 13));
  const count = Number(await env.REPORTS.get(key) || 0);
  if (count >= 15) return false;
  await env.REPORTS.put(key, String(count + 1), { expirationTtl: 3600 });
  return true;
}
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: JSON_HEADERS });
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "tm-web-diagnostics", retentionDays: 1, maxUploadBytes: MAX_UPLOAD_BYTES,
        pairingRequired: true, privateReports: true });
    }
    if (request.method !== "POST") return json({ error: "not found" }, 404);
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return json({ error: "application/json required" }, 415);
    }
    if (url.pathname === "/api/pair") {
      let data;
      try { data = await readJson(request); } catch { return json({ error: "invalid request" }, 400); }
      if (!validId(data?.deviceId) || !validSecret(data?.secret)) return json({ error: "invalid device" }, 400);
      if (!await throttlePair(request, env)) return json({ error: "rate limited" }, 429);
      const code = randomCode();
      await env.REPORTS.put("pending:" + code,
        JSON.stringify({ deviceId: data.deviceId, digest: await sha256(data.secret), requestedAt: new Date().toISOString() }),
        { expirationTtl: 3600 });
      return json({ pairingCode: code, expiresMinutes: 60 });
    }
    if (url.pathname === "/api/status") {
      let data;
      try { data = await readJson(request); } catch { return json({ error: "invalid request" }, 400); }
      return json({ authorized: await isAuthorized(env, data?.deviceId, data?.secret) });
    }
    if (url.pathname === "/api/report") {
      let data;
      try { data = await readJson(request, MAX_UPLOAD_BYTES); }
      catch { return json({ error: "invalid or oversized report" }, 413); }
      if (!await isAuthorized(env, data?.deviceId, data?.secret)) return json({ error: "device not paired" }, 403);
      const report = data?.report;
      if (!report || typeof report !== "object" || !Array.isArray(report.snapshots)
          || typeof report.url !== "string" || typeof report.domHtml !== "string") {
        return json({ error: "invalid report" }, 400);
      }
      let page;
      try {
        const parsed = new URL(report.url);
        if (!["https:", "http:"].includes(parsed.protocol)) throw Error();
        page = parsed.origin + parsed.pathname; // No search query or fragment.
      } catch { return json({ error: "invalid page" }, 400); }
      const id = new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + randomCode(12);
      const saved = {
        reportId: id, receivedAt: new Date().toISOString(), deviceId: data.deviceId,
        report: { ...report, url: page }
      };
      await env.REPORTS.put("report:" + id, JSON.stringify(saved),
        { expirationTtl: RETENTION_SECONDS,
          metadata: { receivedAt: saved.receivedAt, deviceId: data.deviceId, page,
            mode: String(report.mode || "").slice(0, 24) } });
      return json({ ok: true, reportId: id, retentionDays: 1 });
    }
    if (url.pathname === "/api/delete") {
      let data;
      try { data = await readJson(request); } catch { return json({ error: "invalid request" }, 400); }
      if (!await isAuthorized(env, data?.deviceId, data?.secret)) return json({ error: "device not paired" }, 403);
      const id = String(data?.reportId || "");
      if (!/^[0-9]{8}-[A-Z2-9]{12}$/.test(id)) return json({ error: "invalid report id" }, 400);
      const stored = await env.REPORTS.get("report:" + id, "json");
      if (!stored || stored.deviceId !== data.deviceId) return json({ error: "not found" }, 404);
      await env.REPORTS.delete("report:" + id);
      return json({ ok: true });
    }
    return json({ error: "not found" }, 404);
  }
};
