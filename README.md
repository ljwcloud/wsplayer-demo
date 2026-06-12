# WSS Video Tester

用于独立测试 WSPlayer、WSS 视频服务和 RTSP 拉流链路。

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
cd /Users/lvjianwei/Downloads/wsplayer-demo
python3 -m http.server 8090
```

访问：

```text
http://127.0.0.1:8090
```

## 标准测试流程

1. 填写 `WSS 地址`，例如：

```text
wss://di.crcxy.com/video/rtspoverwebsocket
```

2. 填写 VLC 可播放的 `RTSP 地址`，通常需要包含 `token=`。
3. 点击 `完整测试`。

完整测试会依次执行：

```text
资源检查 -> WSS 连接测试 -> 初始化播放器 -> 调用 realByUrl 拉流
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
