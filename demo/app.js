const state = {
  view: "prompts",
  selected: {
    prompts: 0,
    workflows: 0,
    runs: 0,
    integrations: 0,
  },
  integrationTab: "mcp", // "mcp" | "skill"
  // Workflow 编辑器状态
  isEditorMode: false,
  editorNodes: [],
  editorEdges: [],
  selectedNodeId: null,
  draggingNode: null,
  connectingFrom: null,
  // 模型配置
  modelConfig: null,
};

const viewConfig = {
  prompts: {
    title: "Prompt 版本",
    subtitle: "管理 prompt 迭代与对比",
    actions: ["新建版本", "对比", "导出"],
  },
  workflows: {
    title: "Workflow 画布",
    subtitle: "可视化编排与 Temporal 发布",
    actions: ["发布到 Temporal", "复制版本"],
  },
  runs: {
    title: "运行记录",
    subtitle: "跟踪 Temporal 执行状态与产出物",
    actions: ["重试失败", "下载日志"],
  },
  integrations: {
    title: "能力集成",
    subtitle: "管理外部能力与连接器",
    actions: [],
  },
};

const $summary = document.getElementById("summary");
const $list = document.getElementById("list");
const $detail = document.getElementById("detail");
const $panelTitle = document.getElementById("panel-title");
const $panelSubtitle = document.getElementById("panel-subtitle");
const $panelActions = document.getElementById("panel-actions");

function renderSummary() {
  $summary.innerHTML = "";
  demoData.summary.forEach((card) => {
    const el = document.createElement("div");
    el.className = "summary-card";
    el.innerHTML = `
      <div class="summary-card-title">${card.title}</div>
      <div class="summary-card-value">${card.value}</div>
    `;
    $summary.appendChild(el);
  });
}

function setActiveNav(view) {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
}

function renderPanelHeader(view) {
  const cfg = viewConfig[view];
  $panelTitle.textContent = cfg.title;
  $panelSubtitle.textContent = cfg.subtitle;
  $panelActions.innerHTML = "";
  cfg.actions.forEach((label) => {
    const btn = document.createElement("button");
    btn.className = "ghost";
    btn.textContent = label;
    btn.addEventListener("click", () => toast(`${label} · Demo`));
    $panelActions.appendChild(btn);
  });
}

function renderList() {
  $list.innerHTML = "";
  let items = [];
  if (state.view === "prompts") items = demoData.prompts;
  if (state.view === "workflows") items = demoData.workflows;
  if (state.view === "runs") items = demoData.runs;
  if (state.view === "integrations") {
    // 显示 MCP/Skill 切换选项
    const mcpItem = document.createElement("div");
    mcpItem.className = `list-item ${state.integrationTab === "mcp" ? "active" : ""}`;
    mcpItem.innerHTML = `
      <div class="list-item-title">MCP</div>
      <div class="list-item-meta">${demoData.mcpIntegrations.filter(i => i.status === "connected").length} 个已连接</div>
    `;
    mcpItem.addEventListener("click", () => {
      state.integrationTab = "mcp";
      renderList();
      renderDetail();
    });
    $list.appendChild(mcpItem);

    const skillItem = document.createElement("div");
    skillItem.className = `list-item ${state.integrationTab === "skill" ? "active" : ""}`;
    skillItem.innerHTML = `
      <div class="list-item-title">Skill</div>
      <div class="list-item-meta">${demoData.skillIntegrations.filter(i => i.status === "connected").length} 个已连接</div>
    `;
    skillItem.addEventListener("click", () => {
      state.integrationTab = "skill";
      renderList();
      renderDetail();
    });
    $list.appendChild(skillItem);
    return;
  }

  items.forEach((item, idx) => {
    const el = document.createElement("div");
    el.className = "list-item";
    if (state.selected[state.view] === idx) el.classList.add("active");

    let meta = "";
    if (state.view === "prompts") meta = `${item.versions.length} 个版本 · ${item.description}`;
    if (state.view === "workflows") meta = `${item.version} · ${item.description}`;
    if (state.view === "runs") meta = `${item.status.toUpperCase()} · ${item.startedAt}`;

    el.innerHTML = `
      <div class="list-item-title">${item.name}</div>
      <div class="list-item-meta">${meta}</div>
    `;

    el.addEventListener("click", () => {
      state.selected[state.view] = idx;
      renderList();
      renderDetail();
    });

    $list.appendChild(el);
  });
}

function renderDetail() {
  $detail.innerHTML = "";
  if (state.view === "prompts") return renderPromptDetail();
  if (state.view === "workflows") return renderWorkflowDetail();
  if (state.view === "runs") return renderRunDetail();
  if (state.view === "integrations") return renderIntegrationsDetail();
}

