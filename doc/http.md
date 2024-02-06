# HTTP API

目前已实现的API如下表所示

| URL                       | 是否支持 | 注释      |
|---------------------------|:----:|---------|
| `/send_msg`               |  ✓   | 发送消息    |
| `/send_private_msg`       |  ✓   | 发送私聊消息  |
| `/send_group_msg`         |  ✓   | 发送群消息   |
| `/get_login_info`         |  ✓   | 获取账号信息  |
| `/get_friend_list`        |  ✓   | 获取好友列表  |
| `/get_group_list`         |  ✓   | 获取群列表   |
| `/get_group_info`         |  ✓   | 获取群信息   |
| `/get_group_member_list`  |  ✓   | 获取群成员列表 |
| `/set_friend_add_request` |  ✓   | 处理加好友请求 |


### `POST` `/send_msg` 发送消息
目前 `send_msg`, `send_private_msg`, `send_group_msg` 三个接口可以通用，传入 `group_id` 发送群消息，
传入 `user_id` 发送私聊消息，优先判断 `group_id`

**请求体**
```json lines
{
    "user_id": "123456",     // 目标QQ号(群号), user_id 和 group_id 二选一，类型可以是 string 也可以是 int
    "message": "Hello World" // 发送的消息，可以为字符串，也可以为消息数组
}
```
**响应体**
```json lines
{
    status: 'ok',
    retcode: 0,
    "message_id": "123456" // 消息msgId
}
```

### `POST` `/get_login_info` 获取账号信息

**响应体**
```json lines
{
    status: 'ok',
    retcode: 0,
    "data": [
        {
            "account": "123456", // QQ号
        }
    ]
}
```


### `POST` `/get_friend_list` 获取好友列表

**响应体**
```json lines
{
    status: 'ok',
    retcode: 0,
    "data": [
        {
            "user_id": "123456", // 好友QQ号
            "nickname": "",      // 好友昵称
            "remark": ""         // 好友备注
        }
    ]
}
```


### `POST` `/get_group_list` 获取群列表

**响应体**
```json lines
{
    status: 'ok',
    retcode: 0,
    "data": [
        {
            "group_id": "123456",  // 群号
            "group_name": "",      // 群名称
            "member_count": "",    // 成员数
            "max_member_count": "" // 最大成员数（群容量）
        }
    ]
}
```


### `POST` `/get_group_info` 获取群信息

**请求体**
```json lines
{
    "group_id": 123456, // 群号
}
```

**响应体**
```json lines
{
    status: 'ok',
    retcode: 0,
    "data": {
        "group_id": "123456",  // 群号
        "group_name": "",      // 群名称
        "member_count": "",    // 成员数
        "max_member_count": "" // 最大成员数（群容量）
    }
}
```


### `POST` `/get_group_member_list` 获取群成员列表

**请求体**
```json lines
{
    "group_id": 123456, // 群号
}
```

**响应体**
```json lines
{
    status: 'ok',
    retcode: 0,
    "data": {
        "group_id": 123456, // 群号
        "user_id": 123456,  // QQ 号
        "nickname": "",     // 昵称,
        "card": "",     // 群名片／备注,
        "role": "",     // 角色，owner 或 admin 或 member
    }
}
```


### `POST` `/set_friend_add_request` 接受好友请求

**请求体**
```json lines
{
    "flag": "xxxxx", // 上报的flag
    "approve": true  // 是否接受
}
```