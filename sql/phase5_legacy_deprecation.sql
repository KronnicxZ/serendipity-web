-- =================================================================================
-- FASE 5: DEPRECACIÓN DEL SISTEMA LEGACY DE FÓRMULAS
-- ATENCIÓN: Este script es IRREVERSIBLE. Ejecutar SOLO cuando se cumplan
--           los 3 criterios de éxito listados abajo.
--
-- CRITERIOS DE ÉXITO (verificar con las 3 queries de validación antes de ejecutar):
--
--   1. Migración completa: 100% de artículos activos tienen recipe_formula APPROVED
--   2. Cero POs viejas:    No existen POs PENDING/IN_PROGRESS sin recipe_formula_id
--   3. MES actualizado:    El código de MesService ya lee de recipe_lines (no formula_layers)
-- =================================================================================

-- ── PASO 0: VALIDACIONES (ejecutar primero, NO deben devolver filas) ────────────

-- Criterio 1: artículos sin recipe_formula aprobada
SELECT a.id, a.code, a.name
FROM articles a
WHERE a.status != 'ARCHIVED'
  AND NOT EXISTS (
    SELECT 1 FROM production_orders po
    JOIN recipe_formulas rf ON rf.id = po.recipe_formula_id
    WHERE po.article_id = a.id AND rf.status = 'APPROVED'
  );

-- Criterio 2: production_orders activas sin recipe_formula_id
SELECT id, po_number, status
FROM production_orders
WHERE status IN ('PENDING', 'IN_PROGRESS')
  AND recipe_formula_id IS NULL;

-- Criterio 3: batches recientes que todavía usan formula_id (viejo)
SELECT b.id, b.batch_number, b.formula_id
FROM batches b
WHERE b.formula_id IS NOT NULL
  AND b.started_at > NOW() - INTERVAL '30 days';

-- ── PASO 1: ARCHIVAR (seguro — renombra en vez de borrar) ────────────────────────

BEGIN;

ALTER TABLE formulas       RENAME TO _archived_formulas;
ALTER TABLE formula_layers RENAME TO _archived_formula_layers;

-- Limpiar la FK vieja en production_orders
ALTER TABLE production_orders DROP COLUMN IF EXISTS formula_id;

-- Hacer obligatoria la FK nueva
ALTER TABLE production_orders
  ALTER COLUMN recipe_formula_id SET NOT NULL;

-- Limpiar batches: quitar FK vieja (los batches nuevos usan recipe_formula via PO)
ALTER TABLE batches DROP COLUMN IF EXISTS formula_id;

COMMIT;

-- ── PASO 2: BORRADO FINAL (ejecutar semanas después, cuando todo esté estable) ──

-- BEGIN;
-- DROP TABLE IF EXISTS _archived_formula_layers;
-- DROP TABLE IF EXISTS _archived_formulas;
-- COMMIT;

-- =================================================================================
-- FIN DEL SCRIPT. El sistema queda con recipe_formulas como única fuente de verdad.
-- =================================================================================
