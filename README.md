# 玖拾课表

[![Github Pages](https://img.shields.io/badge/Github-Pages-blue?logo=github)](https://iamshaoning.github.io/kechengguanlixitong)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-blue?logo=cloudflare)](https://kechengguanlixitong.pages.dev)

一个由 AI 辅助开发的排课系统，专为课外辅导老师设计。系统支持学生管理、课程安排、课时费统计等功能，数据可同步到云端，支持多设备访问。

> [!IMPORTANT]
> 通过 Supabase 免费功能管理数据，为防止滥用未开放注册

> [!TIP]
> 可联系我注册账号使用，或自行二次开发
>
> 也可先进行试用，使用账号 `test` 密码为空的方式登录

## 在线访问

- **Cloudflare Pages**: <https://kechengguanlixitong.pages.dev>
- **GitHub Pages**: <https://iamshaoning.github.io/kechengguanlixitong>

## 预览截图

### 日历排课

![日历排课](https://github.com/iamshaoning/kechengguanlixitong/raw/master/public/screenshots/预览1.png)

### 学生管理

![学生管理](https://github.com/iamshaoning/kechengguanlixitong/raw/master/public/screenshots/预览2.png)

### 课时费统计

![课时费统计](https://github.com/iamshaoning/kechengguanlixitong/raw/master/public/screenshots/预览3.png)

## 功能特性

### 日历排课

- **直观月历视图**：完整的月历展示，在日历上直接查看每日课程安排
- **快捷添加课程**：点击任意日期即可快速添加新课程，智能检测时间冲突
- **课程快速处理**：点击已有课程或者日期可快速进行编辑复制粘贴删除，智能检测时间冲突和重复课程
- **快速月份导航**：支持左右箭头快速切换月份，或使用下拉菜单快速跳转到指定年月
- **节日调休显示**：集成中国农历节日和相关调休信息

### 学生管理

- **学生信息管理**：添加、编辑、删除学生信息
- **按姓名搜索**：支持通过姓名快速搜索学生
- **机构管理**：自定义机构名称，支持增删改查，可为每个机构分配独特颜色
- **年级管理**：自定义年级名称，支持增删改查，可为每个年级分配独特颜色
- **预设课时费**：可预设一对一课型课时费，排课时自动加载或自定义多人课程费用

### 课程管理

- **一对一课程**：支持一名学生单独上课，课时费根据预设和排课时长自动计算
- **多人课课程**：支持多名学生同时上课，费用可自定义
- **课时时长设置**：可自定义课程时长
- **时间冲突检测**：添加课程时自动检测时间冲突，避免重复安排
- **课程备注信息**：可为每节课程添加文字备注

### 课时费统计

- **年月筛选**：按年份和月份筛选统计数据
- **机构筛选**：可查看全部机构或指定机构的统计数据
- **统计卡片**：总课节数、总课时费、学生人数一目了然
- **机构数据图表**：饼图展示各机构课量分布占比
- **机构详细数据**：表格展示各机构课节数、课时费、学生人数及占比
- **机构课型数据**：分别统计一对一和多人课的年级和人数分布情况
- **学生课量数据**：按学生统计上课节数和课时费
- **数据导出**：将统计数据导出为 HTML 文件，方便存档和分享

### 数据同步

- **云端存储**：基于 Supabase 实现数据云端存储
- **跨设备同步**：登录账号后数据自动同步，支持多设备访问
- **同步状态显示**：实时显示数据同步状态（已同步/同步中/未登录等）
- **数据快照**：支持创建登录快照、自动快照（每15分钟）和手动快照，记录不同时刻的数据状态
- **快照恢复**：可随时从快照恢复数据，恢复后自动同步到服务器

### 用户体验

- **主题切换**：支持浅色/深色/自动三种主题模式，主题切换带有流畅动画效果
- **流畅动画**：页面切换、模态框、下拉菜单等交互采用流畅动画效果
- **操作反馈**：所有操作都有友好的通知提示

- **开源字体**：使用霞鹜文楷（LXGW WenKai）开源中文字体

## 使用指南

### 登录与注册

1. 打开系统后进入登录页面
2. 可使用已注册账号登录，或点击"注册"进行注册
3. 也可使用试用账号：`test`（密码为空）
4. 登录后数据会自动从云端同步

### 添加基础数据

1. 进入"学生管理"页面
2. 先通过"机构管理"添加机构（如"本校"、"分校"等）
3. 再通过"年级管理"添加年级（如"一年级"、"初二"等）

### 添加学生

1. 进入"学生管理"页面
2. 点击"添加学生"按钮
3. 填写姓名、选择机构和年级
4. 设置该学生的一对一课时预设费
5. 点击保存

### 安排课程

1. 在日历视图中点击想要安排课程的日期
2. 选择课型（一对一或多人课）
3. 选择上课学生
4. 设置开始时间和时长
5. 多人课需自定义费用
6. 可添加备注信息
7. 点击保存

### 查看统计数据

1. 进入"费用统计"页面
2. 选择要查看的年份和月份
3. 如需按机构筛选，选择对应机构
4. 查看各项统计数据
5. 点击"导出数据"可导出为 HTML 文件

### 使用快照功能

1. 点击右上角设置按钮
2. 选择"快照"进入快照管理
3. 可查看登录快照、自动快照和手动快照
4. 点击"恢复"可恢复到指定快照的数据

### 切换主题

1. 点击右上角设置按钮
2. 点击主题切换滑块
3. 可选择浅色模式（太阳图标）、自动模式（月亮太阳图标）或深色模式（月亮图标）

## 数据存储

- 用户账号和认证信息存储在 Supabase Auth
- 业务数据（学生、课程、机构等）存储在 Supabase Database
- 本地缓存使用 LocalStorage，包含数据快照
- 登录后自动同步数据到云端
- 支持多设备同步访问

## 注意事项

1. **网络要求**：登录、数据同步等功能需要网络连接
2. **试用模式**：试用模式下数据不会被保存，刷新或关闭后数据会丢失
3. **浏览器支持**：建议使用现代浏览器（如 Chrome、Firefox、Edge、Safari 等）获得最佳体验
4. **数据安全**：请妥善保管账号密码，不要在公共电脑上保存登录状态
5. 意外防范：尽量不要在多端登录同一账号并同时进行数据编辑，以防并发错误数据，意外错误覆盖正确数据

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 项目结构

```
kechengguanlixitong/
├── public/
│   ├── screenshots/     # 预览截图
│   ├── favicon.ico      # 网站图标
│   └── logo.png         # 系统 Logo
├── src/
│   ├── components/      # 公共组件
│   ├── services/       # 服务模块
│   │   ├── authService.js          # 认证服务
│   │   ├── calendarRenderService.js # 日历渲染
│   │   ├── conflictCheckService.js  # 冲突检测
│   │   ├── courseService.js        # 课程服务
│   │   ├── dataLoadService.js      # 数据加载
│   │   ├── dataService.js          # 数据服务
│   │   ├── exportService.js        # 导出服务
│   │   ├── loadSystemService.js    # 系统加载
│   │   ├── modalService.js         # 模态框
│   │   ├── notificationService.js  # 通知提示
│   │   ├── serverStatusService.js  # 服务器状态
│   │   ├── stateService.js         # 状态管理
│   │   ├── statisticsRenderService.js # 统计渲染
│   │   ├── studentService.js       # 学生服务
│   │   ├── themeService.js         # 主题服务
│   │   └── ...
│   ├── utils/          # 工具函数
│   │   ├── clipboardUtils.js      # 复制粘贴
│   │   ├── colorUtils.js          # 颜色工具
│   │   ├── coreUtils.js           # 核心工具
│   │   ├── dateUtils.js          # 日期工具
│   │   ├── snapshotUtils.js       # 快照管理
│   │   └── stateUtils.js         # 状态工具
│   └── style.css       # 全局样式
├── index.html          # 主页面
├── package.json        # 项目配置
└── vite.config.js      # Vite 配置
```

## 联系方式

如有问题或建议，欢迎联系

## 许可证

本项目可自由学习和使用，如需二次开发请注明出处。