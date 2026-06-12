(function () {
  let player = null;

  function render(container) {
    container.innerHTML = `
      <div class="form-grid">
        <div>
          <label for="dahuaWsUrl">大华 / ICC WSS 服务地址</label>
          <input id="dahuaWsUrl" spellcheck="false" value="wss://example.com/video" />
          <div class="hint">这是传给 <code>WSPlayer.realByUrl</code> 的 <code>wsURL</code>。</div>
        </div>
        <div>
          <label>当前播放链路</label>
          <div class="readonly-value" id="dahuaRoute">等待 RTSP 地址</div>
        </div>
        <div>
          <label for="dahuaRtspUrl">RTSP 地址</label>
          <textarea id="dahuaRtspUrl" spellcheck="false" placeholder="rtsp://...?...token=..."></textarea>
          <div class="hint">这是传给 <code>WSPlayer.realByUrl</code> 的 <code>rtspURL</code>。</div>
        </div>
        <div class="row">
          <div>
            <label for="dahuaStreamType">码流</label>
            <select id="dahuaStreamType">
              <option value="1">主码流</option>
              <option value="2">辅码流</option>
            </select>
          </div>
          <div>
            <label for="dahuaChannelId">通道标识</label>
            <input id="dahuaChannelId" value="demo" />
          </div>
        </div>
        <div class="button-row">
          <button class="btn" id="dahuaTestWs">测试 WSS</button>
          <button class="btn primary" id="dahuaPlay">开始大华播放</button>
          <button class="btn danger" id="dahuaStop">停止</button>
        </div>
      </div>
    `;

    ["input", "change"].forEach((eventName) => {
      container.querySelector("#dahuaWsUrl").addEventListener(eventName, updateRoute);
      container.querySelector("#dahuaRtspUrl").addEventListener(eventName, updateRoute);
    });
    container.querySelector("#dahuaTestWs").addEventListener("click", testWs);
    container.querySelector("#dahuaPlay").addEventListener("click", play);
    container.querySelector("#dahuaStop").addEventListener("click", () => stop(true));
    updateRoute();
  }

  function updateRoute() {
    const target = document.getElementById("dahuaRoute");
    if (!target) return;
    const wsURL = VideoTester.normalizeText(document.getElementById("dahuaWsUrl").value);
    const rtspURL = VideoTester.normalizeText(document.getElementById("dahuaRtspUrl").value);
    target.textContent = rtspURL ? `${wsURL} -> ${rtspURL}` : `${wsURL} -> 等待 RTSP 地址`;
  }

  function getCtor() {
    return window.WSPlayer &&
      (window.WSPlayer.WSPlayer ||
       window.WSPlayer.default ||
       (typeof window.WSPlayer === "function" ? window.WSPlayer : null));
  }

  function readConfig(requireRtsp) {
    const wsURL = VideoTester.normalizeText(document.getElementById("dahuaWsUrl").value);
    const rtspURL = VideoTester.normalizeText(document.getElementById("dahuaRtspUrl").value);
    const streamType = document.getElementById("dahuaStreamType").value;
    const channelId = document.getElementById("dahuaChannelId").value.trim() || "demo";

    document.getElementById("dahuaWsUrl").value = wsURL;
    document.getElementById("dahuaRtspUrl").value = rtspURL;
    document.getElementById("dahuaChannelId").value = channelId;
    updateRoute();

    if (!/^wss?:\/\//i.test(wsURL)) throw new Error("大华 WSS 服务地址必须以 ws:// 或 wss:// 开头");
    if (requireRtsp && !/^rtsp:\/\//i.test(rtspURL)) throw new Error("RTSP 地址必须以 rtsp:// 开头");
    if (requireRtsp && !rtspURL.includes("token=")) {
      VideoTester.log("warning", "当前大华 WSPlayer 版本通常要求 RTSP 地址包含 token=");
    }

    return { wsURL, rtspURL, streamType, channelId };
  }

  function testWs() {
    let config;
    try {
      config = readConfig(false);
    } catch (error) {
      VideoTester.log("error", error.message);
      return;
    }

    VideoTester.setStatus("statusDahua", "WSS 连接中", "info");
    const ws = new WebSocket(config.wsURL);
    const timer = window.setTimeout(() => {
      ws.close();
      VideoTester.setStatus("statusDahua", "WSS 超时", "danger");
      VideoTester.log("error", "大华 WSS 服务地址连接超时", { wsURL: config.wsURL });
    }, 10000);

    ws.onopen = () => {
      window.clearTimeout(timer);
      VideoTester.setStatus("statusDahua", "WSS 正常", "success");
      VideoTester.log("success", "大华 WSS 服务地址连接成功", { wsURL: config.wsURL });
      ws.close(1000, "tester complete");
    };
    ws.onerror = () => {
      window.clearTimeout(timer);
      VideoTester.setStatus("statusDahua", "WSS 失败", "danger");
      VideoTester.log("error", "大华 WSS 服务地址连接失败，请查看 Network");
    };
  }

  function play() {
    let config;
    try {
      config = readConfig(true);
    } catch (error) {
      VideoTester.setStatus("statusDahua", "参数错误", "danger");
      VideoTester.log("error", error.message);
      return;
    }

    const Ctor = getCtor();
    if (!Ctor) {
      VideoTester.setStatus("statusDahua", "SDK 未加载", "danger");
      VideoTester.log("error", "未检测到大华 WSPlayer，请确认 libs/WSPlayer/WSPlayer.js 已加载");
      return;
    }

    stop(false);
    VideoTester.setStatus("statusDahua", "初始化中", "info");
    VideoTester.setStage('<div id="dahuaStageTarget" class="ws-stage-target"></div>');
    VideoTester.setStageMeta(`${config.wsURL} -> ${config.rtspURL}`);

    player = new Ctor({
      el: "dahuaStageTarget",
      type: "real",
      prefixUrl: "./libs",
      importLoad: false,
      config: {
        num: 1,
        maxNum: 1,
        showControl: true,
        showTopOperate: true,
        showRecordProgressBar: false,
        isDynamicLoadLib: true,
        onlyLoadSingleLib: location.protocol !== "https:"
      },
      receiveMessageFromWSPlayer: onMessage
    });

    player.realByUrl({
      wsURL: config.wsURL,
      rtspURL: config.rtspURL,
      selectIndex: 0,
      channelId: config.channelId,
      streamType: config.streamType,
      playerAdapter: "selfAdaption",
      channelData: { id: config.channelId }
    });

    VideoTester.log("info", "已调用大华 WSPlayer.realByUrl", config);
  }

  function onMessage(type, data) {
    if (type === "initializationCompleted") {
      VideoTester.setStatus("statusDahua", "解码库就绪", "success");
      VideoTester.log("success", "大华 WSPlayer 解码库初始化完成");
      return;
    }
    if (type === "realSuccess") {
      VideoTester.setStatus("statusDahua", "播放中", "success");
      VideoTester.log("success", "大华 WSPlayer 播放成功", data);
      return;
    }
    if (type === "realError" || type === "errorInfo") {
      VideoTester.setStatus("statusDahua", "失败", "danger");
      VideoTester.log("error", "大华 WSPlayer 返回错误", data || {});
      return;
    }
    if (type === "closeVideo") {
      VideoTester.setStatus("statusDahua", "已关闭", "warning");
      VideoTester.log("info", "大华 WSPlayer 已关闭视频", data);
    }
  }

  function stop(withLog) {
    if (!player) return;
    try {
      if (typeof player.destroy === "function") player.destroy();
      else if (typeof player.close === "function") player.close();
    } catch (error) {
      VideoTester.log("warning", "停止大华 WSPlayer 失败", error.message);
    } finally {
      player = null;
      VideoTester.setStatus("statusDahua", "已停止", "warning");
      if (withLog) VideoTester.log("info", "已停止大华 WSPlayer");
    }
  }

  VideoTester.register({
    id: "dahua-wsplayer",
    title: "大华 WSPlayer",
    tag: "vendor",
    description: "大华 / ICC 私有 SDK，使用 wsURL + rtspURL 播放",
    stagePlaceholder: "大华 WSPlayer 播放窗口",
    render,
    stop
  });
})();
