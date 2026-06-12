# WSPlayer RTSP 流测试 Demo

## 目录说明

```text
wsplayer-demo/
├── index.html
├── libs/
│   └── 把你项目里的播放器文件放这里
└── README.md
```

## 需要复制的文件

从现有前端项目或浏览器 Network/Sources 里下载这些文件，放到 `libs/`：

```text
PlaySDKInterface.js
WSPlayer.js
libplay.js
libplay.wasm
libplay.data
```

如果还有其他 wasm/data/js 依赖，也一起放到 `libs/`。

## 启动方式

进入目录：

```bash
cd wsplayer-demo
python3 -m http.server 8088
```

浏览器访问：

```text
http://127.0.0.1:8088
```

## 测试步骤

1. 点击“测试 WebSocket”
2. 填写 VLC 能播放的 RTSP 地址
3. 点击“开始播放”

## 判断结论

如果 WebSocket 成功，但播放报：

```text
407 Request Timeout
408 Short Request Timeout
```

说明：

```text
WebSocket/Nginx 正常；
视频服务拉 RTSP 源失败。
```

重点查：

```text
1. RTSP 地址是否正确
2. 视频服务服务器是否能访问摄像头 554 端口
3. 摄像头/大华平台是否限制来源 IP
4. 接口返回的 RTSP 地址是否和 VLC 播放地址一致
```

## 注意

不同版本 WSPlayer 初始化参数不一样。

如果页面提示三种初始化方式都失败，请在原项目搜索：

```text
new WSPlayer
StartPullStream
rtspoverwebsocket
```

把原项目初始化代码复制到 `index.html` 的 `startPlay()` 方法里。
