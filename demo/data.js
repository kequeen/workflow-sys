const demoData = {
  summary: [
    { title: "Prompts", value: "12" },
    { title: "Workflow 版本", value: "6" },
    { title: "运行中", value: "2" },
    { title: "评测任务", value: "5" },
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
  evals: [
    {
      id: "e-101",
      name: "聚类标签质量评测",
      type: "cluster",
      dataset: "cluster-raw-202603",
      baseline: "v2",
      candidate: "v3",
      metrics: [
        { name: "一致性", value: 0.82 },
        { name: "覆盖率", value: 0.91 },
        { name: "可解释性", value: 0.87 },
      ],
      summary:
        "v3 在覆盖率与可解释性上提升明显，建议作为默认版本并保留 v2 作为回退。",
    },
    {
      id: "e-102",
      name: "搜索相关性打标评测",
      type: "relevance",
      dataset: "search-pairs-202603",
      baseline: "v1",
      candidate: "v2",
      metrics: [
        { name: "准确率", value: 0.89 },
        { name: "召回率", value: 0.83 },
        { name: "F1", value: 0.86 },
      ],
      summary:
        "v2 在部分相关的识别上更稳健，整体 F1 提升 4%。",
    },
  ],
  integrations: [
    {
      id: "i-01",
      name: "聚类后处理 Skill",
      type: "Skill",
      status: "connected",
      provider: "internal",
    },
    {
      id: "i-02",
      name: "向量检索 MCP",
      type: "MCP",
      status: "connected",
      provider: "open-source",
    },
    {
      id: "i-03",
      name: "人审标注平台",
      type: "Connector",
      status: "pending",
      provider: "third-party",
    },
  ],
  capabilities: [
    { name: "Prompt 版本对比", status: "已启用" },
    { name: "Temporal 长流程", status: "已启用" },
    { name: "MCP/Skill 自动发现", status: "灰度" },
    { name: "评测报表导出", status: "已启用" },
  ],
};

window.demoData = demoData;
