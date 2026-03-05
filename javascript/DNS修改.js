function main(config) {
  // ──────────────── 1. 修改 DNS ───────────────────────────────────────
  if (!config.dns) {
    config.dns = {};
  }

  const dns = config.dns;

  // 先设置 default-nameserver（通常在最前面）
  dns["default-nameserver"] = ["127.0.0.1:5553"];

  // 设置 nameserver
  dns.nameserver = ["127.0.0.1:5553"];

  // 紧接着设置 proxy-server-nameserver（保证在 nameserver 下面）
  dns["proxy-server-nameserver"] = "127.0.0.1:5554";

  // 保留或强制设置 fake-ip 相关（模板已有，可按需调整或删除）
  dns["enhanced-mode"] = "fake-ip";
  if (!dns["fake-ip-range"]) {
    dns["fake-ip-range"] = "198.18.0.1/16";
  }

  // 如果你想完全清空或重写 fake-ip-filter，也可以在这里处理
  // dns["fake-ip-filter"] = ["+.lan", "localhost.ptlogin2.qq.com"];  // 示例

  // ──────────────── 2. 追加自定义 rule-provider ────────────────────────
  if (!config["rule-providers"]) {
    config["rule-providers"] = {};
  }

  const newProvider = {
    type: "http",
    interval: 86400,
    behavior: "domain",
    format: "text",
    url: "https://raw.githubusercontent.com/kxhubs/scripts/refs/heads/main/rules/Custom.mrs"
  };

  config["rule-providers"]["prevent_dns_leak"] = newProvider;

  // ──────────────── 3. 在 rules 最前面插入 RULE-SET 引用 ──────────────
  if (Array.isArray(config.rules)) {
    // 找到原 MATCH 规则，提取其最终策略组名
    const matchRule = config.rules.find(rule => rule.startsWith("MATCH"));
    const finalPolicy = matchRule ? matchRule.split(",").pop().trim() : "兜底流量";

    // 新规则放在最前面
    const newRule = `RULE-SET,prevent_dns_leak,${finalPolicy}`;
    config.rules.unshift(newRule);
  }

  // ──────────────── 返回修改后的配置 ──────────────────────────────
  return config;
}
