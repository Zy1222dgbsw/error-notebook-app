# 📓 智能错题本 — Smart Error Notebook

> 📸 拍照 → 🤖 AI大模型识别 → 📐 Markdown/公式渲染 → 🧠 AI解答 → 📚 学科分类  
> 用 Web 技术解决真实学习痛点 · SUM26001 编程课程期末项目

[![GitHub Pages](https://img.shields.io/badge/🌐-在线体验-blue)](https://Zy1222dgbsw.github.io/error-notebook-app/)
[![PWA](https://img.shields.io/badge/📱-PWA可安装-purple)](#pwa-手机安装)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 📋 项目成员

| 姓名 | 学号 | 贡献 |
|------|------|------|
| 卓妍 | 202320102053 | 独立完成全部工作：项目设计、前端开发（HTML/CSS/JS）、AI API 集成、公式渲染、PWA 配置、测试调试、文档撰写 |

## 📄 最终报告

- **报告源文件（Quarto）**：[report.qmd](./report.qmd)
- **报告 PDF**：[report.pdf](./report.pdf)

---

## 🎯 一句话说清楚

**用手机拍一张错题照片 → AI 大模型识别文字（支持公式）→ 实时预览 Markdown 渲染 → AI 给出详细解答 → 按学科自动归档。** 整个过程不到 30 秒，替代了传统的手抄错题本。

---

## ✨ 能做什么

| 功能 | 说明 |
|------|------|
| 📸 拍照 / 🖼️ 相册 | 上传图片，支持裁剪选取题目区域 |
| 🤖 AI 大模型识别 | 接入硅基流动 API，使用 Qwen3-VL 系列视觉大模型识别文字，支持中英文 + 数学公式 |
| 📐 Markdown + 公式渲染 | 识别结果支持 Markdown 格式和 LaTeX 数学公式实时渲染预览 |
| ✏️ 编辑确认 | 识别后可修改文字，支持编辑/预览模式切换，一键清空或确认 |
| 🧠 AI 解答 | 使用 DeepSeek-V3 大模型，给出 **正确答案 + 解题思路 + 知识点 + 易错提醒**，支持公式渲染 |
| 🏷️ 题型分类 | 选择题/填空/解答/证明……每种学科有专属题型 |
| 📚 学科管理 | 新建/编辑/删除学科，自定义名称+颜色+题型 |
| 🔎 搜索筛选 | 按学科筛选、关键词搜索 |
| 🖨️ 打印错题 | 勾选错题 → 一键生成 A4 打印稿，含 AI 解答和答题区，支持公式渲染（移动端友好：直接在当前页面显示打印预览） |
| 🔧 测试 API Key | 设置面板内可一键测试 6 种模型的可用性，结果实时显示 |
| 🔄 自动更新检测 | 内置版本号，每次发版自动提示用户已更新到新版本 |
| 🌗 智能深色模式 | 自动检测系统偏好，浅色/深色/跟随系统三种模式一键切换（无需点两次） |
| 🌙 深色模式 | 自动跟随系统，也可手动切换 |
| 📱 手机安装 | PWA 支持，可添加到手机桌面像原生 App（顶栏内置安装指南） |
| 💾 本地存储 | 数据在浏览器本地，无需服务器，隐私安全 |

---

## 🛠 用什么技术做的

| 层级 | 技术 | 为什么选它 |
|------|------|-----------|
| 结构 | HTML5 + CSS3 | 原生 Web，零依赖 |
| 逻辑 | JavaScript (ES6+) | 无框架，代码清晰 |
| AI 识别 | 硅基流动 API + Qwen3-VL-32B | 视觉大模型，识别准确率高，支持公式输出 |
| AI 解答 | 硅基流动 API + DeepSeek-V3 | 强推理能力，中文理解优秀 |
| 公式渲染 | KaTeX | 最快的数学公式渲染库 |
| Markdown | marked.js | 轻量级 Markdown 解析器 |
| 存储 | localStorage | 简单可靠，数据在用户设备 |
| 离线 | Service Worker | PWA 离线缓存 |
| 版本 | Git + GitHub | 完整开发故事 |

---

## 🚀 怎么用

### 在线使用（推荐）

👉 **[https://Zy1222dgbsw.github.io/error-notebook-app/](https://Zy1222dgbsw.github.io/error-notebook-app/)**

直接用浏览器打开就行，手机电脑都能用。

### 配置 AI 服务

1. 打开 App，点击右上角 ⚙️ 设置
2. 注册硅基流动账号：[cloud.siliconflow.cn](https://cloud.siliconflow.cn)
3. 获取 API Key，填入设置面板
4. 保存设置后即可使用 AI 识别和解答功能

### 本地运行

```bash
git clone https://github.com/Zy1222dgbsw/error-notebook-app.git
cd error-notebook-app
# 双击 index.html 即可
```

### 📱 手机安装（PWA）

- 顶栏点击 📱 图标可查看**详细图文安装指南**
- **Android**：Chrome 打开 → 自动弹「添加到主屏幕」
- **iPhone**：Safari 打开 → 底部分享 → 「添加到主屏幕」
- 安装后像独立 App，全屏无浏览器地址栏

---

## 📂 文件结构

```
error-notebook-app/
├── index.html          # 主页面（含 Markdown/KaTeX CDN 引入）
├── style.css           # 样式（含深色模式 + 渲染内容样式）
├── app.js              # 全部业务逻辑（AI识别 + 渲染 + AI解答）
├── manifest.json       # PWA 配置
├── sw.js               # Service Worker（离线缓存）
├── 项目报告.md          # 课程报告
└── README.md
```

---

## 🤖 AI 模型说明

### 识别模型（OCR 替代）

使用硅基流动 API 调用视觉大模型进行文字识别，支持多模型降级：

| 优先级 | 模型 | 说明 |
|--------|------|------|
| 主模型 | Qwen/Qwen3-VL-32B-Instruct | 320亿参数视觉大模型，识别精度最高 |
| 备选 1 | Qwen/Qwen3-VL-30B-A3B-Instruct | MoE 架构，平衡速度与精度 |
| 备选 2 | Qwen/Qwen3-VL-8B-Instruct | 轻量级，响应速度快 |
| 备选 3 | zai-org/GLM-4.5V | 智谱视觉模型，多模态能力强 |

### 解答模型

| 模型 | 说明 |
|------|------|
| deepseek-ai/DeepSeek-V3 | DeepSeek 最新大模型，推理能力强，中文理解优秀 |

### 公式与 Markdown 渲染

- **KaTeX**：支持行内公式 `$x^2$` 和独立公式 `$$\int_0^1 f(x)dx$$`
- **marked.js**：支持完整 Markdown 语法（标题、列表、表格、代码块等）
- 识别结果、错题列表、AI 解答、打印输出均支持渲染

---

## 📖 开发历程

### 踩过的坑

| 踩的坑 | 怎么解决的 | 学到了什么 |
|--------|-----------|-----------|
| jsdelivr CDN 国内被墙，页面白屏 | 换 npmmirror 国内镜像 + 多 CDN 降级 | CDN 选型要考虑地域 |
| `[hidden]` 被 `.modal-overlay { display:flex }` 覆盖 | 加 `[hidden] { display:none !important }` | CSS 权重优先级 |
| 正则 `\n` 被 Python 转成物理换行 | 修复转义，检查编码 | 批量替换要验证 |
| 旧版视觉模型被硅基流动下架 | 升级为 Qwen3-VL 系列最新模型 | API 模型版本管理 |
| 手机拍照图片 >5MB | Canvas 压缩为 JPEG | 客户端图片处理 |
| Service Worker 缓存旧页面，功能不更新 | 升级缓存版本 + activate 清旧缓存 | PWA 缓存策略管理 |
| LaTeX 公式在列表中不渲染 | 统一使用 renderMathInElement 遍历渲染 | KaTeX 渲染时机管理 |
| OCR 提示词中单引号字符串包含换行 | 改用 `\n` 转义 | JavaScript 字符串语法 |
| 测试 API Key 按钮无反应 | 内联 `display:none` 优先级高于 `hidden` 属性，改用 `style.display='block'` | CSS 优先级：内联 > 属性选择器 |
| 打印按钮被浏览器拦截 | 用隐藏 iframe 替代 `window.open` | 弹窗策略严格，iframe 更可靠 |
| iOS Safari 移动端 iframe print 失效 | 改用 Blob URL + 当前页面内显示打印内容 + 手动按钮调用 | 移动端对 iframe/print 限制更严格 |
| GitHub Pages + HTTP 缓存导致旧代码运行 | 资源 URL 加 `?v=N` 版本号 + localStorage 版本检测 | 缓存破除双重保险 |


## 📄 许可证

MIT License — 随意使用、修改、分享。
