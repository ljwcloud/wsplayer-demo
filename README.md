# WSS Video Tester

用于独立测试 WSPlayer、WSS 视频服务和 RTSP 拉流链路。
也支持直接测试完整 WSS 取流地址，例如：

```text
```

## 目录结构

```text
wsplayer-demo/
├── index.html
├── libs/
│   └── WSPlayer/
│       ├── WSPlayer.js
│       ├── PlaySDKInterface.js
│       ├── player.css
│       ├── commonThread/
│       ├── multiThread/
│       ├── singleThread/
│       └── icon/
└── README.md
```

## 启动

```bash
cd /wsplayer-demo
npx serve .
```

访问：

```text
http://127.0.0.1:8090
```

## RTSP 播放测试

页面左侧的 `RTSP 播放测试` 是真正调用 WSPlayer 播放画面的区域。

1. 填写 `RTSP 播放使用的 WSS 地址`，例如：

```text
wss://xx.xx.com/video
```

2. 填写 VLC 可播放的 `RTSP 地址`，通常需要包含 `token=`。
3. 页面会在 `当前播放链路` 中展示：

```text
WSS 地址 -> RTSP 地址
```

4. 点击：

```text
开始播放 RTSP
```

RTSP 播放实际调用：

```js
player.realByUrl({
  wsURL: "wss://...",
  rtspURL: "rtsp://..."
})
```

## 直连 WSS 地址测试

页面左侧的 `直连 WSS 数据测试` 是独立区域，不使用 RTSP 地址。

如果拿到的是完整 WSS 取流地址，填到 `完整直连 WSS 地址`：

```text
```

点击：

```text
测试直连 WSS
```

页面会直接创建 WebSocket 连接，并统计：

```text
是否连接成功
是否收到文本消息
是否收到二进制数据
累计收到字节数
关闭 code 和 reason
```

说明：

```text
直连 WSS 测试用于判断这个完整地址本身是否通、是否返回数据。
它不等同于 WSPlayer 播放测试；如果协议不是 WSPlayer realByUrl 使用的 rtsp-over-websocket 格式，直连能收到数据也不代表当前播放器一定能解码播放。
```

如果要从直连 WSS 地址中提取 RTSP 播放使用的服务地址，点击：

```text
提取为 RTSP 播放 WSS
```

例如会从：

```text
wss://xxx/video/dss/monitor/param/...
```

提取为：

```text
wss://xxx/video
```

## 结果判断

资源失败：

```text
libs/WSPlayer 目录不完整，先补齐 WSPlayer 整套文件。
```

WSS 失败：

```text
检查 WSS 地址、证书、Nginx WebSocket 转发、服务是否在线。
```

WSS 成功但播放失败：

```text
前端资源和 WSS 基本正常，重点查视频服务到 RTSP 源的链路。
```

常见播放器错误：

```text
407 请求超时：视频服务拉 RTSP 源失败。
408 请求超时或码流不支持：检查编码、主辅码流、RTSP 地址。
409 服务未推送码流：视频服务没有拿到有效码流。
503 WSS 地址错误：WSS 地址与当前 ICC/视频服务不匹配。
```

## 诊断输出

页面提供：

```text
资源状态
WSS 状态
播放器状态
拉流状态
结构化测试日志
复制诊断报告
```

定位问题时，优先把页面日志和浏览器 Console / Network 中的错误一起保存。
