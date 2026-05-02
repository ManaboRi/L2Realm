-- Сервера-проекты с несколькими "запусками" внутри (Scryde-кейс).
-- instances — массив объектов { id, label?, chronicle, rates, rateNum, url, openedDate? }
-- Старые серверы получают пустой массив и продолжают работать как одиночные.
ALTER TABLE "Server" ADD COLUMN IF NOT EXISTS "instances" JSONB NOT NULL DEFAULT '[]'::jsonb;
