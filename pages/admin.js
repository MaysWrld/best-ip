async function fetchDomains(base, token) {
  const res = await fetch(`${base}/api/admin/domains`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Load failed: ${res.status}`);
  const data = await res.json();
  return data.domains || [];
}

async function saveDomains(base, token, domainsText) {
  const res = await fetch(`${base}/api/admin/domains`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ domains: domainsText })
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
  return res.json();
}

document.getElementById("loadBtn").addEventListener("click", async () => {
  const base = document.getElementById("workerBase").value.trim();
  const token = document.getElementById("token").value.trim();
  const status = document.getElementById("status");
  try {
    status.textContent = "加载中...";
    const domains = await fetchDomains(base, token);
    document.getElementById("domains").value = domains.join("\n");
    status.textContent = `加载成功，共 ${domains.length} 条`;
  } catch (e) {
    status.textContent = `加载失败：${e.message}`;
  }
});

document.getElementById("saveBtn").addEventListener("click", async () => {
  const base = document.getElementById("workerBase").value.trim();
  const token = document.getElementById("token").value.trim();
  const status = document.getElementById("status");
  const text = document.getElementById("domains").value;
  try {
    status.textContent = "保存中...";
    const ret = await saveDomains(base, token, text);
    status.textContent = `保存成功，当前 ${ret.count} 条`;
  } catch (e) {
    status.textContent = `保存失败：${e.message}`;
  }
});
