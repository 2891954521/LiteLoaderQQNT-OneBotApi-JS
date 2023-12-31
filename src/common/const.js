module.exports = {
    IPCAction: {
        /**
         * 读取和写入配置文件
         */
        ACTION_GET_CONFIG: "one_bot_api_get_config",
        ACTION_SET_CONFIG: "one_bot_api_set_config",
            
        
        ACTION_SEND_MSG: "one_bot_api_send_msg",
        ACTION_RECALL_MSG: "one_bot_api_recall_msg",


        ACTION_UPDATE_SELF_INFO: "one_bot_api_set_self_info",
        ACTION_UPDATE_FRIENDS: "one_bot_api_update_friends",
        ACTION_UPDATE_GROUPS: "one_bot_api_update_groups",


        ACTION_NT_CALL: "one_bot_api_nt_call",
        ACTION_GET_USER_BY_UID: "one_bot_api_get_user_by_uid",


        ACTION_DOWNLOAD_FILE: "one_bot_api_download_file",

        /**
         * 主界面是否已加载
         */
        ACTION_IS_LOADED: "one_bot_api_is_loaded",

        /**
         * 主界面加载
         */
        ACTION_LOAD_MAIN_PAGE: "one_bot_api_load_main_page",

        /**
         * 获取HTTP服务器运行状态
         */
        ACTION_HTTP_SERVER_STATUS: 'one_bot_api_http_server_status',
    }
}