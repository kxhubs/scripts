function main(config) {
  // ==================== 1. DNS 基础与防污染分流配置 (修改与合并) ====================
  // 如果原有配置没有 dns，则初始化一个空对象
  config.dns = config.dns || {};
  
  config.dns["enable"] = true;
  config.dns["enhanced-mode"] = "fake-ip"; 
  
  // 仅覆盖核心的 nameserver 为你的 5554 国外组防污染端口
  config.dns["nameserver"] =[
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
  const extraFakeIpFilters =[
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


// ==================== 3. 远程自定义规则配置 (追加) ====================
config["rule-providers"] = config["rule-providers"] || {};

// 插入自定义的远端 list 规则集
config["rule-providers"]["custom_remote_rule"] = {
  "type": "http",
  "behavior": "classical",
  "url": "https://raw.githubusercontent.com/kxhubs/scripts/refs/heads/main/rules/Custom.list",
  "path": "./ruleset/custom_remote_rule.yaml",
  "interval": 86400
};

config.rules = config.rules || [];

const customRule = "RULE-SET,custom_remote_rule,默认代理";

// 检查是否已经存在（防重复插入），不存在则插在规则数组开头
if (!config.rules.some(rule => rule === customRule)) {
  config.rules.unshift(customRule);
}

  // 返回修改完成后的配置对象
  return config;
}