function renderPromptDetail() {
  const prompt = demoData.prompts[state.selected.prompts];
  const tmpl = document.getElementById("prompt-detail-template").content.cloneNode(true);
  const title = tmpl.querySelector(".detail-title");
  const subtitle = tmpl.querySelector(".detail-subtitle");
  const timeline = tmpl.querySelector(".timeline");
  const code = tmpl.querySelector(".code-block");
  const baseSelect = tmpl.querySelector(".compare-select[data-role='base']");
  const candSelect = tmpl.querySelector(".compare-select[data-role='candidate']");
  const diffView = tmpl.querySelector(".diff-view");

  title.textContent = prompt.name;
  subtitle.textContent = prompt.description;

  prompt.versions.forEach((ver, idx) => {
    const item = document.createElement("div");
    item.className = "timeline-item";
    item.innerHTML = `<span>${ver.version}</span><span>${ver.createdAt}</span>`;
    item.addEventListener("click", () => {
      code.textContent = ver.content;
    });
    timeline.appendChild(item);

    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = `${ver.version} · ${ver.createdAt}`;
    baseSelect.appendChild(opt.cloneNode(true));
    candSelect.appendChild(opt);
  });

  const latestIndex = prompt.versions.length - 1;
  const baseIndex = Math.max(0, latestIndex - 1);
  baseSelect.value = baseIndex;
  candSelect.value = latestIndex;
  code.textContent = prompt.versions[latestIndex].content;

  const updateDiff = () => {
    const base = prompt.versions[Number(baseSelect.value)].content;
    const cand = prompt.versions[Number(candSelect.value)].content;
    const diff = diffLines(base, cand);
    diffView.innerHTML = "";
    diff.forEach((line) => {
      const row = document.createElement("div");
      row.className = `diff-line ${line.type}`;
      const prefix = line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
      row.textContent = `${prefix} ${line.text}`;
      diffView.appendChild(row);
    });
  };

  baseSelect.addEventListener("change", updateDiff);
  candSelect.addEventListener("change", updateDiff);

  updateDiff();
  $detail.appendChild(tmpl);
}

function renderWorkflowDetail() {
  const workflow = demoData.workflows[state.selected.workflows];
  const tmpl = document.getElementById("workflow-detail-template").content.cloneNode(true);
  tmpl.querySelector(".detail-title").textContent = workflow.name;
  tmpl.querySelector(".detail-subtitle").textContent = `${workflow.version} · ${workflow.description}`;

  const canvas = tmpl.querySelector(".dag-canvas");
  const stage = document.createElement("div");
  stage.style.position = "relative";
  stage.style.width = "100%";
  stage.style.height = "220px";
  stage.style.overflowX = "auto";

  const maxX = Math.max(...workflow.nodes.map((n) => n.x)) + 200;
  const maxY = Math.max(...workflow.nodes.map((n) => n.y)) + 120;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", maxX);
  svg.setAttribute("height", maxY);
  svg.style.position = "absolute";
  svg.style.left = "0";
  svg.style.top = "0";

  workflow.edges.forEach(([from, to]) => {
    const source = workflow.nodes.find((n) => n.id === from);
    const target = workflow.nodes.find((n) => n.id === to);
    if (!source || !target) return;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", source.x + 110);
    line.setAttribute("y1", source.y + 30);
    line.setAttribute("x2", target.x);
    line.setAttribute("y2", target.y + 30);
    line.setAttribute("stroke", "#94a3b8");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-dasharray", "6 4");
    svg.appendChild(line);
  });

  stage.appendChild(svg);

  workflow.nodes.forEach((node) => {
    const card = document.createElement("div");
    card.className = "node-card";
    card.style.position = "absolute";
    card.style.left = `${node.x}px`;
    card.style.top = `${node.y}px`;
    card.style.width = "120px";
    card.innerHTML = `<strong>${node.name}</strong><span>${node.type}</span>`;
    stage.appendChild(card);
  });

  canvas.appendChild(stage);

  const config = tmpl.querySelector(".node-config");
  workflow.nodes.forEach((node) => {
    const item = document.createElement("div");
    item.className = "node-config-item";
    item.innerHTML = `<strong>${node.name}</strong><div>type: ${node.type}</div><div>retry: 2 · timeout: 5m</div>`;
    config.appendChild(item);
  });

  $detail.appendChild(tmpl);
}

function renderRunDetail() {
  const run = demoData.runs[state.selected.runs];
  const tmpl = document.getElementById("runs-detail-template").content.cloneNode(true);
  tmpl.querySelector(".detail-title").textContent = run.name;
  tmpl.querySelector(".detail-subtitle").textContent = `状态: ${run.status.toUpperCase()} · ${run.startedAt}`;

  const nodes = tmpl.querySelector(".run-nodes");
  run.nodes.forEach((node) => {
    const item = document.createElement("div");
    item.className = "run-node";
    const statusClass =
      node.status === "success"
        ? "status-success"
        : node.status === "running"
        ? "status-running"
        : node.status === "failed"
        ? "status-failed"
        : "status-running";
    item.innerHTML = `<span>${node.name}</span><span class="status-chip ${statusClass}">${node.status}</span>`;
    nodes.appendChild(item);
  });

  const artifacts = tmpl.querySelector(".artifacts");
  run.artifacts.forEach((artifact) => {
    const item = document.createElement("div");
    item.className = "artifact-item";
    item.textContent = `${artifact.name} · ${artifact.type}`;
    artifacts.appendChild(item);
  });

  $detail.appendChild(tmpl);
}

