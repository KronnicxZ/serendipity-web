import { pool } from '@/lib/db';
import { MesNotifyService, ShortageItem } from './mes-notify.service';

export const MesService = {

  /** Check if all chemicals + leather are available for a PO */
  async checkInventory(poId: number): Promise<{
    ok: boolean;
    shortages: ShortageItem[];
    chemicals_ok: boolean;
    leather_ok:   boolean;
  }> {
    // Load PO with both formula FKs (legacy + new Lab)
    const { rows: [po] } = await pool.query(`
      SELECT po.*, a.crust_type, a.name AS article_name
      FROM production_orders po
      LEFT JOIN articles a ON a.id = po.article_id
      WHERE po.id = $1
    `, [poId]);

    if (!po) throw new Error('PO not found');

    const shortages: ShortageItem[] = [];

    // ── 1. Check chemical requirements ──────────────────────
    if (po.recipe_formula_id) {
      // NEW PATH: recipe_lines + recipe_processes.consumption_kg_per_sf
      // sum_grams_proceso via window function — resistant to non-1000g bases
      const { rows: lines } = await pool.query(`
        SELECT
          rl.chemical_id,
          rl.grams,
          rp.consumption_kg_per_sf,
          rp.id AS process_id,
          c.name,
          c.stock_kg,
          c.unit,
          SUM(rl.grams) OVER (PARTITION BY rp.id) AS sum_grams_proceso
        FROM recipe_lines rl
        JOIN recipe_processes rp ON rp.id = rl.process_id
        JOIN chemicals c ON c.id = rl.chemical_id
        WHERE rp.formula_id = $1
          AND rp.type = 'CHEMICAL'
          AND rp.consumption_kg_per_sf IS NOT NULL
          AND rl.chemical_id IS NOT NULL
      `, [po.recipe_formula_id]);

      // Consolidate kg needed across all processes per chemical
      const chemMap = new Map<number, { name: string; stock_kg: number; unit: string; needed: number }>();
      for (const line of lines) {
        const proportion     = Number(line.grams) / Number(line.sum_grams_proceso);
        const total_proc_kg  = Number(po.sf_target) * Number(line.consumption_kg_per_sf);
        const kg_needed      = proportion * total_proc_kg;
        const entry = chemMap.get(line.chemical_id);
        if (entry) {
          entry.needed += kg_needed;
        } else {
          chemMap.set(line.chemical_id, {
            name:     line.name,
            stock_kg: Number(line.stock_kg),
            unit:     line.unit ?? 'kg',
            needed:   kg_needed,
          });
        }
      }
      for (const chem of chemMap.values()) {
        if (chem.needed > chem.stock_kg) {
          shortages.push({ name: chem.name, type: 'CHEMICAL', needed: chem.needed, available: chem.stock_kg, unit: chem.unit });
        }
      }

    } else if (po.formula_id) {
      // LEGACY PATH: formula_layers.qty_per_sf — kept until Phase 5 executes
      const { rows: layers } = await pool.query(`
        SELECT fl.chemical_id, fl.qty_per_sf, c.name, c.stock_kg, c.unit
        FROM formula_layers fl
        JOIN chemicals c ON c.id = fl.chemical_id
        WHERE fl.formula_id = $1 AND fl.layer_type = 'CHEMICAL'
          AND fl.chemical_id IS NOT NULL AND fl.qty_per_sf IS NOT NULL
      `, [po.formula_id]);

      for (const layer of layers) {
        const needed = Number(layer.qty_per_sf) * Number(po.sf_target);
        const available = Number(layer.stock_kg);
        if (needed > available) {
          shortages.push({
            name:      layer.name,
            type:      'CHEMICAL',
            needed,
            available,
            unit:      layer.unit ?? 'kg',
          });
        }
      }
    }

    // ── 2. Check leather/crust stock ─────────────────────────
    if (po.article_id) {
      const { rows: leather } = await pool.query(`
        SELECT COALESCE(SUM(qty_sf - reserved_sf), 0)::numeric AS available_sf
        FROM leather_inventory
        WHERE article_id = $1 AND owner = $2
      `, [po.article_id, po.owner]);

      const available_sf = Number(leather[0]?.available_sf ?? 0);
      const needed_sf    = Number(po.sf_target);

      if (needed_sf > available_sf) {
        shortages.push({
          name:      po.crust_type ?? 'Crust',
          type:      'LEATHER',
          needed:    needed_sf,
          available: available_sf,
          unit:      'SF',
        });
      }
    }

    return {
      ok:           shortages.length === 0,
      shortages,
      chemicals_ok: !shortages.some(s => s.type === 'CHEMICAL'),
      leather_ok:   !shortages.some(s => s.type === 'LEATHER'),
    };
  },

  /** Send PO to production: check inventory, create purchase requests, notify */
  async sendToProduction(poId: number): Promise<{
    ok: boolean;
    status: string;
    shortages: ShortageItem[];
  }> {
    const check = await this.checkInventory(poId);

    const { rows: [po] } = await pool.query(`
      SELECT po.*, a.name AS article_name
      FROM production_orders po
      LEFT JOIN articles a ON a.id = po.article_id
      WHERE po.id = $1
    `, [poId]);

    // Mark inventory check timestamp
    await pool.query(`
      UPDATE production_orders
      SET inventory_ok = $1, inventory_checked_at = NOW()
      WHERE id = $2
    `, [check.ok, poId]);

    if (check.ok) {
      // Reserve leather if available
      if (po.article_id) {
        const { rows: [leather] } = await pool.query(`
          SELECT id, qty_sf, reserved_sf FROM leather_inventory
          WHERE article_id = $1 AND owner = $2
          ORDER BY received_at ASC LIMIT 1
        `, [po.article_id, po.owner]);

        if (leather) {
          await pool.query(`
            UPDATE leather_inventory SET reserved_sf = reserved_sf + $1 WHERE id = $2
          `, [po.sf_target, leather.id]);

          await pool.query(`
            INSERT INTO leather_movements (leather_id, type, qty_sf, reason, po_id, moved_by)
            VALUES ($1, 'RESERVE', $2, 'po_activation', $3, 'system')
          `, [leather.id, po.sf_target, poId]);

          await pool.query(`UPDATE production_orders SET leather_id = $1 WHERE id = $2`, [leather.id, poId]);
        }
      }

      // Activate PO
      await pool.query(`
        UPDATE production_orders
        SET status = 'IN_PROGRESS', started_at = NOW()
        WHERE id = $1 AND status = 'PENDING'
      `, [poId]);

      await MesNotifyService.notifyProductionReady({
        po_number:    po.po_number,
        article_name: po.article_name ?? '—',
        sf_target:    po.sf_target,
        owner:        po.owner,
      });

      return { ok: true, status: 'IN_PROGRESS', shortages: [] };
    } else {
      // Create purchase requests for each shortage
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const shortage of check.shortages) {
          const deficit = shortage.needed - shortage.available;

          if (shortage.type === 'CHEMICAL') {
            const { rows: [chem] } = await client.query(
              'SELECT id FROM chemicals WHERE name = $1', [shortage.name]
            );
            await client.query(`
              INSERT INTO purchase_requests
                (type, item_name, chemical_id, qty_needed, unit, qty_in_stock, reason, po_id, urgency)
              VALUES ('CHEMICAL', $1, $2, $3, $4, $5, 'insufficient_stock', $6, 'URGENT')
              ON CONFLICT DO NOTHING
            `, [shortage.name, chem?.id ?? null, deficit, shortage.unit, shortage.available, poId]);
          } else {
            await client.query(`
              INSERT INTO purchase_requests
                (type, item_name, leather_crust, qty_needed, unit, qty_in_stock, reason, po_id, urgency)
              VALUES ('LEATHER', $1, $1, $2, 'SF', $3, 'insufficient_stock', $4, 'URGENT')
              ON CONFLICT DO NOTHING
            `, [shortage.name, deficit, shortage.available, poId]);
          }
        }
        await client.query('COMMIT');
      } finally {
        client.release();
      }

      // Notify Tuyen + Santi
      await MesNotifyService.notifyShortage({
        po_number:    po.po_number,
        article_name: po.article_name ?? '—',
        sf_target:    po.sf_target,
        owner:        po.owner,
      }, check.shortages);

      return { ok: false, status: 'PENDING', shortages: check.shortages };
    }
  },

  /** Complete a batch → move PO to PACKING */
  async completeBatch(batchId: number, sfProduced: number): Promise<void> {
    const { rows: [batch] } = await pool.query(`
      SELECT po_id FROM batches WHERE id = $1
    `, [batchId]);

    if (!batch?.po_id) return;

    await pool.query(`
      UPDATE batches SET status = 'CLOSED', closed_at = NOW() WHERE id = $1
    `, [batchId]);

    await pool.query(`
      UPDATE production_orders
      SET sf_produced = sf_produced + $1, status = 'PACKING'
      WHERE id = $2
    `, [sfProduced, batch.po_id]);

    const { rows: [po] } = await pool.query(`SELECT po_number FROM production_orders WHERE id = $1`, [batch.po_id]);
    await MesNotifyService.notifyPackingReady(po.po_number, sfProduced);
  },

  /** Complete packing: enter actual SF, close PO, release leather */
  async completePacking(poId: number, sfPacked: number, packedBy: string): Promise<void> {
    await pool.query(`
      UPDATE production_orders
      SET status = 'COMPLETED', sf_packed = $1, packed_by = $2, packed_at = NOW(), completed_at = NOW()
      WHERE id = $3
    `, [sfPacked, packedBy, poId]);

    // Release leather reservation
    const { rows: [po] } = await pool.query(`SELECT leather_id, sf_target FROM production_orders WHERE id = $1`, [poId]);
    if (po?.leather_id) {
      await pool.query(`
        UPDATE leather_inventory
        SET reserved_sf = GREATEST(0, reserved_sf - $1), qty_sf = GREATEST(0, qty_sf - $2)
        WHERE id = $3
      `, [po.sf_target, sfPacked, po.leather_id]);

      await pool.query(`
        INSERT INTO leather_movements (leather_id, type, qty_sf, reason, po_id, moved_by)
        VALUES ($1, 'OUT', $2, 'packing_complete', $3, $4)
      `, [po.leather_id, sfPacked, poId, packedBy]);
    }
  },
};
