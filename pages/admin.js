const WORKER_BASE = "https://your-worker.workers.dev";

async function loadDomains() {
  const token = document.getElementById("token").value.trim();
  const res = await fetch(`${WORKER_BASE}/api/admin/domains`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    document.getElementById("status").textContent = "加载失败";
    return;
  }
  const data = await res.json();
  document.getElementById("domains").value = data.domains.join("\n");
  document.getElementById("status").textContent = "加载成功";
}

async function saveDomains() {
  const token = document.getElementById("token").value.trim();
  const text = document.getElementById("domains").value;
  const res = await fetch(`${WORKER_BASE}/api/admin/domains`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ domains: text })
  });
  if (!res.ok) {
    document.getElementById("status").textContent = "保存失败";
    return;
  }
  const data = await res.json();
  document.getElementById("status").textContent = `保存成功，共 ${data.count} 条`;
}
