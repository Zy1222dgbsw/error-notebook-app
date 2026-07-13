# 📓 智能错题本 — Smart Error Notebook

> 📸 拍照 → 🔍 OCR 识别 → 🤖 AI 解答 → 📚 学科分类  
> 用 Web 技术解决真实学习痛点 · 编程课程项目

[![GitHub Pages](https://img.shields.io/badge/🌐-在线体验-blue)](https://Zy1222dgbsw.github.io/error-notebook-app/)
[![PWA](https://img.shields.io/badge/📱-PWA可安装-purple)](#pwa-手机安装)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 🎯 一句话说清楚

**用手机拍一张错题照片 → App 自动识别文字 → AI 给出详细解答 → 按学科自动归档。** 整个过程不到 30 秒，替代了传统的手抄错题本。

---

## ✨ 能做什么

| 功能 | 说明 |
|------|------|
| 📸 拍照 / 🖼️ 相册 | 独立双按钮：直接拍照 或 从本地相册选取 |
| 🔍 OCR 识别 | Tesseract.js 浏览器端识别，支持中英文混合 |
| ✏️ 编辑确认 | 识别后可修改文字，一键清空或确认 |
| 🤖 AI 解答 | 自动给出 **正确答案 + 解题思路 + 知识点 + 易错提醒** |
| 🏷️ 题型分类 | 选择题/填空/解答/证明……每种学科有专属题型 |
| 📚 学科管理 | 自定义学科 + **自定义题型**，按学科整理错题 |
| 🔎 搜索筛选 | 按学科筛选、关键词搜索 |
| 🖨️ 打印错题 | 勾选错题 → 一键生成 A4 打印稿，含 AI 解答和答题区 |
| 🌙 深色模式 | 自动跟随系统，也可手动切换 |
| 📱 手机安装 | PWA 支持，可添加到手机桌面像原生 App |
| 💾 本地存储 | 数据在浏览器本地，无需服务器，隐私安全 |

---

## 🛠 用什么技术做的

| 层级 | 技术 | 为什么选它 |
|------|------|-----------|
| 结构 | HTML5 + CSS3 | 原生 Web，零依赖 |
| 逻辑 | JavaScript (ES6+) | 无框架，代码清晰 |
| OCR | Tesseract.js v5 | 浏览器端运行，无需后端 |
| AI | Pollinations AI / DeepSeek API | 免费优先，可选付费增强 |
| 存储 | localStorage | 简单可靠，数据在用户设备 |
| 离线 | Service Worker | PWA 离线缓存 |
| 版本 | Git + GitHub | 12 次提交，完整开发故事 |

---

## 🚀 怎么用

### 在线使用（推荐）

👉 **[https://Zy1222dgbsw.github.io/error-notebook-app/](https://Zy1222dgbsw.github.io/error-notebook-app/)**

直接用浏览器打开就行，手机电脑都能用。

### 本地运行

```bash
git clone https://github.com/Zy1222dgbsw/error-notebook-app.git
cd error-notebook-app
# 双击 index.html 即可
```

### 📱 手机安装（PWA）

- **Android**：Chrome 打开 → 自动弹「添加到主屏幕」
- **iPhone**：Safari 打开 → 底部分享 → 「添加到主屏幕」
- 安装后像独立 App，全屏无浏览器地址栏

---

## 📂 文件结构

```
error-notebook-app/
├── index.html          # 主页面
├── style.css           # 样式（含深色模式）
├── app.js              # 全部业务逻辑
├── manifest.json       # PWA 配置
├── sw.js               # Service Worker（离线缓存）
├── 项目报告.md          # 课程报告
└── README.md
```

---

## 📖 开发历程（19 次提交）

```
a5db2d7 🐛✨ fix+feat: 修复 SW 缓存 + 错题打印功能
c918283 🐛 fix: 错题本/学科管理标签页空白问题
c4bfbcb 🐛 fix: 双按钮模式切换
dd8db94 📝 docs: 更新 README
56df331 ✨ feat: 自定义题型 + 双通道上传
9c8c507 ✨ feat: 题型分类 + OCR结果编辑确认
07ae15e 📝 docs: 重写 README
4f4428c 📱 feat: PWA 支持 — 可安装到手机桌面
4cf0f6b 🌙 feat: 深色模式支持
b013ac8 🐛 fix: [hidden] 属性被 CSS 覆盖
2f686a3 🐛 fix: 全面重写 - 修复所有交互问题
06db1ae 🐛 fix: 修复正则表达式语法错误
4b7e537 🐛 fix: 修复 CDN 加载失败
8356589 📄 docs: 完成课程项目报告
d5fe989 📱 style: 移动端体验优化
85eb9dd 🔧 chore: 添加 .gitignore
d72acbf 🔍 perf: OCR识别引擎优化
192d708 📝 添加项目 README
90fe23e 🔧 初始化项目结构
```

### 踩过的坑

| 踩的坑 | 怎么解决的 | 学到了什么 |
|--------|-----------|-----------|
| jsdelivr CDN 国内被墙，页面白屏 | 换 npmmirror 国内镜像 + 多 CDN 降级 | CDN 选型要考虑地域 |
| `[hidden]` 被 `.modal-overlay { display:flex }` 覆盖 | 加 `[hidden] { display:none !important }` | CSS 权重优先级 |
| 正则 `\n` 被 Python 转成物理换行 | 修复转义，检查编码 | 批量替换要验证 |
| Tesseract 首次加载 30MB 太慢 | 复用 Worker 实例，第二次秒开 | Web Worker 生命周期 |
| 手机拍照图片 >5MB | Canvas 压缩为 JPEG | 客户端图片处理 |
| Service Worker 缓存旧页面，功能不更新 | 升级缓存版本 + activate 清旧缓存 | PWA 缓存策略管理 |
| 标签页切换后内容空白 | CSS `!important` 覆盖了 tab-panel 显示 | CSS 权重与 HTML 属性冲突 |

---

## 📊 课程评估标准对照

- ✅ **解决一个问题** — 手动抄错题 → 拍照自动录入，效率提升 10 倍+
- ✅ **发现一些有趣的东西** — 浏览器端 OCR、免费 AI、PWA 安装、深色模式适配
- ✅ **讲一个故事** — 12 次提交完整记录从想法到落地的全过程
- ✅ **展示努力和协作** — 详细文档、Git 历史、问题记录、技术选型说明

---

## 📄 许可证

MIT License — 随意使用、修改、分享。
