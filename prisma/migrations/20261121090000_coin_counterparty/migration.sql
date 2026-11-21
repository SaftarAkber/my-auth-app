-- Hədiyyə əməliyyatlarında qarşı tərəf
ALTER TABLE "coin_transactions" ADD COLUMN "counterpartyId" TEXT;
ALTER TABLE "coin_transactions" ADD COLUMN "counterpartyName" TEXT;

-- Köhnə qeydlər: göndərmə və alma sətirləri eyni anda (eyni məbləğlə) yazılıb — onları cütləşdiririk
UPDATE "coin_transactions" s
SET "counterpartyId" = r."userId", "counterpartyName" = u."name"
FROM "coin_transactions" r
JOIN "users" u ON u."id" = r."userId"
WHERE s."type"::text = 'GIFT_SENT'
  AND r."type"::text IN ('GIFT_RECEIVED', 'TEST_REWARD')
  AND r."amount" = -s."amount"
  AND abs(extract(epoch FROM (r."createdAt" - s."createdAt"))) < 3;

UPDATE "coin_transactions" r
SET "counterpartyId" = s."userId", "counterpartyName" = u."name"
FROM "coin_transactions" s
JOIN "users" u ON u."id" = s."userId"
WHERE r."type"::text IN ('GIFT_RECEIVED', 'TEST_REWARD')
  AND s."type"::text = 'GIFT_SENT'
  AND r."amount" = -s."amount"
  AND abs(extract(epoch FROM (r."createdAt" - s."createdAt"))) < 3;
