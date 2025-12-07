// functions/admin.js

// 注入的前端 HTML 结构，已集成样式和密码输入框
const ADMIN_HTML = (domains) => `
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
    textarea, input[type="password"] { 
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
        请在下方文本框中输入您希望优选的域名，每行一个。
    </p>
    
    <form id="adminForm">
      <input type="password" id="admin_key" placeholder="请输入管理密码" required><br>
      <textarea name="domains" id="domains">${domains.join('\n')}</textarea><br>
      <button type="submit">💾 保存域名列表</button>
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
      const formData = new FormData(form);
      
      // 清洗输入：按换行符分隔，去除空白行
      const domains = formData.get('domains').split(/\\s*\\n\\s*/).map(s => s.trim()).filter(s => s.length > 0);

      // 发送 POST 请求到当前路由 (/admin)
      const res = await fetch('/admin', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            // 将密码放入自定义请求头进行传输
            'X-Admin-Key': password
        },
        body: JSON.stringify({ domains: domains })
      });

      if (res.ok) {
        messageDiv.className = 'success';
        messageDiv.textContent = '✅ 域名列表保存成功！';
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

export async function onRequest(context) {
  const { request, env } = context;
  const KV = env.DOMAINS_KV;
  const ADMIN_KEY = env.ADMIN_PASSWORD; // 从环境变量读取密码
  const KEY = "domains";
  
  // POST 请求：保存数据 (需要密码验证)
  if (request.method === "POST") {
    // 1. 验证密码
    const clientKey = request.headers.get('X-Admin-Key');
    
    if (!ADMIN_KEY || !clientKey || clientKey !== ADMIN_KEY) {
        return new Response("Unauthorized: Invalid password or ADMIN_PASSWORD not set in ENV.", { status: 401 });
    }

    // 2. 验证通过，执行保存逻辑
    try {
      const { domains } = await request.json();
      if (!Array.isArray(domains)) throw new Error("Domains must be an array.");

      // 存储到 KV
      await KV.put(KEY, JSON.stringify(domains));
      return new Response("OK", { status: 200 });

    } catch (e) {
      return new Response(`Error: ${e.message}`, { status: 400 });
    }
  }

  // GET 请求：显示管理页面 (不需要密码，因为页面本身不含敏感数据)
  let domainsString = await KV.get(KEY);
  let domainsArray = domainsString ? JSON.parse(domainsString) : ["openai.com", "cf.pages.dev"];

  return new Response(ADMIN_HTML(domainsArray), {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
