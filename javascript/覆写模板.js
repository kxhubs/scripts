function main(config) {
  // ==================== 1. DNS 基础与防污染分流配置 (修改与合并) ====================
  config.dns = config.dns || {};
  config.dns["enable"] = true;
  config.dns["enhanced-mode"] = "fake-ip";
  // 仅覆盖核心的 nameserver 为你的 5554 国外组防污染端口
  config.dns["nameserver"] = [
    "127.0.0.1:5554"
  ];
  // 合并 nameserver-policy，保留模板原有的策略，同时强制写入国内组分流 (5553 端口)
  config.dns["nameserver-policy"] = config.dns["nameserver-policy"] || {};
  Object.assign(config.dns["nameserver-policy"], {
    "geosite:cn": "127.0.0.1:5553",
    "geosite:private": "127.0.0.1:5553"
  });
  // 安全追加 fake-ip-filter（如果模板里已经有其他的，保留它们）
  config.dns["fake-ip-filter"] = config.dns["fake-ip-filter"] || [];
  const extraFakeIpFilters = [
    "*.lan", "*.localdomain", "*.example", "*.invalid", "*.localhost", "*.test", "*.local", "router.asus.com"
  ];
  extraFakeIpFilters.forEach(domain => {
    if (!config.dns["fake-ip-filter"].includes(domain)) {
      config.dns["fake-ip-filter"].push(domain);
    }
  });

  // ==================== 2. TUN 路由器环境配置 (修改与合并) ====================
  config.tun = config.tun || {};
  // 覆盖/补充适合路由器的核心 TUN 参数
  config.tun["enable"] = true;
  config.tun["stack"] = "system"; // Linux/路由器推荐 system
  config.tun["auto-route"] = true;
  config.tun["auto-redirect"] = true;
  config.tun["auto-detect-interface"] = true;
  // 安全追加 dns-hijack，确保路由器能劫持局域网的 53 端口请求
  config.tun["dns-hijack"] = config.tun["dns-hijack"] || [];
  const extraDnsHijacks = ["any:53", "tcp://any:53"];
  extraDnsHijacks.forEach(hijack => {
    if (!config.tun["dns-hijack"].includes(hijack)) {
      config.tun["dns-hijack"].push(hijack);
    }
  });

  // ==================== 3. 远程自定义规则配置 (追加两个新规则集 + 原有) ====================
  config["rule-providers"] = config["rule-providers"] || {};

  // 新增1：专用于 DIRECT 的远程规则集（例如 PikPak 下载加速）
  config["rule-providers"]["custom_direct_rule"] = {
    "type": "http",
    "behavior": "classical",
    "url": "https://raw.githubusercontent.com/kxhubs/scripts/refs/heads/main/rules/%E7%9B%B4%E8%BF%9E%E8%A7%84%E5%88%99.list",  // ← 替换成你的实际 DIRECT 规则 URL
    "path": "./ruleset/custom_direct_rule.yaml",
    "interval": 86400
  };

  // 新增2：专用于 默认代理 的远程规则集（例如 PikPak 主域名或其他代理规则）
  config["rule-providers"]["custom_proxy_rule"] = {
    "type": "http",
    "behavior": "classical",
    "url": "https://raw.githubusercontent.com/kxhubs/scripts/refs/heads/main/rules/%E4%BB%A3%E7%90%86%E8%A7%84%E5%88%99.list",  // ← 替换成你的实际 PROXY 规则 URL
    "path": "./ruleset/custom_proxy_rule.yaml",
    "interval": 86400
  };

  config.rules = config.rules || [];

  // 插入规则到最前面（最高优先级）：先 DIRECT 的 PikPak 下载，再 PROXY 的 PikPak 服务，最后原有 custom_remote_rule
  const priorityOrder = [
    "RULE-SET,custom_direct_rule,直接连接",   // 先匹配强制直连（加速下载）
    "RULE-SET,custom_proxy_rule,默认代理"   // 再匹配需要代理的域名
  ];

  priorityOrder.reverse().forEach(rule => {
    if (!config.rules.some(r => r === rule)) {
      config.rules.unshift(rule);
    }
  });

  // ==================== 4. 新增：将 external-controller 监听地址改为 0.0.0.0:9090 ====================
  config["external-controller"] = "0.0.0.0:9090"; // 强制监听所有接口，便于局域网访问面板

  // 安全合并/补充 external-ui 相关配置（防止覆盖用户已有设置）
  config["external-ui"] = config["external-ui"] || "ui";
  config["external-ui-name"] = config["external-ui-name"] || "zashboard";
  config["external-ui-url"] = config["external-ui-url"] || "https://github.com/Zephyruso/zashboard/releases/latest/download/dist.zip";

  // 返回修改完成后的配置对象
  return config;
}