function renderIntegrationsDetail() {
  const tmpl = document.getElementById("integrations-detail-template").content.cloneNode(true);
  const tabName = state.integrationTab === "mcp" ? "MCP" : "Skill";
  tmpl.querySelector(".detail-title").textContent = `${tabName} 组件`;
  tmpl.querySelector(".detail-subtitle").textContent = `${tabName} 组件管理与导入`;

  // 隐藏 tab 切换区域，只保留导入按钮
  const tabsContainer = tmpl.querySelector(".integrations-tabs");
  const importBtn = document.createElement("button");
  importBtn.className = "ghost";
  importBtn.textContent = "导入远端";
  importBtn.addEventListener("click", openImportModal);
  tabsContainer.appendChild(importBtn);

  // 渲染组件列表
  const listContainer = tmpl.querySelector(".component-list");
  const items = state.integrationTab === "mcp" ? demoData.mcpIntegrations : demoData.skillIntegrations;

  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "component-item";

    const info = document.createElement("div");
    info.className = "component-info";
    info.innerHTML = `
      <div class="component-name">${item.name}</div>
      <div class="component-meta">v${item.version} · ${item.registry} · ${item.description}</div>
    `;

    const actions = document.createElement("div");
    actions.className = "component-actions";

    const statusBtn = document.createElement("button");
    statusBtn.className = item.status === "connected" ? "primary" : "ghost";
    statusBtn.textContent = item.status === "connected" ? "已连接" : "安装";
    statusBtn.addEventListener("click", () => {
      toast(`${item.status === "connected" ? "断开连接" : "安装"} ${item.name} · Demo`);
    });

    actions.appendChild(statusBtn);
    el.appendChild(info);
    el.appendChild(actions);
    listContainer.appendChild(el);
  });

  // 渲染能力矩阵
  const capabilities = tmpl.querySelector(".capabilities");
  demoData.capabilities.forEach((item) => {
    const row = document.createElement("div");
    row.className = "capability-row";
    row.innerHTML = `<span>${item.name}</span><span class="capability-badge">${item.status}</span>`;
    capabilities.appendChild(row);
  });

  $detail.innerHTML = "";
  $detail.appendChild(tmpl);
}

function diffLines(baseText, candText) {
  const a = baseText.split("\n");
  const b = candText.split("\n");
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      result.push({ type: "same", text: a[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "remove", text: a[i] });
      i += 1;
    } else {
      result.push({ type: "add", text: b[j] });
      j += 1;
    }
  }

  while (i < n) {
    result.push({ type: "remove", text: a[i] });
    i += 1;
  }

  while (j < m) {
    result.push({ type: "add", text: b[j] });
    j += 1;
  }

  return result;
}

function toast(message) {
  const el = document.createElement("div");
  el.textContent = message;
  el.style.position = "fixed";
  el.style.bottom = "24px";
  el.style.right = "24px";
  el.style.padding = "10px 14px";
  el.style.borderRadius = "999px";
  el.style.background = "#111827";
  el.style.color = "white";
  el.style.fontSize = "12px";
  el.style.boxShadow = "0 10px 20px rgba(15, 23, 42, 0.25)";
  el.style.zIndex = "999";
  document.body.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 1800);
}

// 导入弹窗相关函数
function openImportModal() {
  const modal = document.getElementById("import-modal");
  const registrySelect = document.getElementById("import-registry");
  const typeSelect = document.getElementById("import-type");

  // 设置当前 tab 对应的类型
  typeSelect.value = state.integrationTab;

  // 填充注册中心列表
  registrySelect.innerHTML = '<option value="">-- 选择已连接的注册中心 --</option>';
  demoData.remoteRegistries.forEach((reg) => {
    const opt = document.createElement("option");
    opt.value = reg.url;
    opt.textContent = `${reg.name} (${reg.status === "connected" ? "已连接" : "可用"})`;
    registrySelect.appendChild(opt);
  });

  // 清空其他输入
  document.getElementById("import-url").value = "";
  document.getElementById("import-name").value = "";

  modal.style.display = "flex";
}

function closeImportModal() {
  const modal = document.getElementById("import-modal");
  modal.style.display = "none";
}

function doImport() {
  const type = document.getElementById("import-type").value;
  const url = document.getElementById("import-url").value;
  const registry = document.getElementById("import-registry").value;
  const name = document.getElementById("import-name").value;

  if (!url && !registry) {
    toast("请输入远端地址或选择注册中心");
    return;
  }

  const source = url || registry;
  const typeName = type === "mcp" ? "MCP" : "Skill";
  const displayName = name || "组件";

  toast(`正在导入 ${typeName}: ${displayName}...`);

  // 模拟导入延迟
  setTimeout(() => {
    toast(`${typeName} "${displayName}" 导入成功！`);
    closeImportModal();
  }, 1200);
}

function setupImportModal() {
  const modal = document.getElementById("import-modal");
  const closeBtn = document.getElementById("modal-close-btn");
  const cancelBtn = document.getElementById("import-cancel-btn");
  const confirmBtn = document.getElementById("import-confirm-btn");

  closeBtn.addEventListener("click", closeImportModal);
  cancelBtn.addEventListener("click", closeImportModal);
  confirmBtn.addEventListener("click", doImport);

  // 点击遮罩层关闭
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeImportModal();
    }
  });
}

// ==================== Workflow 编辑器功能 ====================

function enterEditorMode() {
  state.isEditorMode = true;
  state.editorNodes = [];
  state.editorEdges = [];
  state.selectedNodeId = null;
  state.modelConfig = { ...demoData.defaultModelConfig };
  renderEditor();
}

function exitEditorMode() {
  state.isEditorMode = false;
  state.editorNodes = [];
  state.editorEdges = [];
  state.selectedNodeId = null;
  state.modelConfig = null;
  renderPanelHeader(state.view);
  renderList();
  renderDetail();
}

function renderEditor() {
  const main = document.querySelector(".main");
  main.innerHTML = "";

  const tmpl = document.getElementById("workflow-editor-template").content.cloneNode(true);
  main.appendChild(tmpl);

  // 渲染节点面板
  renderNodePalette();

  // 设置事件监听
  setupEditorEvents();

  // 设置模型配置
  setupModelConfig();

  // 渲染初始节点和连线
  renderCanvasNodes();
  renderEdges();
}

