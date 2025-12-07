export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 简单 Bearer 验证
    const requireAuth = () => {
      const auth = request.headers.get("Authorization") || "";
      if (auth !== `Bearer ${env.ADMIN_TOKEN}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      return null;
    };

    // 从 KV 读取域名
    async function readDomains() {
      const stored = await env.DOMAINS_KV.get("domains");
      if (stored) {
        try {
          const arr = JSON.parse(stored);
          if (Array.isArray(arr)) return arr;
        } catch {}
      }
      return ["openai.com"]; // 默认值
    }

    // 管理接口：获取域名
    if (url.pathname === "/api/admin/domains" && request.method === "GET") {
      const unauthorized = requireAuth();
      if (unauthorized) return unauthorized;
      const list = await readDomains();
      return new Response(JSON.stringify({ domains: list }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 管理接口：保存域名
    if (url.pathname === "/api/admin/domains" && request.method === "POST") {
      const unauthorized = requireAuth();
      if (unauthorized) return unauthorized;
      try {
        const body = await request.json();
        const raw = (body?.domains ?? "").toString();
        const list = raw.split(/[,，\n]/).map(s => s.trim()).filter(Boolean);
        await env.DOMAINS_KV.put("domains", JSON.stringify(list));
        return new Response(JSON.stringify({ ok: true, count: list.length }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch {
        return new Response(JSON.stringify({ ok: false }), { status: 400 });
      }
    }

    // 普通接口：返回域名列表
    if (url.pathname === "/api/domains" && request.method === "GET") {
      const list = await readDomains();
      return new Response(JSON.stringify({ domains: list }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 格式化接口：返回 IP + 古诗
    if (url.pathname === "/api/format" && request.method === "POST") {
      try {
        const payload = await request.json();
        const results = [];
        const quotes = ["长风破浪会有时","会当凌绝顶，一览众山小","宝剑锋从磨砺出","梅花香自苦寒来","天生我材必有用"];
        const isIPv4 = ip => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
        const isIPv6 = ip => /^[0-9a-f:]+$/i.test(ip) && ip.includes(":");
        const normalizeIPs = arr => [...new Set((arr||[]).map(ip => ip.trim()).filter(ip => isIPv4(ip)||isIPv6(ip)))];
        for (const [domain, records] of Object.entries(payload || {})) {
          const ips = normalizeIPs(records);
          for (const ip of ips) {
            const quote = quotes[Math.floor(Math.random() * quotes.length)];
            results.push(`${ip}:443#${quote}`);
          }
        }
        return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
      }
    }

    return new Response("Worker online");
  }
}
