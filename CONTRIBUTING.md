# 贡献指南 — @dsh-ssh/dsh-ssh

DeepSeek Harness (DSH) 的 SSH 远程工作区插件：把另一台机器的目录当作工作区，其中的 bash / 文件读写 / glob / grep 全部在远端机器（SSH exec + SFTP 通道，远端零安装）执行。

> **给用户（产品页）**：功能、安装与快速上手见 [README.md](./README.md)（英文镜像 [README.en.md](./README.en.md)）。本文件为面向开发者的文档（安装、测试体系、脚本清单、live 配置与目录结构）。

> **当前能力**：SSH 远程工作区（7 工具远端路由、后台任务远端化、TOFU 信任、SFTP 降级、能力面注入等）已落地，详见下方「能力面」「已知限制」与脚本清单。
> 设计依据见仓库 [.agents/notes/requirements-and-design.md](./.agents/notes/requirements-and-design.md)；SSH 远程语义对标业界见 [.agents/notes/research/2026-08-20-remote-capability-competitors.md](./.agents/notes/research/2026-08-20-remote-capability-competitors.md)。

---

## 功能清单

> 用户侧功能见 [README.md](./README.md)（英文镜像 [README.en.md](./README.en.md)）。

开发者关注的实现要点见下方「能力面」「已知限制」及「测试」/「脚本清单」章节（工具路由、SFTP 降级、能力面注入、bash 卡片、健壮性等）。

## 能力面 / Capability Surface

远程工作区会话的工作区目录在远程主机上，但**并非所有能力都跟随到远端**。下面是一张「行为矩阵」说明每个能力到底在哪台机器上执行（面向开发者的实现视角）。判断依据是会话工作目录（cwd）：cwd 为本地占位目录（~/.dsh/remote/<hostId>/...）即视为远端工作区。

| 能力 | 实际执行位置 | 数据/资源来源 | 说明 |
|---|---|---|---|
| bash / read / write / edit / read_image / glob / grep | **远程主机（SSH）** | 远端文件系统，相对路径基于远端工作目录 | 这 7 个同名工具按会话 cwd 路由：远端占位路径走 SSH exec+SFTP，本地路径照常委托宿主官方实现 |
| 本机绝对路径下的 read / write / edit | **本机（委托宿主官方实现）** | 本机文件 | 路径不在占位目录 → 按本地路径处理 |
| skill 目录发现 / SKILL.md / skill 工具 | **本机** | 本机技能目录（~/.agents/skills、项目根） | skill 工具读取 SKILL.md 注入上下文 |
| skill scripts/ 被 bash 执行 | **尝试远端 → 通常失败** | 本地脚本路径在远端不存在 | 远端只有 7 个工具通道，本地技能脚本不会自动同步到远端 |
| skill scripts/ 被 read 读 | **本机** | 本机文件内容 | 能读到本地内容，但脚本不在远端 |
| MCP 工具（mcp__*） | **本机 / MCP server 自身环境** | MCP server 自己的文件系统与进程环境 | stdio server 在本机 spawn；HTTP server 在 server 所在处执行；与远端工作区无关 |
| todo / ask_user / web_search / subagent / goal / jobs | **本机** | 各自的本机服务 | 与 cwd 无关，远端/本地行为一致 |

### 一句话结论

> 远端会话里**只有那 7 个路由工具落在远端**；skill 的脚本资源、MCP 工具以及其它宿主工具**全部在本机执行**，与远端工作区无关。技能脚本若需在远端运行，请用绝对路径上传（git/sftp）后执行；访问本机文件请使用本机绝对路径。

### 设计语义（对标业界）

