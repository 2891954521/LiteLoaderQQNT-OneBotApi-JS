# HTTP API

目前已实现的API如下表所示

| URL                                                   | 是否支持 | 注释           |
|-------------------------------------------------------|:----:|--------------|
| 消息处理                                                  |      |              |
| [`send_msg`](#send_msg)                               |  ✓   | 发送消息         |
| `send_private_msg`                                    |  ✓   | 发送私聊消息       |
| `send_group_msg`                                      |  ✓   | 发送群消息        |
| [`delete_msg`](#delete_msg)                           |  ✓   | 撤回消息         |
| [`get_msg`](#get_msg)                                 |  ✓   | 获取消息         |
| [`get_record`](#get_record)                           |      | 获取语音         |
| [`get_image`](#get_image)                             |      | 获取图片         |
| [`get_forward_msg`](#get_forward_msg)                 |  ✓   | 获取合并转发消息     |
| [`can_send_image`](#can_send_image)                   |      | 检查是否可以发送图片   |
| [`can_send_record`](#can_send_record)                 |      | 检查是否可以发送语音   |
| 好友信息                                                  |      |              |
| [`get_login_info`](#get_login_info)                   |  ✓   | 获取登录号信息      |
| [`get_friend_list`](#get_friend_list)                 |  ✓   | 获取好友列表       |
| [`get_stranger_info`](#get_stranger_info)             |      | 获取陌生人信息      |
| 群信息                                                   |      |              |
| [`get_group_list`](#get_group_list)                   |  ✓   | 获取群列表        |
| [`get_group_info`](#get_group_info)                   |  ✓   | 获取群信息        |
| [`get_group_member_list`](#get_group_member_list)     |  ✓   | 获取群成员列表      |
| [`get_group_member_info`](#get_group_member_info)     |  ✓   | 获取群成员信息      |
| 好友请求                                                  |      |              |
| [`set_friend_add_request`](#set_friend_add_request)   |  ✓   | 处理加好友请求      |
| [`set_group_add_request`](#set_group_add_request)     |      | 处理加群请求/邀请    |
| 好友操作                                                  |      |              |
| [`send_like`](#send_like)                             |      | 发送好友赞        |
| 群操作                                                   |      |              |
| [`set_group_kick`](#set_group_kick)                   |      | 群组踢人         |
| [`set_group_anonymous`](#set_group_anonymous)         |      | 群组匿名         |
| [`set_group_admin`](#set_group_admin)                 |      | 群组设置管理员      |
| [`set_group_ban`](#set_group_ban)                     |      | 群组单人禁言       |
| [`set_group_whole_ban`](#set_group_whole_ban)         |      | 群组全员禁言       |
| [`set_group_anonymous_ban`](#set_group_anonymous_ban) |      | 群组匿名用户禁言     |
| [`get_group_honor_info`](#get_group_honor_info)       |      | 获取群荣誉信息      |
| [`set_group_name`](#set_group_name)                   |      | 设置群名         |
| [`set_group_special_title`](#set_group_special_title) |      | 设置群组专属头衔     |
| [`set_group_card`](#set_group_card)                   |      | 设置群名片群备注     |
| [`set_group_leave`](#set_group_leave)                 |      | 退出群组         |
| 其他                                                    |      |              |
| [`get_status`](#get_status)                           |      | 获取运行状态       |
| [`get_version_info`](#get_version_info)               |      | 获取版本信息       |
| [`set_restart`](#set_restart)                         |      | 重启 OneBot 实现 |
| [`clean_cache`](#clean_cache)                         |      | 清理缓存         |


## `send_msg` 
### 发送消息  
目前 `send_msg`, `send_private_msg`, `send_group_msg` 三个接口可以通用，传入 `group_id` 发送群消息，
传入 `user_id` 发送私聊消息，优先判断 `group_id`

**请求体**
```json lines
{
    "user_id": "123456",     // 目标QQ号, user_id 和 group_id 二选一，类型可以是 string 也可以是 int
    "group_id": "123456",    // 目标群号
    "message": "Hello World" // 发送的消息，可以为字符串，也可以为消息数组
}
```
**响应体**
```json lines
{
    "status": "ok",
    "retcode": 0,
    "data": {
        "message_id": "123456" // 消息msgId
    }
}
```


## `delete_msg`
### 撤回消息
如有需要可以额外传入被撤回消息所属的 QQ群号 / 好友QQ号，这样即使发送的消息在Bot框架启动之前也可撤回，但是**msgId不存在的话会直接导致QQ崩溃**

**请求体**

```json lines
{
    "message_id": "123456", // 消息的msgId, 上报的消息和发送的消息均带有此参数
    "group_id": "123456",   // （可选）消息所属的群
    "user_id": "123456",    // （可选）消息所属的好友QQ
}
```
**响应体**
```json lines
{
    "status": "ok",
    "retcode": 0
}
```


## `ge_msg`
### 获取消息
只支持获取Bot框架启动之后收到的消息，无法获取历史消息

**请求体**

```json lines
{
    "message_id": "123456", // 消息的msgId
}
```
**响应体**
```json lines
{
    "status": "ok",
    "retcode": 0,
    "data": {
        "time": 0,
        "self_id": "123456",
        "post_type": "message",
        "message_id": "123456",
        "message_type": "private",
        "sub_type": "friend",
        "user_id": "",
        "group_id": "",
        "message": [ ]
    }
}
```


## `get_forward_msg` 

### 获取合并转发消息
如果发送的消息在Bot框架启动之前，可以额外传入被撤回消息所属的 QQ群号 / 好友QQ号 来获取消息内容

**请求体**

```json lines
{
    "id": "123456",         // 消息的msgId, 上报的消息和发送的消息均带有此参数
    "group_id": "123456",   // （可选）消息所属的群
    "user_id": "123456",    // （可选）消息所属的好友QQ
}
```
**响应体**
```json lines
{
    "status": "ok",
    "retcode": 0,
    "data": {
        "message": [
            {
                "type": "node",
                "data": {
                    "user_id": "10001000",
                    "content": [
                        {"type": "face", "data": {"id": "123"}},
                        {"type": "text", "data": {"text": "哈喽～"}}
                    ]
                }
            }
        ]
    }
}
```

## `get_login_info`

### 获取账号信息

**响应体**
```json lines
{
    "status": "ok",
    "retcode": 0,
    "data": [
        {
            "user_id": "123456"	// QQ 号
        }
    ]
}
```


## `get_friend_list`
### 获取好友列表

**响应体**
```json lines
{
    "status": "ok",
    "retcode": 0,
    "data": [
        {
            "user_id": "123456", // 好友QQ号
            "nickname": "",      // 好友昵称
            "remark": ""         // 好友备注
        }
    ]
}
```


## `get_group_list`
### 获取群列表

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


## `get_group_info`
### 获取群信息

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


## `get_group_member_list` 
### 获取群成员列表

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
    "data": [
        {
            "group_id": 123456, // 群号
            "user_id": 123456,  // QQ 号
            "nickname": "",     // 昵称,
            "card": "",     // 群名片／备注,
            "role": "",     // 角色，owner 或 admin 或 member
        }
    ]
}
```

## `get_group_member_info`
### 获取群成员信息

**请求体**
```json lines
{
    "group_id": 123456, // 群号
    "user_id": 123456,  // QQ号
    "no_cache": false   // 是否使用缓存
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



## `set_friend_add_request`
### 处理好友请求

**请求体**
```json lines
{
    "flag": "xxxxx", // 上报的flag
    "approve": true  // 是否接受
}
```