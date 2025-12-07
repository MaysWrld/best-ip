// functions/[[path]].js

// ... (省略工具函数和古诗词库，保持不变) ...

// 默认 DNS URL，作为兜底
const DEFAULT_DNS_URL = "https://dns.alidns.com/resolve?name=NAME&type=TYPE";

// 兜底默认域名 (保持不变，只是它们现在会被编码)
const defaultDomains = [
  "openai.com", "cfcn-a-freegoa9.sectigo.pp.ua", "tajikistan.mfa.gov.ua", 
  "cfyx.aliyun.20237737.xyz", "commcloud.prod-abbs-ubi-com.cc-ecdn.net.cdn.cloudflare.net", 
  "mfa.gov.ua", "ctn.cloudflare.182682.xyz", "cf-090227-xyz.pages.dev", 
  "singgcdn.singgnetworkcdn.com", "cf-workers-sub-1k9.pages.dev", "cf.3666888.xyz", 
  "saas301.pages.dev"
];

// ==========================================
// 2. 核心处理函数
// ==========================================
export async function onRequest(context) {
  const { request, env } = context;
  const KV = env.DOMAINS_KV;
  const CONFIG_KEY = "config";

  // 1. 从 KV 读取完整的配置 (域名列表 + DNS URL)
  let config = {};
  try {
    const configString = await KV.get(CONFIG_KEY);
    config = configString ? JSON.parse(configString) : {};
  } catch (e) {
    console.error("Failed to read or parse config from KV:", e);
  }

  const targetDomains = (Array.isArray(config.domains) && config.domains.length > 0) 
                        ? config.domains 
                        : defaultDomains;
                        
  const dnsProviderUrl = config.dns_url || DEFAULT_DNS_URL;
  
  // A. 处理 POST 请求 (IP 格式化) - 保持不变
  if (request.method === "POST") {
    try {
      // ... (保留原有的 IP 格式化和赋诗逻辑) ...
      const payload = await request.json();
      const results = [];

      for (const records of Object.values(payload || {})) {
        const ips = normalizeIPs(records);
        for (const ip of ips) {
          const quote = quotes[Math.floor(Math.random() * quotes.length)];
          results.push(`${ip}:443#${quote}`);
        }
      }

      return Response.json(results);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON or processing error" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // B. 处理 GET 请求 (返回前端页面)
  const response = await context.next(); 
  
  // 核心：使用 Base64 编码域名列表和 DNS URL
  // JSON.stringify(targetDomains) 是域名数组的字符串表示
  const encodedDomains = btoa(JSON.stringify(targetDomains)); 
  const encodedDnsUrl = btoa(dnsProviderUrl); 

  const text = await response.text();
  const injection = `
    const ENCODED_DOMAINS = "${encodedDomains}";
    const ENCODED_DNS_URL = "${encodedDnsUrl}";
  `;
  
  // 注意：占位符 TARGET_DOMAINS_PLACEHOLDER 仍需保留在 index.html 中
  const html = text.replace('/* TARGET_DOMAINS_PLACEHOLDER */', injection);

  return new Response(html, response);
}
