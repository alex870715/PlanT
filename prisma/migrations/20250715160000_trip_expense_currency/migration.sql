-- 舊 Neon DB 在 0_init 更新前建立，補上 TripExpense 多幣別欄位
ALTER TABLE "TripExpense" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'TWD';
ALTER TABLE "TripExpense" ADD COLUMN IF NOT EXISTS "exchangeRate" DECIMAL(16,6) NOT NULL DEFAULT 1;
