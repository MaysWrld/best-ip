// functions/admin.js

const ADMIN_HTML = (domains) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>域名管理后台</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; background: #f4f7f6; color: #333; }
    h2 { color: #1a73e8; }
    textarea { width: 100%; min-height: 200px; padding: 10px; box-sizing: border-box; border: 1px solid #e0e0e0; border-radius: 5px; }
    button { padding: 10px 20px; background-color: #1a73e8; color: white; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.2s; }
    button:hover { background-color: #155cb0; }
    .success { color: #34a853; font-weight: bold; margin-top: 10px; }
  </style>
</head>
<body>
  <h2>⚙️ 域名列表管理 (每行一个域名)</h2>
  <p>请在下方文本框中输入您希望优选的域名，每行一个。此列表存储在 DOMAINS_KV 中。</p>
  <form id="adminForm">
    <textarea name="domains" id="domains">${domains.join('\n')}</textarea><br><br>
    <button type="submit">💾 保存域名列表</button>
  </form>
  <div id="message"></div>
  <p style="margin-top: 20px;"><a href="/">返回优选首页</a></p>

  <script>
    const form = document.getElementById('adminForm');
    const messageDiv = document.getElementById('message');

    form.onsubmit = async (e) => {
      e.preventDefault();
      messageDiv.textContent = '保存中...';
      messageDiv.className = '';
      
      const formData = new FormData(form);
      // 清洗输入：按换行符分隔，去除空白行
      const domains = formData.get('domains').split(/\\s*\\n\\s*/).map(s => s.trim()).filter(s => s.length > 0);

      // 发送 POST 请求到当前路由 (/admin)
      const res = await fetch('/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: domains })
      });

      if (res.ok) {
        messageDiv.className = 'success';
        messageDiv.textContent = '✅ 域名列表保存成功！';
      } else {
        messageDiv.className = '';
        messageDiv.textContent = '❌ 保存失败：' + (await res.text() || "未知错误");
      }
    };
  </script>
</body>
</html>
`;

export async function onRequest(context) {
  const { request, env } = context;
  const KV = env.DOMAINS_KV; // 绑定到 DOMAINS_KV
  const KEY = "domains";
  
  // POST 请求：保存数据
  if (request.method === "POST") {
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

  // GET 请求：显示管理页面
  let domainsString = await KV.get(KEY);
  let domainsArray = domainsString ? JSON.parse(domainsString) : ["openai.com", "cf.pages.dev"];

  return new Response(ADMIN_HTML(domainsArray), {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
