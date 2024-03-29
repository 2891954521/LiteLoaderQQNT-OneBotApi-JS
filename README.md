# OneBot API JS

在 LiteLoaderQQNT 上添加 OneBot11 协议支持

项目灵感来源于[LiteLoaderQQNT-OneBotApi](https://github.com/linyuchen/LiteLoaderQQNT-OneBotApi)，本项目为JS实现

## 关于
- 本项目为轻量级框架，仅实现了部分核心功能，可能不支持现有的QQ机器人框架
- QQ版本仅在 Windows 下 `9.9.2.16183` 和 `9.9.6.19527` 测试运行通过
- API接口不支持并发，请不要同时进行多个请求
- 框架功能仍在完善中，如在使用时遇到问题或有任何希望改进的地方欢迎提交 Issue

## 安装方法
1. 安装 [LiteLoaderQQNT](https://github.com/LiteLoaderQQNT/LiteLoaderQQNT) 1.0.0 及以上版本
2. 下载本项目插件 [LiteLoaderQQNT-OneBotApi-JS](https://github.com/2891954521/LiteLoaderQQNT-OneBotApi-JS/releases) 并手动放置在LiteLoaderQQNT插件目录下：`./LiteLoaderQQNT/plugins`


## API文档
详见 [OneBot11](https://github.com/botuniverse/onebot-11)，所有已实现的 API 如无特殊说明均以 OneBot11 文档为准

- **支持的通信方式**  
  - HTTP API 和 上报
  - 正向 WebSocket
  - 反向 WebSocket  

- **支持的API**  
   - 收发消息、频道消息、撤回消息、获取好友/群列表等  
   - 详见 [HTTP API](https://github.com/2891954521/LiteLoaderQQNT-OneBotApi-JS/blob/main/doc/http.md)

- **支持的消息类型**  
   - 支持常见消息类型：文本、表情、图片、At、回复、撤回等  
   - 详见 [Message](https://github.com/2891954521/LiteLoaderQQNT-OneBotApi-JS/blob/main/doc/message.md) 和 [Notice](https://github.com/2891954521/LiteLoaderQQNT-OneBotApi-JS/blob/main/doc/notice.md)