-- ==============================================================================
-- SITRAC / SIPAC - MIGRACIÓN SEGURA Y ADITIVA PARA SUPABASE (POSTGRESQL)
-- ==============================================================================
-- Adaptado al esquema exacto de BASI Fix (UUIDs, bitacora_logs, etc.)
--
-- GARANTÍA DE SEGURIDAD:
-- 1. NO ejecuta DROP TABLE, NO ejecuta DROP COLUMN ni CASCADE.
-- 2. Es 100% idempotente (se puede ejecutar múltiples veces sin error ni duplicar datos).
-- 3. Conserva intactos los datos de:
--    - unidades_funcionales (id: UUID)
--    - responsables (id: UUID)
--    - categorias_trabajo (id: UUID)
--    - ordenes_trabajo (id: UUID)
--    - bitacora_logs (id: UUID)
-- ==============================================================================

BEGIN;

-- Extensión para generar UUIDs si no estuviera activa
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tipo ENUM estado_ot (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_ot') THEN
        CREATE TYPE public.estado_ot AS ENUM ('Pendiente', 'En Proceso', 'Finalizado', 'Suspendido', 'Cancelado');
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- PARTE 1: TABLAS PREEXISTENTES (BASI FIX) - CONSERVAR DATOS Y ESTRUCTURA
-- ──────────────────────────────────────────────────────────────────────────────

-- 1.1. Unidades Funcionales
CREATE TABLE IF NOT EXISTS public.unidades_funcionales (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    sector_escalera character varying NOT NULL,
    piso character varying NOT NULL,
    depto character varying NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT unidades_funcionales_pkey PRIMARY KEY (id)
);

ALTER TABLE public.unidades_funcionales ADD COLUMN IF NOT EXISTS sector_escalera character varying;
ALTER TABLE public.unidades_funcionales ADD COLUMN IF NOT EXISTS piso character varying;
ALTER TABLE public.unidades_funcionales ADD COLUMN IF NOT EXISTS depto character varying;
ALTER TABLE public.unidades_funcionales ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

CREATE INDEX IF NOT EXISTS ix_unidades_funcionales_sector_escalera_piso_depto 
ON public.unidades_funcionales (sector_escalera, piso, depto);


-- 1.2. Responsables (Técnicos / Operarios)
CREATE TABLE IF NOT EXISTS public.responsables (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    nombre character varying NOT NULL,
    activo boolean NOT NULL DEFAULT true,
    CONSTRAINT responsables_pkey PRIMARY KEY (id)
);

ALTER TABLE public.responsables ADD COLUMN IF NOT EXISTS nombre character varying;
ALTER TABLE public.responsables ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;


-- 1.3. Categorías de Trabajo / Rubros de Mantenimiento
CREATE TABLE IF NOT EXISTS public.categorias_trabajo (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    nombre character varying NOT NULL,
    activo boolean NOT NULL DEFAULT true,
    CONSTRAINT categorias_trabajo_pkey PRIMARY KEY (id)
);

ALTER TABLE public.categorias_trabajo ADD COLUMN IF NOT EXISTS nombre character varying;
ALTER TABLE public.categorias_trabajo ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;


-- 1.4. Órdenes de Trabajo
CREATE TABLE IF NOT EXISTS public.ordenes_trabajo (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    unidad_funcional_id uuid NOT NULL,
    responsable_id uuid NOT NULL,
    categoria_id uuid NOT NULL,
    problema_reportado text NOT NULL,
    solucion_realizada text NULL,
    observaciones text NULL,
    estado character varying NOT NULL DEFAULT 'Pendiente',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone NULL,
    CONSTRAINT ordenes_trabajo_pkey PRIMARY KEY (id)
);

ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS unidad_funcional_id uuid;
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS responsable_id uuid;
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS categoria_id uuid;
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS problema_reportado text;
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS solucion_realizada text;
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS observaciones text;
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS estado character varying DEFAULT 'Pendiente';
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
ALTER TABLE public.ordenes_trabajo ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS ix_ordenes_trabajo_unidad_funcional_id ON public.ordenes_trabajo (unidad_funcional_id);
CREATE INDEX IF NOT EXISTS ix_ordenes_trabajo_responsable_id ON public.ordenes_trabajo (responsable_id);
CREATE INDEX IF NOT EXISTS ix_ordenes_trabajo_categoria_id ON public.ordenes_trabajo (categoria_id);
CREATE INDEX IF NOT EXISTS ix_ordenes_trabajo_created_at ON public.ordenes_trabajo (created_at DESC);


-- 1.5. Bitácora de Logs de Auditoría de OTs
CREATE TABLE IF NOT EXISTS public.bitacora_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    orden_trabajo_id uuid NOT NULL,
    tipo_operacion character varying NOT NULL,
    detalle_cambio text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT bitacora_logs_pkey PRIMARY KEY (id)
);