function renderNodePalette() {
  const palette = document.getElementById("node-palette");
  if (!palette) return;

  palette.innerHTML = "";
  demoData.nodeTypes.forEach((nodeType) => {
    const node = document.createElement("div");
    node.className = "palette-node";
    node.draggable = true;
    node.dataset.type = nodeType.type;
    node.innerHTML = `
      <div class="palette-node-icon" style="background: ${nodeType.color}20; color: ${nodeType.color};">
        ${nodeType.icon}
      </div>
      <div class="palette-node-info">
        <div class="palette-node-name">${nodeType.name}</div>
      </div>
    `;

    node.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("nodeType", nodeType.type);
      e.dataTransfer.effectAllowed = "copy";
    });

    palette.appendChild(node);
  });
}

function setupEditorEvents() {
  const canvas = document.getElementById("editor-canvas");
  const backBtn = document.getElementById("editor-back-btn");
  const clearBtn = document.getElementById("editor-clear-btn");
  const saveBtn = document.getElementById("editor-save-btn");
  const modelBtn = document.getElementById("editor-model-btn");
  const generateDescBtn = document.getElementById("generate-desc-btn");
  const syncFromDescBtn = document.getElementById("sync-from-desc-btn");
  const executeWorkflowBtn = document.getElementById("execute-workflow-btn");

  // 返回按钮
  backBtn.addEventListener("click", () => {
    if (state.editorNodes.length > 0) {
      if (confirm("确定要放弃当前编辑吗？")) {
        exitEditorMode();
      }
    } else {
      exitEditorMode();
    }
  });

  // 清空按钮
  clearBtn.addEventListener("click", () => {
    if (state.editorNodes.length > 0 && confirm("确定要清空画布吗？")) {
      state.editorNodes = [];
      state.editorEdges = [];
      state.selectedNodeId = null;
      renderCanvasNodes();
      renderEdges();
      renderConfigPanel();
    }
  });

  // 保存按钮
  saveBtn.addEventListener("click", saveWorkflow);

  // 模型配置按钮 - 切换到模型配置 tab
  modelBtn.addEventListener("click", () => {
    switchConfigTab("model");
  });

  // Tab 切换
  document.querySelectorAll(".config-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      switchConfigTab(tab.dataset.tab);
    });
  });

  // 生成描述按钮
  if (generateDescBtn) {
    generateDescBtn.addEventListener("click", generateWorkflowDescription);
  }

  // 从描述同步按钮
  if (syncFromDescBtn) {
    syncFromDescBtn.addEventListener("click", syncFromDescription);
  }

  // 执行 workflow 按钮
  if (executeWorkflowBtn) {
    executeWorkflowBtn.addEventListener("click", executeWorkflow);
  }

  // 画布拖放
  canvas.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });

  canvas.addEventListener("drop", (e) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData("nodeType");
    if (nodeType) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - 70;
      const y = e.clientY - rect.top - 25;
      addNode(nodeType, Math.max(0, x), Math.max(0, y));
    }
  });

  // 点击画布空白处取消选中
  canvas.addEventListener("click", (e) => {
    if (e.target === canvas || e.target.id === "edges-svg") {
      selectNode(null);
    }
  });
}

function switchConfigTab(tabName) {
  document.querySelectorAll(".config-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  document.querySelectorAll(".config-tab-content").forEach((content) => {
    content.classList.toggle("active", content.id === `config-${tabName}-tab`);
  });
}

function setupModelConfig() {
  const modelSelect = document.getElementById("model-select");
  if (!modelSelect) return;

  // 填充模型列表
  modelSelect.innerHTML = "";
  demoData.availableModels.forEach((model) => {
    const opt = document.createElement("option");
    opt.value = model.id;
    opt.textContent = `${model.name} (${model.provider})`;
    modelSelect.appendChild(opt);
  });

  // 设置当前选中值
  modelSelect.value = state.modelConfig.model;

  // 模型选择变化
  modelSelect.addEventListener("change", () => {
    state.modelConfig.model = modelSelect.value;
    updateModelInfo();
  });

  // Temperature 滑块
  const tempSlider = document.getElementById("model-temperature");
  const tempValue = document.getElementById("temperature-value");
  tempSlider.value = state.modelConfig.temperature;
  tempValue.textContent = state.modelConfig.temperature;
  tempSlider.addEventListener("input", () => {
    state.modelConfig.temperature = parseFloat(tempSlider.value);
    tempValue.textContent = state.modelConfig.temperature;
  });

  // Max Tokens 输入
  const maxTokensInput = document.getElementById("model-max-tokens");
  maxTokensInput.value = state.modelConfig.maxTokens;
  maxTokensInput.addEventListener("change", () => {
    state.modelConfig.maxTokens = parseInt(maxTokensInput.value, 10);
  });

  // Top P 滑块
  const topPSlider = document.getElementById("model-top-p");
  const topPValue = document.getElementById("top-p-value");
  topPSlider.value = state.modelConfig.topP;
  topPValue.textContent = state.modelConfig.topP;
  topPSlider.addEventListener("input", () => {
    state.modelConfig.topP = parseFloat(topPSlider.value);
    topPValue.textContent = state.modelConfig.topP.toFixed(2);
  });

  // Frequency Penalty 滑块
  const freqSlider = document.getElementById("model-freq-penalty");
  const freqValue = document.getElementById("freq-penalty-value");
  freqSlider.value = state.modelConfig.frequencyPenalty;
  freqValue.textContent = state.modelConfig.frequencyPenalty;
  freqSlider.addEventListener("input", () => {
    state.modelConfig.frequencyPenalty = parseFloat(freqSlider.value);
    freqValue.textContent = state.modelConfig.frequencyPenalty;
  });

  // Presence Penalty 滑块
  const presSlider = document.getElementById("model-pres-penalty");
  const presValue = document.getElementById("pres-penalty-value");
  presSlider.value = state.modelConfig.presencePenalty;
  presValue.textContent = state.modelConfig.presencePenalty;
  presSlider.addEventListener("input", () => {
    state.modelConfig.presencePenalty = parseFloat(presSlider.value);
    presValue.textContent = state.modelConfig.presencePenalty;
  });

  // 初始更新模型信息
  updateModelInfo();
}

