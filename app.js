const defaultNames = [
  "王小米",
  "陈老师",
  "李明",
  "赵一凡",
  "刘佳",
  "周然",
  "宋雨",
  "杨帆",
  "黄晨",
  "吴桐",
  "徐可",
  "郑一",
  "胡欣",
  "沈悦",
  "高宁",
  "马骁",
  "许诺",
  "罗晴",
  "朱凯",
  "林溪",
  "谢安",
  "董琳",
  "程宇",
  "韩笑"
];

const defaultOptions = [
  "一等奖",
  "二等奖",
  "三等奖",
  "幸运奖",
  "免罚金牌",
  "加分机会"
];

const taskOptions = [
  "全队击掌",
  "30秒即兴介绍",
  "抽一个搭档合照",
  "说出今天最想感谢的人",
  "给下一组加一分",
  "现场模仿一个表情包"
];

const themeNames = {
  coral: "珊瑚红",
  teal: "青绿色",
  gold: "金色",
  ink: "深色"
};

const modeMeta = {
  lottery: {
    label: "幸运抽奖",
    action: "开始抽取",
    kicker: "本轮奖项"
  },
  wheel: {
    label: "大屏转盘",
    action: "启动转盘",
    kicker: "转盘结果"
  },
  rollcall: {
    label: "随机点名",
    action: "开始点名",
    kicker: "点名结果"
  },
  task: {
    label: "团建任务",
    action: "抽取任务",
    kicker: "任务结果"
  }
};

const storageKey = "event-interaction-kit-v1";

const state = {
  mode: "lottery",
  title: "年会幸运抽奖",
  theme: "coral",
  names: [...defaultNames],
  options: [...defaultOptions],
  tasks: [...taskOptions],
  history: [],
  drawn: [],
  spinning: false,
  wheelRotation: 0
};

const els = {
  shell: document.querySelector(".app-shell"),
  eventTitle: document.querySelector("#eventTitle"),
  statusText: document.querySelector("#statusText"),
  eventLabel: document.querySelector("#eventLabel"),
  modeLabel: document.querySelector("#modeLabel"),
  panelKicker: document.querySelector("#panelKicker"),
  mainResult: document.querySelector("#mainResult"),
  subResult: document.querySelector("#subResult"),
  startBtn: document.querySelector("#startBtn"),
  copyBtn: document.querySelector("#copyBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  fullscreenBtn: document.querySelector("#fullscreenBtn"),
  namesInput: document.querySelector("#namesInput"),
  optionsInput: document.querySelector("#optionsInput"),
  nameCount: document.querySelector("#nameCount"),
  optionCount: document.querySelector("#optionCount"),
  historyCount: document.querySelector("#historyCount"),
  historyList: document.querySelector("#historyList"),
  themeName: document.querySelector("#themeName"),
  themeGrid: document.querySelector("#themeGrid"),
  tabs: Array.from(document.querySelectorAll(".tab")),
  wheelCanvas: document.querySelector("#wheelCanvas"),
  winnerPanel: document.querySelector("#winnerPanel"),
  nameReel: document.querySelector("#nameReel"),
  confettiLayer: document.querySelector("#confettiLayer"),
  stage: document.querySelector(".stage")
};

const wheelColors = ["#f05d4f", "#0e8c83", "#f6b43b", "#265f99", "#e64d5f", "#1da66f", "#20233a", "#eb6a45"];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    Object.assign(state, {
      ...saved,
      names: Array.isArray(saved.names) && saved.names.length ? saved.names : state.names,
      options: Array.isArray(saved.options) && saved.options.length ? saved.options : state.options,
      tasks: Array.isArray(saved.tasks) && saved.tasks.length ? saved.tasks : state.tasks,
      history: Array.isArray(saved.history) ? saved.history.slice(0, 50) : []
    });
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify({
    mode: state.mode,
    title: state.title,
    theme: state.theme,
    names: state.names,
    options: state.options,
    tasks: state.tasks,
    history: state.history.slice(0, 50),
    drawn: state.drawn.slice(-100)
  }));
}

