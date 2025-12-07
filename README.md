# 🚀 Cloudflare Pages 优选 IP 工具 (KV 动态管理)

本项目基于 **Cloudflare Pages Functions** 和 **Workers KV** 实现，提供了一个优选 IP 获取前端页面和一个密码保护的域名列表管理后台。域名列表通过 KV 持久化存储，便于动态更新，无需重新部署代码。

---

## ⚙️ 核心技术栈

* **托管平台:** Cloudflare Pages
* **后端逻辑:** Pages Functions (基于 Workers)
* **数据存储:** Workers KV (命名空间: `DOMAINS_KV`)
* **部署方式:** GitHub Actions (Pages CI/CD)

---

## 📂 项目结构

| 文件/目录 | 作用描述 |
| :--- | :--- |
| `/public/index.html` | 优选 IP 的**前端页面**。 |
| `/functions/[[path]].js` | Pages Function，处理 `/` 路由：负责读取 KV 注入域名到前端，并处理 POST 请求（IP 格式化）。 |
| `/functions/admin.js` | Pages Function，处理 `/admin` 路由：**域名管理后台**，包含密码验证和 KV 读写逻辑。 |

---

## 🔒 部署先决条件 (Cloudflare 配置)

在开始部署之前，您需要在 Cloudflare 面板中完成以下两项关键配置：

### 1. 创建 KV 存储命名空间

该命名空间用于持久化存储域名列表。

1.  登录 Cloudflare 面板。
2.  导航至 **Workers & Pages** -> **KV** 选项卡。
3.  点击 **创建命名空间**，名称必须为：**`DOMAINS_KV`**。

### 2. 设置管理密码环境变量

管理后台 `/admin` 受到密码保护。此密码必须设置为环境变量。

1.  在 Pages 部署后（或在项目设置中），进入 **设置** -> **环境变量**。
2.  在 **生产环境 (Production)** 下添加以下变量：
    * **变量名称:** `ADMIN_PASSWORD`
    * **值:** **设置一个复杂且安全的管理密码。**

---

## ☁️ Pages 部署步骤 (GitHub CI/CD)

1.  **提交代码:** 将本项目所有文件推送到您的 GitHub 仓库：**`best-ip`**。

2.  **创建 Pages 项目:**
    * 登录 Cloudflare 面板，进入 **Workers & Pages** -> **Pages**。
    * 点击 **创建项目** -> **连接到 Git**，选择您的 `best-ip` 仓库。

3.  **配置构建设置:**
    * **项目名称:** (自定义，例如 `best-ip-optimizer`)
    * **框架预设 (Framework preset):** **None**
    * **构建命令 (Build command):** `echo "No build step required"`
    * **构建输出目录 (Build output directory):** **`public`**

4.  **绑定 KV 命名空间 (关键):**
    * 在部署页面的 **KV 命名空间绑定 (KV namespace bindings)** 部分：
    * 点击 **添加新的绑定**：
        * **变量名称:** **`DOMAINS_KV`**
        * **KV 命名空间:** 从下拉列表中选择您创建的 **`DOMAINS_KV`**。

5.  **部署:** 点击 **保存并部署**。

---

## ✅ 使用与管理

部署成功后，您将获得 Pages 提供的域名，例如 `your-project.pages.dev`。

### 1. 域名管理

* **管理地址:** `[Pages 域名]/admin`
* **操作:** 访问该地址，输入您在环境变量中设置的密码，即可动态修改并保存域名