ALTER TABLE public.bitacora_logs ADD COLUMN IF NOT EXISTS orden_trabajo_id uuid;
ALTER TABLE public.bitacora_logs ADD COLUMN IF NOT EXISTS tipo_operacion character varying;
ALTER TABLE public.bitacora_logs ADD COLUMN IF NOT EXISTS detalle_cambio text;
ALTER TABLE public.bitacora_logs ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

CREATE INDEX IF NOT EXISTS ix_bitacora_logs_orden_trabajo_id ON public.bitacora_logs (orden_trabajo_id);


-- ──────────────────────────────────────────────────────────────────────────────
-- PARTE 2: TABLAS NUEVAS DE SITRAC (PAÑOL, ABASTECIMIENTO, AUTH Y AUDITORÍA)
-- ──────────────────────────────────────────────────────────────────────────────

-- 2.1. Usuarios / Auth de SITRAC
CREATE TABLE IF NOT EXISTS public.usuarios (
    id serial PRIMARY KEY,
    nombre_completo text NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    rol text NOT NULL DEFAULT 'Pañolero',
    activo boolean NOT NULL DEFAULT true,
    refresh_token text NULL,
    refresh_token_expiry_time timestamp with time zone NULL
);

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS nombre_completo text;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS rol text DEFAULT 'Pañolero';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS refresh_token text;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS refresh_token_expiry_time timestamp with time zone;

CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_username ON public.usuarios (username);


-- 2.2. Categorías de Artículos (Pañol)
CREATE TABLE IF NOT EXISTS public.categorias_articulo (
    id serial PRIMARY KEY,
    nombre text NOT NULL
);

ALTER TABLE public.categorias_articulo ADD COLUMN IF NOT EXISTS nombre text;


-- 2.3. Artículos e Insumos de Pañol
CREATE TABLE IF NOT EXISTS public.articulos (
    id serial PRIMARY KEY,
    nombre text NOT NULL,
    categoria_id int NOT NULL,
    unidad_medida text NOT NULL DEFAULT 'Unidad',
    es_fraccionable boolean NOT NULL DEFAULT false,
    stock_actual numeric(18,4) NOT NULL DEFAULT 0,
    stock_minimo numeric(18,4) NOT NULL DEFAULT 0,
    activo boolean NOT NULL DEFAULT true
);

ALTER TABLE public.articulos ADD COLUMN IF NOT EXISTS nombre text;
ALTER TABLE public.articulos ADD COLUMN IF NOT EXISTS categoria_id int;
ALTER TABLE public.articulos ADD COLUMN IF NOT EXISTS unidad_medida text DEFAULT 'Unidad';
ALTER TABLE public.articulos ADD COLUMN IF NOT EXISTS es_fraccionable boolean DEFAULT false;
ALTER TABLE public.articulos ADD COLUMN IF NOT EXISTS stock_actual numeric(18,4) DEFAULT 0;
ALTER TABLE public.articulos ADD COLUMN IF NOT EXISTS stock_minimo numeric(18,4) DEFAULT 0;
ALTER TABLE public.articulos ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS ix_articulos_categoria_id ON public.articulos (categoria_id);
CREATE INDEX IF NOT EXISTS ix_articulos_activo ON public.articulos (activo);
CREATE INDEX IF NOT EXISTS ix_articulos_stock ON public.articulos (stock_actual, stock_minimo);


-- 2.4. Compras (Facturas / Remitos de Proveedores)
CREATE TABLE IF NOT EXISTS public.compras (
    id serial PRIMARY KEY,
    nro_comprobante text NOT NULL,
    fecha_compra timestamp with time zone NOT NULL DEFAULT now(),
    fecha_carga timestamp with time zone NOT NULL DEFAULT now(),
    usuario_id int NOT NULL,
    foto_comprobante_url text NULL,
    observaciones_diferencia text NULL
);

ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS nro_comprobante text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS fecha_compra timestamp with time zone DEFAULT now();
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS fecha_carga timestamp with time zone DEFAULT now();
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS usuario_id int;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS foto_comprobante_url text;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS observaciones_diferencia text;

CREATE INDEX IF NOT EXISTS ix_compras_usuario_id ON public.compras (usuario_id);
CREATE INDEX IF NOT EXISTS ix_compras_fecha_compra ON public.compras (fecha_compra DESC);


-- 2.5. Detalle de Compras (Líneas de Comprobantes)
CREATE TABLE IF NOT EXISTS public.detalle_compras (
    id serial PRIMARY KEY,
    compra_id int NOT NULL,
    articulo_id int NOT NULL,
    cantidad_recibida numeric(18,4) NOT NULL
);

