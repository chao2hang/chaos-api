# BLBUI 发布说明

## 包列表

发布顺序必须保持依赖关系：

```text
@chaos_team/blbui-core
@chaos_team/blbui-react
@chaos_team/blbui-vue
@chaos_team/blbui-svelte
@chaos_team/blbui-business
@chaos_team/blbui-business-react
```

## GitHub Actions 发布

工作流：

```text
.github/workflows/publish-blbui.yml
```

触发方式：

```bash
git tag blbui-v0.1.0
git push origin blbui-v0.1.0
```

或者在 GitHub Actions 中手动执行 `Publish BLBUI packages`。

## NPM_TOKEN 方式

当前 workflow 为了支持首次创建 scoped package，使用 npm token 发布。需要在 GitHub 仓库中配置：

```text
Settings
→ Secrets and variables
→ Actions
→ New repository secret
→ Name: NPM_TOKEN
→ Value: npm_xxxxxxxxxxxxxxxxx
```

Token 建议使用 npm granular access token：

- 只允许发布目标 scope/package
- 设置合理过期时间
- 允许 package publish
- 如果账号启用了 2FA，使用适合 CI publish 的 automation/granular token 配置
- 不要把 token 写入仓库、workflow 文件、`.npmrc` 或日志

发布环境 `npm` 也可以单独配置同名 secret，这样可以通过 GitHub Environment approval 控制正式发布。

## Trusted Publishing / OIDC

更推荐的长期方案是 npm Trusted Publishing：

1. 在 npm package settings 中为每个 package 配置 GitHub Actions trusted publisher。
2. 指定仓库：`chao2hang/chaos-api`。
3. 指定 workflow 文件：`publish-blbui.yml`。
4. 指定发布环境：`npm`（如果启用 environment）。
5. 配置完成后可以移除 `NPM_TOKEN`，把 publish step 改为 npm 11.5.1+ 的 OIDC trusted publishing 模式。

注意：六个 package 是独立的 npm package，首次创建时必须分别确认 trusted publisher 或使用 token 完成首次发布。

## 本地检查

```bash
cd packages/blbui
bun install --frozen-lockfile
bun run typecheck
bun run check:svelte
bun run docs:check
bun run build:packages

npm pack --dry-run --prefix core
npm pack --dry-run --prefix react
npm pack --dry-run --prefix vue
npm pack --dry-run --prefix svelte
npm pack --dry-run --prefix business
npm pack --dry-run --prefix business-react
```

## 当前版本

当前 package version 是 `0.1.0`。已经发布后不能重复发布同一个版本，需要先统一修改六个 package 的 version，再创建新的 tag。