function updateModelInfo() {
  const model = demoData.availableModels.find((m) => m.id === state.modelConfig.model);
  if (model) {
    document.getElementById("model-provider").textContent = model.provider;
    document.getElementById("model-max-context").textContent = `${model.maxTokens.toLocaleString()} tokens`;
  }
}

function addNode(type, x, y) {
  const nodeTypeConfig = demoData.nodeTypes.find((n) => n.type === type);
  if (!nodeTypeConfig) return;

  const id = `node-${Date.now()}`;
  const node = {
    id,
    type,
    name: nodeTypeConfig.name,
    x,
    y,
    config: getDefaultConfig(type),
  };

  state.editorNodes.push(node);
  renderCanvasNodes();
  selectNode(id);
}

function getDefaultConfig(type) {
  const configs = {
    dataset: { source: "manual", path: "" },
    prompt: { promptId: "", version: "latest" },
    skill: { skillId: "", params: {} },
    mcp: { mcpId: "", action: "" },
    output: { format: "json", destination: "default" },
  };
  return configs[type] || {};
}

function renderCanvasNodes() {
  const canvas = document.getElementById("editor-canvas");
  if (!canvas) return;

  // 移除旧节点
  canvas.querySelectorAll(".canvas-node").forEach((n) => n.remove());

  state.editorNodes.forEach((node) => {
    const nodeTypeConfig = demoData.nodeTypes.find((n) => n.type === node.type);
    const el = document.createElement("div");
    el.className = `canvas-node ${node.type}`;
    el.dataset.id = node.id;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;

    if (state.selectedNodeId === node.id) {
      el.classList.add("selected");
    }

    el.innerHTML = `
      <div class="canvas-node-header">
        <span class="canvas-node-icon">${nodeTypeConfig?.icon || "📦"}</span>
        <span class="canvas-node-name">${node.name}</span>
      </div>
      <div class="canvas-node-type">${nodeTypeConfig?.name || node.type}</div>
      <div class="node-port input" data-node-id="${node.id}" data-port="input"></div>
      <div class="node-port output" data-node-id="${node.id}" data-port="output"></div>
    `;

    // 节点拖动
    el.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("node-port")) return;
      state.draggingNode = {
        id: node.id,
        offsetX: e.clientX - node.x,
        offsetY: e.clientY - node.y,
      };
      el.style.zIndex = "100";
    });

    // 点击选中
    el.addEventListener("click", (e) => {
      if (e.target.classList.contains("node-port")) return;
      e.stopPropagation();
      selectNode(node.id);
    });

    // 端口连接
    el.querySelectorAll(".node-port").forEach((port) => {
      port.addEventListener("click", (e) => {
        e.stopPropagation();
        handlePortClick(node.id, port.dataset.port);
      });
    });

    canvas.appendChild(el);
  });

  // 全局鼠标移动和释放
  document.onmousemove = (e) => {
    if (state.draggingNode) {
      const node = state.editorNodes.find((n) => n.id === state.draggingNode.id);
      if (node) {
        node.x = Math.max(0, e.clientX - state.draggingNode.offsetX);
        node.y = Math.max(0, e.clientY - state.draggingNode.offsetY);
        const el = document.querySelector(`.canvas-node[data-id="${node.id}"]`);
        if (el) {
          el.style.left = `${node.x}px`;
          el.style.top = `${node.y}px`;
        }
        renderEdges();
      }
    }
  };

  document.onmouseup = () => {
    if (state.draggingNode) {
      const el = document.querySelector(`.canvas-node[data-id="${state.draggingNode.id}"]`);
      if (el) el.style.zIndex = "10";
      state.draggingNode = null;
    }
  };
}

function selectNode(nodeId) {
  state.selectedNodeId = nodeId;
  document.querySelectorAll(".canvas-node").forEach((el) => {
    el.classList.toggle("selected", el.dataset.id === nodeId);
  });
  renderConfigPanel();
}

function handlePortClick(nodeId, portType) {
  if (state.connectingFrom) {
    // 完成连接
    if (state.connectingFrom.nodeId !== nodeId) {
      const fromId = state.connectingFrom.portType === "output" ? state.connectingFrom.nodeId : nodeId;
      const toId = state.connectingFrom.portType === "output" ? nodeId : state.connectingFrom.nodeId;

      // 检查是否已存在
      const exists = state.editorEdges.some(([f, t]) => f === fromId && t === toId);
      if (!exists) {
        state.editorEdges.push([fromId, toId]);
        renderEdges();
        toast("节点已连接");
      }
    }
    state.connectingFrom = null;
  } else {
    // 开始连接
    state.connectingFrom = { nodeId, portType };
    toast("点击另一个节点的端口完成连接");
  }
}