ALTER TABLE public.detalle_compras ADD COLUMN IF NOT EXISTS compra_id int;
ALTER TABLE public.detalle_compras ADD COLUMN IF NOT EXISTS articulo_id int;
ALTER TABLE public.detalle_compras ADD COLUMN IF NOT EXISTS cantidad_recibida numeric(18,4);

CREATE INDEX IF NOT EXISTS ix_detalle_compras_compra_id ON public.detalle_compras (compra_id);
CREATE INDEX IF NOT EXISTS ix_detalle_compras_articulo_id ON public.detalle_compras (articulo_id);


-- 2.6. Egresos y Consumo de Insumos (VINCULADO A ORDENES_TRABAJO CON UUID)
CREATE TABLE IF NOT EXISTS public.egresos_consumo (
    id bigserial PRIMARY KEY,
    articulo_id int NOT NULL,
    orden_trabajo_id uuid NOT NULL,
    cantidad numeric(18,4) NOT NULL,
    fecha_hora timestamp with time zone NOT NULL DEFAULT now(),
    usuario_id int NOT NULL,
    observacion text NULL
);

ALTER TABLE public.egresos_consumo ADD COLUMN IF NOT EXISTS articulo_id int;
ALTER TABLE public.egresos_consumo ADD COLUMN IF NOT EXISTS orden_trabajo_id uuid;
ALTER TABLE public.egresos_consumo ADD COLUMN IF NOT EXISTS cantidad numeric(18,4);
ALTER TABLE public.egresos_consumo ADD COLUMN IF NOT EXISTS fecha_hora timestamp with time zone DEFAULT now();
ALTER TABLE public.egresos_consumo ADD COLUMN IF NOT EXISTS usuario_id int;
ALTER TABLE public.egresos_consumo ADD COLUMN IF NOT EXISTS observacion text;

CREATE INDEX IF NOT EXISTS ix_egresos_consumo_articulo_id ON public.egresos_consumo (articulo_id);
CREATE INDEX IF NOT EXISTS ix_egresos_consumo_orden_trabajo_id ON public.egresos_consumo (orden_trabajo_id);
CREATE INDEX IF NOT EXISTS ix_egresos_consumo_usuario_id ON public.egresos_consumo (usuario_id);
CREATE INDEX IF NOT EXISTS ix_egresos_consumo_fecha_hora ON public.egresos_consumo (fecha_hora DESC);


-- 2.7. Ajustes de Inventario (Mermas, Roturas, Conciliaciones)
CREATE TABLE IF NOT EXISTS public.ajustes_inventario (
    id serial PRIMARY KEY,
    articulo_id int NOT NULL,
    cantidad numeric(18,4) NOT NULL,
    motivo text NOT NULL,
    justificacion text NOT NULL,
    tipo_ajuste text NOT NULL DEFAULT 'Recuento',
    fecha_hora timestamp with time zone NOT NULL DEFAULT now(),
    usuario_id int NOT NULL
);

ALTER TABLE public.ajustes_inventario ADD COLUMN IF NOT EXISTS articulo_id int;
ALTER TABLE public.ajustes_inventario ADD COLUMN IF NOT EXISTS cantidad numeric(18,4);
ALTER TABLE public.ajustes_inventario ADD COLUMN IF NOT EXISTS motivo text;
ALTER TABLE public.ajustes_inventario ADD COLUMN IF NOT EXISTS justificacion text;
ALTER TABLE public.ajustes_inventario ADD COLUMN IF NOT EXISTS tipo_ajuste text DEFAULT 'Recuento';
ALTER TABLE public.ajustes_inventario ADD COLUMN IF NOT EXISTS fecha_hora timestamp with time zone DEFAULT now();
ALTER TABLE public.ajustes_inventario ADD COLUMN IF NOT EXISTS usuario_id int;

CREATE INDEX IF NOT EXISTS ix_ajustes_inventario_articulo_id ON public.ajustes_inventario (articulo_id);
CREATE INDEX IF NOT EXISTS ix_ajustes_inventario_usuario_id ON public.ajustes_inventario (usuario_id);


-- 2.8. Logs de Auditoría Global
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id serial PRIMARY KEY,
    usuario_id int NULL,
    accion text NOT NULL,
    model text NOT NULL,
    model_id text NULL,
    valores_anteriores text NULL,
    valores_nuevos text NULL,
    ip text NULL,
    timestamp timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS usuario_id int;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS accion text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS model_id text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS valores_anteriores text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS valores_nuevos text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS timestamp timestamp with time zone DEFAULT now();

