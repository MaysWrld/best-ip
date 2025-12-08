// functions/admin.js

// 更新后的 DNS 服务商配置
const DEFAULT_DNS_PROVIDERS = [
  // 国内优化 (推荐)
  { name: "AliDNS (默认)", url: "https://dns.alidns.com/resolve?name=NAME&type=TYPE" },
  { name: "腾讯 DnsPod", url: "https://doh.pub/resolve?name=NAME&type=TYPE" }, 
  
  // 国际稳定/安全
  { name: "Quad9 (安全)", url: "https://dns.quad9.net/dns-query?name=NAME&type=TYPE" }, 
  { name: "OpenDNS", url: "https://doh.opendns.com/dns-query?name=NAME&type=TYPE" } 
];

// 注入的前端 HTML 结构，已集成样式、密码和 DNS 服务商选择
const ADMIN_HTML = (domains, currentProviderUrl) => {
    // 生成 <select> 选项列表
    const providerOptions = DEFAULT_DNS_PROVIDERS.map(p => {
        const selected = p.url === currentProviderUrl ? 'selected' : '';
        return `<option value="${p.url}" ${selected}>${p.name}</option>`;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>域名管理后台</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* 统一的样式 */
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
      background-color: #f4f7f6; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      min-height: 100vh; 
      margin: 0;
      color: #333;
    }
    .container {
      background: #ffffff;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      width: 90%;
      max-width: 600px;
      text-align: center;
    }
    h2 {
      color: #1a73e8;
      margin-bottom: 20px;
      font-weight: 600;
    }
    textarea, input[type="password"], select { 
      width: 100%; 
      padding: 12px; 
      margin-bottom: 15px;
      box-sizing: border-box; 
      border: 1px solid #e0e0e0; 
      border-radius: 8px; 
      font-size: 15px;
    }
    textarea {
        min-height: 200px; 
    }
    button { 
      padding: 12px 25px; 
      font-size: 15px; 
      border: none;
      border-radius: 8px;
      cursor: pointer; 
      background-color: #1a73e8; 
      color: white;
      transition: background-color 0.2s;
      margin: 5px;
      font-weight: 500;
    }
    button:hover { 
      background-color: #155cb0; 
    }
    .success { 
      color: #34a853; 
      font-weight: bold; 
      margin-top: 10px; 
    }
    .error {
      color: #d93025; 
      font-weight: bold; 
      margin-top: 10px; 
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>🔑 域名列表管理</h2>
    <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
        请在下方配置优选参数。
    </p>
    
    <form id="adminForm">
      <input type="password" id="admin_key" placeholder="请输入管理密码" required><br>
      
      <select id="dns_provider" name="dns_provider" style="text-align: left;">
        ${providerOptions}
      </select><br>

      <textarea name="domains" id="domains" placeholder="每行一个域名">${domains.join('\n')}</textarea><br>
      <button type="submit">💾 保存配置</button>
    </form>
    
    <div id="message"></div>
    <p style="margin-top: 20px;"><a href="/">返回优选首页</a></p>
  </div>

  <script>
    const form = document.getElementById('adminForm');
    const messageDiv = document.getElementById('message');

    form.onsubmit = async (e) => {
      e.preventDefault();
      messageDiv.textContent = '保存中...';
      messageDiv.className = '';
      
      const password = document.getElementById('admin_key').value;
      const providerUrl = document.getElementById('dns_provider').value;
      
      const formData = new FormData(form);
      
      // 清洗输入
      const domains = formData.get('domains').split(/\\s*\\n\\s*/).map(s => s.trim()).filter(s => s.length > 0);

      // 发送 POST 请求
      const res = await fetch('/admin', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-Admin-Key': password
        },
        body: JSON.stringify({ domains: domains, dns_url: providerUrl }) // 新增 dns_url
      });

      if (res.ok) {
        messageDiv.className = 'success';
        messageDiv.textContent = '✅ 配置保存成功！';
      } else if (res.status === 401) {
        messageDiv.className = 'error';
        messageDiv.textContent = '❌ 认证失败，密码错误！';
      } else {
        messageDiv.className = 'error';
        messageDiv.textContent = '❌ 保存失败：' + (await res.text() || "未知错误");
      }
    };
  </script>
</body>
</html>
`;
};

// ==========================================
// 核心处理逻辑
// ==========================================

export async function onRequest(context) {
  const { request, env } = context;
  const KV = env.DOMAINS_KV;
  const ADMIN_KEY = env.ADMIN_PASSWORD;
  const KEY = "config"; // 使用一个统一的 KEY 来存储配置对象

  // POST 请求：保存数据 (需要密码验证)
  if (request.method === "POST") {
    // 1. 验证密码
    const clientKey = request.headers.get('X-Admin-Key');
    
    if (!ADMIN_KEY || !clientKey || clientKey !== ADMIN_KEY) {
        return new Response("Unauthorized: Invalid password.", { status: 401 });
    }

    // 2. 验证通过，执行保存逻辑
    try {
      const { domains, dns_url } = await request.json();
      if (!Array.isArray(domains) || typeof dns_url !== 'string') throw new Error("Invalid format.");

      const config = {
          domains: domains,
          dns_url: dns_url
      };

      // 存储到 KV
      await KV.put(KEY, JSON.stringify(config));
      return new Response("OK", { status: 200 });

    } catch (e) {
      return new Response(`Error: ${e.message}`, { status: 400 });
    }
  }

  // GET 请求：显示管理页面
  let configString = await KV.get(KEY);
  let config = configString ? JSON.parse(configString) : {};

  // 默认值
  // 确保使用更新后的 DEFAULT_DNS_PROVIDERS[0].url 作为默认 DNS URL
  const DEFAULT_DNS_URL = DEFAULT_DNS_PROVIDERS[0].url; 
  const domainsArray = config.domains || ["openai.com", "cf.pages.dev"];
  const currentProviderUrl = config.dns_url || DEFAULT_DNS_URL;

  return new Response(ADMIN_HTML(domainsArray, currentProviderUrl), {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
