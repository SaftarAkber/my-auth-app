-- Mövzunun görünməsi: hərkəsə açıq və ya yalnız seçilmiş qruplara
ALTER TABLE "topics" ADD COLUMN "visibility" "ContentVisibility" NOT NULL DEFAULT 'GROUP_ONLY';
