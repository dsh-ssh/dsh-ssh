# Agent Note: 客户端引导与目录浏览链路修复
Status: implemented

## Problem
- 3090 真机暴露一串客户端侧缺陷:设置页「读取设置失败」、测试连接「Host denied (verification failed)」、新建会话选远程主机「resolveRemoteHome 返回异常」、「本地」tab 报 browse capability 缺失。
- 远程目录浏览阶段曾把单主机和当前路径渲染为只读文本，并将「返回」严格绑定于应用内历史栈；从初始主目录打开时历史栈为空，导致无法返回父目录。

## Decision
- **remote.ssh without inject(A.10)**:Typert 客户端把 remote 命名空间注册为平铺键 `remote.ssh`,访问方须显式 inject;但主 fiber 内声明会与 `$mount`(apply 内注册该服务)自引用死锁。修法 =「捕获引用」替代「代理访问」:`$mount` 后用 `ctx.inject(["remote.ssh"], sshCtx => { sshService = sshCtx.remote.ssh; controller.load(); })` 子 fiber 等待就绪并捕获引用;`getSsh()` 返回已捕获引用,不再触碰 ctx.remote.ssh 代理。
- **known_hosts 缺省 path fallback(A.11)**:保存的主机配置无 knownHostsPath 时,`_readKnownHosts` 缺省不读任何文件 → 真实 host key 判 unknown → ssh2 报「Host denied (verification failed)」。修:`_readKnownHosts` 缺省读 `~/.ssh/known_hosts`(os.homedir),ENOENT→[]视为无记录;支持 OpenSSH hashed 条目 `|1|<salt>|<hash>`(HMAC-SHA1);`_connectInner` error handler 用 verifyHostKey 的 stage/message 覆盖 ssh2 库内文案(unknown/mismatch 分类保真)。
- **网关 {ok,value} 未解包(A.13)**:core 网关统一把 host 方法返回值包装成 `{ok:true,value}`/`{ok:false,error}`;client startBrowse 把对象当裸字符串,resolve 成功但形状不符就走错误分支。修:lib/typert-contribution.js 增 `unwrapRemoteResponse`/`remoteResponseError` 纯函数,client 内联同签名副本;startBrowse 先解包再判定,业务失败优先透出真实 error.message;新增 test/remote-wire.test.js。
- **本地 tab browse 能力缺失(A.12/A.14)**:dsh-ssh-dev 两 profile 的 composed picker 实际都只 serve native(win32 决议 native);报错只因插件 DirectoryFlowCombined 本地 tab 直接调 `ctx.workspaces.listDirectory`,而 host.listDirectory 强制要求 browse 能力。修 = 方案 B:本地 tab 探测到 browse 缺失后回退官方原生系统对话框(`ctx.workspaces.pickDirectory`,与 web 行为一致);`isBrowseCapabilityError` 命中条件 = rpcError.code==='directory-picker-unavailable' 或文案含「needs the browse capability」;回退态只渲染提示 + 再次选择 + 取消,不渲染列表与「新建文件夹」。全局可移植(host 决议 native 或 browse 都成立)。
- **远程浏览控件与父目录导航**:浏览阶段始终保留 `SelectMenu`，不再因仅有一台主机退化为静态标签；当前远程路径使用受控输入框，支持 Enter 与「转到」按钮，提交前要求 POSIX 绝对路径并规范化重复分隔符及 `.`/`..`；输入法组合态 Enter 不提交。非法路径错误与远端读取错误分离，避免显示无意义的「重试」。返回始终按路径栏当前绝对路径计算父目录；路径输入使用 DOM ref 读取实际值，避免客户端热替换后 React 状态槽错位导致按钮可见但无效。远端加载期间禁用返回；位于 `/` 时点击保持原位。

## Alternatives considered
- 本地 tab browse 修复的方案 A(profile patch pin browse):改变 host 交互模型(系统对话框换自绘浏览树),换 linux 主机决议又变,行为不一致 → 不采用。

## Consequences
- 设置页「当前设置不可写(只读)」误显示与 remote.ssh 报错同根因(load 抛代理错误→writable 停留 false),修复后一起消失。
- known_hosts 全面支持 hashed;mismatch 仍硬拒绝(v1 无「仍然信任」覆盖,见 TOFU note)。
- 真机验证依赖 GUI 重启(unified)。
- 目录浏览交互由 `test/client-directory-flow.test.js` 的最小 React hooks harness 锁定，覆盖单主机选择、路径 Enter/按钮导航、非法路径、IME 组合态、子目录父级返回与初始目录父级返回。

## 出处
- archived/a-series-log.md A.10(remote.ssh inject)、A.11(known_hosts fallback)、A.13(resolveRemoteHome 解包)、A.12/A.14(local tab browse 回退)。
- dsh-api-gateway@lib/index.js:123-131/3174-3204、lib/client.js:258-265/350-352;dsh-client-runtime/lib/client.js pickDirectory/listDirectory;cordis/lib/index.js inject;ssh-core.js _readKnownHosts/parseKnownHosts;本仓库 client.js、lib/typert-contribution.js。
- 本仓库 `packages/dsh-ssh/client.js` 的 `RemoteFlowBody` 与 `packages/dsh-ssh/test/client-directory-flow.test.js`。
