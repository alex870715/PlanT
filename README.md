# PlanT 🌱

**和朋友一起種出下一趟旅程。**

PlanT 是一款主打「分支式行程（主幹 Trunk＋個人支線 Sprouts）」與「揪團滑卡選景點（Match）」的群組旅遊規劃工具，整合記帳分帳、訂位確認、互動地圖與 AI 故事書。

---

## 目錄

- [核心概念](#核心概念)
- [功能總覽](#功能總覽)
- [技術棧](#技術棧)
- [快速開始](#快速開始)
- [npm 指令](#npm-指令)
- [使用方式](#使用方式)
- [範例旅程](#範例旅程)
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
| **Seed Code（種子碼）** | 每個旅程的 6 碼代碼；有 Seed 即可**檢視**行程 |
| **Trunk Route（主幹路線）** | 大家共用的主要行程（`isTrunk: true`） |
| **Sprouts（個人支線）** | 各團員自己的加碼玩法（`isTrunk: false`，綁定 `memberId`） |
| **個人支線地圖串接** | 切到某團員的支線分頁時，地圖把主幹＋該人支線依時間交錯串成 `1 → S1 → 2 → 3` 折線 |
| **登入與加入** | NextAuth（Google / Email 魔法連結）登入後，在參與人區輸入名字**加入旅程**即可編輯 |
| **主辦人** | 建立或複製旅程者為主辦；可分享 Seed、移除團員 |
| **複製成我的旅程** | 從 Demo Seed 複製主線＋訂位待辦，產生新 Seed，不含原 NPC 團員 |
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
- **投票整合性**：投票者名稱正規化、忽略大小寫去重、卡片 ID 驗證、IP 速率限制。
- **主辦人截止投票**：只有主辦人可手動提前截止；在滑卡畫面與投完票摘要頁皆可操作。
- **揪團結算**：投票截止後，依各卡票數排序自動挑出「大家都想去」的景點，建立共同旅程。

### 工作區（Workspace `/trip/[seedCode]`）

工作區以 **三個分頁** 組織，避免資訊堆疊過亂：

| 分頁 | 內容 |
|------|------|
| 🗺️ **行程** | 時間軸、互動地圖、景點管理 |
| 📋 **訂位** | 訂位清單、收據上傳、團員確認 |
| 💰 **記帳** | 多幣別記帳、分帳結算、建議轉帳打勾 |

#### 行程分頁
- **出發日模式**（旅程期間自動啟用）：
  - 顯示今日主線＋你的個人支線路線。
  - 每站一鍵導航（Google Maps / Kakao / Apple Maps）。
  - **出發中 / 到了 / 晚到 N 分** 狀態回報，全團即時可見。
- **每日時間軸**：依天分段、可拖曳排序景點（dnd-kit）。
- **主線／個人支線分頁**：
  - **主線行程**：全團共用 Trunk。
  - **個人支線**：下拉選團員，只顯示該人的支線；切換即可預覽每個人的加碼玩法。
- **互動地圖**（Leaflet）：
  - 主線分頁：只顯示主幹路線。
  - 個人支線分頁：主幹＋該團員支線依 `scheduledAt` 交錯串接（`1 → S1 → 2 → S2 → 3`）。
  - 標記點擊：**編輯景點 / 移動座標 / 探索美食與照片**。
  - **移動座標模式**、**在地圖上點選位置**（編輯時暫時隱藏編輯框）。
- **新增景點面板**：
  - 無輸入 → 附近推薦（Discover 目錄距離排序）。
  - 有輸入 → **OpenStreetMap Nominatim** 即時搜尋（防抖、節流、快取）。
- **OSRM 通勤估算**：沿道路估算交通時間，失敗退回直線估算。
- **一鍵排程**：依景點順序自動排入時間。
- **團員管理**：登入後**加入旅程**（自訂名字）；主辦人可移除團員、新增規劃用 NPC 名稱。
- **複製成我的旅程**：從範例 Seed 一鍵複製主線與訂位待辦，你成為主辦人。
- **頁面配色**：左上角 7 組預設主題（森綠／海藍／夕照等），含地圖標記同步換色。
- **操作紀錄**：最近 30 筆協作動態（誰改了什麼、何時）。
- **協作同步**：每 20 秒輪詢；他人更新時頂部提示重新載入；編輯景點支援樂觀鎖（409 衝突提示）。
- **AI 故事書**：把行程轉成童話風格 Markdown。
- **景點小提示**：有 AI Key 時提供在地推薦，無 Key 時用內建推薦＋Wikipedia 照片。

#### 訂位清單分頁
- 每筆待辦可 **展開／收合**。
- **上傳收據／截圖**（JPG、PNG、WebP、GIF、PDF；圖片自動壓縮）。
- **團員確認**：各團員可打勾表示已看過訂位資訊／收據；全員確認後顯示提示。
- 備註欄（訂位時間、人數、確認碼等）、**負責人下拉選單**（從參與人選）、完成勾選。

#### 記帳分帳分頁
- **多幣別**：TWD、JPY、KRW、USD、EUR、HKD、CNY、THB、SGD；依目的地自動帶入預設幣別。
- **每筆花費可指定實際支付幣別＋匯率**，換算成旅程基準幣別後再分帳（例：機票台幣刷、現場韓元付）。
- 金額以 `Decimal` 儲存；JPY/KRW 等無小數幣別自動整數計算。
- 記錄「誰先付、誰參與平分」，自動計算餘額與**最少筆數建議轉帳**。
- **建議轉帳可打勾**：轉完帳標記完成，金額變動時自動取消勾選提醒重算。

### 帳號與權限

| 狀態 | 能做什麼 |
|------|----------|
| 只有 Seed | 僅檢視 |
| 已登入，未加入 | 僅檢視；可「複製成我的旅程」 |
| 已登入＋已加入 | 編輯行程、訂位、記帳 |
| 主辦人 | 上述全部＋移除團員、改幣別 |

登入方式：**Google**（需設定 OAuth）或 **Email 魔法連結**（Resend）。

### 安全性
- 編輯 API 需 NextAuth session ＋ 已加入該旅程的 Member。
- 主辦人專用操作（移除團員等）需 `host` 角色。
- 請求需帶 `x-plant-seed` 標頭（client 自動附加）。
- 高風險端點以 **zod** 做輸入驗證。

---

## 技術棧

- **Next.js 15**（App Router）+ TypeScript
- **Tailwind CSS 4** + shadcn/ui（7 組可切換主題）
- **NextAuth v4** + Prisma Adapter（Google / Email）
- **Prisma** + PostgreSQL
- **Resend**：Email 魔法連結
- **Leaflet / react-leaflet**：互動地圖
- **dnd-kit**：拖曳排序
- **OpenAI**：故事書與景點推薦
- **OpenStreetMap Nominatim**：真實地點搜尋
- **OSRM**：沿道路通勤時間估算
- **Vitest** + **GitHub Actions** CI
- **PWA**：Web App Manifest

---

## 快速開始

### 1. 安裝套件

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env`：

```env
DATABASE_URL="postgresql://YOUR_MAC_USERNAME@localhost:5432/plant?schema=public"

# NextAuth（必填）
AUTH_SECRET=""                    # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# Email 登入（Resend）
RESEND_API_KEY=""
EMAIL_FROM="PlanT <onboarding@resend.dev>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Google 登入（選填）
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

OPENAI_API_KEY=""
```

> 完整欄位見 `.env.example`。Resend 未驗證網域時，沙盒模式只能寄到註冊 Email；開發環境連結會印在終端機。

### 3. 啟動 PostgreSQL

```bash
npm run db:start   # 本機 Postgres + 建立 plant 資料庫
# 或：brew services start postgresql@16 && createdb plant
# 或：docker compose up -d
```

### 4. 套用資料庫結構

```bash
npm run db:push          # 本機快速同步
# 或 npm run db:migrate:deploy   # 正式環境建議
```

### 5. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)（埠號被占用時終端機會顯示實際網址）。

---

## npm 指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器 |
| `npm run build` | 正式環境建置 |
| `npm run start` | 啟動正式環境伺服器 |
| `npm run lint` | ESLint 檢查 |
| `npm run typecheck` | TypeScript 型別檢查 |
| `npm run test` | 單元測試（Vitest） |
| `npm run test:watch` | 監看模式測試 |
| `npm run db:generate` | 產生 Prisma Client |
| `npm run db:push` | schema 同步到資料庫（不留 migration） |
| `npm run db:migrate` | 開發環境建立／套用 migration |
| `npm run db:migrate:deploy` | 正式環境套用 migrations |
| `npm run db:migrate:status` | 查看 migration 狀態 |
| `npm run db:studio` | Prisma Studio |
| `npm run db:start` / `db:stop` | 啟動／停止本機 Postgres |
| `npm run db:seed:fukuoka` | 匯入福岡示範資料 |
| `npm run db:seed:busan` | 匯入釜山 10 人範例（Seed `000000`） |
| `npm run push:github` | 同步推送到 [GitHub PlanT](https://github.com/alex870715/PlanT) |
| `npm run publish` | lint → test → build →（可選）DB migrate → push GitHub |

---

## 使用方式

### A. 自己規劃（單人）
1. 首頁 **Match 探索** → **單人** → 選日期、目的地 → 滑卡。
2. 右滑收藏、左滑略過 → 建立旅程 → 進入工作區。

### B. 揪團一起選（Match）
1. **建立房間** → 設定投票截止 → 分享房間碼。
2. 朋友 **加入房間** 各自滑卡投票。
3. 主辦人可在滑卡或摘要頁 **提前截止投票** → 建立旅程。

### C. 工作區協作
1. 用 **Seed Code** 開啟旅程（Demo：`000000`）。
2. **登入** → 輸入名字 **加入旅程**（或 **複製成我的旅程** 當主辦）。
3. 分享 Seed 連結，朋友登入後同樣加入。
4. 旅程期間使用 **出發日模式**；**主線／個人支線** 分頁管理景點。
5. 左上角 **頁面設定** 可切換 7 組配色（含地圖標記）。

### D. 訂位清單（訂位分頁）
1. 確認已 **加入旅程**。
2. 展開某一筆 → **上傳** 訂位確認信、收據或截圖。
3. **負責人** 從參與人下拉選單指定。
4. 各團員看過後點自己名字 **打勾確認**。

### E. 記帳分帳（記帳分頁）
1. 右上選旅程 **基準幣別**。
2. 新增花費：若實際付的是別種幣（如台幣刷機票），選幣別並填 **匯率**。
3. 查看結算與 **建議轉帳**；轉完可 **打勾** 標記已完成。

### F. AI 故事書
- 工作區右上角產生故事書（需 AI 設定填入金鑰）。

---

## 範例旅程

匯入 10 人釜山示範行程（含主幹、個人支線、混合幣別記帳、訂位待辦）：

```bash
npm run db:seed:busan
```

開啟 [http://localhost:3000/trip/000000](http://localhost:3000/trip/000000)

| 項目 | 內容 |
|------|------|
| Seed Code | `000000` |
| 團員 | 10 人 |
| 主幹 | 13 站（機場、甘川洞、海雲台…） |
| 個人支線 | 怡君、Kevin、Nina、宥廷 各有支線（地圖可串接預覽） |
| 記帳 | 12 筆（機票/飯店台幣刷＋現場韓元） |
| 訂位 | 8 筆待辦 |

---

## 環境變數

| 變數 | 必填 | 說明 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 連線字串 |
| `AUTH_SECRET` | ✅ | NextAuth 簽章（`openssl rand -base64 32`） |
| `NEXTAUTH_URL` | ✅ | 本站 URL（本機 `http://localhost:3000`） |
| `NEXT_PUBLIC_APP_URL` | 建議 | 對外連結基底（Email 回跳） |
| `RESEND_API_KEY` | Email 登入 | Resend API Key |
| `EMAIL_FROM` | Email 登入 | 寄件者；未驗證網域用 `PlanT <onboarding@resend.dev>` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | 選填 | Google OAuth |
| `OPENAI_API_KEY` | — | 伺服器端 OpenAI（一般用 App 內 AI 設定） |
| `OSRM_BASE_URL` | — | 自架 OSRM；預設 `https://router.project-osrm.org` |
| `NEXT_PUBLIC_BASE_PATH` | — | 部署在子路徑時設定 |

---

## API 路由

### 旅程
| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/api/trip` | 建立旅程（登入者自動為主辦） |
| `GET` | `/api/trip/[seedCode]` | 取得旅程 |
| `PATCH` | `/api/trip/[seedCode]` | 更新旅程（如幣別） |
| `POST` | `/api/trip/[seedCode]/join` | 登入後加入旅程 |
| `POST` | `/api/trip/[seedCode]/fork` | 複製成我的旅程 |
| `GET` | `/api/trip/[seedCode]/auth/status` | 登入／加入狀態 |
| `GET` | `/api/trip/[seedCode]/sync?since=` | 輕量同步檢查 |
| `POST` | `/api/trip/[seedCode]/presence` | 回報出發中／到了／晚到 |
| `POST` | `/api/trip/[seedCode]/spot` | 新增景點 |
| `PATCH` | `/api/trip/[seedCode]/reorder` | 重新排序 |
| `POST` | `/api/trip/[seedCode]/auto-schedule` | 自動排程 |
| `POST` | `/api/trip/[seedCode]/generate-booklet` | AI 故事書 |

### 景點與成員
| Method | Path | 說明 |
|--------|------|------|
| `PATCH` / `DELETE` | `/api/spot/[spotId]` | 更新／刪除景點 |
| `PATCH` | `/api/spot/[spotId]/graft` | 嫁接支線 → 主幹（進階） |
| `GET` | `/api/spot/[spotId]/recommendations` | 景點推薦 |
| `POST` | `/api/trip/[seedCode]/member` | 新增團員 |
| `PATCH` / `DELETE` | `/api/member/[memberId]` | 更新／刪除團員 |

### 記帳
| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/api/trip/[seedCode]/expense` | 新增花費（支援 `currency`、`exchangeRate`） |
| `DELETE` | `/api/trip/[seedCode]/expense/[expenseId]` | 刪除花費 |
| `POST` | `/api/trip/[seedCode]/settlement` | 標記／取消建議轉帳完成 |

### 訂位待辦
| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/api/trip/[seedCode]/task` | 新增待辦 |
| `PATCH` / `DELETE` | `/api/trip/[seedCode]/task/[taskId]` | 更新／刪除 |
| `POST` | `/api/trip/[seedCode]/task/[taskId]/attachment` | 上傳收據／截圖 |
| `GET` / `DELETE` | `/api/trip/[seedCode]/task/[taskId]/attachment/[id]` | 讀取／刪除附件 |
| `POST` | `/api/trip/[seedCode]/task/[taskId]/confirm` | 團員確認／取消 |

### 探索與揪團
| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/api/discover` | 目的地卡組 |
| `POST` | `/api/discover/plant-trip` | 由收藏建立旅程 |
| `POST` | `/api/match/room` | 建立揪團房間 |
| `GET` | `/api/match/room/[code]` | 房間狀態 |
| `GET` | `/api/match/room/[code]/deck` | 卡組（含票數） |
| `POST` | `/api/match/room/[code]/vote` | 投票 |
| `POST` | `/api/match/room/[code]/close` | 截止投票 |
| `POST` | `/api/match/room/[code]/plant` | 由投票建立旅程 |

### 地點與路線
| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/api/places/search` | Nominatim 地點搜尋 |
| `GET` | `/api/route` | OSRM 通勤時間 |

---

## 資料模型

主要 Prisma model（`prisma/schema.prisma`）：

| Model | 說明 |
|-------|------|
| **Trip** | 旅程（`seedCode`、`currency`、`hostUserId`…） |
| **Member** | 團員（`userId` 綁定登入帳號、`isHost`） |
| **User** / **Session** / **Account** | NextAuth 使用者與 session |
| **Spot** | 景點（座標、`isTrunk`、`memberId`、`scheduledAt`、交通欄位） |
| **TripExpense** | 花費（`amount`、`currency`、`exchangeRate`、先付人、參與者） |
| **TripSettlement** | 建議轉帳完成狀態 |
| **TripTask** | 訂位／待辦 |
| **TripTaskAttachment** | 待辦附件（收據、截圖、PDF） |
| **TripTaskConfirmation** | 待辦團員確認 |
| **TripActivityLog** | 操作紀錄（誰、做了什麼、何時） |
| **TripMemberPresence** | 出發日即時狀態 |
| **MatchRoom** / **MatchVote** | 揪團房間與投票 |

---

## 測試與 CI

```bash
npm run test
```

涵蓋：幣別格式化、記帳分帳、投票去重、zod 驗證、路線估算等。

GitHub Actions（`.github/workflows/ci.yml`）：`lint → typecheck → test → build`。

---

## PWA

Web App Manifest + 圖示，可「加入主畫面」安裝；主題色隨頁面配色設定變化。

---

## 發布到 GitHub

本 repo 獨立於 monorepo，使用 rsync 同步：

```bash
npm run publish -- "feat: 說明本次變更"
```

或僅推送：

```bash
npm run push:github -- "docs: update README"
```

Cursor 可使用 skill **plant-publish**（`.cursor/skills/plant-publish/SKILL.md`）自動執行完整流程。

---

## 部署到 Vercel

### 1. 雲端資料庫
[Neon](https://neon.tech) / Supabase / Vercel Postgres，取得 `DATABASE_URL`（Neon 建議用 pooled 連線）。

### 2. Vercel 環境變數
Settings → Environment Variables：

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`（正式網域，如 `https://your-app.vercel.app`）
- `NEXT_PUBLIC_APP_URL`（同上）
- （選填）`RESEND_API_KEY`、`EMAIL_FROM`、`AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`

→ Redeploy

### 3. 套用 schema

```bash
DATABASE_URL="postgresql://..." npm run db:migrate:deploy
```

若資料庫已有舊 schema 但無 `_prisma_migrations`（P3005），請先 `db push` 同步欄位，再以 `prisma migrate resolve --applied 0_init` 標記 baseline。

### 4. 驗證
重新部署後 `POST /api/trip` 應可成功建立旅程。

> 附件目前存於資料庫（適合 demo）；正式大量上傳建議改 S3 / Vercel Blob。
