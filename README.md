# OneBot API JS

在LiteLoaderQQNT上添加OneBot11协议支持

> 理论支持 LiteLoader 全版本  
> QQ版本仅在 Windows 下 `9.9.2.16183` 和 `9.9.6.19527` 测试运行通过

项目灵感来源于[LiteLoaderQQNT-OneBotApi](https://github.com/linyuchen/LiteLoaderQQNT-OneBotApi)，本项目为JS实现


## 安装方法

1. 安装 [NTQQLiteLoader](https://github.com/LiteLoaderQQNT/LiteLoaderQQNT)

2. 下载本项目插件 [LiteLoaderQQNT-OneBotApi-JS](https://github.com/2891954521/LiteLoaderQQNT-OneBotApi-JS) 并手动放置在LiteLoaderQQNT插件目录
   
   - LiteLoader 1.0.0 以下  
     > Windows插件目录: `%USERPROFILE%/Documents/LiteLoaderQQNT/plugins`  
       Mac插件目录: `~/Library/Containers/com.tencent.qq/Data/Documents/LiteLoaderQQNT/plugins`  
   
   - LiteLoader 1.0.0 及以上，直接放在LiteLoader插件目录下：`./LiteLoaderQQNT/plugins`


## 性能

- 仅安装本插件对QQNT本体运行几乎没有影响  
- HTTP接口不支持并发，请不要同时进行多个请求

## API文档
详见 [OneBot11](https://11.onebot.dev/)，所有已实现的API均以OneBot11文档为准

### 支持的通信方式

- HTTP API 和 上报 
- 正向 WebSocket 
- 反向 WebSocket (未完成)

### 支持的API

详见 [HTTP API](https://github.com/2891954521/LiteLoaderQQNT-OneBotApi-JS/blob/main/doc/http.md)


### 支持的消息

详见 [Message](https://github.com/2891954521/LiteLoaderQQNT-OneBotApi-JS/blob/main/doc/message.md)
和 [Notice](https://github.com/2891954521/LiteLoaderQQNT-OneBotApi-JS/blob/main/doc/notice.md)