function splitLines(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function pick(list, exclude = []) {
  const pool = list.filter((item) => !exclude.includes(item));
  const target = pool.length ? pool : list;
  if (!target.length) return "";
  return target[Math.floor(Math.random() * target.length)];
}

function setMode(mode) {
  state.mode = mode;
  els.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.mode === mode));
  els.stage.classList.toggle("mode-wheel", mode === "wheel");
  els.stage.classList.toggle("mode-rollcall", mode === "rollcall");
  els.modeLabel.textContent = modeMeta[mode].label;
  els.panelKicker.textContent = modeMeta[mode].kicker;
  els.startBtn.textContent = modeMeta[mode].action;
  if (mode === "task") {
    els.optionsInput.value = state.tasks.join("\n");
    els.optionCount.textContent = state.tasks.length;
    els.mainResult.textContent = "团建任务";
    els.subResult.textContent = "点击抽取任务";
  } else {
    els.optionsInput.value = state.options.join("\n");
    els.optionCount.textContent = state.options.length;
    if (mode === "wheel") {
      els.subResult.textContent = "转盘已就绪";
      drawWheel();
    }
  }
  saveState();
}

function syncInputs() {
  state.title = els.eventTitle.value.trim() || "现场互动";
  state.names = splitLines(els.namesInput.value);
  if (state.mode === "task") {
    state.tasks = splitLines(els.optionsInput.value);
  } else {
    state.options = splitLines(els.optionsInput.value);
  }
  renderMeta();
  if (state.mode === "wheel") drawWheel();
  saveState();
}

function renderMeta() {
  els.eventTitle.value = state.title;
  els.eventLabel.textContent = state.title;
  els.statusText.textContent = `名单 ${state.names.length} 人`;
  els.namesInput.value = state.names.join("\n");
  els.nameCount.textContent = state.names.length;
  els.optionCount.textContent = state.mode === "task" ? state.tasks.length : state.options.length;
  els.shell.dataset.theme = state.theme;
  els.themeName.textContent = themeNames[state.theme] || "主题";
  document.querySelectorAll(".swatch").forEach((swatch) => {
    swatch.classList.toggle("is-active", swatch.dataset.theme === state.theme);
  });
  renderHistory();
}

function renderHistory() {
  els.historyCount.textContent = state.history.length;
  els.historyList.innerHTML = "";
  state.history.slice(0, 16).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    els.historyList.appendChild(li);
  });
}

function addHistory(text) {
  const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  state.history.unshift(`${time}  ${text}`);
  state.history = state.history.slice(0, 80);
  renderHistory();
  saveState();
}

function drawWinner() {
  const prize = pick(state.options);
  const winner = pick(state.names, state.drawn);
  if (!winner || !prize) return;
  state.drawn.push(winner);
  els.mainResult.textContent = winner;
  els.subResult.textContent = prize;
  addHistory(`${prize}：${winner}`);
  burstConfetti();
}

function rollName() {
  const reelNames = Array.from({ length: 12 }, () => pick(state.names)).filter(Boolean);
  els.nameReel.innerHTML = "";
  reelNames.forEach((name) => {
    const span = document.createElement("span");
    span.textContent = name;
    els.nameReel.appendChild(span);
  });
  els.stage.classList.add("is-rolling");
  els.startBtn.disabled = true;
  window.setTimeout(() => {
    const name = pick(state.names);
    els.stage.classList.remove("is-rolling");
    els.nameReel.innerHTML = `<span>${name}</span>`;
    els.startBtn.disabled = false;
    addHistory(`随机点名：${name}`);
    burstConfetti();
  }, 1200);
}

function drawTask() {
  const task = pick(state.tasks);
  if (!task) return;
  els.mainResult.textContent = task;
  els.subResult.textContent = "本轮任务";
  addHistory(`团建任务：${task}`);
  burstConfetti();
}

