# 多巴胺格子 微信小程序

一个专为 ADHD 人群设计的 Bingo 任务管理小程序，帮助用户通过游戏化的方式完成日常任务。

## 功能特性

### 核心功能
- **Bingo 格子**: 5×5 格子布局，点击标记任务完成状态
- **进度追踪**: 实时显示今日完成进度，包含百分比和进度条
- **任务管理**: 添加、编辑、删除任务，支持自定义颜色分类
- **随机排序**: 一键随机打乱任务顺序，增加新鲜感
- **每日重置**: 自动在新的一天重置所有任务状态

### 数据管理
- **迁移码导出**: Base64 格式，适合设备间快速迁移
- **JSON 导出**: 结构化数据，方便备份和导入其他平台
- **数据导入**: 支持从迁移码或 JSON 恢复数据

### 统计功能
- **今日概览**: 总任务数、已完成、待完成、完成率
- **环形进度图**: 可视化展示完成进度
- **任务分类统计**: 按颜色分类统计任务分布
- **连续记录**: 记录连续完成所有任务的天数
- **每日鼓励**: 随机展示鼓励语句

## 项目结构

```
miniprogram/
├── app.js                 # 小程序入口
├── app.json               # 全局配置
├── app.wxss               # 全局样式
├── sitemap.json           # 站点地图
├── project.config.json    # 项目配置
├── pages/
│   ├── index/            # 首页 - Bingo 主界面
│   │   ├── index.wxml
│   │   ├── index.js
│   │   ├── index.wxss
│   │   └── index.json
│   ├── tasks/            # 任务管理页
│   │   ├── tasks.wxml
│   │   ├── tasks.js
│   │   ├── tasks.wxss
│   │   └── tasks.json
│   ├── export/           # 数据导出页
│   │   ├── export.wxml
│   │   ├── export.js
│   │   ├── export.wxss
│   │   └── export.json
│   └── stats/            # 统计页
│       ├── stats.wxml
│       ├── stats.js
│       ├── stats.wxss
│       └── stats.json
└── images/               # 图标资源
```

## 技术栈

- **框架**: 微信小程序原生框架
- **样式**: WXSS (类似 CSS)
- **存储**: 微信本地存储 (wx.setStorageSync)
- **数据格式**: JSON

## 快速开始

### 1. 注册微信小程序账号
- 访问 [微信公众平台](https://mp.weixin.qq.com/)
- 注册小程序账号并获取 AppID

### 2. 安装开发工具
- 下载 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 安装并登录

### 3. 导入项目
1. 打开微信开发者工具
2. 选择 "导入项目"
3. 选择 `miniprogram` 文件夹
4. 填入你的 AppID
5. 点击确定

### 4. 修改配置
编辑 `project.config.json`，将 `appid` 替换为你的小程序 AppID：

```json
{
  "appid": "wx YOUR_APP_ID_HERE"
}
```

### 5. 添加图标资源
由于小程序需要图标文件，请在 `miniprogram/images/` 目录下添加以下图标：
- `home.png` / `home-active.png` - 首页图标
- `tasks.png` / `tasks-active.png` - 任务图标
- `stats.png` / `stats-active.png` - 统计图标

或者修改 `app.json` 中的 tabBar 配置，移除图标引用：

```json
"tabBar": {
  "list": [
    {
      "pagePath": "pages/index/index",
      "text": "首页"
    },
    {
      "pagePath": "pages/tasks/tasks",
      "text": "任务"
    },
    {
      "pagePath": "pages/stats/stats",
      "text": "统计"
    }
  ]
}
```

### 6. 预览和发布
- 在开发者工具中点击 "预览" 可以在手机上测试
- 测试无误后点击 "上传" 提交审核
- 审核通过后即可发布

## 数据存储说明

小程序使用微信本地存储保存数据，包括：

- `adhd_tasks`: 任务列表
- `last_visit_date`: 上次访问日期（用于每日自动重置）
- `streak_data`: 连续完成记录

## 自定义配置

### 修改默认任务
编辑 `app.js` 中的 `defaultTasks` 数组：

```javascript
const defaultTasks = [
  { id: 1, name: '你的任务', color: '#E3F2FD', completed: false },
  // ...
]
```

### 修改颜色主题
编辑 `app.wxss` 中的 CSS 变量：

```css
page {
  --primary-color: #7C4DFF;    /* 主色调 */
  --color-blue: #E3F2FD;       /* 蓝色分类 */
  --color-purple: #F3E5F5;     /* 紫色调 */
  // ...
}
```


## 注意事项

1. **数据安全**: 小程序数据存储在本地，卸载小程序会丢失数据，建议定期导出备份
2. **任务数量**: 建议保持 25 个任务以获得最佳 Bingo 体验，最多支持 30 个
3. **每日重置**: 每天首次打开小程序会自动重置完成状态

## 许可证

MIT License
