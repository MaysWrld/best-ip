const WORKER_BASE = "https://your-worker.workers.dev";

async function getIPs() {
  const res = await fetch(`${WORKER_BASE}/api/domains`);
  const { domains } = await res.json();
  const results = {};
  for (const d of domains) {
    const a = await fetch(`https://dns.alidns.com/resolve?name=${d}&type=A`).then(r=>r.json()).catch(()=>({}));
    const aaaa = await fetch(`https://dns.alidns.com/resolve?name=${d}&type=AAAA`).then(r=>r.json()).catch(()=>({}));
    const ips = [...new Set([...(a.Answer||[]).map(x=>x.data), ...(aaaa.Answer||[]).map(x=>x.data)])];
    if (ips.length) results[d] = ips;
  }
  const res2 = await fetch(`${WORKER_BASE}/api/format`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(results)
  });
  const data = await res2.json();
  document.getElementById("result").textContent = data.join("\n");
}