function renderEdges() {
  const svg = document.getElementById("edges-svg");
  if (!svg) return;

  svg.innerHTML = "";

  state.editorEdges.forEach(([fromId, toId]) => {
    const fromNode = state.editorNodes.find((n) => n.id === fromId);
    const toNode = state.editorNodes.find((n) => n.id === toId);
    if (!fromNode || !toNode) return;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", fromNode.x + 140);
    line.setAttribute("y1", fromNode.y + 30);
    line.setAttribute("x2", toNode.x);
    line.setAttribute("y2", toNode.y + 30);
    line.setAttribute("class", "edge-line");
    line.setAttribute("data-from", fromId);
    line.setAttribute("data-to", toId);

    // 双击删除连线
    line.addEventListener("dblclick", () => {
      state.editorEdges = state.editorEdges.filter(([f, t]) => !(f === fromId && t === toId));
      renderEdges();
      toast("连线已删除");
    });

    svg.appendChild(line);
  });
}

function renderConfigPanel() {
  const panel = document.getElementById("config-node-tab");
  if (!panel) return;

  if (!state.selectedNodeId) {
    panel.innerHTML = '<div class="config-placeholder">点击节点进行配置</div>';
    return;
  }

  const node = state.editorNodes.find((n) => n.id === state.selectedNodeId);
  if (!node) return;

  const nodeTypeConfig = demoData.nodeTypes.find((n) => n.type === node.type);

  panel.innerHTML = `
    <div class="config-section">
      <div class="config-section-title">基本信息</div>
      <div class="form-group">
        <label>节点名称</label>
        <input type="text" class="config-input" id="config-node-name" value="${node.name}" />
      </div>
      <div class="form-group">
        <label>节点类型</label>
        <input type="text" class="config-input" value="${nodeTypeConfig?.name || node.type}" disabled />
      </div>
    </div>
    <div class="config-section">
      <div class="config-section-title">节点配置</div>
      ${renderNodeConfigFields(node)}
    </div>
    <div class="config-node-actions">
      <button class="ghost" id="config-delete-btn">删除节点</button>
      <button class="primary" id="config-apply-btn">应用配置</button>
    </div>
  `;

  // 应用配置
  document.getElementById("config-apply-btn").addEventListener("click", () => {
    const nameInput = document.getElementById("config-node-name");
    node.name = nameInput.value;
    applyNodeConfig(node);
    renderCanvasNodes();
    toast("配置已应用");
  });

  // 删除节点
  document.getElementById("config-delete-btn").addEventListener("click", () => {
    state.editorNodes = state.editorNodes.filter((n) => n.id !== node.id);
    state.editorEdges = state.editorEdges.filter(([f, t]) => f !== node.id && t !== node.id);
    state.selectedNodeId = null;
    renderCanvasNodes();
    renderEdges();
    renderConfigPanel();
    toast("节点已删除");
  });
}

function renderNodeConfigFields(node) {
  switch (node.type) {
    case "dataset":
      return `
        <div class="form-group">
          <label>数据源</label>
          <select class="config-select" id="config-source">
            <option value="manual" ${node.config.source === "manual" ? "selected" : ""}>手动输入</option>
            <option value="file" ${node.config.source === "file" ? "selected" : ""}>文件上传</option>
            <option value="api" ${node.config.source === "api" ? "selected" : ""}>API 获取</option>
          </select>
        </div>
        <div class="form-group">
          <label>路径/URL</label>
          <input type="text" class="config-input" id="config-path" value="${node.config.path || ""}" placeholder="输入路径或 URL" />
        </div>
      `;
    case "prompt":
      return `
        <div class="form-group">
          <label>Prompt ID</label>
          <select class="config-select" id="config-prompt-id">
            <option value="">选择 Prompt</option>
            ${demoData.prompts.map((p) => `<option value="${p.id}" ${node.config.promptId === p.id ? "selected" : ""}>${p.name}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label>版本</label>
          <select class="config-select" id="config-version">
            <option value="latest" ${node.config.version === "latest" ? "selected" : ""}>最新版本</option>
          </select>
        </div>
      `;
    case "skill":
      return `
        <div class="form-group">
          <label>Skill</label>
          <select class="config-select" id="config-skill-id">
            <option value="">选择 Skill</option>
            ${demoData.skillIntegrations.map((s) => `<option value="${s.id}" ${node.config.skillId === s.id ? "selected" : ""}>${s.name}</option>`).join("")}
          </select>
        </div>
      `;
    case "mcp":
      return `
        <div class="form-group">
          <label>MCP</label>
          <select class="config-select" id="config-mcp-id">
            <option value="">选择 MCP</option>
            ${demoData.mcpIntegrations.map((m) => `<option value="${m.id}" ${node.config.mcpId === m.id ? "selected" : ""}>${m.name}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label>操作</label>
          <input type="text" class="config-input" id="config-action" value="${node.config.action || ""}" placeholder="输入操作名称" />
        </div>
      `;
    case "output":
      return `
        <div class="form-group">
          <label>输出格式</label>
          <select class="config-select" id="config-format">
            <option value="json" ${node.config.format === "json" ? "selected" : ""}>JSON</option>
            <option value="csv" ${node.config.format === "csv" ? "selected" : ""}>CSV</option>
            <option value="parquet" ${node.config.format === "parquet" ? "selected" : ""}>Parquet</option>
          </select>
        </div>
        <div class="form-group">
          <label>目标位置</label>
          <select class="config-select" id="config-destination">
            <option value="default" ${node.config.destination === "default" ? "selected" : ""}>默认存储</option>
            <option value="download" ${node.config.destination === "download" ? "selected" : ""}>下载文件</option>
          </select>
        </div>
      `;
    default:
      return '<div style="color: var(--muted); font-size: 12px;">无额外配置项</div>';
  }
}

function applyNodeConfig(node) {
  switch (node.type) {
    case "dataset":
      node.config.source = document.getElementById("config-source")?.value || "manual";
      node.config.path = document.getElementById("config-path")?.value || "";
      break;
    case "prompt":
      node.config.promptId = document.getElementById("config-prompt-id")?.value || "";
      node.config.version = document.getElementById("config-version")?.value || "latest";
      break;
    case "skill":
      node.config.skillId = document.getElementById("config-skill-id")?.value || "";
      break;
    case "mcp":
      node.config.mcpId = document.getElementById("config-mcp-id")?.value || "";
      node.config.action = document.getElementById("config-action")?.value || "";
      break;
    case "output":
      node.config.format = document.getElementById("config-format")?.value || "json";
      node.config.destination = document.getElementById("config-destination")?.value || "default";
      break;
  }
}

function saveWorkflow() {
  const nameInput = document.getElementById("workflow-name-input");
  const name = nameInput?.value || "未命名 Workflow";

  if (state.editorNodes.length === 0) {
    toast("请至少添加一个节点");
    return;
  }

  const workflow = {
    id: `w-${Date.now()}`,
    name,
    description: "通过编辑器创建",
    version: "v1",
    nodes: state.editorNodes.map((n) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      x: n.x,
      y: n.y,
      config: n.config,
    })),
    edges: [...state.editorEdges],
    modelConfig: { ...state.modelConfig },
  };

  // 添加到 demo 数据
  demoData.workflows.push(workflow);

  toast(`Workflow "${name}" 保存成功！`);
  exitEditorMode();
}

