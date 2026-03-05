function main(config) {
  // ──────────────── 确保 dns 存在 ─────────────────────────────────────
  if (!config.dns) {
    config.dns = {};
  }

  const dns = config.dns;

  // ──────────────── 基础设置（保持模板大部分，强制防泄漏） ────────────
  dns.enable = true;
  dns.listen = "0.0.0.0:1053";           // 常见本地监听端口
  dns.ipv6 = false;                      // 如不需要 IPv6 可关闭，减少泄漏面
  dns["enhanced-mode"] = "fake-ip";
  dns["fake-ip-range"] = "198.18.0.1/16";

  // Fake-IP 过滤：国内、直连、内网强制走真实 IP（防国内污染 & 速度问题）
  if (!dns["fake-ip-filter"]) {
    dns["fake-ip-filter"] = [];
  }
  // 追加常见过滤（可根据你的规则集再加 geosite:cn 等）
  const extraFilters = [
    "rule-set:Direct",       // 如果你的模板有 Direct 规则集
    "rule-set:Private",
    "rule-set:China",        // 如有 geosite:cn 相关规则集
    "+.lan",
    "+.local",
    "+.miwifi.com",
    "+.push.apple.com",
    "localhost.ptlogin2.qq.com"
  ];
  extraFilters.forEach(f => {
    if (!dns["fake-ip-filter"].includes(f)) {
      dns["fake-ip-filter"].push(f);
    }
  });

  // ──────────────── DNS 服务器设置 ─────────────────────────────────────
  // 1. 最底层：解析其他 DNS 域名的基础（必须明文 IP）
  dns["default-nameserver"] = [
    "223.5.5.5",           // 阿里
    "119.29.29.29"         // 腾讯，可再加 114.114.114.114 等
  ];

  // 2. 代理节点域名解析 → 强制国内（防污染 & 防鸡蛋问题）
  dns["proxy-server-nameserver"] = "127.0.0.1:5553";

  // 3. 直连流量域名解析 → 国内（优化速度，可选）
  dns["direct-nameserver"] = "127.0.0.1:5553";

  // 4. 默认兜底（基本不会走到这里，因为有 nameserver-policy）
  dns.nameserver = ["127.0.0.1:5554"];

  // ──────────────── 核心：DNS 分流策略（国内外分流） ───────────────────
  if (!dns["nameserver-policy"]) {
    dns["nameserver-policy"] = {};
  }

  const policy = dns["nameserver-policy"];

  // 国内 + 内网 + 私有 → 走国内 DNS 组（5553）
  policy["geosite:cn,private,tld-cn"] = "127.0.0.1:5553";
  policy["+.+.cn"] = "127.0.0.1:5553";                     // 补充 .cn 顶级域名
  policy["rule-set:Direct,China,Private"] = "127.0.0.1:5553";  // 如果模板有这些规则集

  // 国外 + GFWList + 非中国 → 走国外 DNS 组（5554）
  policy["geosite:geolocation-!cn,gfw,tld-!cn"] = "127.0.0.1:5554";

  // 可选：更精细的域名分流（根据需求自行增删）
  // policy["+.google.com,+.youtube.com,+.facebook.com"] = "127.0.0.1:5554";
  // policy["+.apple.com,+.icloud.com"] = "127.0.0.1:5553";  // 苹果部分服务国内更快

  // ──────────────── 防泄漏关键 ─────────────────────────────────────────
  dns["respect-rules"] = true;   // DNS 查询本身也走代理规则（强烈推荐）

  // ──────────────── 追加 prevent_dns_leak 规则 ─────
  if (!config["rule-providers"]) {
    config["rule-providers"] = {};
  }

  config["rule-providers"]["prevent_dns_leak"] = {
    type: "http",
    interval: 86400,
    behavior: "domain",
    format: "text",
    url: "https://raw.githubusercontent.com/kxhubs/scripts/refs/heads/main/rules/Custom.mrs"
  };

  if (Array.isArray(config.rules)) {
    const matchRule = config.rules.find(r => r.startsWith("MATCH"));
    const finalPolicy = matchRule ? matchRule.split(",").pop().trim() : "兜底流量";
    const newRule = `RULE-SET,prevent_dns_leak,${finalPolicy}`;
    config.rules.unshift(newRule);
  }

  // ──────────────── 返回修改后的配置 ────────────────────────────────
  return config;
}
