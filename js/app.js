(function () {
  const modules = [];
  const state = {
    currentModule: null,
    logs: []
  };

  const assetPaths = [
    "./css/app.css",
    "./js/app.js",
    "./js/modules/generic-player.js",
    "./js/modules/direct-wss.js",
    "./js/modules/dahua-wsplayer.js",
    "./libs/WSPlayer/player.css",
    "./libs/WSPlayer/PlaySDKInterface.js",
    "./libs/WSPlayer/WSPlayer.js",
    "./libs/WSPlayer/commonThread/libRenderEngine.js",
    "./libs/WSPlayer/commonThread/libRenderEngine.wasm",
    "./libs/WSPlayer/commonThread/libIVSDrawer.js",
    "./libs/WSPlayer/commonThread/libIVSDrawer.wasm",
    "./libs/WSPlayer/commonThread/libmavasp_litepacket.js",
    "./libs/WSPlayer/commonThread/libmavasp_litepacket.wasm",
    "./libs/WSPlayer/commonThread/libmavasp_litepacket.data",
    "./libs/WSPlayer/singleThread/libplay.js",
    "./libs/WSPlayer/singleThread/libplay.wasm",
    "./libs/WSPlayer/singleThread/libplay.data"
  ];

  const dom = {};

  function cacheDom() {
    [
      "moduleTabs",
      "modulePanel",
      "moduleTitle",
      "moduleTag",
      "stage",
      "stageMeta",
      "log",
      "logCount",
      "statusModule",
      "statusGeneric",
      "statusDirect",
      "statusDahua"
    ].forEach((id) => {
      dom[id] = document.getElementById(id);
    });
  }

  function register(module) {
    modules.push(module);
  }

  function now() {
    return new Date().toLocaleTimeString();
  }

  function setStatus(id, label, type) {
    const target = dom[id] || document.getElementById(id);
    if (!target) return;
    target.textContent = label;
    target.className = "badge" + (type ? " " + type : "");
  }

  function log(level, message, data) {
    const entry = {
      time: now(),
      level,
      module: state.currentModule ? state.currentModule.id : "",
      message,
      data
    };
    state.logs.push(entry);

    const line = document.createElement("span");
    line.className = level;
    line.textContent = `[${entry.time}] [${level.toUpperCase()}] ${message}${data === undefined ? "" : " " + safeJson(data)}\n`;
    dom.log.appendChild(line);
    dom.log.scrollTop = dom.log.scrollHeight;
    dom.logCount.textContent = `${state.logs.length} 条`;
  }

  function safeJson(value) {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }

  function normalizeText(value) {
    return (value || "")
      .trim()
      .replace(/^["']+|["']+$/g, "")
      .replace(/[\u201c\u201d]/g, "")
      .replace(/\s+/g, "");
  }

  function setStageMeta(text) {
    dom.stageMeta.textContent = text || "等待测试";
  }

  function setStage(html) {
    dom.stage.innerHTML = html;
  }

  function getStage() {
    return dom.stage;
  }

  function stopCurrentModule() {
    if (state.currentModule && typeof state.currentModule.stop === "function") {
      state.currentModule.stop();
    }
  }

  function selectModule(id) {
    const module = modules.find((item) => item.id === id);
    if (!module) return;

    stopCurrentModule();
    state.currentModule = module;
    setStatus("statusModule", module.title, "info");
    dom.moduleTitle.textContent = module.title;
    dom.moduleTag.textContent = module.tag || "plugin";
    dom.modulePanel.innerHTML = "";
    setStage(`<div>${module.stagePlaceholder || "等待测试"}</div>`);
    setStageMeta(module.description || "");

    document.querySelectorAll(".module-tab").forEach((item) => {
      item.classList.toggle("active", item.dataset.moduleId === id);
    });

    module.render(dom.modulePanel);
    log("info", `已切换到模块：${module.title}`);
  }

  function renderModules() {
    dom.moduleTabs.innerHTML = "";
    modules.forEach((module, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "module-tab";
      button.dataset.moduleId = module.id;
      button.innerHTML = `<strong>${module.title}</strong><span>${module.description || ""}</span>`;
      button.addEventListener("click", () => selectModule(module.id));
      dom.moduleTabs.appendChild(button);
      if (index === 0) selectModule(module.id);
    });
  }

  async function checkAssets() {
    log("info", "开始检查本地资源");
    const failed = [];

    await Promise.all(assetPaths.map(async (path) => {
      try {
        const res = await fetch(path, { method: "HEAD", cache: "no-store" });
        if (!res.ok) failed.push(`${path} -> HTTP ${res.status}`);
      } catch (error) {
        failed.push(`${path} -> ${error.message}`);
      }
    }));

    if (failed.length) {
      log("error", "资源检查失败", failed);
      return;
    }

    log("success", "资源检查通过", { count: assetPaths.length });
  }

  async function copyReport() {
    const report = {
      time: new Date().toISOString(),
      page: location.href,
      currentModule: state.currentModule && state.currentModule.id,
      logs: state.logs
    };
    const text = JSON.stringify(report, null, 2);

    try {
      await navigator.clipboard.writeText(text);
      log("success", "诊断报告已复制到剪贴板");
    } catch (error) {
      console.log(text);
      log("warning", "复制失败，已输出到 Console", error.message);
    }
  }

  function clearLog() {
    state.logs = [];
    dom.log.textContent = "";
    dom.logCount.textContent = "0 条";
  }

  function init() {
    cacheDom();
    renderModules();
    document.getElementById("btnCheckAssets").addEventListener("click", checkAssets);
    document.getElementById("btnCopyReport").addEventListener("click", copyReport);
    document.getElementById("btnClearLog").addEventListener("click", clearLog);
    log("info", "通用视频测试平台已就绪", {
      modules: modules.map((item) => item.id)
    });
  }

  window.VideoTester = {
    register,
    log,
    setStatus,
    setStage,
    getStage,
    setStageMeta,
    normalizeText
  };

  document.addEventListener("DOMContentLoaded", init);
})();