// 生成 Workflow 描述
function generateWorkflowDescription() {
  if (state.editorNodes.length === 0) {
    toast("请先添加节点");
    return;
  }

  const descriptionTextarea = document.getElementById("workflow-description");
  const workflowName = document.getElementById("workflow-name-input")?.value || "未命名 Workflow";

  // 构建拓扑排序
  const nodeMap = new Map(state.editorNodes.map(n => [n.id, n]));
  const inDegree = new Map(state.editorNodes.map(n => [n.id, 0]));
  const adjacency = new Map(state.editorNodes.map(n => [n.id, []]));

  state.editorEdges.forEach(([from, to]) => {
    inDegree.set(to, (inDegree.get(to) || 0) + 1);
    adjacency.get(from)?.push(to);
  });

  // 拓扑排序
  const sorted = [];
  const queue = state.editorNodes.filter(n => inDegree.get(n.id) === 0).map(n => n.id);
  while (queue.length > 0) {
    const id = queue.shift();
    sorted.push(id);
    adjacency.get(id)?.forEach(next => {
      inDegree.set(next, inDegree.get(next) - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    });
  }

  // 生成描述
  let description = `# Workflow: ${workflowName}\n\n`;
  description += `## 概述\n`;
  description += `本 Workflow 包含 ${state.editorNodes.length} 个节点，${state.editorEdges.length} 条连接。\n\n`;

  description += `## 模型配置\n`;
  const modelName = demoData.availableModels.find(m => m.id === state.modelConfig.model)?.name || state.modelConfig.model;
  description += `- 模型: ${modelName}\n`;
  description += `- Temperature: ${state.modelConfig.temperature}\n`;
  description += `- Max Tokens: ${state.modelConfig.maxTokens}\n`;
  description += `- Top P: ${state.modelConfig.topP}\n\n`;

  description += `## 执行流程\n\n`;

  sorted.forEach((nodeId, index) => {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    const nodeTypeConfig = demoData.nodeTypes.find(n => n.type === node.type);
    description += `### 步骤 ${index + 1}: ${node.name}\n`;
    description += `- 类型: ${nodeTypeConfig?.name || node.type}\n`;

    // 添加配置信息
    if (node.type === "dataset") {
      description += `- 数据源: ${node.config.source || "manual"}\n`;
      if (node.config.path) description += `- 路径: ${node.config.path}\n`;
    } else if (node.type === "prompt") {
      const prompt = demoData.prompts.find(p => p.id === node.config.promptId);
      if (prompt) description += `- Prompt: ${prompt.name}\n`;
      description += `- 版本: ${node.config.version || "latest"}\n`;
    } else if (node.type === "skill") {
      const skill = demoData.skillIntegrations.find(s => s.id === node.config.skillId);
      if (skill) description += `- Skill: ${skill.name}\n`;
    } else if (node.type === "mcp") {
      const mcp = demoData.mcpIntegrations.find(m => m.id === node.config.mcpId);
      if (mcp) description += `- MCP: ${mcp.name}\n`;
      if (node.config.action) description += `- 操作: ${node.config.action}\n`;
    } else if (node.type === "output") {
      description += `- 格式: ${node.config.format || "json"}\n`;
      description += `- 目标: ${node.config.destination || "default"}\n`;
    }

    // 添加上游依赖
    const upstream = state.editorEdges.filter(([_, to]) => to === nodeId).map(([from]) => nodeMap.get(from)?.name);
    if (upstream.length > 0) {
      description += `- 上游依赖: ${upstream.join(", ")}\n`;
    }

    description += `\n`;
  });

  description += `## 数据流\n`;
  state.editorEdges.forEach(([from, to]) => {
    const fromNode = nodeMap.get(from);
    const toNode = nodeMap.get(to);
    if (fromNode && toNode) {
      description += `- ${fromNode.name} → ${toNode.name}\n`;
    }
  });

  descriptionTextarea.value = description;
  toast("Workflow 描述已生成");
}

// 从描述同步节点
function syncFromDescription() {
  const description = document.getElementById("workflow-description")?.value;
  if (!description || description.trim() === "") {
    toast("请先输入或生成 Workflow 描述");
    return;
  }

  // 解析描述中的步骤
  const stepRegex = /### 步骤 \d+: (.+)\n([\s\S]*?)(?=\n### |\n## |$)/g;
  const steps = [];
  let match;

  while ((match = stepRegex.exec(description)) !== null) {
    const stepName = match[1].trim();
    const stepContent = match[2];

    // 解析类型
    const typeMatch = stepContent.match(/- 类型: (.+)/);
    const typeName = typeMatch ? typeMatch[1].trim() : "";

    // 匹配节点类型
    let nodeType = "dataset";
    if (typeName.includes("Prompt") || typeName.includes("prompt")) nodeType = "prompt";
    else if (typeName.includes("Skill") || typeName.includes("skill")) nodeType = "skill";
    else if (typeName.includes("MCP") || typeName.includes("mcp")) nodeType = "mcp";
    else if (typeName.includes("输出") || typeName.includes("Output")) nodeType = "output";
    else if (typeName.includes("数据") || typeName.includes("Dataset")) nodeType = "dataset";

    steps.push({
      name: stepName,
      type: nodeType,
      content: stepContent
    });
  }

  if (steps.length === 0) {
    toast("未能从描述中解析出节点信息");
    return;
  }

  // 清空现有节点
  state.editorNodes = [];
  state.editorEdges = [];
  state.selectedNodeId = null;

  // 创建新节点
  let xOffset = 50;
  let yOffset = 50;

  steps.forEach((step, index) => {
    const nodeTypeConfig = demoData.nodeTypes.find(n => n.type === step.type);
    const id = `node-${Date.now()}-${index}`;

    const node = {
      id,
      type: step.type,
      name: step.name,
      x: xOffset,
      y: yOffset,
      config: getDefaultConfig(step.type),
    };

    state.editorNodes.push(node);

    // 创建与前一个节点的连接
    if (index > 0) {
      const prevNode = state.editorNodes[index - 1];
      state.editorEdges.push([prevNode.id, node.id]);
    }

    xOffset += 200;
    if (xOffset > 800) {
      xOffset = 50;
      yOffset += 120;
    }
  });

  renderCanvasNodes();
  renderEdges();
  renderConfigPanel();
  toast(`已从描述同步 ${steps.length} 个节点`);
}

// 执行 Workflow
function executeWorkflow() {
  if (state.editorNodes.length === 0) {
    toast("请先创建 Workflow");
    return;
  }

  const statusEl = document.getElementById("execution-status");
  const outputEl = document.getElementById("output-content");
  const executeBtn = document.getElementById("execute-workflow-btn");

  // 开始执行
  statusEl.textContent = "执行中...";
  statusEl.className = "execution-status running";
  executeBtn.disabled = true;
  outputEl.textContent = "正在初始化 LLM 执行环境...\n";

  // 模拟执行过程
  const steps = state.editorNodes.map((n, i) => ({
    node: n,
    delay: 800 + Math.random() * 1200
  }));

  let currentStep = 0;
  let output = "";

  function executeStep() {
    if (currentStep >= steps.length) {
      // 执行完成
      statusEl.textContent = "执行成功";
      statusEl.className = "execution-status success";
      executeBtn.disabled = false;

      output += "\n" + "=".repeat(40) + "\n";
      output += `[完成] Workflow 执行完成\n`;
      output += `总耗时: ${(steps.reduce((s, step) => s + step.delay, 0) / 1000).toFixed(1)}s\n`;
      output += `处理节点: ${steps.length} 个\n`;
      outputEl.textContent = output;
      toast("Workflow 执行完成");
      return;
    }

    const step = steps[currentStep];
    const node = step.node;
    const nodeTypeConfig = demoData.nodeTypes.find(n => n.type === node.type);

    output += `\n[步骤 ${currentStep + 1}] 执行 ${node.name} (${nodeTypeConfig?.name || node.type})\n`;
    output += `  - 输入: 处理上游数据...\n`;

    // 模拟节点执行结果
    setTimeout(() => {
      let result = "";

      switch (node.type) {
        case "dataset":
          result = `  - 输出: 加载 ${Math.floor(Math.random() * 1000) + 100} 条数据记录`;
          break;
        case "prompt":
          result = `  - 输出: 生成 Prompt 响应 (${Math.floor(Math.random() * 500) + 200} tokens)`;
          break;
        case "skill":
          result = `  - 输出: Skill 处理完成，转换 ${Math.floor(Math.random() * 50) + 10} 条数据`;
          break;
        case "mcp":
          result = `  - 输出: MCP 调用成功，返回 ${Math.floor(Math.random() * 20) + 5} 条结果`;
          break;
        case "output":
          result = `  - 输出: 结果已保存到 storage/output_${Date.now()}.json`;
          break;
        default:
          result = `  - 输出: 节点执行完成`;
      }

      output += result + "\n";
      outputEl.textContent = output;

      currentStep++;
      setTimeout(executeStep, 200);
    }, step.delay);
  }

  // 开始执行第一步
  setTimeout(executeStep, 500);
}

function setupNav() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (state.isEditorMode) return; // 编辑模式下禁用导航切换
      state.view = btn.dataset.view;
      setActiveNav(state.view);
      renderPanelHeader(state.view);
      renderList();
      renderDetail();
    });
  });

  document.getElementById("btn-new").addEventListener("click", () => {
    if (state.view === "workflows") {
      enterEditorMode();
    } else {
      toast("新建 · Demo");
    }
  });
}

function init() {
  renderSummary();
  renderPanelHeader(state.view);
  setActiveNav(state.view);
  renderList();
  renderDetail();
  setupNav();
  setupImportModal();
}

init();
