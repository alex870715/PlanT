DROP TABLE IF EXISTS "TripGuide";

CREATE TABLE IF NOT EXISTS "TripHandbook" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "slides" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripHandbook_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TripHandbook_tripId_key" ON "TripHandbook"("tripId");

DO $$ BEGIN
  ALTER TABLE "TripHandbook" ADD CONSTRAINT "TripHandbook_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
