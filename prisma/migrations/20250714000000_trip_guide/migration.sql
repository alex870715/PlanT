CREATE TABLE IF NOT EXISTS "TripGuide" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "bookletMarkdown" TEXT NOT NULL,
    "pttMarkdown" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripGuide_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TripGuide_tripId_key" ON "TripGuide"("tripId");

DO $$ BEGIN
  ALTER TABLE "TripGuide" ADD CONSTRAINT "TripGuide_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
