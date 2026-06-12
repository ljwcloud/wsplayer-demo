# Universal Video Tester

这是一个通用视频测试平台，不再把大华 `WSPlayer` 当成通用播放器。

平台按模块拆分：

```text
通用播放器       标准 URL、原生 video、HLS/FLV/MPEGTS 开源库适配
直连 WSS 诊断   只测试完整 WSS 地址能否连接、是否返回数据
大华 WSPlayer   大华 / ICC 私有 SDK，使用 wsURL + rtspURL 播放
```

## 目录结构

```text
wsplayer-demo/
├── index.html
├── css/
│   └── app.css
├── js/
│   ├── app.js
│   └── modules/
│       ├── generic-player.js
│       ├── direct-wss.js
│       └── dahua-wsplayer.js
├── libs/
│   └── WSPlayer/
└── README.md
```

## 启动

```bash
cd /Users/lvjianwei/Downloads/wsplayer-demo
python3 -m http.server 8090
```

访问：

```text
http://127.0.0.1:8090
```

## 通用播放器

用于测试标准媒体地址：

```text
https://example.com/video.mp4
https://example.com/live.m3u8
https://example.com/live.flv
```

支持方式：

```text
原生 video
HLS 原生，主要是 Safari
HLS.js，需要额外引入 hls.js
MPEGTS.js，需要额外引入 mpegts.js
FLV.js，需要额外引入 flv.js
iframe 预览
```

通用播放器不直接播放：

```text
rtsp://...
wss://...
```

这类地址需要网关转封装或厂商 SDK。

## 直连 WSS 诊断

用于测试完整 WSS 地址，例如：

```text
wss://example.com/video/dss/monitor/param/cameraid=CHANNEL_ID%26substream=1?token=YOUR_TOKEN
```

它只做 WebSocket 诊断：

```text
是否连接成功
是否收到文本帧
是否收到二进制帧
累计收到字节数
关闭 code / reason
```

它不是播放器。能收到二进制数据，不代表浏览器知道如何解码成画面。

## 大华 WSPlayer 模块

这是厂商私有模块，依赖：

```text
libs/WSPlayer/WSPlayer.js
libs/WSPlayer/PlaySDKInterface.js
libs/WSPlayer/commonThread/
libs/WSPlayer/singleThread/
libs/WSPlayer/multiThread/
```

播放时需要两段参数：

```text
大华 / ICC WSS 服务地址：
wss://example.com/video

RTSP 地址：
rtsp://...?...token=...
```

实际调用：

```js
player.realByUrl({
  wsURL: "wss://...",
  rtspURL: "rtsp://..."
})
```

## 后续扩展

新增厂商或协议时，不要改大华模块，新增一个独立文件即可：

```text
js/modules/hikvision-player.js
js/modules/webrtc-player.js
js/modules/flv-live-player.js
```

然后在 `index.html` 中引入该模块脚本，并调用：

```js
VideoTester.register({
  id: "your-module",
  title: "Your Module",
  render(container) {},
  stop() {}
})
```
