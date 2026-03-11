const state = {
  view: "prompts",
  selected: {
    prompts: 0,
    workflows: 0,
    runs: 0,
    evals: 0,
    integrations: 0,
  },
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
  evals: {
    title: "评测对比",
    subtitle: "对比不同 prompt 版本表现",
    actions: ["生成报表", "导出指标"],
  },
  integrations: {
    title: "MCP/Skill",
    subtitle: "管理外部能力与连接器",
    actions: ["安装组件", "刷新连接"],
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
  if (state.view === "evals") items = demoData.evals;
  if (state.view === "integrations") items = demoData.integrations;

  items.forEach((item, idx) => {
    const el = document.createElement("div");
    el.className = "list-item";
    if (state.selected[state.view] === idx) el.classList.add("active");

    let meta = "";
    if (state.view === "prompts") meta = `${item.versions.length} 个版本 · ${item.description}`;
    if (state.view === "workflows") meta = `${item.version} · ${item.description}`;
    if (state.view === "runs") meta = `${item.status.toUpperCase()} · ${item.startedAt}`;
    if (state.view === "evals") meta = `${item.type.toUpperCase()} · ${item.dataset}`;
    if (state.view === "integrations") meta = `${item.type} · ${item.status}`;

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
  if (state.view === "evals") return renderEvalDetail();
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

function renderEvalDetail() {
  const evalItem = demoData.evals[state.selected.evals];
  const tmpl = document.getElementById("evals-detail-template").content.cloneNode(true);
  tmpl.querySelector(".detail-title").textContent = evalItem.name;
  tmpl.querySelector(".detail-subtitle").textContent = `${evalItem.dataset} · ${evalItem.type.toUpperCase()}`;

  const metrics = tmpl.querySelector(".metrics");
  evalItem.metrics.forEach((metric) => {
    const row = document.createElement("div");
    row.className = "metric-row";
    row.innerHTML = `
      <div>${metric.name}</div>
      <div class="metric-bar"><span style="width: ${Math.round(metric.value * 100)}%"></span></div>
      <div>${Math.round(metric.value * 100)}%</div>
    `;
    metrics.appendChild(row);
  });

  tmpl.querySelector(".compare-summary").textContent = evalItem.summary;

  $detail.appendChild(tmpl);
}

function renderIntegrationsDetail() {
  const tmpl = document.getElementById("integrations-detail-template").content.cloneNode(true);
  tmpl.querySelector(".detail-title").textContent = "能力集成";
  tmpl.querySelector(".detail-subtitle").textContent = "MCP / Skill / Connector";

  const integrations = tmpl.querySelector(".integrations");
  demoData.integrations.forEach((item) => {
    const row = document.createElement("div");
    row.className = "integration-item";
    row.innerHTML = `<span>${item.name} · ${item.type}</span><span>${item.status}</span>`;
    integrations.appendChild(row);
  });

  const capabilities = tmpl.querySelector(".capabilities");
  demoData.capabilities.forEach((item) => {
    const row = document.createElement("div");
    row.className = "capability-row";
    row.innerHTML = `<span>${item.name}</span><span class="capability-badge">${item.status}</span>`;
    capabilities.appendChild(row);
  });

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

function setupNav() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.view = btn.dataset.view;
      setActiveNav(state.view);
      renderPanelHeader(state.view);
      renderList();
      renderDetail();
    });
  });

  document.getElementById("btn-new").addEventListener("click", () => toast("新建 · Demo"));
}

function init() {
  renderSummary();
  renderPanelHeader(state.view);
  setActiveNav(state.view);
  renderList();
  renderDetail();
  setupNav();
}

init();
