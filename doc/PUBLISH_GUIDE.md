# 🚀 Chrome/Firefox 扩展商店发布指南

本文档详细说明如何将 single-spa Inspector Pro 扩展发布到 Chrome Web Store 和 Firefox Add-ons 商店。

---

## 📋 发布前准备清单

### 1. 更新项目配置

在发布之前，需要更新以下配置以区分你的 fork 版本：

#### 需要修改的文件：

| 文件 | 需要修改的内容 |
|------|----------------|
| `package.json` | `name`, `author`, `description`, `version` |
| `manifest.json` | `name`, `short_name`, `author`, `homepage_url`, `description`, `version`, `gecko.id` |
| `manifest.chrome.json` | `name`, `short_name`, `author`, `homepage_url`, `description`, `version` |
| `.web-extension-id` | 删除此文件（Firefox 会生成新的） |

#### 示例修改：

**package.json:**
```json
{
  "name": "your-single-spa-inspector",
  "version": "1.0.0",
  "description": "Your customized single-spa devtools extension",
  "author": "Your Name <your.email@example.com>"
}
```

**manifest.json / manifest.chrome.json:**
```json
{
  "name": "Your single-spa Inspector",
  "short_name": "Your SSPA Inspector",
  "version": "1.0.0",
  "author": "Your Name",
  "homepage_url": "https://github.com/yourusername/your-repo",
  "description": "Your customized devtools panel for single-spa applications"
}
```

**manifest.json (Firefox gecko 配置):**
```json
{
  "browser_specific_settings": {
    "gecko": {
      "id": "your-extension-id@yourdomain.com",
      "strict_min_version": "109.0"
    }
  }
}
```

### 2. 准备扩展图标

商店要求多种尺寸的图标。建议准备：

| 尺寸 | 用途 |
|------|------|
| 16x16 | 工具栏图标 |
| 48x48 | 扩展管理页面 |
| 96x96 | Firefox 商店展示 |
| 128x128 | Chrome 商店展示 |

更新 `manifest.json` 和 `manifest.chrome.json` 中的 icons 配置：

```json
{
  "icons": {
    "16": "./icons/icon-16.png",
    "48": "./icons/icon-48.png",
    "96": "./icons/icon-96.png",
    "128": "./icons/icon-128.png"
  }
}
```

### 3. 准备商店资源

#### Chrome Web Store 需要：
- **扩展图标**: 128x128 PNG
- **商店图标**: 128x128 PNG（在商店列表中显示）
- **宣传图片**（可选但推荐）:
  - 小型: 440x280 PNG/JPEG
  - 大型: 920x680 PNG/JPEG
  - Marquee: 1400x560 PNG/JPEG
- **截图**: 1-5 张，1280x800 或 640x400
- **详细描述**: 商店页面描述文字
- **隐私政策 URL**（如果需要敏感权限）

#### Firefox Add-ons 需要：
- **扩展图标**: 至少 64x64，推荐 128x128
- **截图**: 最多 5 张
- **详细描述**: 商店页面描述
- **隐私政策 URL**（如果需要敏感权限）

---

## 🔨 构建扩展

### 设置环境变量（Node.js 兼容性）

```bash
# Windows PowerShell
$env:NODE_OPTIONS="--openssl-legacy-provider"

# Windows CMD
set NODE_OPTIONS=--openssl-legacy-provider

# Linux/Mac
export NODE_OPTIONS=--openssl-legacy-provider
```

### 构建 Firefox 版本

```bash
npm run build:firefox
```

输出文件: `web-ext-artifacts/single-spa-inspector-pro-firefox-{version}.zip`

### 构建 Chrome 版本

```bash
npm run build:chrome
```

输出文件: `web-ext-artifacts/single-spa-inspector-pro-chrome-{version}.zip`

---

## 🦊 发布到 Firefox Add-ons

### 步骤 1: 注册开发者账号

