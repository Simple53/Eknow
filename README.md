# Eknow 穿着手记

家庭电子衣橱。网页与原生 App 使用同一个靛蓝主题，五个无文字导航依次为衣橱、搭配、视频、日历、我的。Web 首次从日历打开；示例照片标注为图库，不会自动成为穿着记录。

## 本地运行

需要 Node 22.13+（此项目使用 22.19）。两个客户端各自锁定依赖，领域规则位于 `packages/domain`。从项目根运行：

| 操作 | 命令 |
| --- | --- |
| 安装并启动网页 | `npm --prefix apps/web ci`，然后 `npm --prefix apps/web run dev -- --host 127.0.0.1 --port 4173` |
| 生产包 / 本地预览 | `npm --prefix apps/web run build`，然后 `npm --prefix apps/web run preview -- --host 127.0.0.1` |
| 安装并运行原生 App | `npm --prefix apps/mobile ci`；进入 `apps/mobile` 后运行 `npx expo run:android` 或在 macOS 上运行 `npx expo run:ios`，需原生开发工具链 |
| 领域及服务适配器测试 | `node --test packages/domain/*.test.mjs services/api/*.test.mjs` |
| 网页用户流程测试 | `npm --prefix apps/web run test:flow`（组件 + 独立测试 IndexedDB，无个人数据） |
| 双平台 JS 资源包 | 进入 `apps/mobile` 后运行 `npx expo export --platform android --platform ios`；不是签名 APK/IPA |

网页使用 IndexedDB；生产构建的 Service Worker 会在首次联网成功缓存后支持断网重开。原生版使用 SQLite。成员资料、衣橱、记穿分开存储。本地家庭档案不是权限账户，两端不自动同步。

## 外部连接

复制 `apps/web/.env.example` 为同目录的 `.env.local`，设置后重启本机服务。不得使用 `VITE_` 或 `EXPO_PUBLIC_` 前缀保存密钥。

- AI：`MODEL_URL` 为完整的兼容 Chat Completions 的 HTTP 端点，`MODEL_NAME` 为模型 ID，`MODEL_KEY` 仅在服务端使用。不带密钥的本机模型也可接入。只发送当前成员的候选单品、场景和天气；返回的单品 ID 会再次校验。
- 市场：`EBAY_TOKEN` 使用获授权的 eBay Browse API 应用访问令牌；令牌到期需更新。应用内呈现来源与币种，不把美元价格当作人民币。无授权仍可带关键词跳转淘宝或京东。商品链接可手动保留来源，不抓取未知网站。
- 原生端：`EXPO_PUBLIC_API_BASE` 是设备可以访问的开发服务根地址，不包含 `/api`，也不包含密钥。仅在可信设备之间调试；生产发布前必须配置 HTTPS、鉴权与配额。本地 Vite 代理不是公共多租户网关，静态部署并不自带 API。

## 人体数据与视频

人体录入支持手填、品牌尺码参考、三视角校准。照片处理在设备端完成：检测纯色背景与完整轮廓、按已知身高归一、对照正背宽度、以侧视深度拟合椭圆截面。输出为**未做实人精度标定的粗估**，仅在逐项确认后写入，并标记来源；不是完整三维扫描或合身保证。宽松衣物、手臂遮挡和复杂背景会造成误差。参考值来自 [Nike Team 成人尺码表](https://niketeam.nike.com/niketeamsports/content/pdf/catalog_thumbs/NTS_Tee_Fleece.pdf)，不作为实测数据，也不外推给儿童。

视频页可切换二维模拟人物，采用衣物图层和体型比例粗略预览，也支持本机相机或视频播放，不声称已生成实时换装视频。平台验证及未交付项见 [实施检查点](docs/CHECKPOINT.md)，架构见 [开发计划](PLAN.md)。