- **声明式能力面 —— 对标 VS Code extensionKind**：VS Code 用 ui / workspace / uiWorkspace 声明扩展在哪一侧（本地 UI 还是远端 workspace）执行；本插件的「行为矩阵 + 远端会话能力面提示」即同一思路 —— 明确告诉模型与用户每个能力在哪侧执行，避免「远端会话操作当前工作区」的错位误导。
- **skill 本地执行 —— 对标 Claude Code Agent Skills**：Claude Code 的 skills 本质是「注入上下文的 Markdown 指令 + 资源」，脚本由 agent 通过自己的工具读取/执行，执行落在运行它的那台机器，**不跟随远端工作区**。这正与 dsh-ssh 现状一致：skill 脚本是注入上下文、在本机读/执行，远端会话只暴露 7 工具集。
- **MCP 保持本机 —— 业界常态**：业界没有「MCP server 自动跟随工作区到远端」的零安装先例；远程 MCP 的标准做法是本地客户端连远端 HTTP server，或用 SSH 包装为 MCP。故 dsh-ssh 的 MCP 在本机（或 server 自身环境）执行并文档化声明。

> 实现：上述能力面声明与工具路由分别落在 packages/dsh-ssh/index.js（agent/created 钩子，向远端会话 agent 注入能力面声明并遮蔽路由工具，见 installToolRoutingHook / injectCapabilitySurface）与 packages/dsh-ssh/client.js（远程工作区弹窗目录浏览阶段的一行小字提示 + TOFU 弹窗 + bash 卡片 toolview）。**本地 cwd 会话零影响**（非远端 cwd 直接短路）。

---

## 安装

插件本体经 DSH 官方 bundle 通道安装。两种来源：

### 1. 本地 link（开发 / 本仓库）

用隔离测试 profile，不要污染 web profile：

```bash
dsh plugin --profile dsh-ssh-dev add <本仓库 packages/dsh-ssh 的本地路径>
dsh --profile dsh-ssh-dev --dump-config   # 校验 bundle patch 进入组合（不启动服务，打印后退出）
```

插件目录会以 symlink 指向仓库，仓库内的改动即时生效（配合 dev:web 构建客户端）。

### 2. npm 发布（未来）

发布后可用于任意 profile：

```bash
dsh plugin --profile web add @dsh-ssh/dsh-ssh
```

> 卸载：`dsh plugin --profile <profile> remove @dsh-ssh/dsh-ssh`。

## 使用

用户流程（设置主机 → 信任密钥 → 创建远程工作区 → 工具自动路由）见 [README.md](./README.md)。

---

## 测试

> 运行目录：单测在 `packages/dsh-ssh` 下；live/verify 脚本多数在 `packages/dsh-ssh` 下运行（个别需从仓库根，见下）。**全部脚本的主机/端口/用户/私钥/hostId/远端根目录统一从 `test/live-config.mjs` 读取，并支持环境变量覆盖**——不要在脚本里写死主机。

### 单元测试（无需真机）

```bash
cd packages/dsh-ssh
node --test test/*.test.js     # 基线: 295 tests, pass 295, fail 0
```

### CI（GitHub Actions）

`.github/workflows/ci.yml` 在 **push 到 main** 与 **任何 base 为 main 的 pull_request** 上自动运行，门槛与本地一致：

1. `pnpm install --frozen-lockfile`（锁文件必须与 package.json 一致）；
2. `packages/dsh-ssh` 全量单测（**fail=0 硬性**，AGENTS.md §5.1）；
3. 客户端静态自检 `client-selfcheck.mjs`；
4. `npm pack --dry-run` 校验发布文件白名单完整性。

PR 的 CI 状态显示在 PR 页面；**fork 来源的 PR 同样受检**（workflow 于 base main 的定义处生效）。发布流水线见 `release.yml`（`v*` tag 触发，自带同样的测试门槛，双保险）。提交前本地跑一遍上述命令可避免 CI 打回。

覆盖 ssh-core / ssh-reconnect（连接池/exec/SFTP/重连）、hosts-model、settings-schema / settings-migration、router（cwd 路由）、tool-routing-hook（遮蔽）、exec-fs（SFTP 降级）、remote / remote-jobs / jobs-controller（后台任务与远端语义）、remote-wire / typert-contribution（通信契约）、capability-surface（能力面）、policy（sandbox 语义）、tools-local / tools-remote / tools-search / tools-sandbox、m4-placeholder / placeholder-cleanup 等。