1. 访问 [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
2. 使用 Mozilla 账号登录（没有则注册）
3. 同意开发者协议

### 步骤 2: 提交扩展

1. 点击 **"Submit a New Add-on"**
2. 选择 **"On this site"**（发布到商店）
3. 上传 `single-spa-inspector-pro-firefox-{version}.zip`

### 步骤 3: 填写扩展信息

**基本信息：**
- **Name**: Your single-spa Inspector
- **Add-on URL**: 自定义 URL 路径
- **Summary**: 简短描述（250 字符以内）
- **Description**: 详细描述，支持 Markdown

**分类和标签：**
- **Categories**: Developer Tools
- **Tags**: single-spa, devtools, microfrontend, debugging

**版本信息：**
- **Version Notes**: 版本更新说明
- **Compatibility**: Firefox 109.0+

### 步骤 4: 提交审核

1. 上传截图
2. 填写隐私政策（如果使用了敏感权限）
3. 提交审核

### 审核时间

- 通常 1-5 个工作日
- 复杂扩展可能需要更长时间

### 自动化部署（可选）

使用 `@wext/shipit` 自动部署：

1. 获取 API 凭证：
   - 访问 https://addons.mozilla.org/developers/addon/api/key/
   - 生成 JWT Issuer 和 Secret

2. 配置环境变量（创建 `.env` 文件）：
   ```env
   WEXT_SHIPIT_FIREFOX_JWT_ISSUER=your_jwt_issuer
   WEXT_SHIPIT_FIREFOX_JWT_SECRET=your_jwt_secret
   ```

3. 运行部署：
   ```bash
   npm run deploy:firefox
   ```

---

## 🌐 发布到 Chrome Web Store

### 步骤 1: 注册开发者账号

1. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. 使用 Google 账号登录
3. **支付一次性注册费 $5 USD**
4. 同意开发者协议

### 步骤 2: 创建新项目

1. 点击 **"New Item"**
2. 上传 `single-spa-inspector-pro-chrome-{version}.zip`

### 步骤 3: 填写商店列表

**基本信息：**
- **Language**: 选择主要语言
- **Product name**: Your single-spa Inspector
- **Short description**: 简短描述（132 字符以内）
- **Full description**: 详细描述

**图形资源：**
- 上传图标、截图、宣传图片

**分类：**
- **Category**: Developer Tools
- **Language**: 选择支持的语言

### 步骤 4: 隐私设置

**权限说明：**
需要解释为什么需要以下权限：

| 权限 | 说明理由 |
|------|----------|
| `storage` | 保存用户的 import map override 配置 |
| `scripting` | 在目标页面执行脚本以获取 single-spa 应用状态 |
| `browsingData` | 清除缓存功能需要此权限 |
| `<all_urls>` | 需要在所有页面上运行以检测 single-spa 应用 |

**隐私政策：**
- 如果收集用户数据，需要提供隐私政策 URL
- 此扩展不收集用户数据，但仍建议准备一个简单的隐私政策

### 步骤 5: 提交审核

1. 确保所有必填字段已填写
2. 点击 **"Submit for Review"**

### 审核时间

- 通常 1-3 个工作日
- 首次提交可能需要更长时间
- 如果被拒绝，会收到邮件说明原因

### 自动化部署（可选）

使用 `@wext/shipit` 自动部署：

1. 获取 API 凭证：
   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 创建项目并启用 Chrome Web Store API
   - 创建 OAuth 2.0 凭证
   - 获取 Client ID、Client Secret 和 Refresh Token

2. 配置环境变量：
   ```env
   WEXT_SHIPIT_CHROME_EXTENSION_ID=your_extension_id
   WEXT_SHIPIT_CHROME_CLIENT_ID=your_client_id
   WEXT_SHIPIT_CHROME_CLIENT_SECRET=your_client_secret
   WEXT_SHIPIT_CHROME_REFRESH_TOKEN=your_refresh_token
   ```

3. 运行部署：
   ```bash
   npm run deploy:chrome
   ```

---

## 📝 版本更新流程

### 1. 更新版本号

在以下文件中同步更新版本号：
- `package.json` 中的 `version`
- `manifest.json` 中的 `version`
- `manifest.chrome.json` 中的 `version`

```bash
# 示例：从 3.1.1 更新到 3.2.0
```

### 2. 更新 Changelog

在 `README.md` 的 Changelog 部分添加新版本说明。

### 3. 构建并提交

```bash
# 构建两个平台
npm run build:firefox
npm run build:chrome

# 或使用自动部署
npm run deploy
```

### 4. 创建 Git Tag 和 Release

```bash
git add .
git commit -m "Release v3.2.0"
git tag v3.2.0
git push origin main --tags
```

在 GitHub 上创建 Release，附上构建好的 zip 文件。

---

## ⚠️ 常见审核问题及解决方案

### Chrome Web Store

| 问题 | 解决方案 |
|------|----------|
| 权限过多 | 详细说明每个权限的必要性 |
| `<all_urls>` 权限 | 解释为什么需要在所有页面上运行（检测 single-spa） |
| 缺少隐私政策 | 添加简单的隐私政策页面 |
| 描述不够详细 | 完善商店描述，说明功能和使用方法 |

### Firefox Add-ons

| 问题 | 解决方案 |
|------|----------|
| 源代码审核 | 如果被要求，需要提供完整源代码 |
| Manifest V3 兼容性 | 确保使用正确的 Firefox MV3 语法 |
| 混淆代码 | 避免代码混淆，或提供源码映射 |

---

## 🔗 相关链接

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
- [Chrome Extension Developer Documentation](https://developer.chrome.com/docs/extensions/)
- [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [web-ext Documentation](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)
- [@wext/shipit Documentation](https://github.com/nickytonline/wext-shipit)

---

## 📄 隐私政策模板

如果需要隐私政策，可以使用以下模板：

```markdown
# Privacy Policy for [Your Extension Name]

## Data Collection
This extension does not collect, store, or transmit any personal data.

## Local Storage
The extension stores user preferences (such as import map override URLs) 
locally in the browser using the browser's storage API. This data never 
leaves your device.

## Permissions
- **storage**: Used to save your preferences locally
- **scripting**: Used to detect single-spa applications on web pages
- **browsingData**: Used for the "Clear Cache" feature
- **<all_urls>**: Required to detect single-spa applications on any website

## Third-party Services
This extension does not use any third-party analytics or tracking services.

## Contact
If you have questions about this privacy policy, please contact:
[Your Email]

Last updated: [Date]
```

---

## ✅ 发布检查清单

### 发布前
- [ ] 更新 `package.json` 中的版本号
- [ ] 更新 `manifest.json` 中的版本号
- [ ] 更新 `manifest.chrome.json` 中的版本号
- [ ] 更新 README 中的 Changelog
- [ ] 运行 `npm run lint` 检查是否有错误
- [ ] 在本地测试扩展功能
- [ ] 准备商店截图和描述

### 构建
- [ ] 运行 `npm run build:firefox`
- [ ] 运行 `npm run build:chrome`
- [ ] 验证 zip 文件大小合理

### 提交
- [ ] 上传到 Firefox Add-ons
- [ ] 上传到 Chrome Web Store
- [ ] 填写所有必填信息
- [ ] 提交审核

### 发布后
- [ ] 创建 Git tag
- [ ] 创建 GitHub Release
- [ ] 监控审核状态
- [ ] 回复审核问题（如有）
