const demoData = {
  // 节点类型配置
  nodeTypes: [
    { type: "dataset", name: "数据节点", color: "#3b82f6", icon: "📊" },
    { type: "prompt", name: "Prompt 节点", color: "#8b5cf6", icon: "💬" },
    { type: "skill", name: "Skill 节点", color: "#10b981", icon: "⚡" },
    { type: "mcp", name: "MCP 节点", color: "#f59e0b", icon: "🔗" },
    { type: "output", name: "结果输出", color: "#ef4444", icon: "📤" },
  ],

  // 可用模型列表
  availableModels: [
    { id: "gpt-4.1", name: "GPT-4.1", provider: "OpenAI", maxTokens: 128000 },
    { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "OpenAI", maxTokens: 128000 },
    { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", maxTokens: 128000 },
    { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", maxTokens: 200000 },
    { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic", maxTokens: 200000 },
    { id: "claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic", maxTokens: 200000 },
    { id: "deepseek-v3", name: "DeepSeek V3", provider: "DeepSeek", maxTokens: 64000 },
    { id: "qwen-max", name: "Qwen Max", provider: "Alibaba", maxTokens: 32000 },
    { id: "doubao-pro", name: "Doubao Pro", provider: "ByteDance", maxTokens: 128000 },
  ],

  // 默认模型配置
  defaultModelConfig: {
    model: "gpt-4.1",
    temperature: 0.3,
    maxTokens: 4096,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },

  summary: [
    { title: "Prompts", value: "12" },
    { title: "Workflow 版本", value: "6" },
    { title: "运行中", value: "2" },
  ],
  prompts: [
    {
      id: "p-001",
      name: "语义聚类-标签提取",
      description: "生成聚类标签并规范化输出",
      versions: [
        {
          version: "v1",
          createdAt: "2026-03-02 10:12",
          content: "你是文本聚类助手。给定一批文本，输出 3 个聚类标签。\n输出 JSON: {clusters: [{label, rationale}]}",
          model: "GPT-4.1",
          temperature: 0.2,
        },
        {
          version: "v2",
          createdAt: "2026-03-05 16:40",
          content: "你是语义聚类助手。为每个主题给出简洁标签并提供例子。\n输出 JSON: {clusters: [{label, examples, rationale}]}",
          model: "GPT-4.1",
          temperature: 0.3,
        },
        {
          version: "v3",
          createdAt: "2026-03-09 09:15",
          content: "你是语义聚类助手。\n步骤: 1) 归纳主题 2) 合并相似主题 3) 输出标签、示例、覆盖率。\n输出 JSON: {clusters: [{label, examples, coverage, rationale}]}",
          model: "GPT-4.1",
          temperature: 0.25,
        },
      ],
    },
    {
      id: "p-002",
      name: "搜索相关性打标",
      description: "判断 query-item 相关性并输出等级",
      versions: [
        {
          version: "v1",
          createdAt: "2026-03-01 13:05",
          content: "判断 query 与 item 的相关性，输出 0-2 分。\n0=不相关,1=部分相关,2=相关。\n输出 JSON: {score, reason}",
          model: "GPT-4.1",
          temperature: 0.1,
        },
        {
          version: "v2",
          createdAt: "2026-03-06 11:22",
          content: "根据 query 与 item 描述，输出相关性等级与关键证据。\n输出 JSON: {score, evidence, mismatch?}",
          model: "GPT-4.1",
          temperature: 0.15,
        },
      ],
    },
  ],
  workflows: [
    {
      id: "w-001",
      name: "语义聚类流水线",
      description: "文本聚类 + 标签规范化 + 报表导出",
      version: "v4",
      nodes: [
        { id: "n1", name: "导入数据", type: "dataset", x: 20, y: 30 },
        { id: "n2", name: "Prompt v3", type: "llm", x: 220, y: 30 },
        { id: "n3", name: "聚类后处理", type: "skill", x: 420, y: 30 },
        { id: "n4", name: "评测", type: "eval", x: 620, y: 30 },
        { id: "n5", name: "导出报告", type: "export", x: 820, y: 30 },
      ],
      edges: [
        ["n1", "n2"],
        ["n2", "n3"],
        ["n3", "n4"],
        ["n4", "n5"],
      ],
    },
    {
      id: "w-002",
      name: "搜索相关性打标",
      description: "批量打标 + 版本对比",
      version: "v2",
      nodes: [
        { id: "n1", name: "样本导入", type: "dataset", x: 20, y: 90 },
        { id: "n2", name: "Prompt v2", type: "llm", x: 220, y: 90 },
        { id: "n3", name: "人审对比", type: "review", x: 420, y: 90 },
        { id: "n4", name: "指标汇总", type: "eval", x: 620, y: 90 },
      ],
      edges: [
        ["n1", "n2"],
        ["n2", "n3"],
        ["n3", "n4"],
      ],
    },
  ],
  runs: [
    {
      id: "r-901",
      name: "语义聚类流水线 · 2026-03-09",
      status: "running",
      startedAt: "2026-03-09 10:20",
      nodes: [
        { name: "导入数据", status: "success" },
        { name: "Prompt v3", status: "success" },
        { name: "聚类后处理", status: "running" },
        { name: "评测", status: "pending" },
      ],
      artifacts: [
        { name: "cluster-output.json", type: "object" },
        { name: "cluster-preview.csv", type: "object" },
      ],
    },
    {
      id: "r-902",
      name: "搜索相关性打标 · 2026-03-08",
      status: "success",
      startedAt: "2026-03-08 15:45",
      nodes: [
        { name: "样本导入", status: "success" },
        { name: "Prompt v2", status: "success" },
        { name: "人审对比", status: "success" },
        { name: "指标汇总", status: "success" },
      ],
      artifacts: [
        { name: "relevance-report.pdf", type: "object" },
        { name: "labeling-output.parquet", type: "object" },
      ],
    },
  ],
  // 远端注册中心
  remoteRegistries: [
    { id: "reg-01", name: "Official MCP Registry", url: "https://registry.mcp.dev", status: "connected" },
    { id: "reg-02", name: "Internal Skill Hub", url: "https://skills.internal.io", status: "connected" },
    { id: "reg-03", name: "Community Registry", url: "https://community.mcp.dev", status: "available" },
  ],

  // MCP 组件列表
  mcpIntegrations: [
    { id: "mcp-01", name: "向量检索 MCP", status: "connected", version: "1.2.0", registry: "Official MCP Registry", description: "提供向量相似度检索能力" },
    { id: "mcp-02", name: "文件系统 MCP", status: "available", version: "2.0.1", registry: "Official MCP Registry", description: "文件读写与目录管理" },
    { id: "mcp-03", name: "数据库查询 MCP", status: "available", version: "1.0.0", registry: "Community Registry", description: "SQL 数据库查询接口" },
    { id: "mcp-04", name: "Web 搜索 MCP", status: "connected", version: "1.5.0", registry: "Official MCP Registry", description: "联网搜索与信息检索" },
  ],

  // Skill 组件列表
  skillIntegrations: [
    { id: "skill-01", name: "聚类后处理 Skill", status: "connected", version: "1.0.0", registry: "Internal Skill Hub", description: "聚类结果的清洗与格式化" },
    { id: "skill-02", name: "文本清洗 Skill", status: "available", version: "2.1.0", registry: "Internal Skill Hub", description: "文本预处理与标准化" },
    { id: "skill-03", name: "数据格式转换 Skill", status: "available", version: "1.5.0", registry: "Internal Skill Hub", description: "JSON/CSV/Parquet 格式互转" },
    { id: "skill-04", name: "Prompt 增强 Skill", status: "connected", version: "1.2.0", registry: "Internal Skill Hub", description: "自动优化 Prompt 结构" },
  ],

  // 保留兼容旧数据（已清空）
  integrations: [],
  capabilities: [
    { name: "Prompt 版本对比", status: "已启用" },
    { name: "Temporal 长流程", status: "已启用" },
    { name: "MCP/Skill 自动发现", status: "灰度" },
    { name: "评测报表导出", status: "已启用" },
  ],
};

window.demoData = demoData;