### 统一真机配置（live-config.mjs）

`packages/dsh-ssh/test/live-config.mjs` 一处定义真机参数，凡 live-* / verify-* / bench / functional-live-test / sandbox-live-verify 脚本一律从这里读。全部可用**环境变量覆盖**：
> **隐私与默认行为**：默认主机是 RFC 5737 TEST-NET-3 保留示例地址 `203.0.113.10`（公网永不真实路由），仓库内不写死任何真实服务器地址。未显式设置 `DSH_SSH_TEST_HOST` 时，所有需要真机的 live/e2e 脚本会打印 `[skip]` 提示并以**退出码 0** 跳过（绝不尝试连接网络）；要跑真机测试必须显式 `DSH_SSH_TEST_HOST=<host>`（可再加 PORT/USER/HOST_ID/KEY_PATH/REMOTE_ROOT）。

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| DSH_SSH_TEST_HOST | 203.0.113.10 | 测试远端主机 IP |
| DSH_SSH_TEST_PORT | 22 | SSH 端口 |
| DSH_SSH_TEST_USER | ubuntu | 登录用户 |
| DSH_SSH_TEST_HOST_ID | 00000000-0000-4000-8000-000000000000 | 占位目录用的 hostId |
| DSH_SSH_TEST_KEY_PATH | ~/.ssh/id_ed25519 | 私钥路径（Windows 用 USERPROFILE 拼 .ssh） |
| DSH_SSH_TEST_REMOTE_ROOT | /tmp/dsh-ssh-test-root | 远端测试根目录 |
| DSH_SSH_TEST_REMOTE_WORKSPACE | /tmp/dsh-ssh-remote-workspace | verify*/e2e 脚本的远端占位工作区（remoteWorkspace） |

### live / verify 脚本清单与用途（scripts/ 与 test/）

| 脚本 | 用途 |
|---|---|
| `scripts/live-smoke.mjs` | 冒烟：真实 SSH 建连 + exec + SFTP（内存配置，不写 settings.yaml / known_hosts） |
| `scripts/tools-live-smoke.mjs` | 冒烟：工具所用的完整 SSH 原语（exec/SFTP 原子写/read/edit 往返）与远端 glob/grep 命令 |
| `scripts/functional-live-test.mjs` | 功能+兼容性实测套件：ssh-core 原语级 + tools 远端分支 + 兼容性矩阵采集（2026-08-20-compat-matrix.md 数据源） |
| `scripts/bench.mjs` | 性能基准脚本：建连耗时 / exec 往返延迟 / SFTP 吞吐 / 远端 glob / 远端 grep |
| `scripts/build-readme.mjs` | README 构建：从根 README.md 生成 packages/dsh-ssh/README.md（自动产物，勿手动编辑） |
| `scripts/sandbox-live-verify.mjs` | 远端 sandbox 语义验证（不同 sandboxMode 的远端 write） |
| `scripts/verify-agent-created.mjs` | agent/created 钩子组合验证：对远端 cwd 会话遮蔽七工具，read 走 SSH 读回远端文件 |
| `scripts/verify-remote-bg-created.mjs` | 远端后台任务 E2E 验证：sleep 30 后台任务状态/增量输出/kill 进程组 |
| `scripts/verify-execfs-fallback.mjs` | SFTP 降级（ExecFs）验证：exec+base64 全链路 + 与 SFTP 路径结果对比 |
| `scripts/client-selfcheck.mjs` | client.js 静态自检（无浏览器）：校验注入契约 / 遮蔽 priority / 内联 Typert 描述符与 lib 一致 —— **从仓库根运行**：`node packages/dsh-ssh/scripts/client-selfcheck.mjs` |
| `scripts/e2e-web-3080.mjs` | 3080 真实服务全工具 E2E（8/8）：HTTP API 驱动真实会话跑 8 组工具用例 |

