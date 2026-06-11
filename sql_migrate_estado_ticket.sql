ALTER TABLE "BDTicket" ADD COLUMN IF NOT EXISTS "estado" TEXT;

UPDATE "BDTicket" SET "estado" = 'confirmado' WHERE "confirmado" = true;
UPDATE "BDTicket" SET "estado" = 'por confirmar' WHERE ("confirmado" = false OR "confirmado" IS NULL);

ALTER TABLE "BDTicket" DROP COLUMN IF EXISTS "confirmado";
