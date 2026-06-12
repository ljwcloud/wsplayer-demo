(function () {
  let socket = null;
  let timer = null;
  let stats = null;

  function render(container) {
    container.innerHTML = `
      <div class="form-grid">
        <div>
          <label for="directWssUrl">完整直连 WSS 地址</label>
          <textarea id="directWssUrl" spellcheck="false">wss://example.com/video/dss/monitor/param/cameraid=CHANNEL_ID%26substream=1?token=YOUR_TOKEN</textarea>
          <div class="hint">只测试 WebSocket 连接和数据返回，不做视频解码播放。</div>
        </div>
        <div>
          <label for="directTimeout">测试时长</label>
          <select id="directTimeout">
            <option value="5000">5 秒</option>
            <option value="10000" selected>10 秒</option>
            <option value="15000">15 秒</option>
          </select>
        </div>
        <div class="readonly-value" id="directStats">等待测试</div>
        <div class="button-row">
          <button class="btn primary" id="directStart">测试直连 WSS</button>
          <button class="btn danger" id="directStop">关闭直连</button>
          <button class="btn" id="directExtract">提取为大华 WSS 服务地址</button>
        </div>
      </div>
    `;

    container.querySelector("#directStart").addEventListener("click", start);
    container.querySelector("#directStop").addEventListener("click", () => stop(true));
    container.querySelector("#directExtract").addEventListener("click", extractBase);
  }

  function start() {
    const url = VideoTester.normalizeText(document.getElementById("directWssUrl").value);
    const timeout = Number(document.getElementById("directTimeout").value);

    if (!/^wss?:\/\//i.test(url)) {
      VideoTester.log("error", "直连 WSS 地址必须以 ws:// 或 wss:// 开头");
      return;
    }

    stop(false);
    stats = {
      url,
      opened: false,
      textMessages: 0,
      binaryMessages: 0,
      bytes: 0,
      closeCode: null,
      closeReason: ""
    };
    updateStats();
    VideoTester.setStatus("statusDirect", "连接中", "info");
    VideoTester.setStage("<div>直连 WSS 数据诊断中，查看日志和统计信息</div>");
    VideoTester.setStageMeta(url);
    VideoTester.log("info", "开始测试直连 WSS", { url, timeout });

    try {
      socket = new WebSocket(url);
      socket.binaryType = "arraybuffer";
      timer = window.setTimeout(finish, timeout);

      socket.onopen = () => {
        stats.opened = true;
        VideoTester.setStatus("statusDirect", "等待数据", "info");
        VideoTester.log("success", "直连 WSS 连接成功，等待服务端推送数据");
        updateStats();
      };

      socket.onmessage = (event) => {
        if (typeof event.data === "string") {
          stats.textMessages += 1;
          stats.bytes += event.data.length;
          VideoTester.log("info", "直连 WSS 收到文本消息", event.data.slice(0, 500));
        } else {
          const size = event.data && event.data.byteLength ? event.data.byteLength : 0;
          stats.binaryMessages += 1;
          stats.bytes += size;
          VideoTester.log("success", "直连 WSS 收到二进制数据", {
            bytes: size,
            totalBytes: stats.bytes
          });
        }
        VideoTester.setStatus("statusDirect", "收到数据", "success");
        updateStats();
      };

      socket.onerror = (event) => {
        VideoTester.setStatus("statusDirect", "失败", "danger");
        VideoTester.log("error", "直连 WSS 错误，请查看 Network 面板", { type: event.type });
      };

      socket.onclose = (event) => {
        stats.closeCode = event.code;
        stats.closeReason = event.reason || "";
        VideoTester.log("info", "直连 WSS 已关闭", stats);
        updateStats();
        socket = null;
        clearTimer();
      };
    } catch (error) {
      VideoTester.setStatus("statusDirect", "失败", "danger");
      VideoTester.log("error", error.message);
    }
  }

  function finish() {
    if (!stats) return;
    if (stats.bytes > 0 || stats.textMessages > 0 || stats.binaryMessages > 0) {
      VideoTester.setStatus("statusDirect", "收到数据", "success");
      VideoTester.log("success", "直连 WSS 测试完成，已收到数据", stats);
    } else if (stats.opened) {
      VideoTester.setStatus("statusDirect", "无数据", "warning");
      VideoTester.log("warning", "直连 WSS 已连接，但测试时长内没有收到数据", stats);
    } else {
      VideoTester.setStatus("statusDirect", "超时", "danger");
      VideoTester.log("error", "直连 WSS 连接超时", stats);
    }
    stop(false);
  }

  function stop(withLog) {
    clearTimer();
    if (socket) {
      try {
        socket.close(1000, "tester close");
      } catch (error) {
        VideoTester.log("warning", "关闭直连 WSS 失败", error.message);
      }
      socket = null;
    }
    if (withLog) {
      VideoTester.setStatus("statusDirect", "已关闭", "warning");
      VideoTester.log("info", "已关闭直连 WSS");
    }
  }

  function clearTimer() {
    if (timer) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function updateStats() {
    const target = document.getElementById("directStats");
    if (!target || !stats) return;
    target.textContent = `opened=${stats.opened}, text=${stats.textMessages}, binary=${stats.binaryMessages}, bytes=${stats.bytes}, close=${stats.closeCode || "-"}`;
  }

  function extractBase() {
    const input = document.getElementById("directWssUrl");
    const url = VideoTester.normalizeText(input.value);
    try {
      const parsed = new URL(url);
      const marker = "/dss/";
      const index = parsed.pathname.indexOf(marker);
      const basePath = index >= 0 ? parsed.pathname.slice(0, index) : parsed.pathname;
      const baseUrl = `${parsed.protocol}//${parsed.host}${basePath}`.replace(/\/$/, "");
      VideoTester.log("success", "已提取大华 WSS 服务地址，可复制到大华模块", { baseUrl });
    } catch (error) {
      VideoTester.log("error", "无法解析直连 WSS 地址", error.message);
    }
  }

  VideoTester.register({
    id: "direct-wss",
    title: "直连 WSS 诊断",
    tag: "diagnostic",
    description: "完整 WSS 地址连通性、文本帧、二进制帧和字节统计",
    stagePlaceholder: "直连 WSS 不负责解码播放，只诊断数据通道",
    render,
    stop
  });
})();
