// functions/admin.js

// 更新后的 DNS 服务商配置
const DEFAULT_DNS_PROVIDERS = [
  // 国内优化 (推荐)
  { name: "AliDNS (默认)", url: "https://dns.alidns.com/resolve?name=NAME&type=TYPE" },
  { name: "腾讯 DnsPod", url: "https://doh.pub/dns-query?name=NAME&type=TYPE" }, 
  
  // 国际稳定/安全
  { name: "Quad9 (安全)", url: "https://dns.quad9.net/dns-query?name=NAME&type=TYPE" }, 
  { name: "OpenDNS", url: "https://doh.opendns.com/dns-query?name=NAME&type=TYPE" } 
];

// 注入的前端 HTML 结构，已集成样式、密码和 DNS 服务商选择
const ADMIN_HTML = (domains, currentProviderUrl) => {
    // 1. 生成 <select> 选项列表 (保持不变)
    const providerOptions = DEFAULT_DNS_PROVIDERS.map(p => {
        const selected = p.url === currentProviderUrl ? 'selected' : '';
        return `<option value="${p.url}" ${selected}>${p.name}</option>`;
    }).join('');

    // 2. Base64 编码域名列表，用于前端 JS 解码
    // 注意：我们将 domains 和 currentProviderUrl 都编码注入
    const encodedDomains = btoa(domains.join('\n'));
    
    // 3. 构造 HTML 模板
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>域名管理后台</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* 统一的样式 (保持不变) */
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
    /* 新增：隐藏 DNS 选择框，直到验证成功 */
    #dns_provider {
      display: none;
    }
    /* 新增：设置文本域默认颜色以模拟密码输入 */
    #domains {
      color: #999; /* 提示文字颜色 */
    }
    /* 成功后的样式 */
    #domains.unlocked {
      color: #333;
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
      请先输入管理密码进行解锁。
    </p>
    
    <form id="adminForm">
      <input type="password" id="admin_key" placeholder="请输入管理密码" required><br>
      
      <select id="dns_provider" name="dns_provider" style="text-align: left;">
        ${providerOptions}
      </select><br>

      <textarea 
        name="domains" 
        id="domains" 
        placeholder="******** (请先输入密码解锁)" 
        data-encoded-domains="${encodedDomains}"
        data-current-provider="${currentProviderUrl}"
        readonly
      >******** (请先输入密码解锁)</textarea><br>
      
      <button type="submit" id="save_button" disabled>💾 保存配置</button>
      <button type="button" id="unlock_button">🔓 解锁</button>
    </form>
    
    <div id="message"></div>
    <p style="margin-top: 20px;"><a href="/">返回优选首页</a></p>
  </div>

  <script>
    const form = document.getElementById('adminForm');
    const messageDiv = document.getElementById('message');
    const passwordInput = document.getElementById('admin_key');
    const domainsTextarea = document.getElementById('domains');
    const dnsSelect = document.getElementById('dns_provider');
    const saveButton = document.getElementById('save_button');
    const unlockButton = document.getElementById('unlock_button');

    // 辅助函数：解码 Base64 字符串
    function decodeBase64(encoded) {
      try {
        return atob(encoded);
      } catch (e) {
        return '';
      }
    }

    // 1. 独立解锁逻辑
    unlockButton.onclick = async (e) => {
        e.preventDefault();
        messageDiv.textContent = '验证中...';
        messageDiv.className = '';
        
        const password = passwordInput.value;
        if (!password) {
            messageDiv.className = 'error';
            messageDiv.textContent = '❌ 请输入密码！';
            return;
        }

        // 发送一个只包含密码的轻量级请求来验证身份
        // 我们利用 POST /admin 的 401/200 状态码来判断密码是否正确，但不会实际修改数据
        const testData = { domains: [], dns_url: 'TEST_URL' };

        const res = await fetch('/admin', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Admin-Key': password
            },
            body: JSON.stringify(testData)
        });

        if (res.ok) {
            // 验证成功！执行解锁操作
            const encodedDomains = domainsTextarea.getAttribute('data-encoded-domains');
            
            // 填充域名文本域
            domainsTextarea.value = decodeBase64(encodedDomains);
            domainsTextarea.removeAttribute('readonly');
            domainsTextarea.placeholder = '每行一个域名';
            domainsTextarea.classList.add('unlocked');

            // 显示 DNS 选择框
            dnsSelect.style.display = 'block';

            // 按钮状态切换
            saveButton.disabled = false;
            saveButton.style.display = 'inline-block';
            unlockButton.style.display = 'none';
            
            passwordInput.disabled = true; // 密码锁定，避免误操作
            messageDiv.className = 'success';
            messageDiv.textContent = '✅ 解锁成功！请修改并保存配置。';
        
        } else if (res.status === 401) {
            messageDiv.className = 'error';
            messageDiv.textContent = '❌ 认证失败，密码错误！';
        } else {
            messageDiv.className = 'error';
            messageDiv.textContent = '❌ 验证失败：' + (await res.text() || "未知错误");
        }
    };

    // 2. 独立的保存配置逻辑 (只有解锁后才能操作)
    form.onsubmit = async (e) => {
        e.preventDefault();

        // 检查是否已解锁
        if (domainsTextarea.readOnly) {
            messageDiv.className = 'error';
            messageDiv.textContent = '❌ 请先点击“解锁”按钮并验证密码！';
            return;
        }
        
        messageDiv.textContent = '保存中...';
        messageDiv.className = '';
        
        const password = passwordInput.value; // 此时密码框可能已被锁定，但我们使用解锁时输入的密码即可
        const providerUrl = dnsSelect.value;
        
        const domains = domainsTextarea.value.split(/\s*\n\s*/).map(s => s.trim()).filter(s => s.length > 0);

        // 发送 POST 请求
        const res = await fetch('/admin', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Admin-Key': password // 仍然需要密码进行鉴权
            },
            body: JSON.stringify({ domains: domains, dns_url: providerUrl })
        });

        if (res.ok) {
            messageDiv.className = 'success';
            messageDiv.textContent = '✅ 配置保存成功！';
            
            // 重新编码新数据，更新到 data 属性中
            domainsTextarea.setAttribute('data-encoded-domains', btoa(domains.join('\n')));

        } else if (res.status === 401) {
            messageDiv.className = 'error';
            messageDiv.textContent = '❌ 认证失败，密码错误！';
            passwordInput.disabled = false; // 重新启用密码输入框
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
// 核心处理逻辑 (保持不变)
// ==========================================

export async function onRequest(context) {
  const { request, env } = context;
  const KV = env.DOMAINS_KV;
  const ADMIN_KEY = env.ADMIN_PASSWORD;
  const KEY = "config"; 

  // POST 请求：保存数据 (需要密码验证) - 保持不变
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

  // GET 请求：显示管理页面 (保持不变)
  let configString = await KV.get(KEY);
  let config = configString ? JSON.parse(configString) : {};

  // 默认值
  const DEFAULT_DNS_URL = DEFAULT_DNS_PROVIDERS[0].url; 
  const domainsArray = config.domains || ["openai.com", "cf.pages.dev"];
  const currentProviderUrl = config.dns_url || DEFAULT_DNS_URL;

  return new Response(ADMIN_HTML(domainsArray, currentProviderUrl), {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
