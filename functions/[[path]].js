// functions/[[path]].js

// ==========================================
// 1. 工具函数 (IP 验证与清洗)
// ==========================================
const isIPv4 = (ip) => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
const isIPv6 = (ip) => /^[0-9a-f:]+$/i.test(ip) && ip.includes(":");
const normalizeIPs = (arr) => {
  const set = new Set();
  for (const ip of arr || []) {
    const pure = ip.trim();
    if (isIPv4(pure) || isIPv6(pure)) set.add(pure);
  }
  return [...set];
};

// 中国古诗名句库 (保持不变)
const quotes = [
  "长风破浪会有时","会当凌绝顶，一览众山小","宝剑锋从磨砺出","梅花香自苦寒来","天生我材必有用",
  "千里之行，始于足下","路漫漫其修远兮，吾将上下而求索","不畏浮云遮望眼","海内存知己，天涯若比邻","莫愁前路无知己",
  "业精于勤荒于嬉","黑发不知勤学早，白首方悔读书迟","少壮不努力，老大徒伤悲","书山有路勤为径，学海无涯苦作舟","学而不厌，诲人不倦",
  "敏而好学，不耻下问","读书破万卷，下笔如有神","学而时习之，不亦说乎","知之者不如好之者，好之者不如乐之者","学而不思则罔，思而不学则殆",
  "天行健，君子以自强不息","地势坤，君子以厚德载物","穷且益坚，不坠青云之志","志当存高远","燕雀安知鸿鹄之志",
  "会挽雕弓如满月，西北望，射天狼","人生自古谁无死，留取丹心照汗青","先天下之忧而忧，后天下之乐而乐","苟利国家生死以，岂因祸福避趋之","天下兴亡，匹夫有责",
  "位卑未敢忘忧国","人生如逆旅，我亦是行人","人生得意须尽欢，莫使金樽空对月","仰天大笑出门去，我辈岂是蓬蒿人","安能摧眉折腰事权贵，使我不得开心颜",
  "大鹏一日同风起，扶摇直上九万里","直挂云帆济沧海","长风几万里，吹度玉门关","欲穷千里目，更上一层楼","会当凌绝顶，一览众山小",
  "江山代有人才出，各领风骚数百年","沉舟侧畔千帆过，病树前头万木春","长江后浪推前浪，世上新人赶旧人","青山遮不住，毕竟东流去","莫愁前路无知己，天下谁人不识君",
  "人生如梦，一尊还酹江月","人生如寄，多忧何益","人生天地间，忽如远行客","人生若只如初见","人生在世不称意，明朝散发弄扁舟",
  "人生如朝露，何必久留","人生如白驹过隙","人生如寄，何必久留","人生如梦，何必多忧","人生如逆旅，我亦是行人",
  "少壮不努力，老大徒伤悲","莫等闲，白了少年头，空悲切","花有重开日，人无再少年","盛年不重来，一日难再晨","及时当勉励，岁月不待人",
  "百川东到海，何时复西归","少壮不努力，老大徒伤悲","黑发不知勤学早，白首方悔读书迟","一寸光阴一寸金，寸金难买寸光阴","光阴似箭，日月如梭",
  "志不强者智不达","志当存高远","有志者事竟成","不飞则已，一飞冲天","不鸣则已，一鸣惊人",
  "千里之行，始于足下","不积跬步，无以至千里","不积小流，无以成江海","绳锯木断，水滴石穿","锲而不舍，金石可镂",
  "工欲善其事，必先利其器","凡事预则立，不预则废","敏而好学，不耻下问","学而不思则罔，思而不学则殆","知之者不如好之者，好之者不如乐之者",
  "读书破万卷，下笔如有神","书山有路勤为径，学海无涯苦作舟","学而不厌，诲人不倦","学而时习之，不亦说乎","温故而知新，可以为师矣"
];

// 兜底默认域名 (与您原始脚本中的列表保持一致)
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
  const KV = env.DOMAINS_KV; // 使用您指定的 KV 命名空间名称

  // 1. 从 KV 读取域名列表
  let targetDomains = defaultDomains;
  try {
    const domainData = await KV.get("domains");
    if (domainData) {
      const parsed = JSON.parse(domainData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        targetDomains = parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read or parse domains from KV:", e);
  }
  
  // A. 处理 POST 请求 (IP 格式化)
  if (request.method === "POST") {
    try {
      const payload = await request.json();
      const results = [];

      for (const records of Object.values(payload || {})) {
        const ips = normalizeIPs(records);
        for (const ip of ips) {
          const quote = quotes[Math.floor(Math.random() * quotes.length)];
          // 输出格式：[IP]:443#[古诗]
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
  // 调用 Pages 的默认行为，获取 /public/index.html 的内容
  const response = await context.next(); 
  
  // 注入域名列表到 HTML
  const text = await response.text();
  const html = text.replace(
      '/* TARGET_DOMAINS_PLACEHOLDER */', 
      `const DOMAINS = ${JSON.stringify(targetDomains)};`
  );

  return new Response(html, response);
}
