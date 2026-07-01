---
name: plant-publish
description: >-
  PlanT 專案自動發布：跑 lint/typecheck/test/build、套用 Prisma migration、
  推送到 GitHub（alex870715/PlanT）。Use when the user asks to publish, release,
  deploy sync, push to GitHub, update database schema, or 發布/同步 PlanT.
---

# PlanT 自動發布

## 何時使用

使用者要求：發布、推 GitHub、同步遠端、更新資料庫 schema、release PlanT。

## 前置

- 工作目錄：`PlanT/`（`/Users/alexchen870715/sideproject/PlanT` 或 repo 內 PlanT 子目錄）
- **勿** commit `.env`（含 secrets）
- GitHub 目標：`https://github.com/alex870715/PlanT`（branch `main`）

## 標準流程（依序）

```bash
cd PlanT
npm run publish -- "feat: 簡述本次變更"
```

等同：

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`
5. 若 `.env` 有 `DATABASE_URL` → `db:generate` + `db:migrate:deploy`
6. `npm run push:github`（rsync 到 PlanT repo 並 push main）

### 選項

| 環境變數 | 效果 |
|----------|------|
| `SKIP_DB=1` | 略過 Prisma migrate |
| `SKIP_PUSH=1` | 只跑檢查與 build，不 push |
| 第一個參數 | Git commit message |

範例：

```bash
SKIP_DB=1 npm run publish -- "docs: update README"
DATABASE_URL="postgresql://..." npm run db:migrate:deploy   # 僅更新 DB
npm run push:github -- "fix: reorder sync"
```

## 失敗處理

| 失敗 | 處理 |
|------|------|
| lint/typecheck/test/build | 修錯後重跑 publish |
| migrate | 看 `npm run db:migrate:status`；本機可先 `db:push` 再 `migrate resolve` |
| push 拒絕 | 確認 GitHub 權限；勿 force push main |
| Resend/Auth 無關 | 發布不需 `.env` 進 git |

## Vercel 部署（push 之後）

1. Vercel 專案連到 `alex870715/PlanT`
2. Environment Variables：`DATABASE_URL`、`AUTH_SECRET`、`NEXTAUTH_URL`、（選填）`RESEND_API_KEY`、`AUTH_GOOGLE_*`
3. 部署後在 Neon/Vercel Postgres 執行：`DATABASE_URL=... npm run db:migrate:deploy`
4. `NEXTAUTH_URL` 必須與正式網域一致

## 相關檔案

| 路徑 | 用途 |
|------|------|
| `scripts/publish.sh` | 一鍵發布 |
| `scripts/push-to-github.sh` | rsync → PlanT repo → push |
| `scripts/start-db.sh` | 本機 Postgres |
| `.env.example` | 環境變數範本 |
| `prisma/schema.prisma` | Schema 來源 |
| `.github/workflows/ci.yml` | CI（lint/typecheck/test/build） |

## 發布前檢查清單

- [ ] README / `.env.example` 是否反映新功能
- [ ] 無 secrets 被 staged
- [ ] `npm run publish` 全綠
- [ ] 若改 schema，production `db:migrate:deploy` 已規劃
