UPDATE "financial_institutions"
SET "status" = 'PILOT',
    "sender_patterns" = ARRAY['notificaciones@popularenlinea.com'],
    "updated_at" = CURRENT_TIMESTAMP
WHERE "code" = 'POPULAR';
