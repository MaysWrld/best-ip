// 修改为你的 Worker 地址
const WORKER_BASE = "https://bestip.400123456.xyz";

// Toast 提示
function showToast(msg, isError=false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.backgroundColor = isError ? "#d93025" : "#333";
  t.className = "show";
  setTimeout(() => t.className = "", 3000);
}

// 加载域名
async function loadDomains() {
  const token = document.getElementById("token").value.trim();
  try {
    const res = await fetch(`${WORKER_BASE}/api/admin/domains`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("加载失败，可能是 Token 错误或 Worker 地址错误");
    const data = await res.json();
    document.getElementById("domains").value = data.domains.join("\n");
    showToast("✅ 域名加载成功");
  } catch (e) {
    showToast("❌ 加载失败：" + e.message, true);
  }
}

// 保存域名
async function saveDomains() {
  const token = document.getElementById("token").value.trim();
  const text = document.getElementById("domains").value;
  try {
    const res = await fetch(`${WORKER_BASE}/api/admin/domains`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ domains: text })
    });
    if (!res.ok) throw new Error("保存失败，可能是 Token 错误或 Worker 地址错误");
    const data = await res.json();
    showToast(`✅ 保存成功，共 ${data.count} 条`);
  } catch (e) {
    showToast("❌ 保存失败：" + e.message, true);
  }
}

// 清空输入
function clearDomains() {
  document.getElementById("domains").value = "";
  showToast("已清空输入");
}
