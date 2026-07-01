-- Trip: 主辦／PIN 欄位（PIN 已廢棄，保留 nullable 相容舊資料）
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "editPinHash" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "hostMemberId" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "hostUserId" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "hostEmail" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "setupTokenHash" TEXT;

-- Member: 登入帳號綁定
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "isHost" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- NextAuth
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- 舊 PIN / Magic Link（schema 保留，應用已改用 NextAuth）
CREATE TABLE IF NOT EXISTS "TripAccessGrant" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "memberId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TripMagicToken" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripMagicToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TripActivityLog" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "memberId" TEXT,
    "memberName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TripMemberPresence" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "lateMinutes" INTEGER,
    "spotId" TEXT,
    "message" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripMemberPresence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

CREATE INDEX IF NOT EXISTS "Member_userId_idx" ON "Member"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Member_tripId_userId_key" ON "Member"("tripId", "userId");

CREATE UNIQUE INDEX IF NOT EXISTS "TripAccessGrant_tokenHash_key" ON "TripAccessGrant"("tokenHash");
CREATE INDEX IF NOT EXISTS "TripAccessGrant_tripId_idx" ON "TripAccessGrant"("tripId");
CREATE UNIQUE INDEX IF NOT EXISTS "TripMagicToken_tokenHash_key" ON "TripMagicToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "TripMagicToken_tripId_idx" ON "TripMagicToken"("tripId");
CREATE INDEX IF NOT EXISTS "TripMagicToken_email_idx" ON "TripMagicToken"("email");
CREATE INDEX IF NOT EXISTS "TripActivityLog_tripId_createdAt_idx" ON "TripActivityLog"("tripId", "createdAt");
CREATE INDEX IF NOT EXISTS "TripMemberPresence_tripId_idx" ON "TripMemberPresence"("tripId");
CREATE UNIQUE INDEX IF NOT EXISTS "TripMemberPresence_tripId_memberId_key" ON "TripMemberPresence"("tripId", "memberId");

DO $$ BEGIN
  ALTER TABLE "Trip" ADD CONSTRAINT "Trip_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TripAccessGrant" ADD CONSTRAINT "TripAccessGrant_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TripAccessGrant" ADD CONSTRAINT "TripAccessGrant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TripMagicToken" ADD CONSTRAINT "TripMagicToken_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TripMagicToken" ADD CONSTRAINT "TripMagicToken_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TripActivityLog" ADD CONSTRAINT "TripActivityLog_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TripActivityLog" ADD CONSTRAINT "TripActivityLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TripMemberPresence" ADD CONSTRAINT "TripMemberPresence_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TripMemberPresence" ADD CONSTRAINT "TripMemberPresence_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
