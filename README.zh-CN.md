<h1 align="center">image2prompt</h1>

<div align="center">

[English](README.md)
[中文](README.zh-CN.md)
[仓库地址](https://github.com/doducan71037-hue/image2prompt)
[Safari 说明](README.safari.md)

</div>

## 🌟 项目简介

**image2prompt** 是基于 [`pingan8787/image2prompt`](https://github.com/pingan8787/image2prompt) 的维护版 fork。
这个版本重点做了提示词生成流程、结果面板、更多提示词控制项、本地图片处理，以及 Safari bundle 支持。

使用方式是：在网页图片上点击右键，选择 **Generate prompt with image2prompt**。插件会分析图片、生成提示词，并支持复制或直接跳转到你设置的 AI 平台。

![项目简介](https://github.com/user-attachments/assets/905995c7-bdb6-4c8f-b70d-44b24684c99d)

## 🔧 本 Fork 的调整

- 这是原项目的维护版 fork
- 重做了 prompt workflow 和结果面板
- 增加了提示词丰富度控制和 JSON 结构化结果视图
- 增加了设置页本地图片生成流程
- 增加了 Safari-ready bundle 和对应文档

## ⚙️ 功能特性

| 功能模块              | 说明                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------- |
| 🧩 **模型选择**       | 可切换 **Gemini 2.5 Flash** 与 **智谱 GLM-4V**，每个模型单独保存 API Key 和模型名称           |
| 🌏 **多语言生成**     | 可选择 20 个国家语言生成提示词                                                                |
| 🖼️ **图片尺寸过滤**   | 仅大于设定尺寸（默认 256×256）的图片显示按钮                                                  |
| 📒 **生成历史**       | 你可以查看所有生成的历史                                                                      |
| 🎨 **自定义平台跳转** | 可配置默认跳转平台：OpenAI / Gemini / StableDiffusion / 即梦 / 可灵 / 豆包 / 海螺 AI / 自定义 |
| 💬 **提示词模板**     | 支持编辑提示词生成模板，打造你的专属风格                                                      |
| ✍️ **自定义说明输入** | 可选开启生成前的对话框，在生成提示词前补充诸如“换成霓虹城市背景”等说明                        |
| 🧭 **国际化界面**     | 支持中英文切换                                                                                |
| 🪶 **轻量级 UI**      | 借鉴 shadcnUI 风格，自绘组件，不依赖第三方库                                                  |
| 🧮 **画面比例预设**   | 提供常见比例并支持自定义，让生成的提示词与目标画面更契合                                      |
| 🚫 **域名过滤**       | 在指定域名的页面隐藏捕捉按钮，保持浏览体验纯净                                                |
| 🖼️ **本地图片生成**   | 在设置页直接上传本地图片，即可生成提示词并复制                                                |
| 🧾 **JSON 结果视图**  | 结果面板支持中文、英文和结构化 JSON 三种查看方式                                              |
| 🧭 **Safari Bundle**  | 仓库包含顶层 `safari-web-extension/` bundle 以及重新生成脚本                                  |

## 🌈 安装方式

1. 克隆或下载本仓库

```bash
git clone https://github.com/doducan71037-hue/image2prompt.git
```

2. 安装 Chrome / Edge 版本

下载完项目后，在 Chrome/Edge 浏览器拓展程序页 `chrome://extensions/` / `edge://extensions/` 中开启“开发者模式”，然后将整个项目拖拽进去即可，也可以点击左上角“**加载未打包的拓展程序**”，选择项目文件夹。

![安装](https://github.com/user-attachments/assets/eb006388-280b-4838-b7c3-7baf7fa37745)

3. Safari（macOS）

仓库中已经包含生成好的 Safari-ready bundle，路径为 `safari-web-extension/`。

对于想在本机直接使用 Safari 版本的 Mac 用户：

- 通过 macOS Safari 的“临时安装 web extension 文件夹”流程安装
- 选择仓库中的 `safari-web-extension/` 目录
- 你可能需要先开启 Safari 的开发者相关选项，例如 Develop 菜单和允许未签名扩展

对于要继续打包或分发 Safari 版本的开发者：

- 可运行 `./scripts/prepare-safari-bundle.sh` 重新生成 `safari-web-extension/`
- 需要时再用 Xcode 的转换工具继续处理
- 具体说明见 [README.safari.md](README.safari.md)

## 🍭 使用

安装完插件，首先进入配置页，选择要使用的大模型并设置对应的 API Key：

- Gemini：[创建 Gemini API Key](https://aistudio.google.com/app/api-keys)
- 智谱 AI：[模型与控制台入口](https://docs.bigmodel.cn/cn/guide/start/model-overview)

![设置页](https://github.com/user-attachments/assets/1fa8451f-e06b-4c75-b99c-695f4aafe7fc)

然后，在网页中的图片上点击右键，选择 **Generate prompt with image2prompt** 即可开始生成提示词。

想在生成前补充几句说明（例如「把背景改成霓虹城市」）？在 **设置 → 提示词生成** 中开启 **自定义指令输入**，生成前会弹出输入框，将你的补充说明与系统提示词一起发送给模型。

![项目简介](https://github.com/user-attachments/assets/905995c7-bdb6-4c8f-b70d-44b24684c99d)

## 🧭 上游项目

原项目地址：[`pingan8787/image2prompt`](https://github.com/pingan8787/image2prompt)

## 📝 仓库说明

- 当前仓库是维护版 fork，不是原项目首发仓库。
- 上游仓库目前未看到显式 `LICENSE` 文件，若要做再分发或商用，请先确认授权与许可。
