# PlanT 🌱

**和朋友一起種出下一趟旅程。**

PlanT 是一款主打「分支式行程（主幹 Trunk＋分枝 Sprouts）」與「揪團滑卡選景點（Match）」的群組旅遊規劃工具，並可用 AI 產生童話風格的旅程故事書。

---

## 目錄

- [核心概念](#核心概念)
- [功能總覽](#功能總覽)
- [技術棧](#技術棧)
- [快速開始](#快速開始)
- [npm 指令](#npm-指令)
- [使用方式](#使用方式)
- [環境變數](#環境變數)
- [API 路由](#api-路由)
- [資料模型](#資料模型)
- [測試與 CI](#測試與-ci)
- [PWA](#pwa)
- [部署到 Vercel](#部署到-vercel)

---

## 核心概念

| 名詞 | 說明 |
|------|------|
| **Seed Code（種子碼）** | 每個旅程的 6 碼加入代碼，分享給朋友即可一起查看／協作 |
| **Trunk Route（主幹路線）** | 大家共用的主要行程（`isTrunk: true`） |
| **Sprouts（分枝）** | 個人的支線玩法（`isTrunk: false`） |
| **Grafting（嫁接）** | 把某個 Sprout 景點併入主幹行程 |
| **Match（揪團探索）** | 多人各自滑卡投票，截止後依票數自動長出一份共同行程 |

---

## 功能總覽

### 旅程入口（首頁）
- **建立新旅程**：選日期、命名，自動產生 Seed Code。
- **用 Seed Code 加入**：輸入 6 碼直接開啟既有旅程。
- **Match 探索**：依目的地滑卡選景點與美食，再一鍵建立旅程。

### 探索與揪團（Discover / Match）
- **滑卡探索**：左滑略過、右滑收藏，內建台北、東京、大阪、福岡、首爾、釜山等目的地卡組（景點＋美食）。
- **三種模式**：
  - **單人（solo）**：自己滑卡 → 直接生成行程。
  - **建立房間（create）**：開房並設定投票截止時間，分享房間碼揪團。
  - **加入房間（join）**：輸入房間碼一起投票。
- **投票整合性**：投票者名稱正規化、忽略大小寫去重（防止改大小寫灌票）、卡片 ID 驗證、基本 IP 速率限制。
- **揪團結算**：投票截止後，依各卡票數排序自動挑出「大家都想去」的景點，建立共同旅程。

### 工作區（Workspace `/trip/[seedCode]`）
- **每日時間軸**：依天分段、可拖曳排序景點（dnd-kit）。
- **互動地圖**（Leaflet）：
  - 標記點擊後彈出選單：**編輯景點 / 移動座標 / 探索美食與照片**（不再直接跳轉）。
  - **移動座標模式**：在地圖上重新放置景點位置。
  - 編輯景點時可「在地圖上點選位置」，暫時隱藏編輯框、跳到地圖選點。
- **新增景點面板**：
  - 無輸入 → 顯示「附近推薦」（依 Discover 目錄距離排序）。
  - 有輸入 → 即時呼叫 **OpenStreetMap Nominatim** 真實地點搜尋（含防抖、節流、快取）。
  - 以真實座標加入，或自訂名稱加入。
- **真實通勤估算（OSRM）**：景點間交通時間改用沿道路路線估算（開車/計程車採 OSRM 行車時間，其他模式以道路距離換算速度），失敗自動退回直線估算並標示來源。
- **自動排程**：依景點順序自動排入時間。
- **主幹／分枝與嫁接**：管理共用行程與個人支線，將支線景點併入主幹。
- **團員管理**：新增／移除旅程成員。
- **記帳分帳**：
  - 多幣別支援（TWD、JPY、KRW、USD、EUR、HKD、CNY、THB、SGD），依目的地自動帶入預設幣別，可隨時切換。
  - 金額以 `Decimal(12,2)` 儲存；JPY/KRW 等無小數幣別自動以整數計算與顯示。
  - 記錄「誰先付、誰參與平分」，自動計算每人份額、餘額與**最少筆數的建議轉帳**。
- **準備清單（Tasks）**：訂房、票券等待辦事項與金額。
- **AI 故事書**：把行程轉成童話風格的 Markdown 故事書。
- **景點小提示**：有 AI Key 時提供在地推薦，無 Key 時改用內建推薦＋Wikipedia 照片。

### 安全性
- 修改／刪除景點與團員的 API 會驗證 `x-plant-seed` 標頭，確認資源屬於該旅程。
- 高風險端點（建立旅程、加入收藏、記帳等）以 **zod** 做輸入驗證。

---

## 技術棧

- **Next.js 15**（App Router）+ TypeScript
- **Tailwind CSS 4** + shadcn/ui（emerald 主題）
- **Prisma** + PostgreSQL
- **Leaflet / react-leaflet**：互動地圖
- **dnd-kit**：拖曳排序
- **OpenAI**：故事書與景點推薦
- **OpenStreetMap Nominatim**：真實地點搜尋（免 API key）
- **OSRM**：沿道路路線／通勤時間估算
- **Vitest**：單元測試
- **GitHub Actions**：CI

---

## 快速開始

### 1. 安裝套件

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env`，至少設定資料庫連線：

```env
DATABASE_URL="postgresql://YOUR_MAC_USERNAME@localhost:5432/plant?schema=public"
# 選填：伺服器端 OpenAI 金鑰（一般使用者可改用 App 內「AI 設定」）
OPENAI_API_KEY=""
```

> 在 App 內開啟 **AI 設定**，選擇平台（ChatGPT / Gemini / Claude）並填入 API Key；金鑰只存在你的瀏覽器。沒有金鑰時，景點提示會使用**內建推薦＋Wikipedia 照片**。

### 3. 啟動 PostgreSQL

**方式 A — Homebrew（Mac 建議）**

```bash
brew install postgresql@16
brew services start postgresql@16
createdb plant   # 只需一次
```

**方式 B — Docker**

```bash
docker compose up -d
# DATABASE_URL="postgresql://plant:plant@localhost:5432/plant?schema=public"
```

**方式 C — 專案內建腳本**（當 `brew services` 失敗時很實用）

```bash
npm run db:start   # 啟動 Postgres，並在缺少時建立 plant 資料庫
```

### 4. 套用資料庫結構

```bash
npm run db:migrate:deploy   # 套用 migrations（建議）
# 或快速同步（不留 migration 紀錄）：
# npm run db:push
```

### 5. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)（若 3000 被占用，Next.js 會自動換到其他埠，終端機會顯示實際網址）。

---

## npm 指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器 |
| `npm run build` | 正式環境建置 |
| `npm run start` | 啟動正式環境伺服器 |
| `npm run lint` | ESLint 檢查 |
| `npm run typecheck` | TypeScript 型別檢查（`tsc --noEmit`） |
| `npm run test` | 執行單元測試（Vitest） |
| `npm run test:watch` | 監看模式測試 |
| `npm run db:generate` | 產生 Prisma Client |
| `npm run db:push` | 直接把 schema 同步到資料庫（不留 migration） |
| `npm run db:migrate` | 開發環境建立／套用 migration |
| `npm run db:migrate:deploy` | 正式環境套用既有 migrations |
| `npm run db:migrate:status` | 查看 migration 狀態 |
| `npm run db:studio` | 開啟 Prisma Studio |
| `npm run db:start` / `db:stop` | 啟動／停止本機 Postgres |
| `npm run db:seed:fukuoka` | 匯入福岡示範資料 |

---

## 使用方式

### A. 自己規劃一趟（單人）
1. 首頁點 **Match 探索** → 選 **單人** 模式。
2. 選日期、輸入目的地（如「福岡」），開始滑卡。
3. 右滑收藏喜歡的景點／美食，左滑略過。
4. 滑完後檢視收藏清單 → 建立旅程，自動導向工作區。

### B. 揪團一起選（Match）
1. 首頁 **Match 探索** → 選 **建立房間**，設定投票截止時間 → 取得房間碼。
2. 把房間碼分享給朋友；大家用 **加入房間** 各自滑卡投票。
3. 截止後按「建立旅程」，系統依票數挑出共同景點並生成行程。

### C. 在工作區協作
1. 用 **Seed Code** 開啟旅程（首頁輸入 6 碼）。
2. 在每日時間軸拖曳排序、按 **+** 新增景點（推薦或真實搜尋）。
3. 在地圖上點標記可 **編輯／移動座標／探索**。
4. 編輯景點時用「依路線估算時間」取得沿道路通勤時間。

### D. 記帳分帳
1. 工作區切到 **記帳** 區。
2. 右上選擇旅程幣別（依目的地預設）。
3. 新增每筆花費：項目、金額、先付的人、參與平分的人。
4. 系統自動算出每人餘額與**建議轉帳**。

### E. AI 故事書
- 在工作區按產生故事書，將行程輸出成童話風格 Markdown（需在 AI 設定填入金鑰）。

---

## 環境變數

| 變數 | 必填 | 說明 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 連線字串 |
| `OPENAI_API_KEY` | — | 伺服器端 OpenAI 金鑰（一般改用 App 內 AI 設定） |
| `OSRM_BASE_URL` | — | 自架 OSRM 伺服器；預設使用公開 demo `https://router.project-osrm.org` |
| `NEXT_PUBLIC_BASE_PATH` | — | 部署在子路徑時設定 |

> 圖片來源已在 `next.config.ts` 允許 `upload.wikimedia.org` 等 Wikipedia 網域。

---

## API 路由

### 旅程
| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/api/trip` | 建立旅程（自動產生 seedCode） |
| `GET` | `/api/trip/[seedCode]` | 取得旅程 |
| `PATCH` | `/api/trip/[seedCode]` | 更新旅程（如幣別） |
| `POST` | `/api/trip/[seedCode]/spot` | 新增主幹／分枝景點 |
| `PATCH` | `/api/trip/[seedCode]/reorder` | 重新排序景點 |
| `POST` | `/api/trip/[seedCode]/auto-schedule` | 自動排程 |
| `POST` | `/api/trip/[seedCode]/generate-booklet` | 產生 AI 故事書 |

### 景點與成員
| Method | Path | 說明 |
|--------|------|------|
| `PATCH` / `DELETE` | `/api/spot/[spotId]` | 更新／刪除景點（需 `x-plant-seed`） |
| `PATCH` | `/api/spot/[spotId]/graft` | 嫁接分枝 → 主幹 |
| `GET` | `/api/spot/[spotId]/recommendations` | 景點推薦 |
| `POST` | `/api/trip/[seedCode]/member` | 新增團員 |
| `PATCH` / `DELETE` | `/api/member/[memberId]` | 更新／刪除團員（需 `x-plant-seed`） |

### 記帳與待辦
| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/api/trip/[seedCode]/expense` | 新增花費 |
| `DELETE` | `/api/trip/[seedCode]/expense/[expenseId]` | 刪除花費 |
| `POST` | `/api/trip/[seedCode]/task` | 新增待辦 |
| `PATCH` / `DELETE` | `/api/trip/[seedCode]/task/[taskId]` | 更新／刪除待辦 |

### 探索與揪團
| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/api/discover` | 取得目的地卡組 |
| `POST` | `/api/discover/plant-trip` | 由收藏卡片建立旅程 |
| `POST` | `/api/match/room` | 建立揪團房間 |
| `GET` | `/api/match/room/[code]` | 房間狀態 |
| `GET` | `/api/match/room/[code]/deck` | 房間卡組（含票數） |
| `POST` | `/api/match/room/[code]/vote` | 投票 |
| `POST` | `/api/match/room/[code]/close` | 截止投票 |
| `POST` | `/api/match/room/[code]/plant` | 由投票結果建立旅程 |

### 地點與路線
| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/api/places/search` | Nominatim 地點搜尋 |
| `GET` | `/api/route` | OSRM 路線／通勤時間估算 |

---

## 資料模型

主要 Prisma model（見 `prisma/schema.prisma`）：

- **Trip**：旅程（`seedCode`、`currency`、起訖日）
- **Spot**：景點（座標、`isTrunk` 主幹/分枝、`scheduledAt`、`travelMode`/`travelMinutes`）
- **Member**：團員
- **TripExpense**：花費（`amount: Decimal(12,2)`、先付人、參與者）
- **TripTask**：準備清單待辦
- **MatchRoom** / 投票紀錄：揪團房間與投票

---

## 測試與 CI

- **單元測試**（Vitest）涵蓋：幣別格式化／四捨五入、記帳分帳、揪團投票去重、zod 驗證、路線估算等純函式。

```bash
npm run test
```

- **GitHub Actions**（`.github/workflows/ci.yml`）：每次 push / PR 到 `main` 會跑
  `install → prisma generate → lint → typecheck → test → build`。

---

## PWA

App 已提供 Web App Manifest（`/manifest.webmanifest`）與圖示，支援「加入主畫面」安裝為 standalone 應用，主題色為 emerald（`#059669`）。

---

## 部署到 Vercel

Vercel **不會**讀取本機 `.env`，需在儀表板設定雲端 PostgreSQL。

### 1. 建立雲端資料庫
擇一（皆支援 Prisma）：
- [Neon](https://neon.tech)（免費方案，Prisma 文件完整）
- [Supabase](https://supabase.com) → Project Settings → Database
- [Vercel Postgres](https://vercel.com/storage/postgres)

> Neon 在 serverless 建議使用 **pooled** 連線字串（host 含 `-pooler`）。

### 2. 在 Vercel 設定 `DATABASE_URL`
專案 → **Settings → Environment Variables** → 新增 `DATABASE_URL`（需 SSL 時加上 `?sslmode=require`）→ 啟用 Production → **Save** 後 **Redeploy**。

### 3. 套用資料庫結構（首次／schema 變動時）
從本機指向與 Vercel 相同的連線字串：

```bash
DATABASE_URL="postgresql://..." npm run db:migrate:deploy
```

> 本專案已提供 `prisma/migrations`，正式環境請用 `migrate deploy`（而非 `db push`），可避免「table does not exist」之類的 schema 不同步問題。

### 4. 驗證
重新部署後，`POST /api/trip` 應可成功。若出現 `Environment variable not found: DATABASE_URL`，代表變數名稱有誤或未在存檔後重新部署。

> 注意：`.env` 內的 `localhost` 連線只在本機有效，無法用於 Vercel。
