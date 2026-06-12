(function () {
  let cleanup = null;

  function stop() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    VideoTester.setStatus("statusGeneric", "已停止", "warning");
    VideoTester.setStage("<div>通用播放器已停止</div>");
    VideoTester.setStageMeta("等待通用播放测试");
  }

  function render(container) {
    container.innerHTML = `
      <div class="form-grid">
        <div>
          <label for="genericUrl">媒体地址</label>
          <textarea id="genericUrl" spellcheck="false" placeholder="https://example.com/video.mp4 或 .m3u8/.flv"></textarea>
          <div class="hint">
            通用模块支持浏览器原生可播放地址，也可在页面额外引入 <code>hls.js</code>、<code>mpegts.js</code>、<code>flv.js</code> 后播放对应协议。
          </div>
        </div>
        <div class="row">
          <div>
            <label for="genericType">播放类型</label>
            <select id="genericType">
              <option value="auto">自动判断</option>
              <option value="native">原生 video</option>
              <option value="hls-native">HLS 原生</option>
              <option value="hlsjs">HLS.js</option>
              <option value="mpegts">MPEGTS.js</option>
              <option value="flvjs">FLV.js</option>
              <option value="iframe">iframe 预览</option>
            </select>
          </div>
          <div>
            <label for="genericMuted">自动播放</label>
            <select id="genericMuted">
              <option value="true">静音自动播放</option>
              <option value="false">不静音</option>
            </select>
          </div>
        </div>
        <div class="readonly-value">
          不支持直接播放 <code>rtsp://</code> 或裸 <code>wss://</code>。这类协议需要厂商 SDK、网关转封装或专用模块。
        </div>
        <div class="button-row">
          <button class="btn primary" id="genericPlay">开始通用播放</button>
          <button class="btn danger" id="genericStop">停止</button>
        </div>
      </div>
    `;

    container.querySelector("#genericPlay").addEventListener("click", play);
    container.querySelector("#genericStop").addEventListener("click", stop);
  }

  function play() {
    const url = VideoTester.normalizeText(document.getElementById("genericUrl").value);
    const requestedType = document.getElementById("genericType").value;
    const muted = document.getElementById("genericMuted").value === "true";

    if (!url) {
      VideoTester.log("error", "请先填写媒体地址");
      return;
    }

    if (/^rtsp:\/\//i.test(url) || /^wss?:\/\//i.test(url)) {
      VideoTester.log("error", "通用模块不能直接播放 RTSP/WSS，请使用大华模块或直连 WSS 诊断模块", { url });
      VideoTester.setStatus("statusGeneric", "协议不支持", "danger");
      return;
    }

    stop();
    VideoTester.setStatus("statusGeneric", "启动中", "info");
    VideoTester.setStage('<video id="genericVideo" controls playsinline></video>');
    VideoTester.setStageMeta(url);

    const video = VideoTester.getStage().querySelector("#genericVideo");
    video.muted = muted;
    video.autoplay = true;

    const type = requestedType === "auto" ? detectType(url, video) : requestedType;

    try {
      if (type === "iframe") {
        playIframe(url);
        return;
      }

      if (type === "hlsjs") {
        playHlsJs(url, video);
        return;
      }

      if (type === "mpegts") {
        playMpegts(url, video);
        return;
      }

      if (type === "flvjs") {
        playFlvJs(url, video);
        return;
      }

      if (type === "hls-native" && !video.canPlayType("application/vnd.apple.mpegurl")) {
        throw new Error("当前浏览器不支持原生 HLS，请引入 hls.js 或换 Safari 测试");
      }

      playNative(url, video, type);
    } catch (error) {
      VideoTester.log("error", error.message);
      VideoTester.setStatus("statusGeneric", "失败", "danger");
    }
  }

  function detectType(url, video) {
    const path = url.split("?")[0].toLowerCase();
    if (path.endsWith(".m3u8")) {
      return video.canPlayType("application/vnd.apple.mpegurl") ? "hls-native" : "hlsjs";
    }
    if (path.endsWith(".flv")) return "flvjs";
    if (path.endsWith(".ts") || path.endsWith(".m2ts")) return "mpegts";
    return "native";
  }

  function bindVideoEvents(video) {
    video.addEventListener("playing", () => {
      VideoTester.setStatus("statusGeneric", "播放中", "success");
      VideoTester.log("success", "通用播放器开始播放");
    });
    video.addEventListener("error", () => {
      const err = video.error;
      VideoTester.setStatus("statusGeneric", "失败", "danger");
      VideoTester.log("error", "video 播放错误", err ? { code: err.code, message: err.message } : {});
    });
  }

  function playNative(url, video, type) {
    bindVideoEvents(video);
    video.src = url;
    cleanup = () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
    video.play().catch((error) => {
      VideoTester.log("warning", "自动播放被浏览器拦截，需要手动点击播放", error.message);
    });
    VideoTester.log("info", "已使用原生 video 播放", { type, url });
  }

  function playIframe(url) {
    VideoTester.setStage(`<iframe src="${escapeAttribute(url)}" allow="autoplay; fullscreen"></iframe>`);
    cleanup = () => VideoTester.setStage("<div>iframe 已停止</div>");
    VideoTester.setStatus("statusGeneric", "iframe", "info");
    VideoTester.log("info", "已使用 iframe 预览", { url });
  }

  function playHlsJs(url, video) {
    if (!window.Hls) throw new Error("未检测到 hls.js。请先在页面引入 hls.min.js。");
    if (!window.Hls.isSupported()) throw new Error("当前浏览器不支持 hls.js MSE 播放。");
    bindVideoEvents(video);
    const hls = new window.Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
    cleanup = () => {
      hls.destroy();
      video.removeAttribute("src");
      video.load();
    };
    hls.on(window.Hls.Events.ERROR, (event, data) => {
      VideoTester.log(data.fatal ? "error" : "warning", "HLS.js 事件", data);
      if (data.fatal) VideoTester.setStatus("statusGeneric", "失败", "danger");
    });
    video.play().catch(() => {});
    VideoTester.log("info", "已使用 hls.js 播放", { url });
  }

  function playMpegts(url, video) {
    if (!window.mpegts) throw new Error("未检测到 mpegts.js。请先在页面引入 mpegts.js。");
    if (!window.mpegts.getFeatureList().mseLivePlayback) throw new Error("当前浏览器不支持 mpegts.js MSE 播放。");
    bindVideoEvents(video);
    const player = window.mpegts.createPlayer({ type: "mse", isLive: true, url });
    player.attachMediaElement(video);
    player.load();
    cleanup = () => {
      player.destroy();
      video.removeAttribute("src");
      video.load();
    };
    video.play().catch(() => {});
    VideoTester.log("info", "已使用 mpegts.js 播放", { url });
  }

  function playFlvJs(url, video) {
    if (!window.flvjs) throw new Error("未检测到 flv.js。请先在页面引入 flv.min.js。");
    if (!window.flvjs.isSupported()) throw new Error("当前浏览器不支持 flv.js MSE 播放。");
    bindVideoEvents(video);
    const player = window.flvjs.createPlayer({ type: "flv", isLive: true, url });
    player.attachMediaElement(video);
    player.load();
    cleanup = () => {
      player.destroy();
      video.removeAttribute("src");
      video.load();
    };
    video.play().catch(() => {});
    VideoTester.log("info", "已使用 flv.js 播放", { url });
  }

  function escapeAttribute(value) {
    return String(value).replace(/"/g, "&quot;");
  }

  VideoTester.register({
    id: "generic-player",
    title: "通用播放器",
    tag: "standard",
    description: "标准 URL、原生 video、HLS/FLV/MPEGTS 开源库适配",
    stagePlaceholder: "通用播放器窗口",
    render,
    stop
  });
})();
