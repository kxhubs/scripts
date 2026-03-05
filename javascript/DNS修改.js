function main(config) {
  // ──────────────── 1. DNS 配置（国内外分流 + 防泄漏） ────────────────────────────────
  if (!config.dns) {
    config.dns = {};
  }

  const dns = config.dns;

  dns.enable = true;
  dns.listen = "0.0.0.0:1053";
  dns.ipv6 = false;                      // 如不需要 IPv6 可关闭，减少泄漏
  dns["enhanced-mode"] = "fake-ip";
  dns["fake-ip-range"] = "198.18.0.1/16";

  // Fake-IP 过滤：国内/直连/内网强制真实 IP
  if (!dns["fake-ip-filter"]) {
    dns["fake-ip-filter"] = [];
  }
  const extraFilters = [
    "rule-set:Direct",
    "rule-set:Private",
    "rule-set:China",
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

  // DNS 服务器设置
  dns["default-nameserver"] = ["223.5.5.5", "119.29.29.29"];
  dns["proxy-server-nameserver"] = "127.0.0.1:5553";   // 节点域名 → 国内
  dns["direct-nameserver"] = "127.0.0.1:5553";         // 直连流量 → 国内
  dns.nameserver = ["127.0.0.1:5554"];                 // 默认兜底 → 国外

  // 核心：nameserver-policy 国内外分流
  if (!dns["nameserver-policy"]) {
    dns["nameserver-policy"] = {};
  }
  const policy = dns["nameserver-policy"];

  policy["geosite:cn,private,tld-cn"] = "127.0.0.1:5553";
  policy["+.+.cn"] = "127.0.0.1:5553";
  policy["rule-set:Direct,China,Private"] = "127.0.0.1:5553";

  policy["geosite:geolocation-!cn,gfw,tld-!cn"] = "127.0.0.1:5554";

  dns["respect-rules"] = true;   // DNS 查询走代理规则，防泄漏关键

  // ──────────────── 2. 追加 prevent_dns_leak 规则 ──────────────────────────────────────
  if (!config["rule-providers"]) {
    config["rule-providers"] = {};
  }

  config["rule-providers"]["prevent_dns_leak"] = {
    type: "http",
    interval: 86400,
    behavior: "domain",
    format: "text",
    url: "https://raw.githubusercontent.com/kxhubs/scripts/refs/heads/main/rules/Custom.list"
  };

  if (Array.isArray(config.rules)) {
    const matchRule = config.rules.find(r => r.startsWith("MATCH"));
    const finalPolicy = matchRule ? matchRule.split(",").pop().trim() : "兜底流量";
    const newRule = `RULE-SET,prevent_dns_leak,${finalPolicy}`;
    config.rules.unshift(newRule);
  }

  // ──────────────── 3. TUN 模式配置（OpenWrt + Nikki 推荐开启） ────────────────────────
  if (!config.tun) {
    config.tun = {};
  }

  const tun = config.tun;

  tun.enable = true;
  tun.stack = "system";                  // 路由器首选 system（性能好）
  tun.device = "mihomo";                 // 自定义 TUN 网卡名，避免冲突
  tun.mtu = 9000;                        // 常见值，下载更快；如卡顿可改 1500
  tun["auto-route"] = true;
  tun["auto-redirect"] = true;
  tun["auto-detect-interface"] = true;
  tun["strict-route"] = false;           // 必须 false！否则局域网无法访问路由器本身
  tun["dns-hijack"] = [
    "any:53",
    "tcp://any:53"
  ];
  tun["endpoint-independent-nat"] = false;

  // ──────────────── 返回完整修改后的配置 ───────────────────────────────────────────────
  return config;
}