function drawWheel() {
  const canvas = els.wheelCanvas;
  const ctx = canvas.getContext("2d");
  const rect = canvas.width;
  const center = rect / 2;
  const radius = rect / 2 - 18;
  const items = state.options.length ? state.options : defaultOptions;
  const slice = (Math.PI * 2) / items.length;

  ctx.clearRect(0, 0, rect, rect);
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(state.wheelRotation);

  items.forEach((item, index) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, slice * index, slice * (index + 1));
    ctx.closePath();
    ctx.fillStyle = wheelColors[index % wheelColors.length];
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.72)";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.save();
    ctx.rotate(slice * index + slice / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff8ec";
    ctx.font = "bold 28px Microsoft YaHei, sans-serif";
    ctx.fillText(item.slice(0, 8), radius - 24, 10);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(0, 0, 76, 0, Math.PI * 2);
  ctx.fillStyle = "#fff8ec";
  ctx.fill();
  ctx.fillStyle = "#191713";
  ctx.font = "bold 30px Microsoft YaHei, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GO", 0, 2);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(center, 16);
  ctx.lineTo(center - 22, 70);
  ctx.lineTo(center + 22, 70);
  ctx.closePath();
  ctx.fillStyle = "#fff8ec";
  ctx.fill();
}

function spinWheel() {
  if (state.spinning || !state.options.length) return;
  state.spinning = true;
  els.startBtn.disabled = true;
  const total = Math.PI * 2 * (4 + Math.random() * 2);
  const start = state.wheelRotation;
  const end = start + total;
  const duration = 2200;
  const startedAt = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - t, 4);
    state.wheelRotation = start + (end - start) * eased;
    drawWheel();
    if (t < 1) {
      requestAnimationFrame(frame);
      return;
    }
    const items = state.options;
    const normalized = (Math.PI * 2 - (state.wheelRotation % (Math.PI * 2)) + Math.PI * 1.5) % (Math.PI * 2);
    const selected = items[Math.floor(normalized / ((Math.PI * 2) / items.length))] || pick(items);
    state.spinning = false;
    els.startBtn.disabled = false;
    els.subResult.textContent = selected;
    addHistory(`转盘结果：${selected}`);
    burstConfetti();
    saveState();
  }

  requestAnimationFrame(frame);
}

function burstConfetti() {
  els.confettiLayer.innerHTML = "";
  for (let i = 0; i < 70; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = wheelColors[i % wheelColors.length];
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    piece.style.setProperty("--drift", `${Math.random() * 220 - 110}px`);
    els.confettiLayer.appendChild(piece);
  }
  window.setTimeout(() => {
    els.confettiLayer.innerHTML = "";
  }, 2200);
}

function startAction() {
  syncInputs();
  if (state.mode === "lottery") drawWinner();
  if (state.mode === "wheel") spinWheel();
  if (state.mode === "rollcall") rollName();
  if (state.mode === "task") drawTask();
}

function copyHistory() {
  const text = state.history.length ? state.history.join("\n") : "暂无结果";
  navigator.clipboard?.writeText(text);
  els.copyBtn.textContent = "已复制";
  window.setTimeout(() => {
    els.copyBtn.textContent = "复制结果";
  }, 900);
}

function resetAll() {
  state.history = [];
  state.drawn = [];
  els.mainResult.textContent = state.mode === "task" ? "团建任务" : state.mode === "lottery" ? "一等奖" : "现场互动";
  els.subResult.textContent = state.mode === "wheel" ? "转盘已就绪" : "点击开始抽取";
  renderHistory();
  saveState();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    els.stage.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function bindEvents() {
  els.tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
  els.eventTitle.addEventListener("input", syncInputs);
  els.namesInput.addEventListener("input", syncInputs);
  els.optionsInput.addEventListener("input", syncInputs);
  els.startBtn.addEventListener("click", startAction);
  els.copyBtn.addEventListener("click", copyHistory);
  els.resetBtn.addEventListener("click", resetAll);
  els.fullscreenBtn.addEventListener("click", toggleFullscreen);
  els.themeGrid.addEventListener("click", (event) => {
    const swatch = event.target.closest(".swatch");
    if (!swatch) return;
    state.theme = swatch.dataset.theme;
    renderMeta();
    drawWheel();
    saveState();
  });
  window.addEventListener("resize", drawWheel);
}

loadState();
bindEvents();
renderMeta();
setMode(state.mode);
drawWheel();
