# 聊天消息

### 消息上报基本结构
```json lines
{
    "time": 0,
    "self_id": "123456",        // 自身QQ号
    "post_type": "message",     // 上报的类型（固定为message）
    "message_id": "123456",     // 消息的msgId
    "message_type": "private",  // 消息类型（私聊为private，群聊为group）
    "sub_type": "friend",       // 消息子类型
    "user_id": "",              // 消息发送者
    "group_id": "",             // 收到消息的群（只有群消息才有这个字段）
    "font": 0,
    "message": [
        // 消息内容，具体请参考下文
    ]
}
```


### 支持的消息类型

| 消息类型    | 接收 | 发送 | 备注                    |
|---------|:--:|:--:|-----------------------|
| 文字      | ✔  | ✔  |                       |
| QQ表情    | ✔  | ✔  |                       |
| 图片      | ✔  | ✔  | 发送目前仅支持本地图片           |
| 语音      |    |
| 短视频     |    |
| at      | ✔  | ✔  |                       |
| 猜拳魔法表情  |    |
| 掷骰子魔法表情 |    |
| 窗口抖动    |    |
| 戳一戳     | ❌  | ❌  | QQNT并没有戳一戳功能，所以该功能不支持 |
| 链接分享    |    |
| 推荐好友    |    |
| 推荐群     |    |
| 回复      | ✔  | ✔  | 只能回复Bot框架启动后收到的消息     |
| 合并转发    | ✔  |
| JSON 消息 | ✔  |
| XML 消息  |    |


## 消息结构

### 纯文本
```json lines
{
    "type": "text",
    "data": {
        "text": "纯文本内容"
    }
}
```

### QQ 表情
```json lines
{
    "type": "face",
    "data": {
        "id": "123" // string int 均可
    }
}
```

### 图片
```json lines
{
    "type": "image",
    "data": {
        "file": "path",         // 图片文件本地路径
        "url": "https://xxx",   // 图片URL
        "md5": "3F7D797BE1AF0A" // 图片md5 (大写)
    }
}
```

### at
```json lines
{
    "type": "at",
    "data": {
        "qq": "123456" // at全体成员时是 "all"
    }
}
```

### 回复
```json lines
{
    "type": "reply",
    "data": {
        "id": "123456" // 回复的消息的msgId
    }
}
```

### 转发消息
```json lines
{
    "type": "forward",
    "data": {
        "id": "123456" // 消息的msgId
    }
}
```

### Json消息
```json lines
{
    "type": "json",
    "data": {
        "data": "{\"app\":\"com.tencent.miniapp_01\" ... }" // Json消息内容（字符串）
    }
}
```