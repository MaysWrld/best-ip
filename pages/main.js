const WORKER_BASE = "https://your-worker.workers.dev";

function showToast(msg, isError=false) {
  const t=document.getElementById("toast");
  t.textContent=msg;
  t.style.backgroundColor=isError?"#d93025":"#333";
  t.className="show";
  setTimeout(()=>t.className="",3000);
}

function clearOutput(){
  document.getElementById("result").textContent="已清空。";
  document.getElementById("error").textContent="";
  document.getElementById("btn").style.display="inline-block";
  document.getElementById("btn").textContent="关闭代理 获取 IP / 复制";
  document.getElementById("btn").disabled=false;
  document.getElementById("btn-copy").style.display="none";
}

async function manualCopy(){
  const text=document.getElementById("result").textContent;
  try{await navigator.clipboard.writeText(text);showToast("✅ 复制成功！");}
  catch{showToast("❌ 复制失败，请手动全选复制",true);}
}

async function getIPs(){
  const btn=document.getElementById("btn");
  const copyBtn=document.getElementById("btn-copy");
  const errDiv=document.getElementById("error");
  const resPre=document.getElementById("result");
  btn.disabled=true;btn.textContent="⚙️ 获取中...";errDiv.textContent="";copyBtn.style.display="none";
  try{
    const res=await fetch(`${WORKER_BASE}/api/domains`);
    const {domains}=await res.json();
    const results={};
    for(const d of domains){
      const a=await fetch(`https://dns.alidns.com/resolve?name=${d}&type=A`).then(r=>r.json()).catch(()=>({}));
      const aaaa=await fetch(`https://dns.alidns.com/resolve?name=${d}&type=AAAA`).then(r=>r.json()).catch(()=>({}));
      const ips=[...(a.Answer||[]).map(x=>x.data),...(aaaa.Answer||[]).map(x=>x.data)];
      if(ips.length)results[d]=ips;
    }
    if(Object.keys(results).length===0)throw new Error("未能解析到任何有效 IP");
    const res2=await fetch(`${WORKER_BASE}/api/format`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(results)});
    if(!res2.ok)throw new Error("服务端处理失败");
    const data=await res2.json();
    resPre.textContent=data.join("\n");
    showToast("✅ IP 获取成功，请点击绿色按钮复制");
    btn.style.display="none";copyBtn.style.display="inline-block";
  }catch(e){
    errDiv.textContent="❌ 失败："+(e.message||"未知错误");
    resPre.textContent="出现错误，请检查网络连接。";
    btn.textContent="关闭代理 获取 IP / 复制";
  }finally{btn.disabled=false;}
}
