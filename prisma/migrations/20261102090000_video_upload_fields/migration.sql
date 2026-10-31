-- Yüklənmiş videoların ölçüsü və müddəti
ALTER TABLE "videos" ADD COLUMN "bytes" INTEGER,
  ADD COLUMN "duration" INTEGER;