> 多数 live/verify 脚本需配置好真机（默认 ubuntu@203.0.113.10 / id_ed25519，可用环境变量切换）。它们只写远端 /tmp 下自建目录并在结束清理，不碰 ~/.dsh/settings.yaml 与用户 known_hosts。

### e2e-web-3080.mjs 用法与前置

**作用**：不重启不停止 3080 服务，仅通过 POST `http://127.0.0.1:3080/api/<method>` 的信封（client-request）驱动真实 web-app 会话，对远端占位工作区跑 **8 组工具用例**（bash 前台 / write / read / edit / glob / grep / 后台链 / 清理），结尾用 bash 清理 e2e 产物。全部通过退出码 0（输出 PASS 汇总表 ≤60 行），任一失败退出码 1。

**前置**：
- 一个正在运行、监听 3080 端口的 DSH web-app 服务（含本插件，`E2E_BASE` 环境变量可覆盖地址，默认 `http://127.0.0.1:3080`）；
- 已配置好真机远端（脚本内 hostId 为 `00000000-...` 占位 UUID，与 live-config 默认一致）且该主机可连；
- 远端占位工作区目录存在（脚本内为 `/tmp/dsh-ssh-remote-workspace` 的占位路径，可用 `DSH_SSH_TEST_REMOTE_WORKSPACE` 覆盖）；
- 会话使用 provider `fusion-router` + 模型 `deepseek-v4-flash`（脚本内 MODEL 常量）。

```bash
node packages/dsh-ssh/scripts/e2e-web-3080.mjs
```

---

## 已知限制

- **~/.ssh/config 暂不解析**：主机的别名 / IdentityFile / 端口不自动读取，请在设置页显式填写。
- **ProxyJump / 多跳代理不支持**：只做单跳直连远端，见 [.agents/notes/requirements-and-design.md](./.agents/notes/requirements-and-design.md) §2.3。
- **Windows 远端未支持**：仅支持 Linux / macOS 远端（GNU 工具链、shell 语义）；Windows 远端 OpenSSH 路径/默认 shell 差异未实测，详见 [.agents/notes/research/2026-08-20-compat-matrix.md](./.agents/notes/research/2026-08-20-compat-matrix.md)。
- **mtime 秒级精度 → 并发写守卫有窗口**：edit / 写后校验靠 mtime 无法区分秒内两次写，实现用 size + 内容 hash 兜底 + SFTP 原子 rename。
- **远端 grep 基于 GNU grep**：忽略规则与 rg 有差异（二进制用 grep -I 跳过、忽略规则用 --exclude-dir + .gitignore 读取），语义对照详见兼容性矩阵。
- **SFTP 被完全禁用时降级到 exec+base64**：功能可用但性能下降。
- **认证**：密钥已实测，口令已实现（`src/ssh-core.js` 支持 `password` 分支）；口令经 settings secret 机制只写存储，重置行为「留空 = 保持不变」，私钥路径引用本地文件。
- **安全**：命令/路径统一经引号转义，文件内容走 SFTP 参数通道不经 shell。

---

## 开发

本仓库是 pnpm workspace，插件位于 `packages/dsh-ssh`（plain JS / ESM，无构建）。仓库无构建步骤；客户端 shell 的改动需 `pnpm run dev:web` 重建后刷新 3080 页面验证。

```bash
pnpm install
cd packages/dsh-ssh
node --test test/*.test.js                     # 单测（基线 295 fail=0）
node scripts/live-smoke.mjs                    # 冒烟（需配置测试远端）
```

- 提交规范见仓库根 [AGENTS.md](./AGENTS.md) §5.1：Conventional Commits、单测 `fail=0` 才能提交、直接推 `main`。
- 代码注释规范见根 AGENTS.md §4.1：英文注释、禁过程化编号（里程碑/方案编号/note 条目号）。
- 架构与设计决策见 [.agents/notes/requirements-and-design.md](./.agents/notes/requirements-and-design.md)；协作资料见 [.agents/](./.agents/)。
