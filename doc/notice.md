# 通知消息

### 支持的消息类型

| 消息类型   | 接收 | 备注 |
|--------|:--:|----|
| 好友请求   | ✔  |    |    |
| 好友消息撤回 | ✔  |    |    |
| 群消息撤回  | ✔  |    |    |

## 消息结构

### 收到好友请求
```json lines
{
    "request_type": "friend",
    "user_id": "123456",   // 好友QQ号
    "comment": "我是xxx",  // 加好友的验证消息
    "flag": "xxxx"         // 处理好友请求的flag
}
```

### 好友消息撤回
```json lines
{  
    "time": 1708072121,
    "self_id": "123456",
    
    "post_type": "notice",
    "notice_type": "friend_recall",
    
    "user_id": "123456",
    "operator_id": "123456",
    "message_id": "xxxxxx",
}
```

### 群消息撤回
```json lines
{  
    "time": 1708072121,
    "self_id": "123456",
    
    "post_type": "notice",
    "notice_type": "group_recall",
    
    "user_id": "123456",
    "group_id": "123456",
    "operator_id": "123456",
    "message_id": "xxxxxx",
}
```