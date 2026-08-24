// @dsh-ssh/dsh-ssh client entry: settings-page SSH host manager.
// window.__ModuleLoader__.load({id, factory(require)}) is the official client
// plugin shape: dsh.client:{platform:'web', inject:[...]} + exports['./client']
// make client.js loadable by the web app at /plugins/@dsh-ssh/dsh-ssh/client.js;
// the factory must be SELF-CONTAINED
// SELF-CONTAINED: the factory's require() only resolves the web module map
// (react, @deepseek-ai/dsh-client-ui-primitives), never relative imports —
// so the pure model helpers below are an inlined, verbatim copy of
// packages/dsh-ssh/lib/hosts-model.js (the canonical, node-tested copy;
// keep them in sync), and the Typert client descriptors inline
// packages/dsh-ssh/lib/typert-contribution.js.
//
// Architecture (all official seams):
//   - settings.section slot (kind list, scope root): id 'ssh-hosts',
//     registration options {id, order, label, locale, inject} per
//     dsh-client-ui-settings/lib/types/client/contract/slots.d.ts:67 and the
//     in-tree consumer dsh-client-ui-agent-preset/lib/client.js:1706.
//   - CRUD + test connection: ALL host-editor RPC rides the self-built
//     Typert remote — ctx.remote.$mount(CLIENT_TYPERT_REMOTE) installs
//     ctx.remote.ssh.{listHosts, saveHost, deleteHost, testConnection} over
//     the official Typert gateway; the host half lives in
//     packages/dsh-ssh/src/remote.js. api.settings is NOT used: the settings
//     wire only serves a hard-coded namespace whitelist
//     (dsh-host-apiproxy/lib/index.js:888 WEB_SETTINGS_NAMESPACES), so
//     plugin namespaces answer settings-not-exposed.
//     listHosts returns the REDACTED dict + secrets + revision; saveHost
//     merges the patch over the stored entry host-side (blank password keeps
//     the stored secret, switch to key clears it) and rejects stale
//     revisions with SETTINGS_CONFLICT.
window.__ModuleLoader__.load({
  id: "@dsh-ssh/dsh-ssh",
  factory: function (require) {
    var React = require("react");
    var primitives = require("@deepseek-ai/dsh-client-ui-primitives");
    var Button = primitives.Button;
    var Input = primitives.Input;
    var IconPlusOutline16 = primitives.IconPlusOutline16;
    var IconEditOutline16 = primitives.IconEditOutline16;
    var IconTrashOutline16 = primitives.IconTrashOutline16;
    var IconCheckOutline16 = primitives.IconCheckOutline16;
    var IconWarningOutline16 = primitives.IconWarningOutline16;
    var IconRefreshOutline16 = primitives.IconRefreshOutline16;
    var IconCloseOutline16 = primitives.IconCloseOutline16;
    var IconLoadingOutline16 = primitives.IconLoadingOutline16;
    var IconFolderClose16 = primitives.IconFolderClose16;
    var IconChevronDownOutline14 = primitives.IconChevronDownOutline14;
    var Menu = primitives.Menu;
    var Modal = primitives.Modal;
    var StateDot = primitives.StateDot;
    var Pill = primitives.Pill;

    // ---------- locale ----------
    var ZH = {
      "nav": "SSH 连接",
      "title": "SSH 连接",
      "intro": "把另一台机器的目录作为工作区。添加主机后，即可在其中创建会话，命令、文件与搜索都会在该机器上执行。口令留空表示沿用已保存的值。",
      "listLabel": "主机列表",
      "add": "添加主机",
      "edit": "编辑",
      "save": "保存",
      "cancel": "取消",
      "delete": "删除",
      "test": "测试连接",
      "testing": "正在测试…",
      "testOk": "已连接 · 可以开始会话",
      "testFail": "连接失败",
      "banner": "标识(可选)",
      "confirmDelete": "删除主机「{name}」?",
      "confirmDeleteHint": "仅移除本机配置，远端机器不受影响，也不会删除其上的任何文件。",
      "confirmDeleteAction": "删除",
      "field.name": "名称",
      "field.namePh": "例如：我的工作站",
      "field.host": "地址",
      "field.hostPh": "IP 或域名",
      "field.port": "端口",
      "field.user": "用户名",
      "field.userPh": "登录用户名",
      "field.auth": "认证方式",
      "field.authKey": "SSH 密钥",
      "field.authPassword": "密码",
      "field.keyPath": "私钥路径",
      "field.keyPathPh": "如 ~/.ssh/id_ed25519；留空使用 ssh-agent",
      "field.password": "密码",
      "field.passwordPh": "新密码；留空使用已保存的值",
      "passwordSet": "已保存(留空沿用)",
      "err.required": "此项必填",
      "err.noSpaces": "地址不能包含空格",
      "err.range": "端口需在 1–65535",
      "err.conflict": "主机配置已在其他位置被修改。请重新加载后重试。",
      "empty": "还没有主机。添加一台机器，就能把它的目录当工作区使用。",
      "loading": "正在加载…",
      "loadError": "无法读取配置，请稍后重试。",
      "saveError": "保存失败，请重试。",
      "deleteError": "删除失败，请重试。",
      "unavailable": "无法读取配置，请检查插件是否已启用。",
      "readonly": "当前不可修改（只读）。",
      "testDone": "已测试",
      "saved": "已保存",
      "empty.first": "首次使用？先添加主机，再从新建会话里选它的目录。",
      "mountFail": "远程服务挂载失败",
      "notReady": "远程服务未就绪",
      "remoteResolveError": "远程返回异常",
      "trust.title": "信任此主机？",
      "trust.intro": "首次连接 {host}，无法确认其真实身份。请核对下面的主机密钥指纹，确认无误后再信任：",
      "trust.host": "主机",
      "trust.keyType": "密钥类型",
      "trust.fingerprint": "密钥指纹",
      "trust.copy": "复制",
      "trust.copied": "已复制",
      "trust.trust": "信任并保存",
      "trust.trusting": "正在保存…",
      "trust.cancel": "取消",
      "trust.error": "保存失败",
    };
    var EN = {
      "nav": "SSH Connections",
      "title": "SSH Connections",
      "intro": "Add machines to use a folder on them as a workspace. Once added, sessions run there — commands, files, and search all execute on that machine. Leave the password blank to keep the saved value.",
      "listLabel": "Host list",
      "add": "Add host",
      "edit": "Edit",
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Remove",
      "test": "Test connection",
      "testing": "Testing…",
      "testOk": "Connected · ready",
      "testFail": "Connection failed",
      "banner": "Label (optional)",
      "confirmDelete": "Remove “{name}”?",
      "confirmDeleteHint": "This only removes the local config. The remote machine is untouched and no files are deleted.",
      "confirmDeleteAction": "Remove",
      "field.name": "Name",
      "field.namePh": "e.g. My workstation",
      "field.host": "Address",
      "field.hostPh": "IP or hostname",
      "field.port": "Port",
      "field.user": "Username",
      "field.userPh": "SSH login user",
      "field.auth": "Authentication",
      "field.authKey": "SSH key",
      "field.authPassword": "Password",
      "field.keyPath": "Private key path",
      "field.keyPathPh": "e.g. ~/.ssh/id_ed25519; empty uses ssh-agent",
      "field.password": "Password",
      "field.passwordPh": "New password; empty keeps the saved one",
      "passwordSet": "Saved (empty keeps it)",
      "err.required": "Required",
      "err.noSpaces": "No spaces allowed",
      "err.range": "Port must be 1–65535",
      "err.conflict": "This host was changed elsewhere. Reload and try again.",
      "empty": "No hosts yet. Add a machine to use one of its folders as a workspace.",
      "loading": "Loading…",
      "loadError": "Couldn’t load config. Please try again.",
      "saveError": "Failed to save. Please retry.",
      "deleteError": "Failed to remove. Please retry.",
      "unavailable": "Config unavailable — check that the add-on is enabled.",
      "readonly": "Read-only — cannot be modified here.",
      "testDone": "Tested",
      "saved": "Saved",
      "empty.first": "First time? Add a host, then pick one of its folders when creating a session.",
      "mountFail": "Remote service mount failed",
      "notReady": "Remote service not ready",
      "remoteResolveError": "the remote returned an error",
      "trust.title": "Trust this host?",
      "trust.intro": "This is the first time you connect to {host} and its identity can't be confirmed. Verify the host key fingerprint below before trusting it:",
      "trust.host": "Host",
      "trust.keyType": "Key type",
      "trust.fingerprint": "Fingerprint",
      "trust.copy": "Copy",
      "trust.copied": "Copied",
      "trust.trust": "Trust & save",
      "trust.trusting": "Saving…",
      "trust.cancel": "Cancel",
      "trust.error": "Failed to save",
    };
    // directoryFlow occupant locale (new namespace workspace.ssh)
    var SSH_ZH = {
      "title": "选择工作区目录",
      "intro": "选择本机或某台远程主机上的目录作为工作区。之后会话会在该目录所在机器上执行。",
      "tab.local": "本机",
      "tab.remote": "远程主机",
      "local.home": "主目录",
      "local.up": "上一级",
      "local.open": "打开",
      "local.newFolder": "新建文件夹",
      "local.folderName": "文件夹名",
      "local.create": "创建",
      "local.loading": "正在加载…",
      "local.empty": "此文件夹为空",
      "local.loadFailed": "无法读取此文件夹",
      "local.createFailed": "无法新建文件夹",
      "local.nativeHint": "在此处浏览目录不可用，改用本机文件夹选择器。",
      "local.nativeAgain": "重新选择…",
      "local.nativePick": "选择本机文件夹…",
      "host": "主机",
      "hostPh": "选择主机…",
      "noHosts": "还没有可用主机。请先到设置页「远程主机」添加一台。",
      "path": "远程路径",
      "go": "转到",
      "invalidPath": "请输入以 / 开头的绝对路径",
      "home": "主目录",
      "back": "返回",
      "retry": "重试",
      "use": "打开",
      "using": "正在准备…",
      "cancel": "取消",
      "loading": "正在加载…",
      "emptyDir": "此文件夹为空",
      "loadHostsFailed": "无法读取主机列表",
      "loadDirFailed": "无法读取远端文件夹",
      "placeholderFailed": "无法连接到此目录",
      "remoteResolveError": "远程返回异常",
      "select.remote.emptyCTA": "去添加主机",
      "capHint": "此工作区的命令与文件在 {host} 上执行；技能脚本与 MCP 工具在本机执行。",
      "trust.title": "信任此主机？",
      "trust.intro": "首次连接 {host}，无法确认其真实身份。请核对下面的主机密钥指纹，确认无误后再信任：",
      "trust.host": "主机",
      "trust.keyType": "密钥类型",
      "trust.fingerprint": "密钥指纹",
      "trust.copy": "复制",
      "trust.copied": "已复制",
      "trust.trust": "信任并保存",
      "trust.trusting": "正在保存…",
      "trust.cancel": "取消",
      "trust.error": "保存失败",
    };
    var SSH_EN = {
      "title": "Select Workspace Directory",
      "intro": "Pick a folder on this machine or on a remote host as the workspace. Sessions then run on that machine.",
      "tab.local": "This machine",
      "tab.remote": "Remote host",
      "local.home": "Home",
      "local.up": "Parent",
      "local.open": "Open",
      "local.newFolder": "New folder",
      "local.folderName": "Folder name",
      "local.create": "Create",
      "local.loading": "Loading…",
      "local.empty": "This folder is empty",
      "local.loadFailed": "Couldn’t read this folder",
      "local.createFailed": "Couldn’t create folder",
      "local.nativeHint": "In-app browsing isn’t available here, so we’ll use the system folder picker.",
      "local.nativeAgain": "Choose again…",
      "local.nativePick": "Choose a local folder…",
      "host": "Host",
      "hostPh": "Select a host…",
      "noHosts": "No hosts configured. Add one under Settings → Remote Hosts first.",
      "path": "Remote path",
      "go": "Go",
      "invalidPath": "Enter an absolute path starting with /",
      "home": "Home",
      "back": "Back",
      "retry": "Retry",
      "use": "Open",
      "using": "Preparing…",
      "cancel": "Cancel",
      "loading": "Loading…",
      "emptyDir": "This folder is empty",
      "loadHostsFailed": "Couldn’t load hosts",
      "loadDirFailed": "Couldn’t read the remote folder",
      "placeholderFailed": "Couldn’t connect to this folder",
      "remoteResolveError": "the remote returned an error",
      "select.remote.emptyCTA": "Add a host",
      "capHint": "Commands and files in this workspace run on {host}; skill scripts and MCP tools run on this machine.",
      "trust.title": "Trust this host?",
      "trust.intro": "This is the first time you connect to {host} and its identity can't be confirmed. Verify the host key fingerprint below before trusting it:",
      "trust.host": "Host",
      "trust.keyType": "Key type",
      "trust.fingerprint": "Fingerprint",
      "trust.copy": "Copy",
      "trust.copied": "Copied",
      "trust.trust": "Trust & save",
      "trust.trusting": "Saving…",
      "trust.cancel": "Cancel",
      "trust.error": "Failed to save",
    };

    // ---------- pure model helpers (inline copy of lib/hosts-model.js) ----------
    // Canonical copy lives in packages/dsh-ssh/lib/hosts-model.js (node-tested).
    // Host-only helpers intentionally NOT duplicated here: mergeTestConfig,
    // mergeHostPatch, validateHostConfig, redactHosts, hostsSecretsList.
    function normalizePort(value) {
      if (value === '' || value === null || value === undefined) return null;
      var n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > 65535) return null;
      return n;
    }
    function validateHostForm(form) {
      var errors = {};
      var name = String(form && form.name != null ? form.name : '').trim();
      var host = String(form && form.host != null ? form.host : '').trim();
      var user = String(form && form.user != null ? form.user : '').trim();
      var authType = form && form.authType === 'password' ? 'password' : 'key';
      var privateKeyPath = String(form && form.privateKeyPath != null ? form.privateKeyPath : '').trim();
      var port = normalizePort(form && form.port);
      if (!name) errors.name = 'required';
      if (!host) errors.host = 'required';
      else if (host.includes(' ')) errors.host = 'noSpaces';
      if (form && form.port !== undefined && form.port !== null && form.port !== '' && port === null) errors.port = 'range';
      if (!user) errors.user = 'required';
      if (Object.keys(errors).length > 0) return { ok: false, errors: errors };
      return { ok: true, value: { name: name, host: host, port: port, user: user, authType: authType, privateKeyPath: privateKeyPath } };
    }
    function displayHostTitle(host) {
      var name = host && host.name && String(host.name).trim() ? String(host.name).trim() : '';
      var id = host && host.id ? String(host.id) : '';
      var hostPart = host && host.host ? String(host.host) : '';
      return name || (hostPart ? hostPart + (id ? ' (' + id + ')' : '') : id || '(unnamed)');
    }
    function displayAuthType(host) {
      return host && host.auth && host.auth.type === 'password' ? 'password' : 'key';
    }
    // Display-only masking for the host list: keep the first and last dot-segment and
    // replace every middle segment with "***" (e.g. 203.***.***.113). Storage and
    // connection use the full host value; only this list rendering is redacted.
    function maskHostAddress(addr) {
      var s = String(addr == null ? '' : addr);
      var parts = s.split('.');
      if (parts.length <= 2) return s;
      var out = [parts[0]];
      for (var i = 1; i < parts.length - 1; i++) out.push('***');
      out.push(parts[parts.length - 1]);
      return out.join('.');
    }
    function buildHostConfig(form, existingId, newPassword) {
      var password = String(newPassword != null ? newPassword : '').trim();
      var auth = form && form.authType === 'password'
        ? (password ? { type: 'password', password: password } : { type: 'password' })
        : { type: 'key' };
      if (form && form.authType !== 'password') {
        var keyPath = String(form.privateKeyPath != null ? form.privateKeyPath : '').trim();
        if (keyPath) auth.privateKeyPath = keyPath;
      }
      var cfg = {
        id: existingId != null ? existingId : newHostId(),
        name: String(form && form.name != null ? form.name : '').trim(),
        host: String(form && form.host != null ? form.host : '').trim(),
        port: normalizePort(form && form.port) != null ? normalizePort(form && form.port) : 22,
        user: String(form && form.user != null ? form.user : '').trim(),
        auth: auth,
      };
      if (form && form.knownHostsPath != null && String(form.knownHostsPath).trim()) cfg.knownHostsPath = String(form.knownHostsPath).trim();
      if (form && form.connectTimeoutMs) cfg.connectTimeoutMs = Number(form.connectTimeoutMs);
      return cfg;
    }
    function newHostId() {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
      return 'h-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }
    function secretPathFor(hostId) {
      return ['hosts', String(hostId), 'auth', 'password'];
    }
    function isHostSecretSet(secrets, hostId) {
      if (!Array.isArray(secrets)) return false;
      var target = ['hosts', String(hostId), 'auth', 'password'];
      return secrets.some(function (s) {
        return s && s.set === true && Array.isArray(s.path)
          && s.path.length === target.length && s.path.every(function (p, i) { return p === target[i]; });
      });
    }
    function sortedHosts(hosts) {
      if (!hosts || typeof hosts !== 'object') return [];
      var list = [];
      for (var id in hosts) {
        if (!Object.prototype.hasOwnProperty.call(hosts, id)) continue;
        list.push(Object.assign({}, hosts[id], { id: String(hosts[id] && hosts[id].id != null ? hosts[id].id : id) }));
      }
      list.sort(function (a, b) {
        var an = displayHostTitle(a).toLowerCase();
        var bn = displayHostTitle(b).toLowerCase();
        return an < bn ? -1 : an > bn ? 1 : 0;
      });
      return list;
    }
    function messageOf(error) {
      if (error && typeof error === 'object') {
        if (error.message) return String(error.message);
        if (error.code) return String(error.code);
      }
      return String(error);
    }

    // ---------- Typert client remote (inline copy of lib/typert-contribution.js) ----------
    // Client-side $mount REQUIRES strict codecs (dsh-api-gateway/lib/client.js
    // requireStrictCodec); the schema is a JSON passthrough because values are
    // already validated host-side (hosts-model.validateHostConfig + settings
    // schema + ssh-core) and the gateway re-asserts JSON-safety on the wire.
    function strictCodec(typeSymbol) {
      return { mode: 'strict', typeSymbol: typeSymbol, schema: { parse: function (value) { return value; } } };
    }
    function remoteDescriptor(method, params, resultType) {
      return {
        id: '@dsh-ssh/dsh-ssh#ssh/' + method,
        service: 'ssh',
        namespace: 'ssh',
        method: method,
        invocation: { kind: 'direct' },
        parameters: params.map(function (name) {
          return { name: name, wire: name, source: 'json', codec: strictCodec('@dsh-ssh/dsh-ssh#' + name) };
        }),
        result: strictCodec('@dsh-ssh/dsh-ssh#' + resultType),
      };
    }
    var CLIENT_TYPERT_REMOTE = {
      package: '@dsh-ssh/dsh-ssh',
      descriptors: [
        remoteDescriptor('testConnection', ['cfg'], 'TestConnectionResult'),
        remoteDescriptor('listHosts', [], 'ListHostsResult'),
        remoteDescriptor('saveHost', ['id', 'patch', 'revision'], 'SaveHostResult'),
        remoteDescriptor('deleteHost', ['id', 'revision'], 'DeleteHostResult'),
        remoteDescriptor('listRemoteDir', ['hostId', 'path'], 'ListRemoteDirResult'),
        remoteDescriptor('statRemote', ['hostId', 'path'], 'StatRemoteResult'),
        remoteDescriptor('resolveRemoteHome', ['hostId'], 'ResolveRemoteHomeResult'),
        remoteDescriptor('createPlaceholder', ['hostId', 'remotePath'], 'CreatePlaceholderResult'),
        remoteDescriptor('trustHostKey', ['hostId', 'rawKeyBase64', 'fingerprint'], 'TrustHostKeyResult'),
      ],
    };

    // Gateway uniformly wraps host method results as { ok: true, value } (success)
    // / { ok: false, error } (business failure) (dsh-api-gateway/lib/index.js:123-131
    // invokeRpc; lib/client.js:258-265 client invoke). Every ctx.remote.ssh.* promise
    // resolves to this shape, so a bare value never reaches the UI. Keep in sync with
    // the canonical copy in lib/typert-contribution.js.
    function unwrapRemoteResponse(response) {
      return response && typeof response === 'object' && response.ok === true ? response.value : null;
    }
    function remoteResponseError(response, fallback) {
      var err = response && typeof response === 'object' ? response : null;
      var msg = err && err.error && typeof err.error === 'object' && typeof err.error.message === 'string'
        ? err.error.message : '';
      return msg || fallback;
    }
    // Detect missing browse capability: when the host composed picker only serves
    // "native", listDirectory/createDirectory return directory-picker-unavailable which
    // the client wraps as DirectoryBrowseError (the rpcError carries the business code;
    // dsh-host-apiproxy/lib/index.js:3174-3204). On hit the local tab falls back to the
    // official native system dialog (ctx.workspaces.pickDirectory). Keep in sync with the
    // canonical copy in lib/typert-contribution.js.
    function isBrowseCapabilityError(err) {
      if (!err || typeof err !== 'object') return false;
      var rpc = err.rpcError && typeof err.rpcError === 'object' ? err.rpcError : null;
      if (rpc && rpc.code === 'directory-picker-unavailable') return true;
      var rpcMsg = rpc && typeof rpc.message === 'string' ? rpc.message : '';
      var errMsg = typeof err.message === 'string' ? err.message : '';
      return rpcMsg.indexOf('needs the browse capability') !== -1
        || errMsg.indexOf('needs the browse capability') !== -1;
    }

    // ---------- store ----------
    function createStore(initial) {
      var snapshot = initial;
      var listeners = new Set();
      return {
        getSnapshot: function () { return snapshot; },
        subscribe: function (fn) {
          listeners.add(fn);
          return function () { listeners.delete(fn); };
        },
        set: function (patch) {
          snapshot = Object.assign({}, snapshot, patch);
          listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
        },
      };
    }

    var HOSTS_NS = 'dsh-ssh-hosts';
    // TOFU: this stage matches ssh-core's HOST_KEY_UNKNOWN_STAGE; a result carrying
    // this stage triggers the trust dialog.
    var HOST_KEY_UNKNOWN_STAGE = 'host-key-unknown';
    var INITIAL = {
      status: 'idle',
      error: null,
      writable: false,
      hosts: {},
      secrets: [],
      revision: 0,
      form: null,
      formData: {},
      formErrors: {},
      saving: false,
      pendingDelete: null,
      deleting: false,
      testing: null,
      testResult: null,
      notice: null,
      formTesting: false,
      formTestResult: null,
      trustHostKey: null,
    };

    // ---------- controller ----------
    function createController(remote, getSsh, remoteError) {
      var store = createStore(INITIAL);
      var testingSeq = 0;
      function set(patch) { store.set(patch); }

      function isConflict(error) {
        var text = messageOf(error);
        return text.indexOf('SETTINGS_CONFLICT') !== -1;
      }

      var mountFailureSource = null;
      function setMountFailureSource(fn) { mountFailureSource = fn; }

      function setLoadError(message) {
        set({ status: 'error', error: String(message) });
      }

      async function load() {
        try {
          var ssh = getSsh();
          if (!ssh) { set({ status: 'error', error: remoteError() }); return; }
          var response = await ssh.listHosts();
          if (!response || !response.ok) {
            var loadErr = response && response.error && response.error.message ? String(response.error.message) : 'ssh.listHosts failed';
            set({ status: 'error', error: loadErr });
            return;
          }
          var value = response.value || {};
          set({
            status: 'ready',
            writable: !!value.writable,
            hosts: value.hosts && typeof value.hosts === 'object' ? value.hosts : {},
            secrets: Array.isArray(value.secrets) ? value.secrets : [],
            revision: typeof value.revision === 'number' ? value.revision : 0,
            error: null,
          });
        } catch (e) {
          var root = mountFailureSource ? mountFailureSource() : null;
          if (root) { set({ status: 'error', error: sshT('mountFail') + ': ' + root }); return; }
          set({ status: 'error', error: messageOf(e) });
        }
      }

      function beginAdd() {
        set({ form: { mode: 'add' }, formData: { name: '', host: '', port: '22', user: '', authType: 'key', privateKeyPath: '', newPassword: '' }, formErrors: {}, testResult: null, error: null });
      }
      function beginEdit(id) {
        var hosts = store.getSnapshot().hosts || {};
        var host = hosts[id];
        if (!host) return;
        set({
          form: { mode: 'edit', id: id },
          formData: {
            name: host.name || '',
            host: host.host || '',
            port: host.port ? String(host.port) : '22',
            user: host.user || '',
            authType: displayAuthType(host),
            privateKeyPath: (host.auth && host.auth.type === 'key' && host.auth.privateKeyPath) || '',
            newPassword: '',
          },
          formErrors: {},
          testResult: null,
          error: null,
        });
      }
      function cancelForm() { set({ form: null, formData: {}, formErrors: {}, saving: false }); }
      function patchForm(patch) {
        set({ formData: Object.assign({}, store.getSnapshot().formData, patch), formErrors: {}, formTestResult: null });
      }
      async function saveForm() {
        var snap = store.getSnapshot();
        if (!snap.form) return;
        var validated = validateHostForm(snap.formData);
        if (!validated.ok) { set({ formErrors: validated.errors }); return; }
        var id = snap.form.mode === 'edit' ? snap.form.id : null;
        var host = buildHostConfig(snap.formData, id, snap.formData.newPassword || '');
        set({ saving: true, formErrors: {}, error: null });
        try {
          // The wire carries the form HostConfig (auth.password only when the
          // user typed one); the host merges it over the stored entry with the
          // write-only semantics (blank = keep, switch to key = clear) and
          // guards the write with the revision from the last listHosts.
          var ssh = getSsh();
          if (!ssh) { set({ saving: false, error: remoteError() }); return; }
          var response = await ssh.saveHost(host.id, host, snap.revision);
          if (!response || !response.ok) {
            var saveErr = response && response.error && response.error.message ? String(response.error.message) : 'ssh.saveHost failed';
            set({ saving: false, error: isConflict(response && response.error) ? 'conflict' : saveErr });
            return;
          }
          set({ saving: false, form: null, formData: {}, formErrors: {}, notice: 'saved' });
          await load();
        } catch (e) {
          set({ saving: false, error: messageOf(e) });
        }
      }
      function requestDelete(id) { set({ pendingDelete: id, deleting: false }); }
      function cancelDelete() { set({ pendingDelete: null, deleting: false }); }
      async function confirmDelete() {
        var snap = store.getSnapshot();
        var id = snap.pendingDelete;
        if (!id) return;
        set({ deleting: true, error: null });
        try {
          var ssh = getSsh();
          if (!ssh) { set({ deleting: false, error: remoteError() }); return; }
          var response = await ssh.deleteHost(id, snap.revision);
          if (!response || !response.ok) {
            var delErr = response && response.error && response.error.message ? String(response.error.message) : 'ssh.deleteHost failed';
            set({ deleting: false, error: isConflict(response && response.error) ? 'conflict' : delErr });
            return;
          }
          set({ deleting: false, pendingDelete: null, notice: 'saved' });
          await load();
        } catch (e) {
          set({ deleting: false, error: messageOf(e) });
        }
      }
      async function testConnection(id) {
        var hosts = store.getSnapshot().hosts || {};
        var host = hosts[id];
        if (!host) return;
        var seq = ++testingSeq;
        set({ testing: { id: id }, testResult: null });
        try {
          var ssh = getSsh();
          if (!ssh) { set({ testing: null, testResult: { id: id, ok: false, text: remoteError() } }); return; }
          var response = await ssh.testConnection({ cfg: host });
          if (seq !== testingSeq) return;
          var result = response && response.ok ? response.value : null;
          if (result && result.stage === HOST_KEY_UNKNOWN_STAGE) {
            // TOFU: first connection reports an unknown host key; show the trust
            // dialog, then automatically retry the original "test connection".
            set({ testing: null });
            openHostKeyTrust({
              hostId: id,
              host: result.host,
              port: result.port,
              keyType: result.keyType,
              fingerprint: result.fingerprint,
              rawKeyBase64: result.rawKeyBase64,
              retry: function () { testConnection(id); }
            });
            return;
          }
          if (result && result.ok) {
            set({ testing: null, testResult: { id: id, ok: true, text: result.banner ? String(result.banner) : '' } });
          } else {
            var msg = result ? String(result.error || 'connection failed')
              : (response && response.error && response.error.message) || 'test connection failed';
            set({ testing: null, testResult: { id: id, ok: false, text: msg } });
          }
        } catch (e) {
          if (seq !== testingSeq) return;
          set({ testing: null, testResult: { id: id, ok: false, text: messageOf(e) } });
        }
      }
      function dismissTest() { set({ testResult: null }); }
      function dismissFormTest() { set({ formTestResult: null }); }
      function dismissNotice() { set({ notice: null }); }

      // ---------- TOFU trust flow ----------
      // Extract host-key-unknown structured info from a method's return value:
      // testConnection's host returns {ok:false,error,stage,...}; the browsing methods
      // (resolveRemoteHome/listRemoteDir) also return the unified shape and the gateway
      // wraps it as {ok:true, value:{ok:false,stage,...}}. Unify on value.
      function hostKeyUnknownOf(response) {
        if (response && typeof response === 'object') {
          var value = response.ok === true ? response.value : response;
          if (value && typeof value === 'object' && value.stage === HOST_KEY_UNKNOWN_STAGE) return value;
          if (response.error && typeof response.error === 'object' && response.error.stage === HOST_KEY_UNKNOWN_STAGE) return response.error;
        }
        return null;
      }
      function openHostKeyTrust(info) {
        set({ trustHostKey: {
          hostId: info.hostId,
          host: info.host,
          port: info.port,
          keyType: info.keyType,
          fingerprint: info.fingerprint,
          rawKeyBase64: info.rawKeyBase64,
          retry: info.retry,
          trusting: false,
          error: null,
        } });
      }
      function cancelHostKeyTrust() { set({ trustHostKey: null }); }
      async function trustAndRetry() {
        var info = store.getSnapshot().trustHostKey;
        if (!info) return;
        set({ trustHostKey: Object.assign({}, info, { trusting: true, error: null }) });
        try {
          var ssh = getSsh();
          if (!ssh) { set({ trustHostKey: Object.assign({}, info, { trusting: false, error: remoteError() }) }); return; }
          var response = await ssh.trustHostKey(info.hostId, info.rawKeyBase64, info.fingerprint);
          if (!response || !response.ok) {
            var errMsg = response && response.error && response.error.message ? String(response.error.message) : 'trustHostKey failed';
            set({ trustHostKey: Object.assign({}, info, { trusting: false, error: errMsg }) });
            return;
          }
          // Close the dialog and clear any in-flight test state, then automatically
          // retry the original operation (test connection or directory browse).
          set({ trustHostKey: null, testing: null, formTesting: false });
          if (typeof info.retry === 'function') { try { info.retry(); } catch (e) {} }
        } catch (e) {
          set({ trustHostKey: Object.assign({}, info, { trusting: false, error: messageOf(e) }) });
        }
      }

      // Pre-save connection test: build the config straight from the current form
      // values instead of reusing a stored host.
      async function testConnectionForm() {
        var snap = store.getSnapshot();
        var validated = validateHostForm(snap.formData);
        if (!validated.ok) { set({ formErrors: validated.errors }); return; }
        var id = snap.form && snap.form.mode === 'edit' ? snap.form.id : null;
        var cfg = buildHostConfig(snap.formData, id, snap.formData.newPassword || '');
        var seq = ++testingSeq;
        set({ formTesting: true, formTestResult: null, formErrors: {} });
        try {
          var ssh = getSsh();
          if (!ssh) { set({ formTesting: false, formTestResult: { ok: false, text: remoteError() } }); return; }
          var response = await ssh.testConnection({ cfg: cfg });
          if (seq !== testingSeq) return;
          var result = response && response.ok ? response.value : null;
          if (result && result.stage === HOST_KEY_UNKNOWN_STAGE) {
            // TOFU: first pre-save test hits unknown; show the trust dialog and
            // retry (testConnectionForm re-reads the form values on retry).
            set({ formTesting: false });
            openHostKeyTrust({
              hostId: id + '',
              host: result.host,
              port: result.port,
              keyType: result.keyType,
              fingerprint: result.fingerprint,
              rawKeyBase64: result.rawKeyBase64,
              retry: function () { testConnectionForm(); }
            });
            return;
          }
          if (result && result.ok) {
            set({ formTesting: false, formTestResult: { ok: true, text: result.banner ? String(result.banner) : '' } });
          } else {
            var msg = result ? String(result.error || 'connection failed')
              : (response && response.error && response.error.message) || 'test connection failed';
            set({ formTesting: false, formTestResult: { ok: false, text: msg } });
          }
        } catch (e) {
          if (seq !== testingSeq) return;
          set({ formTesting: false, formTestResult: { ok: false, text: messageOf(e) } });
        }
      }

      return {
        store: store,
        load: load,
        setLoadError: setLoadError,
        setMountFailureSource: setMountFailureSource,
        beginAdd: beginAdd,
        beginEdit: beginEdit,
        cancelForm: cancelForm,
        patchForm: patchForm,
        saveForm: saveForm,
        requestDelete: requestDelete,
        cancelDelete: cancelDelete,
        confirmDelete: confirmDelete,
        testConnection: testConnection,
        dismissTest: dismissTest,
        dismissNotice: dismissNotice,
        testConnectionForm: testConnectionForm,
        dismissFormTest: dismissFormTest,
        hostKeyUnknownOf: hostKeyUnknownOf,
        openHostKeyTrust: openHostKeyTrust,
        cancelHostKeyTrust: cancelHostKeyTrust,
        trustAndRetry: trustAndRetry,
      };
    }

    // ---------- components ----------
    var CSS = ".dsh-hosts{display:flex;flex-direction:column;gap:12px;max-width:720px;padding:4px 2px 20px;font-size:13px;line-height:18px;color:var(--dsw-alias-label-primary,#e6e6e6)}" +
      ".dsh-hosts-header{display:flex;align-items:center;justify-content:space-between;gap:8px}" +
      // Title/intro stack: official _section lays them out as flex siblings with gap 12px.
      ".dsh-hosts-headtext{display:flex;flex-direction:column;gap:12px}" +
      // Typography mirrors the official settings section (AgentPresetSection.module.css,
      // dsh-client-ui-agent-preset): title 18/600, intro 13px tertiary, section gap 12px,
      // a group header in 12px/600 uppercase. The host rows themselves (.dsh-row*) stay as-is.
      ".dsh-hosts-title{margin:0;color:var(--dsw-alias-label-primary,#e6e6e6);font-size:18px;font-weight:600}" +
      ".dsh-hosts-intro{color:var(--dsw-alias-label-tertiary,#9a9a9a);margin:0;font-size:13px}" +
      ".dsh-hosts-group{flex-direction:column;gap:10px;display:flex}" +
      ".dsh-hosts-group+.dsh-hosts-group{margin-top:20px}" +
      ".dsh-hosts-groupHead{letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary,#9a9a9a);margin:0;font-size:12px;font-weight:600}" +
      ".dsh-hosts-error{display:flex;align-items:flex-start;gap:6px;padding:8px 10px;border-radius:10px;color:var(--dsw-alias-state-error-primary,#ef4444);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 12%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 30%,transparent);font-size:12px;line-height:16px;word-break:break-word}" +
      ".dsh-hosts-empty{display:flex;align-items:center;justify-content:center;min-height:120px;border:1px dashed var(--dsw-alias-border-l2,#36373b);border-radius:12px;color:var(--dsw-alias-label-tertiary,#9a9a9a);font-size:13px}" +
      ".dsh-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2,#36373b);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#1c1d21)}" +
      ".dsh-row-main{flex:1;min-width:0}" +
      ".dsh-row-name{font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".dsh-row-sub{display:flex;align-items:center;gap:6px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,#9a9a9a);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".dsh-pill{display:inline-flex;align-items:center;gap:3px;height:18px;padding:0 7px;border-radius:9px;font-size:10px;line-height:14px;color:var(--dsw-alias-label-secondary,#b8b8b8);background:var(--dsw-alias-bg-layer-2,#232529);border:1px solid var(--dsw-alias-border-l1,#2c2d31)}" +
      ".dsh-row-actions{display:flex;align-items:center;gap:4px;flex:none}" +
      ".dsh-test{display:flex;align-items:flex-start;gap:6px;padding:6px 10px;border-radius:10px;font-size:12px;line-height:16px;word-break:break-word;margin-left:12px}" +
      ".dsh-test.ok{color:var(--dsw-alias-state-success-primary,#22c55e);background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#22c55e) 10%,transparent)}" +
      ".dsh-test.err{color:var(--dsw-alias-state-error-primary,#ef4444);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 10%,transparent)}" +
      ".dsh-form{display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid var(--dsw-alias-border-l2,#36373b);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#1c1d21)}" +
      ".dsh-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}" +
      ".dsh-field{display:flex;flex-direction:column;gap:4px;min-width:0}" +
      ".dsh-field.full{grid-column:1 / -1}" +
      ".dsh-field-label{font-size:11px;line-height:14px;color:var(--dsw-alias-label-tertiary,#9a9a9a)}" +
      ".dsh-field-err{font-size:11px;line-height:14px;color:var(--dsw-alias-state-error-primary,#ef4444)}" +
      ".dsh-select{display:flex;align-items:center;gap:6px;flex:1 1 0%;min-width:0;height:32px;padding:0 8px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#36373b);background:var(--dsw-alias-bg-layer-2,#232529);color:var(--dsw-alias-label-primary,#e6e6e6);font-size:12px;line-height:16px;cursor:pointer;box-sizing:border-box}" +
      ".dsh-select:hover:not(:disabled){border-color:var(--dsw-alias-border-l1,#2c2d31);background:var(--dsw-alias-bg-layer-1,#1c1d21)}" +
      ".dsh-select:focus-visible,.dsh-select.open{border-color:var(--dsw-alias-brand-primary,#4c8dff);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary,#4c8dff) 25%,transparent)}" +
      ".dsh-select:disabled{opacity:.5;cursor:default}" +
      ".dsh-select-value{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}" +
      ".dsh-select-chevron{flex:none;color:var(--dsw-alias-label-tertiary,#9a9a9a);transition:transform .12s ease}" +
      ".dsh-select.open .dsh-select-chevron{transform:rotate(180deg)}" +
      ".dsh-select-wrap{display:flex;min-width:0}" +
      ".dsh-add-btn{white-space:nowrap;flex-shrink:0;min-width:0}" +
      ".dsh-form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:2px}" +
      ".dsh-hint{font-size:11px;line-height:14px;color:var(--dsw-alias-label-tertiary,#9a9a9a)}" +
      ".dsh-delete{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 35%,transparent);border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 8%,transparent)}" +
      ".dsh-delete-body{flex:1;font-size:12px;line-height:16px}" +
      ".dsh-delete-title{font-weight:600;color:var(--dsw-alias-label-primary,#e6e6e6)}" +
      ".dsh-delete-hint{color:var(--dsw-alias-label-tertiary,#9a9a9a);margin-top:2px}" +
      ".dsh-remote-dialog{width:min(560px,100%)}" +
      ".dsh-remote-pick,.dsh-remote-browse{display:flex;flex-direction:column;gap:10px;min-height:220px}" +
      ".dsh-remote-label{font-size:11px;line-height:14px;color:var(--dsw-alias-label-tertiary,#9a9a9a)}" +
      ".dsh-remote-empty{display:flex;align-items:center;justify-content:center;min-height:140px;padding:12px;border:1px dashed var(--dsw-alias-border-l2,#36373b);border-radius:12px;color:var(--dsw-alias-label-tertiary,#9a9a9a);font-size:13px;text-align:center}" +
      ".dsh-remote-hint{font-size:11px;line-height:14px;color:var(--dsw-alias-label-tertiary,#9a9a9a)}" +
      ".dsh-remote-pathbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap}" +
      ".dsh-remote-hostswitch{flex:none;min-width:180px;max-width:220px}" +
      ".dsh-remote-path{flex:1;min-width:0;font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary,#b8b8b8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}" +
      ".dsh-remote-path-input{flex:1;min-width:160px;height:32px;padding:0 8px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2,#36373b);border-radius:8px;background:var(--dsw-alias-bg-layer-2,#232529);color:var(--dsw-alias-label-primary,#e6e6e6);font-size:12px;line-height:16px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;outline:none}" +
      ".dsh-remote-path-input:focus{border-color:var(--dsw-alias-border-focus,#4ade80)}" +
      ".dsh-remote-list{display:flex;flex-direction:column;gap:2px;max-height:280px;overflow-y:auto}" +
      ".dsh-remote-row{display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary,#e6e6e6);font-size:13px;line-height:18px;text-align:left;cursor:pointer}" +
      ".dsh-remote-row:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2,#232529)}" +
      ".dsh-remote-row:disabled{opacity:.5;cursor:default}" +
      ".dsh-remote-row-file{cursor:default;color:var(--dsw-alias-label-tertiary,#9a9a9a)}" +
      ".dsh-remote-row-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".dsh-remote-error{display:flex;align-items:flex-start;gap:6px;padding:8px 10px;border-radius:10px;color:var(--dsw-alias-state-error-primary,#ef4444);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 12%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 30%,transparent);font-size:12px;line-height:16px;word-break:break-word}" +
      ".dsh-remote-actions{display:flex;justify-content:flex-end;gap:8px}" +
      ".dsh-flow{display:flex;flex-direction:column;gap:10px;min-height:0}" +
      ".dsh-tabs{display:flex;gap:4px;flex:none}" +
      ".dsh-tab{display:inline-flex;align-items:center;height:28px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2,#36373b);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#b8b8b8);font-size:12px;line-height:16px;cursor:pointer}" +
      ".dsh-tab:hover:not(.active){background:var(--dsw-alias-bg-layer-2,#232529)}" +
      ".dsh-tab.active{color:var(--dsw-alias-label-primary,#e6e6e6);background:var(--dsw-alias-bg-layer-2,#232529);border-color:var(--dsw-alias-border-l1,#2c2d31)}" +
      ".dsh-local-actions{display:flex;justify-content:flex-end;gap:8px}" +
      ".dsh-newfolder{display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid var(--dsw-alias-border-l2,#36373b);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#1c1d21)}" +
      ".dsh-newfolder-input{height:32px;padding:0 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#36373b);background:var(--dsw-alias-bg-layer-2,#232529);color:var(--dsw-alias-label-primary,#e6e6e6);font-size:13px;width:100%;box-sizing:border-box}" +
      ".dsh-saved-notice{color:var(--dsw-alias-state-success-primary,#22c55e);margin:0;font-size:12px;line-height:18px}" +
      ".dsh-statusnote{display:flex;align-items:flex-start;gap:6px;padding:6px 10px;border-radius:10px;font-size:12px;line-height:16px;word-break:break-word}" +
      ".dsh-statusnote.done{color:var(--dsw-alias-state-success-primary,#22c55e);background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#22c55e) 10%,transparent)}" +
      ".dsh-statusnote.error{color:var(--dsw-alias-state-error-primary,#ef4444);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 12%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 30%,transparent)}" +
      ".dsh-statusnote.warning{color:var(--dsw-alias-state-warn-primary,#d9a03d);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d9a03d) 12%,transparent)}" +
      ".dsh-statusnote.ongoing{color:var(--dsw-alias-state-business-primary,#4c8dff);background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4c8dff) 12%,transparent)}" +
      ".dsh-statusnote-text{flex:1;min-width:0}" +
      ".dsh-delete-modal{width:min(440px,100%)}" +
      ".dsh-trust-dialog{width:min(480px,100%)}" +
      ".dsh-trust{display:flex;flex-direction:column;gap:10px}" +
      ".dsh-trust-intro{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#9a9a9a);word-break:break-word}" +
      ".dsh-trust-row{display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:20px}" +
      ".dsh-trust-label{flex:none;width:76px;color:var(--dsw-alias-label-tertiary,#9a9a9a)}" +
      ".dsh-trust-value{flex:1;min-width:0;color:var(--dsw-alias-label-primary,#e6e6e6);word-break:break-all}" +
      ".dsh-trust-fp{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:20px;color:var(--dsw-alias-label-primary,#e6e6e6);word-break:break-all}" +
      ".dsh-trust-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}";
    if (typeof document !== "undefined") {
      var cssId = "@dsh-ssh/dsh-ssh/client.css";
      if (!document.querySelector("style[data-plugin-css='" + cssId + "']")) {
        var styleTag = document.createElement("style");
        styleTag.dataset.plugin = "@dsh-ssh/dsh-ssh";
        styleTag.dataset.pluginCss = cssId;
        styleTag.textContent = CSS;
        document.head.appendChild(styleTag);
      }
    }

    // Single semantic component consolidating the three bespoke status rows
    // (.dsh-test/.dsh-hosts-error/.dsh-remote-error): uses the official StateDot
    // (aria-hidden) with three-state coloring plus visible text.
    // state: done|error|warning|ongoing; optional detail, onRetry, onDismiss.
    function StatusNote(props) {
      var state = props.state || 'warning';
      var label = props.retryLabel || 'retry';
      var dismissLabel = props.dismissLabel || 'close';
      return React.createElement("div", {
        className: "dsh-statusnote " + state,
        role: state === 'error' ? 'alert' : 'status'
      },
        React.createElement(StateDot, { state: state }),
        React.createElement("span", { className: "dsh-statusnote-text" },
          props.text,
          props.detail ? React.createElement(React.Fragment, null, React.createElement("br", null), React.createElement("span", { style: { opacity: 0.8 } }, props.detail)) : null
        ),
        props.onRetry ? React.createElement(Button, { variant: "ghost", size: "sm", onClick: props.onRetry }, label) : null,
        props.onDismiss ? React.createElement("button", {
          type: "button",
          "aria-label": dismissLabel,
          onClick: props.onDismiss,
          style: { border: "none", background: "transparent", color: "inherit", cursor: "pointer", padding: 0, flex: "none" }
        }, React.createElement(IconCloseOutline16, { size: 14 })) : null
      );
    }

    function HostTestResult(props) {
      var result = props.result;
      if (!result) return null;
      var ok = result.ok;
      var state = ok ? 'done' : 'error';
      var label = ok
        ? (result.text ? result.text : props.t("testOk"))
        : props.t("testFail") + (result.text ? ": " + result.text : "");
      return React.createElement(StatusNote, {
        state: state,
        text: label,
        onDismiss: props.onDismiss,
        dismissLabel: props.t("cancel")
      });
    }

    // TOFU trust dialog for first-connecting to an unknown host: shows host/host:port,
    // key type and SHA256 fingerprint (monospaced + one-click copy); confirming calls
    // trustHostKey then auto-retries the original operation, while cancel just closes it.
    // info = { hostId, host, port, keyType, fingerprint, rawKeyBase64, trusting, error }.
    function TrustHostKeyModal(props) {
      var info = props.info;
      if (!info) return null;
      var t = props.t;
      var copiedState = React.useState(false);
      var copied = copiedState[0];
      var setCopied = copiedState[1];
      function copyFingerprint() {
        var fp = String(info.fingerprint || '');
        if (!fp) return;
        var done = function () { setCopied(true); setTimeout(function () { setCopied(false); }, 2000); };
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(fp).then(done, function () {});
        } else if (document) {
          var ta = document.createElement('textarea');
          ta.value = fp; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch (e) {}
          document.body.removeChild(ta);
          done();
        }
      }
      var host = String(info.host || '') + (info.port ? ':' + info.port : '');
      return React.createElement(Modal, {
        open: true,
        onClose: props.onCancel,
        title: t('trust.title'),
        closeLabel: t('trust.cancel'),
        className: 'dsh-trust-dialog',
        children: React.createElement('div', { className: 'dsh-trust' },
          React.createElement('div', { className: 'dsh-trust-intro' }, t('trust.intro', { host: host })),
          React.createElement('div', { className: 'dsh-trust-row' },
            React.createElement('span', { className: 'dsh-trust-label' }, t('trust.host')),
            React.createElement('span', { className: 'dsh-trust-value' }, host)
          ),
          React.createElement('div', { className: 'dsh-trust-row' },
            React.createElement('span', { className: 'dsh-trust-label' }, t('trust.keyType')),
            React.createElement('span', { className: 'dsh-trust-value' }, info.keyType || 'ssh-host-key')
          ),
          React.createElement('div', { className: 'dsh-trust-row' },
            React.createElement('span', { className: 'dsh-trust-label' }, t('trust.fingerprint')),
            React.createElement('span', { className: 'dsh-trust-fp', title: info.fingerprint }, info.fingerprint || ''),
            React.createElement(Button, {
              variant: 'ghost', size: 'sm', onClick: copyFingerprint,
              icon: copied ? React.createElement(IconCheckOutline16, { size: 14 }) : null
            }, copied ? t('trust.copied') : t('trust.copy'))
          ),
          info.error ? React.createElement(StatusNote, { state: 'error', text: t('trust.error') + ': ' + info.error }) : null,
          React.createElement('div', { className: 'dsh-trust-actions' },
            React.createElement(Button, { variant: 'outline', size: 'sm', disabled: info.trusting, onClick: props.onCancel }, t('trust.cancel')),
            React.createElement(Button, {
              variant: 'primary', size: 'sm', disabled: info.trusting,
              icon: info.trusting ? React.createElement(IconLoadingOutline16, { size: 14 }) : null,
              onClick: props.onTrust
            }, info.trusting ? t('trust.trusting') : t('trust.trust'))
          )
        )
      });
    }

    function HostRow(props) {
      var host = props.host;
      var id = host.id;
      var state = props.state;
      var t = props.t;
      var testing = state.testing && state.testing.id === id;
      var testResult = state.testResult && state.testResult.id === id ? state.testResult : null;
      var auth = displayAuthType(host);
      var secretSet = isHostSecretSet(state.secrets, id);
      var addr = maskHostAddress(host.host) + (host.port && host.port !== 22 ? ":" + host.port : "") + " · " + host.user;
      var authLabel = auth === 'password'
        ? (t("field.authPassword") + (secretSet ? " · " + t("passwordSet") : ""))
        : t("field.authKey");
      var testButton = React.createElement(Button, {
        variant: "outline",
        size: "sm",
        disabled: testing,
        icon: testing ? React.createElement(IconLoadingOutline16, { size: 14 }) : React.createElement(IconRefreshOutline16, { size: 14 }),
        onClick: function () { props.testConnection(id); },
        "data-test-connection": id
      }, testing ? t("testing") : t("test"));
      return React.createElement("div", null,
        React.createElement("div", { className: "dsh-row" },
          React.createElement("div", { className: "dsh-row-main" },
            React.createElement("div", { className: "dsh-row-name" }, displayHostTitle(host)),
            React.createElement("div", { className: "dsh-row-sub" },
              React.createElement("span", null, addr),
              React.createElement("span", { className: "dsh-pill" }, authLabel)
            )
          ),
          React.createElement("div", { className: "dsh-row-actions" },
            testButton,
            React.createElement(Button, {
              variant: "ghost",
              size: "sm",
              icon: React.createElement(IconEditOutline16, { size: 14 }),
              onClick: function () { props.beginEdit(id); }
            }, t("edit")),
            React.createElement(Button, {
              variant: "ghost",
              size: "sm",
              icon: React.createElement(IconTrashOutline16, { size: 14 }),
              onClick: function () { props.requestDelete(id); }
            }, t("delete"))
          )
        ),
        React.createElement(HostTestResult, { result: testResult, t: t, onDismiss: props.dismissTest })
      );
    }

    // custom select — official primitives.Menu as a styled dropdown
    // trigger (mirrors the old native <select> capsule via .dsh-select with DSH
    // theme tokens), so it matches dark/light themes and is fully keyboard
    // accessible (role=menu, Escape/outside-click close handled by Menu).
    // portal keeps the option list above any scrolling/clipping ancestor.
    function SelectMenu(props) {
      var openState = React.useState(false);
      var open = openState[0];
      var setOpen = openState[1];
      var options = props.options || [];
      var value = props.value;
      var disabled = props.disabled;
      var placeholder = props.placeholder;
      var selected = null;
      for (var i = 0; i < options.length; i++) {
        if (String(options[i].value) === String(value)) { selected = options[i]; break; }
      }
      var items = options.map(function (o) {
        return { id: String(o.value), label: o.label };
      });
      var anchor = React.createElement("button", {
        type: "button",
        className: "dsh-select" + (open ? " open" : ""),
        disabled: disabled,
        "aria-haspopup": "listbox",
        "aria-expanded": open,
        onClick: function (e) { e.stopPropagation(); setOpen(!open); }
      },
        React.createElement("span", { className: "dsh-select-value" }, selected ? selected.label : (placeholder || "")),
        React.createElement(IconChevronDownOutline14, { size: 14, className: "dsh-select-chevron" })
      );
      return React.createElement(Menu, {
        open: open,
        anchor: anchor,
        items: items,
        selectedId: selected ? String(selected.value) : undefined,
        align: "start",
        portal: true,
        className: "dsh-select-wrap",
        onSelect: function (id) {
          setOpen(false);
          props.onChange(id);
        },
        onClose: function () { setOpen(false); }
      });
    }

    function Field(props) {
      var label = props.label;
      var error = props.error;
      var errNode = error ? React.createElement("div", { className: "dsh-field-err" }, error) : null;
      var inputNode;
      if (props.kind === "select") {
        inputNode = React.createElement(SelectMenu, {
          value: props.value,
          disabled: props.disabled,
          options: props.options,
          onChange: props.onChange
        });
      } else {
        inputNode = React.createElement(Input, {
          className: "dsh-input",
          type: props.type || "text",
          value: props.value,
          placeholder: props.placeholder,
          disabled: props.disabled,
          autoComplete: props.autoComplete,
          onChange: function (e) { props.onChange(e.target.value); }
        });
      }
      return React.createElement("div", { className: "dsh-field" + (props.full ? " full" : "") },
        React.createElement("div", { className: "dsh-field-label" }, label),
        inputNode,
        errNode
      );
    }

    function HostForm(props) {
      var t = props.t;
      var state = props.state;
      var data = state.formData || {};
      var errors = state.formErrors || {};
      var editing = state.form && state.form.mode === 'edit';
      var secretSet = editing && isHostSecretSet(state.secrets, state.form.id);
      var err = function (key) { return errors[key] ? t("err." + errors[key]) : null; };
      var authOptions = [
        { value: "key", label: t("field.authKey") },
        { value: "password", label: t("field.authPassword") },
      ];
      var passwordField = data.authType === 'password'
        ? React.createElement("div", { className: "dsh-field full" },
            React.createElement("div", { className: "dsh-field-label" }, t("field.password")),
            React.createElement(Input, {
              type: "password",
              value: data.newPassword || "",
              placeholder: t("field.passwordPh"),
              autoComplete: "new-password",
              onChange: function (e) { props.patchForm({ newPassword: e.target.value }); }
            }),
            secretSet ? React.createElement("div", { className: "dsh-hint" }, t("passwordSet")) : null
          )
        : React.createElement("div", { className: "dsh-field full" },
            React.createElement("div", { className: "dsh-field-label" }, t("field.keyPath")),
            React.createElement(Input, {
              value: data.privateKeyPath || "",
              placeholder: t("field.keyPathPh"),
              onChange: function (e) { props.patchForm({ privateKeyPath: e.target.value }); }
            })
          );
      return React.createElement("div", { className: "dsh-form" },
        React.createElement("div", { className: "dsh-form-grid" },
          React.createElement(Field, {
            label: t("field.name"), value: data.name || "", placeholder: t("field.namePh"),
            error: err("name"), onChange: function (v) { props.patchForm({ name: v }); }
          }),
          React.createElement(Field, {
            label: t("field.host"), value: data.host || "", placeholder: t("field.hostPh"),
            error: err("host"), onChange: function (v) { props.patchForm({ host: v }); }
          }),
          React.createElement(Field, {
            label: t("field.port"), value: data.port || "", placeholder: "22",
            error: err("port"), onChange: function (v) { props.patchForm({ port: v }); }
          }),
          React.createElement(Field, {
            label: t("field.user"), value: data.user || "", placeholder: t("field.userPh"),
            error: err("user"), onChange: function (v) { props.patchForm({ user: v }); }
          }),
          React.createElement(Field, {
            kind: "select", full: true, label: t("field.auth"), value: data.authType || "key", options: authOptions,
            onChange: function (v) { props.patchForm({ authType: v }); }
          }),
          passwordField
        ),
        state.formTestResult ? React.createElement(StatusNote, {
          state: state.formTestResult.ok ? 'done' : 'error',
          text: state.formTestResult.ok
            ? (state.formTestResult.text ? state.formTestResult.text : t("testOk"))
            : t("testFail") + (state.formTestResult.text ? ": " + state.formTestResult.text : ""),
          onDismiss: props.dismissFormTest,
          dismissLabel: t("cancel")
        }) : null,
        React.createElement("div", { className: "dsh-form-actions" },
          React.createElement(Button, {
            variant: "outline", size: "sm", disabled: state.saving || state.formTesting,
            icon: state.formTesting ? React.createElement(IconLoadingOutline16, { size: 14 }) : React.createElement(IconRefreshOutline16, { size: 14 }),
            onClick: props.testConnectionForm
          }, state.formTesting ? t("testing") : t("test")),
          React.createElement(Button, { variant: "ghost", size: "sm", onClick: props.cancelForm }, t("cancel")),
          React.createElement(Button, {
            variant: "primary", size: "sm", disabled: state.saving || state.formTesting,
            className: "dsh-add-btn",
            onClick: props.saveForm
          }, editing ? t("save") : t("add"))
        )
      );
    }

    function SshHostsSection(props) {
      var state = props.useSshHosts(function (snap) { return snap; });
      var t = props.t;
      React.useEffect(function () {
        var mounted = true;
        props.load();
        return function () { mounted = false; };
      }, []);

      var hosts = sortedHosts(state.hosts);
      var rows = hosts.map(function (host) {
        return React.createElement(HostRow, {
          key: host.id,
          host: host,
          state: state,
          t: t,
          testConnection: props.testConnection,
          beginEdit: props.beginEdit,
          requestDelete: props.requestDelete,
          dismissTest: props.dismissTest,
        });
      });

      var errorText = state.error === 'conflict' ? t("err.conflict") : state.error;
      var errorNode = state.error ? React.createElement(StatusNote, { state: 'error', text: errorText }) : null;
      // "Saved" inline green notice (role=status + aria-live, the official savedNotice pattern).
      var noticeNode = state.notice ? React.createElement("p", { className: "dsh-saved-notice", role: "status", "aria-live": "polite" }, t("saved")) : null;

      var body;
      if (state.status === 'idle' || state.status === 'loading') {
        body = React.createElement("div", { className: "dsh-hosts-empty" }, t("loading"));
      } else if (state.status === 'error') {
        body = React.createElement("div", { className: "dsh-hosts-empty" }, t("loadError"));
      } else if (state.status === 'unavailable') {
        body = React.createElement("div", { className: "dsh-hosts-empty" }, t("unavailable"));
      } else if (state.status === 'ready') {
        if (hosts.length === 0 && !state.form) {
          // Value-directed empty state with a secondary nudge.
          body = React.createElement("div", { className: "dsh-hosts-empty" },
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4, alignItems: "center", textAlign: "center" } },
              React.createElement("div", null, t("empty")),
              React.createElement("div", { className: "dsh-hosts-intro" }, t("empty.first"))
            )
          );
        } else {
          body = React.createElement("section", { className: "dsh-hosts-group" },
            React.createElement("h3", { className: "dsh-hosts-groupHead" }, t("listLabel")),
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, rows)
          );
        }
      } else {
        body = null;
      }

      var readonlyNode = state.writable ? null : React.createElement("div", { className: "dsh-hosts-intro" }, t("readonly"));

      // Delete confirmation via a single official Modal; the title interpolates the host
      // name (locale bind supports {var}).
      var pendHost = null;
      if (state.pendingDelete != null) {
        for (var pi = 0; pi < hosts.length; pi++) {
          if (hosts[pi].id === String(state.pendingDelete)) { pendHost = hosts[pi]; break; }
        }
      }
      var deleteModal = state.pendingDelete != null ? React.createElement(Modal, {
        open: true,
        onClose: props.cancelDelete,
        title: t("confirmDelete", { name: displayHostTitle(pendHost) }),
        closeLabel: t("cancel"),
        description: t("confirmDeleteHint"),
        className: "dsh-delete-modal",
        footer: React.createElement(React.Fragment, null,
          React.createElement(Button, { variant: "outline", size: "sm", disabled: state.deleting, onClick: props.cancelDelete }, t("cancel")),
          React.createElement(Button, { variant: "primary", size: "sm", disabled: state.deleting, onClick: props.confirmDelete }, t("confirmDeleteAction"))
        )
      }) : null;

      return React.createElement(React.Fragment, null,
        React.createElement("div", { className: "dsh-hosts" },
          React.createElement("div", { className: "dsh-hosts-header" },
            React.createElement("div", { className: "dsh-hosts-headtext" },
              React.createElement("h2", { className: "dsh-hosts-title" }, t("title")),
              React.createElement("div", { className: "dsh-hosts-intro" }, t("intro"))
            ),
            state.form ? null : React.createElement(Button, {
              variant: "outline", size: "sm", disabled: !state.writable,
              className: "dsh-add-btn",
              icon: React.createElement(IconPlusOutline16, { size: 14 }),
              onClick: props.beginAdd
            }, t("add"))
          ),
          readonlyNode,
          noticeNode,
          errorNode,
          state.form ? React.createElement(HostForm, {
            state: state, t: t,
            patchForm: props.patchForm, saveForm: props.saveForm, cancelForm: props.cancelForm,
            testConnectionForm: props.testConnectionForm, dismissFormTest: props.dismissFormTest
          }) : body
        ),
        deleteModal,
        React.createElement(TrustHostKeyModal, {
          info: state.trustHostKey,
          t: t,
          onCancel: props.cancelTrust,
          onTrust: props.trustAndRetry
        })
      );
    }

    // ---------- combined directory-flow occupant ----------
    // Fills BOTH directoryFlow holes (conversation.hero.workspace /
    // sidebar.workspaces) at priority -1 — shadowing the stock browse picker,
    // which registers at default priority 0 (single slots are unique per
    // priority; lowest renders — dsh-client-ui-slots/lib/index.js:68-73,122).
    // One dialog, two tabs:
    //   local    — simplified local directory browser over the official wire
    //              face ctx.workspaces.listDirectory/createDirectory
    //              (dsh-client-runtime/lib/client.js:9956-9988). Entries are the
    //              host-side DIRECTORY children, name-sorted, so no client-side
    //              sort; showHidden is deliberately omitted (simplification).
    //   remote   — the remote directory-flow logic (pick host → browse →
    //              createPlaceholder → onPicked(localPath)).
    // Outcome contract: each open reports exactly ONE result. The combined
    // component owns the generation + reported refs (bumped on the open rising
    // edge during render — before the active tab's effects fire) and hands both
    // tabs the shared reportOutcome.
    function LocalFlowBody(props) {
      var t = props.t;
      var busy = props.busy;
      var onPicked = props.onPicked;
      var onCancel = props.onCancel;
      var onError = props.onError;
      var listDirectory = props.listDirectory;
      var createDirectory = props.createDirectory;
      var pickDirectory = props.pickDirectory;
      var nativeModeRef = props.nativeModeRef;
      var reportOutcome = props.reportOutcome;

      var cwdState = React.useState(null);
      var cwd = cwdState[0];
      var setCwd = cwdState[1];
      var homeState = React.useState('');
      var home = homeState[0];
      var setHome = homeState[1];
      var crumbsState = React.useState([]);
      var crumbs = crumbsState[0];
      var setCrumbs = crumbsState[1];
      var entriesState = React.useState([]);
      var entries = entriesState[0];
      var setEntries = entriesState[1];
      var loadingState = React.useState(false);
      var loading = loadingState[0];
      var setLoading = loadingState[1];
      var errorState = React.useState(null);
      var error = errorState[0];
      var setError = errorState[1];
      var creatingState = React.useState(false);
      var creating = creatingState[0];
      var setCreating = creatingState[1];
      var createErrorState = React.useState(null);
      var createError = createErrorState[0];
      var setCreateError = createErrorState[1];
      var newFolderState = React.useState(false);
      var newFolder = newFolderState[0];
      var setNewFolder = newFolderState[1];
      var draftState = React.useState('');
      var draft = draftState[0];
      var setDraft = draftState[1];
      var scanRef = React.useRef(null);
      // Native fallback: when the host has no browse capability, the local tab
      // switches to the system dialog (ctx.workspaces.pickDirectory). nativeModeRef
      // is owned by the parent and remembered across tab switches / remounts so
      // that listDirectory is not retried repeatedly.
      var nativeModeState = React.useState(false);
      var nativeMode = nativeModeState[0];
      var setNativeMode = nativeModeState[1];
      var nativeFiredRef = React.useRef(false);

      function failureText(err) {
        if (err && typeof err === 'object') {
          if (err.rpcError && err.rpcError.message) return String(err.rpcError.message);
          if (err.message) return String(err.message);
        }
        return String(err);
      }
      function supersede() {
        if (scanRef.current) {
          try { scanRef.current.abort(); } catch (e) {}
          scanRef.current = null;
        }
      }
      // Unified call into the injected listDirectory: a synchronous throw or a
      // returned promise both converge to a promise.
      function list(path) {
        var gen = props.generationRef.current;
        supersede();
        var controller = new AbortController();
        scanRef.current = controller;
        var request = path === undefined || path === null ? undefined : path;
        setLoading(true);
        setError(null);
        Promise.resolve().then(function () {
          return listDirectory(request, controller.signal);
        }).then(function (listing) {
          if (gen !== props.generationRef.current || scanRef.current !== controller) return;
          scanRef.current = null;
          setLoading(false);
          setCwd(listing && listing.path ? listing.path : null);
          setHome(listing && listing.home ? listing.home : '');
          setCrumbs(listing && Array.isArray(listing.crumbs) ? listing.crumbs : []);
          setEntries(listing && Array.isArray(listing.entries) ? listing.entries : []);
          setCreateError(null);
        }, function (err) {
          if (gen !== props.generationRef.current || scanRef.current !== controller) return;
          scanRef.current = null;
          if (isBrowseCapabilityError(err)) {
            // Host has no browse capability (composed picker serves only "native"):
            // enter the fallback UI only — never auto-open the system dialog; the
            // explicit "choose local folder…" button triggers it on click.
            enterNativeMode();
            return;
          }
          setLoading(false);
          setError(t('local.loadFailed') + (request ? ': ' + request : '') + ' — ' + failureText(err));
        });
      }
      React.useEffect(function () {
        // When the environment is known to have only a native directory picker,
        // skip listDirectory and enter the fallback UI directly (never auto-open the
        // system dialog — the remembered nativeModeRef, held by the owner, persists
        // across tab switches / multiple opens, but "popup on entry" is removed; an
        // explicit button click triggers it).
        if (nativeModeRef && nativeModeRef.current) {
          enterNativeMode();
        } else {
          list(undefined);
        }
        return function () { supersede(); };
      }, []);

      function goUp() {
        if (!cwd || loading || busy || crumbs.length < 2) return;
        list(crumbs[crumbs.length - 2].path);
      }
      function goHome() {
        if (loading || busy) return;
        list(undefined);
      }
      function enter(entry) {
        if (!entry || !entry.path || loading || busy) return;
        list(entry.path);
      }
      function retry() {
        if (loading || busy) return;
        list(cwd === null || cwd === undefined ? undefined : cwd);
      }
      function openCurrent() {
        if (!cwd || loading || busy) return;
        reportOutcome(onPicked, cwd);
      }
      function toggleNewFolder() {
        if (loading || busy) return;
        setCreateError(null);
        setNewFolder(!newFolder);
        if (!newFolder) setDraft('');
      }
      function createFolder() {
        var name = String(draft || '').trim();
        if (!cwd || creating || !name) return;
        var gen = props.generationRef.current;
        setCreating(true);
        setCreateError(null);
        Promise.resolve().then(function () {
          return createDirectory(cwd, name);
        }).then(function () {
          if (gen !== props.generationRef.current) return;
          setCreating(false);
          setNewFolder(false);
          setDraft('');
          list(cwd);
        }, function (err) {
          if (gen !== props.generationRef.current) return;
          setCreating(false);
          setCreateError(t('local.createFailed') + ': ' + failureText(err));
        });
      }
      function onDraftKeyDown(e) {
        if (e.key === 'Enter') { e.preventDefault(); createFolder(); }
      }

      // ---- native system-dialog fallback ----
      // The official native picker (dsh-client-ui-directory-picker-native/lib/client.js)
      // pops the system dialog exactly once on the open rising edge and reports one
      // result; align with that when browse capability is missing (marker hit): each
      // "enter local tab" triggers one pick whose result goes through the shared
      // reportOutcome (cancel → close the whole dialog; picked → onPicked; failure →
      // onError). The system dialog cannot create folders, so native mode does not
      // render "new folder" (matching the official native picker).
      function fireNativePick() {
        if (nativeFiredRef.current) return;
        nativeFiredRef.current = true;
        var gen = props.generationRef.current;
        var fn = pickDirectory;
        Promise.resolve().then(function () { return fn(); }).then(function (path) {
          if (gen !== props.generationRef.current) return;
          if (path === null || path === undefined) {
            // On cancel call the owner's cancel directly (it sets reported first,
            // then invokes the raw onCancel); not wrapped via reportOutcome, or the
            // cancel's reported self-check short-circuits and the dialog won't close.
            onCancel();
          } else {
            reportOutcome(onPicked, path);
          }
        }, function (err) {
          if (gen !== props.generationRef.current) return;
          reportOutcome(onError, failureText(err));
        });
      }
      // Split "entering the native fallback UI" from "triggering the system dialog"
      // into two separate actions: this only enters the fallback UI (showing
      // local.nativeHint + an explicit "choose local folder…" button) and never
      // auto-fires fireNativePick on mount (the system dialog never pops by itself;
      // it is user-triggered).
      function enterNativeMode() {
        if (nativeModeRef) nativeModeRef.current = true;
        setNativeMode(true);
        setLoading(false);
        setError(null);
        setCreateError(null);
        setNewFolder(false);
      }
      function pickNative() {
        nativeFiredRef.current = false;
        fireNativePick();
      }

      var rows;
      if (entries.length === 0) {
        rows = React.createElement('div', { className: 'dsh-remote-empty' }, t('local.empty'));
      } else {
        rows = React.createElement('div', { className: 'dsh-remote-list' }, entries.map(function (entry) {
          return React.createElement('button', {
            key: entry.path,
            type: 'button',
            className: 'dsh-remote-row',
            disabled: loading || busy,
            onClick: function () { enter(entry); },
            title: entry.path
          }, React.createElement(React.Fragment, null,
            React.createElement(IconFolderClose16, { size: 14 }),
            React.createElement('span', { className: 'dsh-remote-row-name' }, entry.name)));
        }));
      }
      var pathBar = React.createElement('div', { className: 'dsh-remote-pathbar' },
        React.createElement('span', { className: 'dsh-remote-path', title: cwd || home }, cwd || home),
        React.createElement(Button, { variant: 'ghost', size: 'sm', disabled: loading || busy, onClick: goHome }, t('local.home')),
        React.createElement(Button, { variant: 'ghost', size: 'sm', disabled: loading || busy || crumbs.length < 2, onClick: goUp }, t('local.up')),
        React.createElement(Button, { variant: 'ghost', size: 'sm', disabled: !cwd || loading || busy, onClick: toggleNewFolder }, t('local.newFolder'))
      );
      var errorNode = error ? React.createElement(StatusNote, {
        state: 'error',
        text: error,
        onRetry: retry,
        retryLabel: t('retry')
      }) : null;
      var createNode = newFolder ? React.createElement('div', { className: 'dsh-newfolder' },
        React.createElement('label', { className: 'dsh-remote-label' }, t('local.folderName')),
        React.createElement('input', {
          className: 'dsh-newfolder-input',
          value: draft,
          placeholder: t('local.folderName'),
          disabled: creating,
          autoFocus: true,
          onChange: function (e) { setDraft(e.target.value); },
          onKeyDown: onDraftKeyDown
        }),
        createError ? React.createElement(StatusNote, { state: 'error', text: createError }) : null,
        React.createElement('div', { className: 'dsh-local-actions' },
          React.createElement(Button, { variant: 'ghost', size: 'sm', disabled: creating, onClick: toggleNewFolder }, t('cancel')),
          React.createElement(Button, { variant: 'primary', size: 'sm', disabled: creating || !String(draft || '').trim(), onClick: createFolder }, t('local.create'))
        )
      ) : null;
      if (nativeMode) {
        // Native fallback UI: explanatory text + an explicit "choose local folder…"
        // button (clicking it pops the system dialog) + cancel — no directory list
        // and no "new folder", aligned with the official native picker.
        return React.createElement('div', { className: 'dsh-remote-browse' },
          React.createElement('div', { className: 'dsh-remote-hint' }, t('local.nativeHint')),
          React.createElement('div', { className: 'dsh-local-actions' },
            React.createElement(Button, {
              variant: 'primary',
              size: 'sm',
              disabled: busy,
              onClick: pickNative
            }, t('local.nativePick')),
            React.createElement(Button, {
              variant: 'ghost',
              size: 'sm',
              disabled: busy,
              onClick: onCancel
            }, t('cancel'))
          )
        );
      }
      return React.createElement('div', { className: 'dsh-remote-browse' },
        pathBar,
        rows,
        loading ? React.createElement('div', { className: 'dsh-remote-hint' }, t('local.loading')) : null,
        errorNode,
        createNode,
        React.createElement('div', { className: 'dsh-local-actions' },
          React.createElement(Button, { variant: 'outline', size: 'sm', disabled: busy, onClick: props.onCancel }, t('cancel')),
          React.createElement(Button, {
            variant: 'primary',
            size: 'sm',
            disabled: !cwd || loading || busy,
            onClick: openCurrent
          }, t('local.open'))
        )
      );
    }

    function RemoteFlowBody(props) {
      var t = props.t;
      var busy = props.busy;
      var onPicked = props.onPicked;
      var onError = props.onError;
      var reportOutcome = props.reportOutcome;
      var adoptingRef = props.adoptingRef;
      var onSelectHost = props.onSelectHost;
      var initialHostId = props.initialHostId;
      var ssh = {
        listHosts: props.listHosts,
        listRemoteDir: props.listRemoteDir,
        resolveRemoteHome: props.resolveRemoteHome,
        createPlaceholder: props.createPlaceholder,
        trustHostKey: props.trustHostKey,
      };

      // TOFU trust state for directory browsing (local state; the dialog is rendered
      // inside this component's returned Fragment).
      // trustInfo = { hostId, host, port, keyType, fingerprint, rawKeyBase64, retry, trusting, error }.
      var HKU_STAGE = 'host-key-unknown';
      var trustState = React.useState(null);
      var trustInfo = trustState[0];
      var setTrustInfo = trustState[1];
      // Detect host-key-unknown from a gateway response (the browse method returns it
      // as a "value" and the gateway wraps it as {ok:true, value:{ok:false,stage,...}}).
      function hostKeyInfoOf(response) {
        if (response && typeof response === 'object') {
          var value = response.ok === true ? response.value : response;
          if (value && typeof value === 'object' && value.stage === HKU_STAGE) return value;
        }
        return null;
      }
      function openTrust(info) {
        setTrustInfo({
          hostId: info.hostId, host: info.host, port: info.port, keyType: info.keyType,
          fingerprint: info.fingerprint, rawKeyBase64: info.rawKeyBase64,
          retry: info.retry, trusting: false, error: null
        });
      }
      function cancelTrust() { setTrustInfo(null); }
      function trustAndRetry() {
        if (!trustInfo) return;
        setTrustInfo(Object.assign({}, trustInfo, { trusting: true, error: null }));
        call('trustHostKey', trustInfo.hostId, trustInfo.rawKeyBase64, trustInfo.fingerprint).then(function (response) {
          if (!response || !response.ok) {
            setTrustInfo(Object.assign({}, trustInfo, { trusting: false, error: messageOfRemote(response, t('placeholderFailed')) }));
            return;
          }
          setTrustInfo(null);
          if (typeof trustInfo.retry === 'function') { try { trustInfo.retry(); } catch (e) {} }
        }, function (err) {
          setTrustInfo(Object.assign({}, trustInfo, { trusting: false, error: messageOf(err) }));
        });
      }

      var phaseState = React.useState('hosts');
      var phase = phaseState[0];
      var setPhase = phaseState[1];
      var hostsState = React.useState([]);
      var hosts = hostsState[0];
      var setHosts = hostsState[1];
      var hostIdState = React.useState('');
      var hostId = hostIdState[0];
      var setHostId = hostIdState[1];
      var cwdState = React.useState('');
      var cwd = cwdState[0];
      var setCwd = cwdState[1];
      var pathDraftState = React.useState('');
      var pathDraft = pathDraftState[0];
      var setPathDraft = pathDraftState[1];
      var entriesState = React.useState([]);
      var entries = entriesState[0];
      var setEntries = entriesState[1];
      var stackState = React.useState([]);
      var stack = stackState[0];
      var setStack = stackState[1];
      var loadingState = React.useState(false);
      var loading = loadingState[0];
      var setLoading = loadingState[1];
      var errorState = React.useState(null);
      var error = errorState[0];
      var setError = errorState[1];
      var pathErrorState = React.useState(null);
      var pathError = pathErrorState[0];
      var setPathError = pathErrorState[1];
      var loadErrorState = React.useState(null);
      var loadError = loadErrorState[0];
      var setLoadError = loadErrorState[1];
      var adoptingState = React.useState(false);
      var adopting = adoptingState[0];
      var setAdopting = adoptingState[1];
      var autoBrowseRef = React.useRef(false);
      var pathInputRef = React.useRef(null);

      // Unified call into the injected remote method: a synchronous throw or a
      // returned promise both converge to a promise.
      function call(name) {
        var args = Array.prototype.slice.call(arguments, 1);
        var fn = ssh[name];
        try {
          return Promise.resolve(fn.apply(ssh, args));
        } catch (err) {
          return Promise.reject(err);
        }
      }
      function messageOfRemote(response, fallback) {
        return response && response.error && response.error.message
          ? String(response.error.message)
          : (fallback || 'remote call failed');
      }

      // Load the host list (retryable): on failure set phase='error' and show an
      // inline error with a retry button instead of closing the dialog via
      // reportOutcome (avoids a dead end).
      function reloadHosts() {
        var gen = props.generationRef.current;
        setAdopting(false);
        setLoading(true);
        setError(null);
        setLoadError(null);
        setPhase('hosts');
        call('listHosts').then(function (response) {
          if (gen !== props.generationRef.current) return;
          setLoading(false);
          if (!response || !response.ok) {
            setPhase('error');
            setLoadError(messageOfRemote(response, t('loadHostsFailed')));
            return;
          }
          var dict = (response.value && response.value.hosts) || {};
          var list = [];
          for (var id in dict) {
            if (!Object.prototype.hasOwnProperty.call(dict, id)) continue;
            var entry = dict[id] && typeof dict[id] === 'object' ? dict[id] : {};
            list.push({ id: id, title: displayHostTitle(Object.assign({}, entry, { id: entry.id != null ? entry.id : id })) });
          }
          list.sort(function (a, b) {
            var an = String(a.title).toLowerCase();
            var bn = String(b.title).toLowerCase();
            return an < bn ? -1 : an > bn ? 1 : 0;
          });
          setHosts(list);
          setPhase(list.length === 0 ? 'empty' : 'hosts');
          // Restore the previously selected host (if any) — auto-enter browse only on
          // the initial load; a retry does not repeat it.
          if (!autoBrowseRef.current && initialHostId) {
            for (var ai = 0; ai < list.length; ai++) {
              if (String(list[ai].id) === String(initialHostId)) {
                autoBrowseRef.current = true;
                startBrowse(initialHostId);
                break;
              }
            }
          }
        }, function (err) {
          if (gen !== props.generationRef.current) return;
          setLoading(false);
          setPhase('error');
          setLoadError(messageOf(err));
        });
      }
      // On the open rising edge (component mounts with open=true): load the host
      // list; results are guarded by the shared generation.
      React.useEffect(function () {
        reloadHosts();
      }, []);

      function listInto(host, path, history) {
        var gen = props.generationRef.current;
        setLoading(true);
        setError(null);
        setPathError(null);
        call('listRemoteDir', host, path).then(function (response) {
          if (gen !== props.generationRef.current) return;
          setLoading(false);
          var hki = hostKeyInfoOf(response);
          if (hki) {
            // TOFU: directory-browse connection hits unknown; show the trust dialog,
            // then automatically retry listing the directory.
            openTrust({ hostId: host, host: hki.host, port: hki.port, keyType: hki.keyType, fingerprint: hki.fingerprint, rawKeyBase64: hki.rawKeyBase64, retry: function () { listInto(host, path, history); } });
            return;
          }
          if (!response || !response.ok) {
            setError(messageOfRemote(response, t('loadDirFailed') + ': ' + path));
            return;
          }
          setCwd(path);
          setPathDraft(path);
          setStack(history);
          setEntries(Array.isArray(response.value) ? response.value : []);
          setPhase('browse');
        }, function (err) {
          if (gen !== props.generationRef.current) return;
          setLoading(false);
          setError(messageOf(err));
        });
      }

      function startBrowse(host) {
        var gen = props.generationRef.current;
        setHostId(host);
        setPhase('browse');
        setLoading(true);
        setError(null);
        call('resolveRemoteHome', host).then(function (home) {
          if (gen !== props.generationRef.current) return;
          var hki = hostKeyInfoOf(home);
          if (hki) {
            // TOFU: directory-browse connection hits unknown; show the trust dialog,
            // then automatically retry resolveRemoteHome.
            setLoading(false);
            openTrust({ hostId: host, host: hki.host, port: hki.port, keyType: hki.keyType, fingerprint: hki.fingerprint, rawKeyBase64: hki.rawKeyBase64, retry: function () { startBrowse(host); } });
            return;
          }
          // The gateway wraps the host result as { ok: true, value: '/home/...' }; if
          // not unwrapped, home would remain an object, so read value and still verify
          // it is an absolute path.
          var resolved = unwrapRemoteResponse(home);
          if (typeof resolved === 'string' && resolved.startsWith('/')) {
            listInto(host, resolved, []);
          } else {
            setLoading(false);
            setError(remoteResponseError(home, t('loadDirFailed') + '（' + t('remoteResolveError') + '）'));
          }
        }, function (err) {
          if (gen !== props.generationRef.current) return;
          setLoading(false);
          setError(messageOf(err));
        });
      }

      function selectHost(id) {
        if (!id || loading || adopting) return;
        if (onSelectHost) onSelectHost(id);
        startBrowse(id);
      }
      function enterDir(entry) {
        if (!entry || entry.type !== 'dir' || loading || adopting) return;
        var next = stack.concat([cwd]);
        listInto(hostId, (cwd.endsWith('/') ? cwd : cwd + '/') + entry.name, next);
      }
      function parentPath(path) {
        var value = String(path || '').replace(/\/+$/, '') || '/';
        if (value === '/') return null;
        var slash = value.lastIndexOf('/');
        return slash <= 0 ? '/' : value.slice(0, slash);
      }
      function effectivePath() {
        var input = pathInputRef.current;
        return input && typeof input.value === 'string' ? input.value : (pathDraft || cwd);
      }
      function goBack() {
        if (loading || adopting) return;
        var parent = parentPath(effectivePath());
        if (parent) listInto(hostId, parent, []);
      }
      function goHome() {
        if (loading || adopting) return;
        startBrowse(hostId);
      }
      function normalizeRemotePath(path) {
        var parts = String(path).split('/');
        var kept = [];
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i];
          if (!part || part === '.') continue;
          if (part === '..') {
            if (kept.length > 0) kept.pop();
            continue;
          }
          kept.push(part);
        }
        return '/' + kept.join('/');
      }
      function navigatePath() {
        if (loading || adopting) return;
        var draft = String(effectivePath() || '').trim();
        if (!draft || draft.charAt(0) !== '/') {
          setPathError(t('invalidPath'));
          return;
        }
        var target = normalizeRemotePath(draft);
        setPathError(null);
        var history = target === cwd || !cwd ? stack : stack.concat([cwd]);
        listInto(hostId, target, history);
      }
      function pathKeyDown(event) {
        if (event.key !== 'Enter') return;
        if (event.isComposing || (event.nativeEvent && event.nativeEvent.isComposing)) return;
        event.preventDefault();
        navigatePath();
      }
      function retry() {
        if (cwd && !loading && !adopting) listInto(hostId, cwd, stack);
      }
      function adopt() {
        if (!cwd || loading || adopting || busy) return;
        var gen = props.generationRef.current;
        setAdopting(true);
        adoptingRef.current = true;
        setError(null);
        call('createPlaceholder', hostId, cwd).then(function (response) {
          if (gen !== props.generationRef.current) return;
          setAdopting(false);
          adoptingRef.current = false;
          if (!response || !response.ok) {
            setError(messageOfRemote(response, t('placeholderFailed')));
            return;
          }
          var value = response.value;
          var localPath = value && typeof value.localPath === 'string' ? value.localPath : null;
          if (!localPath) {
            setError(t('placeholderFailed') + ': missing localPath');
            return;
          }
          reportOutcome(onPicked, localPath);
        }, function (err) {
          if (gen !== props.generationRef.current) return;
          setAdopting(false);
          adoptingRef.current = false;
          setError(messageOf(err));
        });
      }

      var body = null;
      if (phase === 'hosts' || phase === 'empty' || phase === 'error') {
        var options = hosts.map(function (h) {
          return { value: h.id, label: h.title };
        });
        var emptyOrError = null;
        if (phase === 'error') {
          emptyOrError = React.createElement(StatusNote, {
            state: 'error',
            text: loadError || t('loadHostsFailed'),
            onRetry: function () { reloadHosts(); },
            retryLabel: t('retry')
          });
        } else if (phase === 'empty') {
          // Remote empty state: value-directed text + a "go add host" CTA (clicking it
          // cancels the dialog and guides the user to the settings page).
          emptyOrError = React.createElement('div', { className: 'dsh-remote-empty', style: { flexDirection: 'column', gap: 10 } },
            React.createElement('div', null, t('noHosts')),
            React.createElement(Button, {
              variant: 'outline', size: 'sm', disabled: busy,
              onClick: props.onCancel
            }, t('select.remote.emptyCTA'))
          );
        }
        body = React.createElement('div', { className: 'dsh-remote-pick' },
          React.createElement('label', { className: 'dsh-remote-label' }, t('host')),
          React.createElement(SelectMenu, {
            value: hostId,
            disabled: loading || phase === 'error',
            placeholder: t('hostPh'),
            options: options,
            onChange: function (id) { selectHost(id); }
          }),
          emptyOrError,
          loading ? React.createElement('div', { className: 'dsh-remote-hint' }, t('loading')) : null,
          React.createElement('div', { className: 'dsh-remote-actions' },
            React.createElement(Button, { variant: 'outline', size: 'sm', disabled: busy || adopting, onClick: props.onCancel }, t('cancel'))
          )
        );
      } else if (phase === 'browse') {
        var rows;
        if (entries.length === 0) {
          rows = React.createElement('div', { className: 'dsh-remote-empty' }, t('emptyDir'));
        } else {
          rows = React.createElement('div', { className: 'dsh-remote-list' }, entries.map(function (entry) {
            var isDir = entry.type === 'dir';
            var inner = isDir
              ? React.createElement(React.Fragment, null,
                  React.createElement(IconFolderClose16, { size: 14 }),
                  React.createElement('span', { className: 'dsh-remote-row-name' }, entry.name))
              : React.createElement('span', { className: 'dsh-remote-row-name dsh-remote-row-file' }, entry.name);
            return React.createElement(isDir ? 'button' : 'div', {
              key: entry.name,
              type: isDir ? 'button' : undefined,
              className: 'dsh-remote-row' + (isDir ? '' : ' dsh-remote-row-file'),
              disabled: isDir ? (loading || adopting) : undefined,
              onClick: isDir ? function () { enterDir(entry); } : undefined,
              title: entry.name + (entry.size !== undefined ? ' · ' + entry.size + ' B' : '')
            }, inner);
          }));
        }
        var curHostTitle = '';
        for (var ci = 0; ci < hosts.length; ci++) {
          if (String(hosts[ci].id) === String(hostId)) { curHostTitle = hosts[ci].title; break; }
        }
        // Keep the host selector interactive even when only one host is configured, so
        // the same control remains usable as hosts are added or the remembered host changes.
        var switchOptions = hosts.map(function (h) { return { value: h.id, label: h.title }; });
        var hostSwitcher = React.createElement('div', { className: 'dsh-remote-hostswitch' },
          React.createElement(SelectMenu, {
            value: hostId,
            disabled: loading || adopting,
            options: switchOptions,
            onChange: function (id) { selectHost(id); }
          })
        );
        var pathBar = React.createElement('div', { className: 'dsh-remote-pathbar' },
          hostSwitcher,
          React.createElement('input', {
            ref: pathInputRef,
            type: 'text',
            className: 'dsh-remote-path-input',
            value: pathDraft,
            disabled: loading || adopting,
            'aria-label': t('path'),
            title: t('path'),
            onChange: function (event) { setPathDraft(event.target.value); setPathError(null); },
            onKeyDown: pathKeyDown
          }),
          React.createElement(Button, { variant: 'ghost', size: 'sm', disabled: loading || adopting, onClick: navigatePath }, t('go')),
          React.createElement(Button, { variant: 'ghost', size: 'sm', disabled: loading || adopting, onClick: goHome }, t('home')),
          React.createElement(Button, {
            variant: 'ghost',
            size: 'sm',
            disabled: loading || adopting,
            onClick: goBack
          }, t('back'))
        );
        var pathErrorNode = pathError ? React.createElement(StatusNote, {
          state: 'error',
          text: pathError
        }) : null;
        var errorNode = error ? React.createElement(StatusNote, {
          state: 'error',
          text: error,
          onRetry: retry,
          retryLabel: t('retry')
        }) : null;
        body = React.createElement('div', { className: 'dsh-remote-browse' },
          pathBar,
          // Capability hint: a small line during directory browsing (falls back to
          // hostId when the host title is missing); reuses the .dsh-remote-hint style
          // (--dsw-alias-label-tertiary).
          React.createElement('div', { className: 'dsh-remote-hint' }, t('capHint', { host: curHostTitle || hostId })),
          rows,
          loading ? React.createElement('div', { className: 'dsh-remote-hint' }, t('loading')) : null,
          pathErrorNode,
          errorNode,
          React.createElement('div', { className: 'dsh-remote-actions' },
            React.createElement(Button, { variant: 'outline', size: 'sm', disabled: busy || adopting, onClick: props.onCancel }, t('cancel')),
            React.createElement(Button, {
              variant: 'primary',
              size: 'sm',
              disabled: !cwd || loading || busy || adopting,
              onClick: adopt
            }, adopting ? t('using') : t('use'))
          )
        );
      }
      var trustModal = trustInfo ? React.createElement(TrustHostKeyModal, {
        info: trustInfo,
        t: t,
        onCancel: cancelTrust,
        onTrust: trustAndRetry
      }) : null;
      return React.createElement(React.Fragment, null, body, trustModal);
    }

    // Tab / host memory: persisted in browser localStorage because the client cannot
    // write the plugin namespace via api.settings (the host hard-codes an allow-list)
    // and no write channel may be added to src/remote.js. Keys follow the
    // dsh-ssh.ui.lastWorkspaceTab / dsh-ssh.ui.lastHostId convention without touching
    // host-config validation. Survives page refreshes; when localStorage is unavailable
    // it silently degrades to session-only memory.
    var UI_TAB_KEY = 'dsh-ssh.ui.lastWorkspaceTab';
    var UI_HOST_KEY = 'dsh-ssh.ui.lastHostId';
    function uiRead(key) {
      try { return (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem(key) : null; }
      catch (e) { return null; }
    }
    function uiWrite(key, value) {
      try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(key, value); } catch (e) {}
    }

    function DirectoryFlowCombined(props) {
      var open = props.open;
      var busy = props.busy;
      var t = props.t;
      var onPicked = props.onPicked;
      var onCancel = props.onCancel;
      var onError = props.onError;

      // Default tab unresolved (null) until memory / host-count parsing; deciding
      // means resolution is in progress (light loading).
      var tabState = React.useState(null);
      var tab = tabState[0];
      var setTab = tabState[1];
      var decidingState = React.useState(false);
      var deciding = decidingState[0];
      var setDeciding = decidingState[1];
      var generation = React.useRef(0);
      var reported = React.useRef(false);
      var adoptingRef = React.useRef(false);
      var prevOpen = React.useRef(false);
      // Native-fallback memory for the local tab: set when the host has no browse
      // capability; prevents retrying listDirectory for the rest of this open across
      // tab switches / remounts (enters the fallback UI only, never auto-pops).
      var nativeModeRef = React.useRef(false);
      var openRef = React.useRef(open);
      openRef.current = open;
      // On the open rising edge reset the result guard. Done during render — before
      // child effects fire — so the active tab's initial request gets the new generation.
      if (open !== prevOpen.current) {
        prevOpen.current = open;
        if (open) {
          generation.current += 1;
          reported.current = false;
        }
      }
      function reportOutcome(fn, value) {
        if (reported.current) return;
        reported.current = true;
        fn(value);
      }
      function cancel() {
        if (busy || adoptingRef.current || reported.current) return;
        reportOutcome(onCancel, undefined);
      }

      // On the open rising edge resolve the default tab: restore memory first; with
      // no memory, default smartly by configured host count (listHosts non-empty →
      // remote, else local); render light loading while unresolved.
      React.useEffect(function () {
        if (!open) return;
        var remembered = uiRead(UI_TAB_KEY);
        if (remembered === 'local' || remembered === 'remote') {
          setTab(remembered);
          setDeciding(false);
          return;
        }
        setDeciding(true);
        setTab(null);
        Promise.resolve().then(function () { return props.listHosts(); }).then(function (response) {
          if (!openRef.current) return;
          var dict = response && response.ok && response.value ? response.value.hosts : null;
          var has = !!(dict && typeof dict === 'object' && Object.keys(dict).length > 0);
          setTab(has ? 'remote' : 'local');
          setDeciding(false);
        }, function () {
          if (!openRef.current) return;
          setTab('local');
          setDeciding(false);
        });
      }, [open]);

      // Persist the memory when the tab is switched manually.
      function selectTab(next) {
        setTab(next);
        uiWrite(UI_TAB_KEY, next);
      }
      function rememberHost(id) {
        if (id) uiWrite(UI_HOST_KEY, String(id));
      }

      if (!open) return null;

      var shared = {
        busy: busy,
        t: t,
        reportOutcome: reportOutcome,
        generationRef: generation,
      };
      var body;
      if (tab === null || deciding) {
        // Light loading while unresolved (renders no tab content and never pops the
        // system dialog).
        body = React.createElement('div', { className: 'dsh-remote-empty' },
          React.createElement(IconLoadingOutline16, { size: 14 }), ' ', t('loading'));
      } else if (tab === 'local') {
        body = React.createElement(LocalFlowBody, Object.assign({}, shared, {
          onPicked: onPicked,
          onCancel: cancel,
          onError: onError,
          listDirectory: props.listDirectory,
          createDirectory: props.createDirectory,
          pickDirectory: props.pickDirectory,
          nativeModeRef: nativeModeRef,
        }));
      } else {
        body = React.createElement(RemoteFlowBody, Object.assign({}, shared, {
          onPicked: onPicked,
          onCancel: cancel,
          onError: onError,
          adoptingRef: adoptingRef,
          listHosts: props.listHosts,
          listRemoteDir: props.listRemoteDir,
          resolveRemoteHome: props.resolveRemoteHome,
          createPlaceholder: props.createPlaceholder,
          trustHostKey: props.trustHostKey,
          onSelectHost: rememberHost,
          initialHostId: uiRead(UI_HOST_KEY) || '',
        }));
      }
      var tabBar = React.createElement('div', { className: 'dsh-tabs' },
        React.createElement('button', {
          type: 'button',
          className: 'dsh-tab' + (tab === 'local' ? ' active' : ''),
          onClick: function () { selectTab('local'); }
        }, t('tab.local')),
        React.createElement('button', {
          type: 'button',
          className: 'dsh-tab' + (tab === 'remote' ? ' active' : ''),
          onClick: function () { selectTab('remote'); }
        }, t('tab.remote'))
      );
      return React.createElement(Modal, {
        open: open,
        onClose: cancel,
        title: t('title'),
        closeLabel: t('cancel'),
        description: t('intro'),
        className: 'dsh-remote-dialog',
        children: React.createElement('div', { className: 'dsh-flow' },
          tabBar,
          body)
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Custom toolview for the bash tool card (a client-side override so the remote
    // placeholder cwd is displayed as a readable path).
    // ── Background ──
    // A remote-workspace session's cwd is a local placeholder directory
    // <root>/remote/<hostId>/<base64url(remote abs path)> (see src/router.js
    // mapRemoteToLocal / encodeRemotePath). The official bash card BashRow
    // (@deepseek-ai/dsh-client-ui-tool/lib/client.js:1146) displays only the last cwd
    // segment to the terminal promptLabel (primitives' promptLabel takes the last path
    // segment), so the user sees a base64 blob like
    // "L3Nydi93b3Jr".
    // ── Why it must be overridden client-side ──
    // The host-side presentCall only receives args (no session/routing context), and
    // the route depends on that base64 segment to decode the real remote path (the
    // directory name cannot change), so the bash tool view must be overridden on the
    // client.
    // ── Mechanism ──
    // 'tool.call.toolview' is a keyed slot (scope:session) dispatched by tool name
    // (dsh-client-ui-tool/lib/types/client/contract/slots.d.ts:20-25). The official bash
    // row registers key:'bash' at default priority 0 (dsh-client-ui-tool/lib/client.js:
    // 1252-1266); here the same key is registered at priority -1, and the lowest
    // priority renders (dsh-client-ui-slots/lib/index.js:68-73,122), taking over the
    // official bash view. The standard kit injects useSessions/sessionId/t etc. props
    // per session  — identical to what BashRow receives — so the official rendering can
    // be reproduced verbatim.
    // ── The single difference ──
    // Before rendering, the terminal card's cwd (its final displayed value) is decoded
    // from the remote placeholder: when it matches <...>/remote/<hostId>/<base64url>,
    // it is decoded into a readable remote path, otherwise returned as-is. A local
    // path never matches this shape, so its cwd passes through unchanged and displays
    // byte-identically to the official render (no regression).
    // The model/rendering logic is synced verbatim from
    // @deepseek-ai/dsh-client-ui-tool@0.1.0-rc.7 (pure display layer, no core changes;
    // follow the repo's existing "inlined verbatim copy" convention when syncing on
    // DSH upgrades).
    var SSH_BASH_CSS = {
      "ioLabel": "CY-8Ka_ioLabel",
      "chevron": "CY-8Ka_chevron",
      "leading": "CY-8Ka_leading",
      "ioSection": "CY-8Ka_ioSection",
      "chevronHover": "CY-8Ka_chevronHover",
      "inspectButton": "CY-8Ka_inspectButton",
      "iconIdle": "CY-8Ka_iconIdle",
      "card": "CY-8Ka_card",
      "ioCard": "CY-8Ka_ioCard",
      "sep": "CY-8Ka_sep",
      "title": "CY-8Ka_title",
      "terminal": "CY-8Ka_terminal",
      "bodyWrap": "CY-8Ka_bodyWrap",
      "ioText": "CY-8Ka_ioText",
      "root": "CY-8Ka_root",
      "ioDivider": "CY-8Ka_ioDivider",
      "errorSummary": "CY-8Ka_errorSummary",
      "visuallyHidden": "CY-8Ka_visuallyHidden",
      "summary": "CY-8Ka_summary"
    };
    // Join class names, skipping falsy ones (replaces clsx; keeps zero extra deps).
    function sshCx() {
      var out = "";
      for (var i = 0; i < arguments.length; i++) {
        if (arguments[i]) out = out === "" ? String(arguments[i]) : out + " " + String(arguments[i]);
      }
      return out;
    }
    // ── remote placeholder cwd → readable remote path (client mirror of the
    //    reversible determination in src/router.js) ──
    function sshIsValidHostId(s) {
      if (typeof s !== "string" || s.length === 0) return false;
      if (s === "." || s === "..") return false;
      return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(s);
    }
    function sshEncodeBase64Url(text) {
      var bytes = new TextEncoder().encode(String(text));
      var bin = "";
      for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    // base64url (or a plain base64 variant) → string; invalid / irreversible /
    // non-UTF-8 input returns null (falls back to the original text).
    function sshDecodeBase64Url(enc) {
      if (typeof enc !== "string" || enc.length === 0) return null;
      if (!/^[A-Za-z0-9_-]+$/.test(enc)) return null;
      var b64 = enc.replace(/-/g, "+").replace(/_/g, "/");
      var bin;
      try {
        bin = atob(b64);
      } catch (e) {
        return null;
      }
      var bytes = new Uint8Array(bin.length);
      for (var j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
      var text;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch (e) {
        return null;
      }
      // Reversibility guard: only accept when a round-trip matches (excludes ambiguity /
      // false positives; isomorphic with the router).
      if (sshEncodeBase64Url(text) !== enc) return null;
      return text;
    }
    // Rewrite a placeholder prefix of the form <...>/remote/<hostId>/<base64url> in cwd
    // into a readable remote absolute path; any trailing path segments (subdirectories
    // under the placeholder) are re-appended. Non-matching input is returned unchanged
    // (local display stays byte-identical).
    function sshDecodeRemoteCwd(cwd) {
      if (typeof cwd !== "string" || cwd === "") return cwd;
      var segments = cwd.split(/[\\/]/);
      for (var i = segments.length - 2; i >= 2; i--) {
        if (segments[i - 1] !== "remote") continue;
        var hostId = segments[i];
        var enc = segments[i + 1];
        if (!sshIsValidHostId(hostId) || enc === void 0) return cwd;
        var remote = sshDecodeBase64Url(enc);
        if (remote === null || remote.charAt(0) !== "/") return cwd;
        var suffix = segments.slice(i + 2).join("/");
        return suffix === "" ? remote : remote.replace(/[\\/]+$/, "") + "/" + suffix;
      }
      return cwd;
    }
    // ── The model/render logic below is synced verbatim from the official
    //    dsh-client-ui-tool (tool-call-model + bash-sample) ──
    var SSH_TOOL_VARIANTS = {
      bash: "bash", pwsh: "bash", read: "read", web_fetch: "read", web_search: "search",
      grep: "search", glob: "search", write: "write", edit: "edit", run_code: "code",
      cordis_package_inspect: "read", cordis_runtime_inspect: "read", cordis_run: "others",
      cordis_stop: "others", cordis_undefine: "others"
    };
    var SSH_TOOL_TITLES = {
      cordis_package_inspect: "Inspect", cordis_runtime_inspect: "Inspect", cordis_run: "Run Cordis Plugin",
      cordis_stop: "Stop Cordis Plugin", cordis_undefine: "Remove Cordis Plugin", pwsh: "Pwsh"
    };
    var SSH_VARIANT_TITLES = {
      search: "Search", read: "Read", bash: "Bash", write: "Write", edit: "Edit",
      code: "Code", others: "Tool call"
    };
    var SSH_SUMMARY_KEYS = {
      bash: ["description", "command"], read: ["path", "file_path"], search: ["query", "pattern", "url"],
      write: ["path", "file_path"], edit: ["path", "file_path"], code: ["description"], others: []
    };
    function sshClassifyTool(toolName) {
      return SSH_TOOL_VARIANTS[toolName] ?? "others";
    }
    function sshRelativizeToCwd(text, cwd) {
      if (cwd === void 0 || cwd === "") return text;
      var root = cwd.replace(/[\\/]+$/, "");
      if (text.startsWith(root + "/") || text.startsWith(root + "\\")) return text.slice(root.length + 1);
      return text;
    }
    function sshParseArgs(argsRaw) {
      try { return JSON.parse(argsRaw); } catch (e) { return; }
    }
    function sshFirstLine(text) {
      var nl = text.indexOf("\n");
      return nl === -1 ? text : text.slice(0, nl);
    }
    function sshPickString(args, keys) {
      for (var i = 0; i < keys.length; i++) { var v = args[keys[i]]; if (typeof v === "string" && v !== "") return v; }
    }
    function sshDeriveSummary(variant, argsRaw) {
      var parsed = sshParseArgs(argsRaw);
      if (typeof parsed !== "object" || parsed === null) return sshFirstLine(argsRaw);
      var picked = sshPickString(parsed, SSH_SUMMARY_KEYS[variant]);
      if (picked !== void 0) return sshFirstLine(picked);
      for (var k in parsed) { var v = parsed[k]; if (typeof v === "string" && v !== "") return sshFirstLine(v); }
      return sshFirstLine(argsRaw);
    }
    function sshDeriveFilePath(variant, argsRaw) {
      if (variant !== "read" && variant !== "write" && variant !== "edit") return void 0;
      var parsed = sshParseArgs(argsRaw);
      if (typeof parsed !== "object" || parsed === null) return void 0;
      var picked = sshPickString(parsed, ["path", "file_path"]);
      return picked === void 0 ? void 0 : sshFirstLine(picked);
    }
    function sshDeriveBody(variant, argsRaw) {
      if (argsRaw === "") return null;
      var parsed = sshParseArgs(argsRaw);
      if (parsed === void 0) return argsRaw;
      if (variant === "code" && typeof parsed === "object" && parsed !== null) {
        var code = parsed.code;
        if (typeof code === "string" && code !== "") return code;
      }
      return JSON.stringify(parsed, null, 2);
    }
    function sshResultText(node) {
      var parts = [];
      for (var i = 0; i < node.content.length; i++) {
        var block = node.content[i];
        if (block.type === "text") parts.push(block.text);
        else parts.push(JSON.stringify(block, null, 2));
      }
      if (parts.length === 0 && node.error !== void 0) parts.push(node.error.name + ": " + node.error.code);
      return parts.join("\n");
    }
    function sshToolRowModel(toolName, block) {
      var variant = sshClassifyTool(toolName);
      var done = "kind" in block;
      var argsRaw = (done ? block.call && block.call.argsRaw : block.argsRaw) ?? "";
      var state = !done ? "running" : block.error && block.error.code === "interrupted" ? "stopped" : block.isError ? "error" : "ok";
      var base = argsRaw === "" ? block.callId : sshRelativizeToCwd(sshDeriveSummary(variant, argsRaw), void 0);
      var toolTitle = SSH_TOOL_TITLES[toolName];
      var summary = variant === "others" && toolName !== "" && toolTitle === void 0 ? toolName + " · " + base : base;
      var output = done ? sshResultText(block) || null : null;
      var errorSummary = state === "error" && output !== null ? sshFirstLine(output) : null;
      return {
        variant: variant,
        title: toolTitle ?? SSH_VARIANT_TITLES[variant],
        summary: summary,
        filePath: sshDeriveFilePath(variant, argsRaw),
        body: sshDeriveBody(variant, argsRaw),
        output: output,
        errorSummary: errorSummary,
        state: state
      };
    }
    // ── Terminal card model (official terminalCardModel / resolveTerminalCwd /
    //    normalizeSegments / collapse) ──
    function sshCollapse(body, rooted, separator) {
      if (separator === void 0) separator = "/";
      var kept = [];
      var segs = body.split(/[\\/]/);
      for (var i = 0; i < segs.length; i++) {
        var segment = segs[i];
        if (segment === "" || segment === ".") continue;
        if (segment === "..") {
          if (kept.length > 0 && kept[kept.length - 1] !== "..") kept.pop();
          else if (!rooted) kept.push(segment);
          continue;
        }
        kept.push(segment);
      }
      return kept.join(separator);
    }
    function sshNormalizeSegments(path) {
      if (!/(?:^|[\\/])\.\.?(?:[\\/]|$)/.test(path)) return path;
      var unc = /^[\\/]{2}([^\\/]+)[\\/]+([^\\/]+)/.exec(path);
      if (unc !== null) {
        var matched = unc[0], server = unc[1], share = unc[2];
        var uncRoot = "\\\\" + server + "\\" + share;
        var rest = sshCollapse(path.slice(matched.length), true);
        return rest === "" ? uncRoot : uncRoot + "\\" + rest;
      }
      var separator = path.indexOf("\\") !== -1 && path.indexOf("/") === -1 ? "\\" : "/";
      var rooted = /^[\\/]/.test(path);
      var drive = (/^[A-Za-z]:/.exec(path) || [])[0] || "";
      var body = sshCollapse(path.slice(drive.length), rooted || drive !== "", separator);
      var leading = rooted ? separator : "";
      return drive === "" ? leading + body : drive + (rooted ? leading : separator) + body;
    }
    function sshResolveTerminalCwd(viewCwd, sessionCwd) {
      if (viewCwd === void 0 || viewCwd === "") return sessionCwd;
      if (sessionCwd === void 0 || sessionCwd === "") return sshNormalizeSegments(viewCwd);
      return sshNormalizeSegments(sshJoinWorkspace(sessionCwd, viewCwd));
    }
    // The official kit uses resolveWorkspacePath(sessionCwd, viewCwd) from
    // @deepseek-ai/dsh-client-runtime/client: absolute paths pass through unchanged,
    // relative paths are normalized against the workspace root (matching the semantics
    // the official bash resolves before executing).
    function sshJoinWorkspace(sessionCwd, viewCwd) {
      if (/^[\\/]/.test(viewCwd)) return viewCwd;
      var root = String(sessionCwd).replace(/[\\/]+$/, "");
      var sep = root.indexOf("\\") !== -1 && String(viewCwd).indexOf("/") === -1 ? "\\" : "/";
      return sshNormalizeSegments(root + sep + String(viewCwd));
    }
    function sshTerminalCardModel(block, sessionCwd) {
      var call = block.callView && block.callView.card === "terminal" ? block.callView : null;
      if (!("kind" in block)) {
        if (call === null) return null;
        return {
          description: call.description,
          card: {
            command: call.title,
            cwd: sshResolveTerminalCwd(call.cwd, sessionCwd),
            output: void 0, exitCode: void 0, signal: void 0, running: true
          }
        };
      }
      var result = block.resultView && block.resultView.card === "terminal" ? block.resultView : null;
      if (result === null) return null;
      return {
        description: call !== null ? call.description : void 0,
        card: {
          command: result.title ?? (call !== null ? call.title : void 0) ?? "",
          cwd: call === null ? void 0 : sshResolveTerminalCwd(call.cwd, sessionCwd),
          output: result.output,
          exitCode: result.exitCode,
          signal: result.signal,
          running: false
        }
      };
    }
    function sshTerminalFailed(model) {
      var card = model.card;
      return card.running !== true && (card.exitCode !== void 0 && card.exitCode !== 0 || card.signal !== void 0);
    }
    function sshTerminalBlockLabels(t) {
      return {
        signal: function (signal) { return t("terminal.signal", { signal: signal }); },
        exitCode: function (code) { return t("terminal.exitCode", { code: code }); },
        running: t("terminal.running"),
        failed: t("terminal.failed"),
        done: t("terminal.done"),
        copy: t("copy"),
        copied: t("copied"),
        noOutput: t("terminal.noOutput"),
        collapseAria: t("terminal.collapseAria"),
        collapse: t("collapse"),
        expandAria: function (hidden) { return t("terminal.expandAria", { n: hidden }); },
        expand: function (hidden) { return t("terminal.expandRest", { n: hidden }); }
      };
    }
    function sshLeadingFor(state) {
      if (state === "error") return React.createElement(primitives.StateDot, { state: "error" });
      if (state === "stopped") return React.createElement(primitives.StateDot, { state: "warning" });
      return React.createElement(primitives.IconApiOutline14, { size: 14 });
    }
    function sshStateStatus(state, t) {
      if (state === "running") return t("bash.running");
      if (state === "error") return t("bash.failed");
      if (state === "stopped") return t("bash.stopped");
      return null;
    }
    // ── BashSshRow: a verbatim reproduction of the official BashRow
    //    (dsh-client-ui-tool/lib/client.js:1146-1247); the only difference is that the
    //    cwd passed to the terminal card is first decoded from the remote placeholder
    //    (sshDecodeRemoteCwd); non-matching local input passes through unchanged, so
    //    the display matches the official one. ──
    function BashSshRow(props) {
      var toolName = props.toolName, block = props.block, sessionId = props.sessionId,
        useSessions = props.useSessions, inspect = props.inspect, t = props.t;
      var model = sshToolRowModel(toolName, block);
      var sessionCwd = useSessions ? useSessions(function (list) {
        return list.byId && list.byId[sessionId] ? list.byId[sessionId].cwd : void 0;
      }) : void 0;
      var terminal = sshTerminalCardModel(block, sessionCwd);
      // The only difference: only the terminal card's final displayed cwd string is
      // changed (decode placeholder → readable remote path).
      if (terminal !== null && terminal.card && typeof terminal.card.cwd === "string") {
        terminal.card.cwd = sshDecodeRemoteCwd(terminal.card.cwd);
      }
      var state = model.state === "ok" && terminal !== null && sshTerminalFailed(terminal) ? "error" : model.state;
      var status = sshStateStatus(state, t);
      var expandedState = React.useState(false);
      var expanded = expandedState[0];
      var setExpanded = expandedState[1];
      var genericError = terminal === null && model.state === "error" && (model.body !== null || model.output !== null);
      var expandable = terminal !== null || genericError;
      var open = expanded && expandable;
      var failureLine = model.state === "error" ? model.errorSummary : null;
      var toggleExpand = function () { setExpanded(function (v) { return !v; }); };
      var toggleFromKeyboard = function (event) {
        if (!expandable || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        toggleExpand();
      };
      var leading;
      if (open) {
        leading = React.createElement(primitives.IconChevronDownOutline14, { className: SSH_BASH_CSS.chevron });
      } else if (expandable) {
        leading = React.createElement(React.Fragment, null,
          React.createElement("span", { className: SSH_BASH_CSS.iconIdle }, sshLeadingFor(state)),
          React.createElement(primitives.IconChevronDownOutline14, { className: sshCx(SSH_BASH_CSS.chevron, SSH_BASH_CSS.chevronHover) }));
      } else {
        leading = sshLeadingFor(state);
      }
      var summaryText = failureLine !== null ? failureLine
        : terminal !== null && terminal.description !== void 0 ? terminal.description
        : model.summary;
      var root = React.createElement("div", {
        className: SSH_BASH_CSS.root,
        "data-sample": "bash",
        "data-variant": "bash",
        "data-state": state,
        "data-expandable": expandable || void 0,
        role: expandable ? "button" : void 0,
        tabIndex: expandable ? 0 : void 0,
        "aria-expanded": expandable ? open : void 0,
        onClick: expandable ? toggleExpand : void 0,
        onKeyDown: expandable ? toggleFromKeyboard : void 0
      },
        React.createElement("span", { className: SSH_BASH_CSS.leading }, leading),
        status !== null ? React.createElement("span", { className: SSH_BASH_CSS.visuallyHidden }, status) : null,
        React.createElement("span", { className: SSH_BASH_CSS.title }, model.title),
        React.createElement("span", { className: SSH_BASH_CSS.sep, "aria-hidden": true }),
        React.createElement("span", {
          className: sshCx(SSH_BASH_CSS.summary, failureLine !== null && SSH_BASH_CSS.errorSummary)
        }, summaryText));
      var bodyNode = null;
      if (open) {
        if (terminal !== null) {
          bodyNode = React.createElement(primitives.TerminalBlock, Object.assign({}, terminal.card, {
            maxLines: Infinity,
            labels: sshTerminalBlockLabels(t),
            className: SSH_BASH_CSS.terminal
          }));
        } else {
          bodyNode = React.createElement("div", { className: SSH_BASH_CSS.ioCard },
            model.body !== null ? React.createElement("div", { className: SSH_BASH_CSS.ioSection },
              React.createElement("span", { className: SSH_BASH_CSS.ioLabel }, "IN"),
              React.createElement("span", { className: SSH_BASH_CSS.ioText }, model.body)) : null,
            model.body !== null && model.output !== null ? React.createElement("span", { className: SSH_BASH_CSS.ioDivider, "aria-hidden": true }) : null,
            model.output !== null ? React.createElement("div", { className: SSH_BASH_CSS.ioSection },
              React.createElement("span", { className: SSH_BASH_CSS.ioLabel }, "OUT"),
              React.createElement("span", { className: SSH_BASH_CSS.ioText, "data-error": true }, model.output)) : null);
        }
        if (inspect !== void 0) {
          bodyNode = React.createElement(React.Fragment, null, bodyNode,
            React.createElement("button", { type: "button", className: SSH_BASH_CSS.inspectButton, onClick: inspect },
              React.createElement(primitives.IconInspectOutline12, null), "Inspect"));
        }
      }
      return React.createElement("div", { className: SSH_BASH_CSS.card },
        root,
        open ? React.createElement("div", { className: SSH_BASH_CSS.bodyWrap }, bodyNode) : null);
    }

    // ---------- registration ----------
    var inject = ["slots", "workspaces", "locale", "remote"];

    function apply(ctx) {
      ctx.effect(function () {
        return ctx.locale.register("settings.ssh", { zh: ZH, en: EN });
      }, "@dsh-ssh/dsh-ssh: settings section locale");

      // Readiness flag: ctx.remote.ssh must not be touched until $mount succeeds (a
      // property access itself throws a proxy error). The sshService reference is
      // captured by the ctx.inject child fiber below, not accessed directly from the
      // plugin fiber.
      var sshService = null;
      var mountFailure = null;
      function getSsh() { return sshService; }
      var sshT = ctx.locale.bind("settings.ssh");
      function remoteError() { return sshT('notReady') + (mountFailure ? ': ' + mountFailure : ''); }

      var controller = createController(ctx.remote, getSsh, remoteError);
      controller.setMountFailureSource(function () { return mountFailure; });

      // Mount the Typert remote contribution so ctx.remote.ssh.* works.
      // $mount registers its own effect on the caller fiber; the returned disposer
      // is for manual teardown only. The first load must wait for the mount to finish
      // (async); on mount failure the real cause is surfaced to the settings-page error
      // area (instead of being masked by remote.ssh's proxy error).
      var mountReady = ctx.remote.$mount(CLIENT_TYPERT_REMOTE).catch(function (err) {
        mountFailure = err && err.message ? String(err.message) : String(err);
        console.error("@dsh-ssh/dsh-ssh: typert remote mount failed:", err);
        controller.setLoadError(sshT('mountFail') + ': ' + mountFailure);
      });

      ctx.effect(function () {
        var refresh = function () { controller.load(); };
        var disposers = [
          ctx.remote.$on("settings/document-updated", function (ns) {
            if (ns !== HOSTS_NS) return;
            refresh();
          }),
          ctx.on("connection/reset", refresh),
        ];
        return function () {
          for (var i = 0; i < disposers.length; i++) disposers[i]();
        };
      }, "@dsh-ssh/dsh-ssh: settings refresh");

      // remote.ssh is registered by the api-gateway framework under a flattened key on
      // its own fiber; to access ctx.remote.ssh from the plugin fiber, the flattened key
      // must be explicitly injected (cf. dsh-client-runtime's inject "remote.commands").
      // Wait for readiness on a child fiber: adding it to the main inject directly
      // deadlocks (it waits on the service, which $mount inside apply registers). The
      // mount-failure path still surfaces the real cause via mountReady.catch above.
      ctx.inject(["remote.ssh"], function (sshCtx) {
        if (mountFailure !== null) return;
        sshService = sshCtx.remote.ssh;
        controller.load();
      });

      // directoryFlow occupant locale (workspace.ssh).
      ctx.effect(function () {
        return ctx.locale.register("workspace.ssh", { zh: SSH_ZH, en: SSH_EN });
      }, "@dsh-ssh/dsh-ssh: workspace ssh locale");

      var injected = function () {
        return {
          hooks: { sshHosts: controller.store },
          load: controller.load,
          beginAdd: controller.beginAdd,
          beginEdit: controller.beginEdit,
          cancelForm: controller.cancelForm,
          patchForm: controller.patchForm,
          saveForm: controller.saveForm,
          requestDelete: controller.requestDelete,
          cancelDelete: controller.cancelDelete,
          confirmDelete: controller.confirmDelete,
          testConnection: controller.testConnection,
          dismissTest: controller.dismissTest,
          dismissNotice: controller.dismissNotice,
          testConnectionForm: controller.testConnectionForm,
          dismissFormTest: controller.dismissFormTest,
          cancelTrust: controller.cancelHostKeyTrust,
          trustAndRetry: controller.trustAndRetry,
        };
      };

      ctx.slots.inject("settings.section", function () {
        return ctx.slots.register({
          name: "settings.section",
          id: "ssh-hosts",
          order: 40,
          label: function () { return ctx.locale.bind("settings.ssh")("nav"); },
          locale: "settings.ssh",
          inject: injected,
        }, SshHostsSection);
      });

      // Custom toolview for the bash tool card: the keyed slot 'tool.call.toolview' is
      // registered with key:'bash' at priority -1 and the lowest priority renders
      // (dsh-client-ui-slots/lib/index.js:68-73,122), taking over the official bash row
      // (which registers key:'bash' at default priority 0). The locale must be the
      // conversation namespace so t() inside BashSshRow resolves official keys like
      // bash.* / terminal.*.
      ctx.slots.inject("tool.call.toolview", function () {
        return ctx.slots.register({
          name: "tool.call.toolview",
          key: "bash",
          priority: -1,
          locale: "conversation",
        }, BashSshRow);
      });

      // Fill BOTH directoryFlow holes with the combined picker at
      // priority -1, shadowing the stock browse picker (registered at default
      // priority 0; a single slot is unique per priority and the lowest
      // renders — dsh-client-ui-slots/lib/index.js:68-73,122). Nested
      // slots.inject generator pattern (reference:
      // dsh-client-ui-directory-picker-browse/lib/client.js:1026-1035).
      // remoteCall guards a not-yet-mounted ctx.remote.ssh (the $mount above is
      // async) by rejecting instead of throwing synchronously. The local tab's
      // listDirectory/createDirectory ride the official client cable service
      // ctx.workspaces (dsh-client-runtime/lib/client.js:9956-9988).
      var remoteCall = function (name) {
        return function () {
          var args = Array.prototype.slice.call(arguments);
          var ssh = getSsh();
          if (!ssh || typeof ssh[name] !== 'function') {
            return Promise.reject(new Error(remoteError()));
          }
          return ssh[name].apply(ssh, args);
        };
      };
      var injectedFlow = function () {
        return {
          listHosts: remoteCall('listHosts'),
          listRemoteDir: remoteCall('listRemoteDir'),
          resolveRemoteHome: remoteCall('resolveRemoteHome'),
          createPlaceholder: remoteCall('createPlaceholder'),
          trustHostKey: remoteCall('trustHostKey'),
          listDirectory: function (path, signal) { return ctx.workspaces.listDirectory(path, signal); },
          createDirectory: function (path, name) { return ctx.workspaces.createDirectory(path, name); },
          // Native fallback: when the host has no browse capability, pop the system
          // dialog via the official native picker (dsh-client-runtime/lib/client.js:
          // 9954-9958, the same path the official native picker uses).
          pickDirectory: function () { return ctx.workspaces.pickDirectory(); },
          t: ctx.locale.bind("workspace.ssh"),
        };
      };
      ctx.slots.inject("conversation.hero.workspace.directoryFlow", function () {
        return ctx.slots.inject("sidebar.workspaces.directoryFlow", function* () {
          yield ctx.slots.register({
            name: "conversation.hero.workspace.directoryFlow",
            priority: -1,
            inject: injectedFlow,
          }, DirectoryFlowCombined);
          yield ctx.slots.register({
            name: "sidebar.workspaces.directoryFlow",
            priority: -1,
            inject: injectedFlow,
          }, DirectoryFlowCombined);
        });
      });
    }

    return { apply: apply, inject: inject };
  }
});
