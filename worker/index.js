export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ---- Simple Bearer auth for admin endpoints ----
    const requireAuth = () => {
      const auth = request.headers.get("Authorization") || "";
      const token = env.ADMIN_TOKEN; // set in Worker vars
      if (!token || auth !== `Bearer ${token}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      return null;
    };

    // ---- Read domains from KV (fallback to default) ----
    async function readDomains(env) {
      const stored = await env.DOMAINS_KV.get("domains");
      if (stored) {
        try {
          const arr = JSON.parse(stored);
          if (Array.isArray(arr)) return arr;
        } catch {}
      }
      return ["openai.com"]; // default fallback
    }

    // ---- Admin: get current domains ----
    if (url.pathname === "/api/admin/domains" && request.method === "GET") {
      const unauthorized = requireAuth();
      if (unauthorized) return unauthorized;

      const list = await readDomains(env);
      return new Response(JSON.stringify({ domains: list }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // ---- Admin: save domains ----
    if (url.pathname === "/api/admin/domains" && request.method === "POST") {
      const unauthorized = requireAuth();
      if (unauthorized) return unauthorized;

      try {
        const body = await request.json();
        const raw = (body?.domains ?? "").toString();
        const list = raw
          .split(/[,，\n]/)
          .map(s => s.trim())
          .filter(Boolean);

        await env.DOMAINS_KV.put("domains", JSON.stringify(list));
        return new Response(JSON.stringify({ ok: true, count: list.length }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: "bad_json" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // ---- Original POST pipeline: format IPs with quotes ----
    if (request.method === "POST" && url.pathname === "/api/format") {
      try {
        const payload = await request.json();
        const results = [];

        const quotes = [
          "长风破浪会有时","会当凌绝顶，一览众山小","宝剑锋从磨砺出","梅花香自苦寒来","天生我材必有用",
          "千里之行，始于足下","路漫漫其修远兮，吾将上下而求索","不畏浮云遮望眼","海内存知己，天涯若比邻","莫愁前路无知己",
          "业精于勤荒于嬉","黑发不知勤学早，白首方悔读书迟","少壮不努力，老大徒伤悲","书山有路勤为径，学海无涯苦作舟","学而不厌，诲人不倦",
          "敏而好学，不耻下问","读书破万卷，下笔如有神","学而时习之，不亦说乎","知之者不如好之者，好之者不如乐之者","学而不思则罔，思而不学则殆",
          "天行健，君子以自强不息","地势坤，君子以厚德载物","穷且益坚，不坠青云之志","志当存高远","燕雀安知鸿鹄之志",
          "会挽雕弓如满月，西北望，射天狼","人生自古谁无死，留取丹心照汗青","先天下之忧而忧，后天下之乐而乐","苟利国家生死以，岂因祸福避趋之","天下兴亡，匹夫有责",
          "位卑未敢忘忧国","人生如逆旅，我亦是行人","人生得意须尽欢，莫使金樽空对月","仰天大笑出门去，我辈岂是蓬蒿人","安能摧眉折腰事权贵，使我不得开心颜",
          "大鹏一日同风起，扶摇直上九万里","直挂云帆济沧海","长风几万里，吹度玉门关","欲穷千里目，更上一层楼"
        ];

        const isIPv4 = (ip) => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
        const isIPv6 = (ip) => /^[0-9a-f:]+$/i.test(ip) && ip.includes(":");
        const normalizeIPs = (arr) => {
          const set = new Set();
          for (const ip of arr || []) {
            const pure = ip.trim();
            if (isIPv4(pure) || isIPv6(pure)) set.add(pure);
          }
          return [...set];
        };

        for (const [domain, records] of Object.entries(payload || {})) {
          const ips = normalizeIPs(records);
          for (const ip of ips) {
            const quote = quotes[Math.floor(Math.random() * quotes.length)];
            results.push(`${ip}:443#${quote}`);
          }
        }

        return new Response(JSON.stringify(results), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON or processing error" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // ---- GET homepage: provide current domains to front-end Pages if needed ----
    if (request.method === "GET" && url.pathname === "/api/domains") {
      const list = await readDomains(env);
      return new Response(JSON.stringify({ domains: list }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Default: hint
    return new Response("Worker online", { headers: { "Content-Type": "text/plain" } });
  }
}
