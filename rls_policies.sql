-- ============================================
-- POLÍTICAS RLS PARA EVENTHUB
-- ============================================

-- ===== BDSitio =====
ALTER TABLE "BDSitio" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en BDSitio" ON "BDSitio";
CREATE POLICY "Permitir todo en BDSitio" ON "BDSitio"
    FOR ALL USING (true)
    WITH CHECK (true);

-- ===== BDAnfiteatro =====
ALTER TABLE "BDAnfiteatro" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en BDAnfiteatro" ON "BDAnfiteatro";
CREATE POLICY "Permitir todo en BDAnfiteatro" ON "BDAnfiteatro"
    FOR ALL USING (true)
    WITH CHECK (true);

-- ===== BDEventos =====
ALTER TABLE "BDEventos" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en BDEventos" ON "BDEventos";
CREATE POLICY "Permitir todo en BDEventos" ON "BDEventos"
    FOR ALL USING (true)
    WITH CHECK (true);

-- ===== BDTicket =====
ALTER TABLE "BDTicket" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en BDTicket" ON "BDTicket";
CREATE POLICY "Permitir todo en BDTicket" ON "BDTicket"
    FOR ALL USING (true)
    WITH CHECK (true);

-- ===== Auth_Users =====
ALTER TABLE "Auth_Users" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en Auth_Users" ON "Auth_Users";
CREATE POLICY "Permitir todo en Auth_Users" ON "Auth_Users"
    FOR ALL USING (true)
    WITH CHECK (true);