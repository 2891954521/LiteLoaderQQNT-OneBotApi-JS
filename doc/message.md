# 聊天消息

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

### 消息上报结构
#### 好友消息
```json lines
{
    "time": 1711698307,
    "message_id": "7351688249283856975",
    "self_id": "123456",
    "post_type": "message",
    "user_id": "123456",
    "font": 0,
    "message": [
        {
            "type": "text",
            "data": {
                "text": "hello"
            }
        }
    ],
    "raw_message": "hello",
    "message_type": "private",
    "sub_type": "friend",
    "sender": {
        "user_id": "123456",
        "nickname": "",
        "sex": "unknown",
        "age": 0
    }
}
```

#### 群消息
```json lines
{
    "time": 1711698530,
    "message_id": "7351689208262640341",
    "self_id": "123456",
    "post_type": "message",
    "user_id": "123456",
    "font": 0,
    "message": [
        {
            "type": "image",
            "data": {
                "file": "file:///C:\\xxxx\\123456.jpg",
                "url": "https://xxxxxxx",
                "md5": "6BC2CAB569525B992398376BA7B3D8D4"
            }
        }
    ],
    "raw_message": "[CQ:image,md5=6BC2CAB569525B992398376BA7B3D8D4]",
    "group_id": "123456",
    "message_type": "group",
    "sub_type": "group",
    "sender": {
        "user_id": "123456",
        "nickname": "",
        "card": "",
        "sex": "unknown",
        "age": 0,
        "area": "",
        "level": "0",
        "role": "",
        "title": ""
    }
}
```
#### 频道消息
**注意：只有QQ打开某一具体频道的聊天界面才能接受到频道消息**
```json lines
{
    "time": 1711698669,
    "message_id": "7351689810098904374",
    "self_id": "123456",
    "post_type": "message",
    "font": 0,
    "message": [
        {
            "type": "text",
            "data": {
                "text": "hello"
            }
        }
    ],
    "raw_message": "hello",
    "guild_id": "123456",
    "channel_id": "123456",
    "tiny_id": "123456",
    "message_type": "guild",
    "sub_type": "message"
}
```


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