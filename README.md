# OneBot API JS

在LiteLoaderQQNT上添加OneBot11协议支持

项目灵感来源于[LiteLoaderQQNT-OneBotApi](https://github.com/linyuchen/LiteLoaderQQNT-OneBotApi)，本项目为JS实现

## 安装方法

1. 安装 [NTQQLiteLoader](https://github.com/LiteLoaderQQNT/LiteLoaderQQNT)
2. 下载本项目插件 [LiteLoaderQQNT-OneBotApi-JS](https://github.com/2891954521/LiteLoaderQQNT-OneBotApi-JS) 并手动放置在LiteLoaderQQNT插件目录

   > Windows插件目录: `%USERPROFILE%/Documents/LiteLoaderQQNT/plugins`  
   > Mac插件目录: `~/Library/Containers/com.tencent.qq/Data/Documents/LiteLoaderQQNT/plugins`

### 支持的通信方式

* [X] HTTP 上报
* [ ] 正向 WebSocket
* [ ] 反向 WebSocket

### 支持的API

- [X] send_msg
- [X] send_group_msg
- [X] send_private_msg

- [ ] get_login_info
- [X] get_friend_list
- [X] set_friend_add_request

### 支持上报的消息

- [X] 文字
- [X] at
- [X] 好友请求

### 支持发送的消息格式

* [X] 文字