CREATE INDEX IF NOT EXISTS ix_audit_logs_usuario_id ON public.audit_logs (usuario_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_timestamp ON public.audit_logs (timestamp DESC);


-- 2.9. Empleados (Soporte complementario)
CREATE TABLE IF NOT EXISTS public.empleados (
    id serial PRIMARY KEY,
    nombre_completo text NOT NULL,
    legajo text NOT NULL,
    puesto_sector text NOT NULL,
    activo boolean NOT NULL DEFAULT true
);

ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS nombre_completo text;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS legajo text;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS puesto_sector text;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS ux_empleados_legajo ON public.empleados (legajo);


-- ──────────────────────────────────────────────────────────────────────────────
-- PARTE 3: CLAVES FORÁNEAS (FOREIGN KEYS IDEMPOTENTES)
-- ──────────────────────────────────────────────────────────────────────────────

-- Foreign keys de ordenes_trabajo
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ordenes_trabajo_unidad_funcional_id_fkey') THEN
        ALTER TABLE public.ordenes_trabajo 
        ADD CONSTRAINT ordenes_trabajo_unidad_funcional_id_fkey 
        FOREIGN KEY (unidad_funcional_id) REFERENCES public.unidades_funcionales(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ordenes_trabajo_responsable_id_fkey') THEN
        ALTER TABLE public.ordenes_trabajo 
        ADD CONSTRAINT ordenes_trabajo_responsable_id_fkey 
        FOREIGN KEY (responsable_id) REFERENCES public.responsables(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ordenes_trabajo_categoria_id_fkey') THEN
        ALTER TABLE public.ordenes_trabajo 
        ADD CONSTRAINT ordenes_trabajo_categoria_id_fkey 
        FOREIGN KEY (categoria_id) REFERENCES public.categorias_trabajo(id);
    END IF;
END $$;

-- Foreign keys de bitacora_logs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bitacora_logs_orden_trabajo_id_fkey') THEN
        ALTER TABLE public.bitacora_logs 
        ADD CONSTRAINT bitacora_logs_orden_trabajo_id_fkey 
        FOREIGN KEY (orden_trabajo_id) REFERENCES public.ordenes_trabajo(id);
    END IF;
END $$;

-- Foreign keys de articulos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_articulos_categorias_articulo') THEN
        ALTER TABLE public.articulos 
        ADD CONSTRAINT fk_articulos_categorias_articulo 
        FOREIGN KEY (categoria_id) REFERENCES public.categorias_articulo(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Foreign keys de compras
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_compras_usuarios') THEN
        ALTER TABLE public.compras 
        ADD CONSTRAINT fk_compras_usuarios 
        FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Foreign keys de detalle_compras
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_detalle_compras_compras') THEN
        ALTER TABLE public.detalle_compras 
        ADD CONSTRAINT fk_detalle_compras_compras 
        FOREIGN KEY (compra_id) REFERENCES public.compras(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_detalle_compras_articulos') THEN
        ALTER TABLE public.detalle_compras 
        ADD CONSTRAINT fk_detalle_compras_articulos 
        FOREIGN KEY (articulo_id) REFERENCES public.articulos(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Foreign keys de egresos_consumo (VINCULACIÓN A OT CON UUID Y ARTÍCULO)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_egresos_consumo_articulos') THEN
        ALTER TABLE public.egresos_consumo 
        ADD CONSTRAINT fk_egresos_consumo_articulos 
        FOREIGN KEY (articulo_id) REFERENCES public.articulos(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_egresos_consumo_ordenes_trabajo') THEN
        ALTER TABLE public.egresos_consumo 
        ADD CONSTRAINT fk_egresos_consumo_ordenes_trabajo 
        FOREIGN KEY (orden_trabajo_id) REFERENCES public.ordenes_trabajo(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_egresos_consumo_usuarios') THEN
        ALTER TABLE public.egresos_consumo 
        ADD CONSTRAINT fk_egresos_consumo_usuarios 
        FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Foreign keys de ajustes_inventario
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ajustes_inventario_articulos') THEN
        ALTER TABLE public.ajustes_inventario 
        ADD CONSTRAINT fk_ajustes_inventario_articulos 
        FOREIGN KEY (articulo_id) REFERENCES public.articulos(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ajustes_inventario_usuarios') THEN
        ALTER TABLE public.ajustes_inventario 
        ADD CONSTRAINT fk_ajustes_inventario_usuarios 
        FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Foreign keys de audit_logs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_logs_usuarios') THEN
        ALTER TABLE public.audit_logs 
        ADD CONSTRAINT fk_audit_logs_usuarios 
        FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;
    END IF;
END $$;

COMMIT;

