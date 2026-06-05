DROP TABLE IF EXISTS "BDZona";
DROP TABLE IF EXISTS "BDAnfiteatro";

CREATE TABLE "BDAnfiteatro" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    filas INTEGER NOT NULL,
    columnas INTEGER NOT NULL,
    "asientosVacios" TEXT DEFAULT '[]',
    "pisoID" UUID REFERENCES "BDPiso"(id) ON DELETE CASCADE
);

CREATE TABLE "BDZona" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    "anfiteatroID" UUID REFERENCES "BDAnfiteatro"(id) ON DELETE CASCADE UNIQUE,
    "asientosVips" TEXT DEFAULT '[]',
    "precioVips" DECIMAL(10,2) DEFAULT 0,
    "Zona1" TEXT DEFAULT '[]',
    "precioZona1" DECIMAL(10,2) DEFAULT 0,
    "Zona2" TEXT DEFAULT '[]',
    "precioZona2" DECIMAL(10,2) DEFAULT 0,
    "Zona3" TEXT DEFAULT '[]',
    "precioZona3" DECIMAL(10,2) DEFAULT 0,
    "asientosDiscapacitados" TEXT DEFAULT '[]'
);

ALTER TABLE "BDZona" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en BDZona" ON "BDZona";
CREATE POLICY "Permitir todo en BDZona" ON "BDZona"
    FOR ALL USING (true)
    WITH CHECK (true);
