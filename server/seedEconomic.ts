import { getDb } from './db.ts';
import { MVP_CATALOG, DEFAULT_BID_SCENARIO } from './economic/catalog.ts';

export function seedEconomicCatalog() {
  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) AS c FROM economic_indicator_catalog').get() as {
    c: number;
  };
  const upsert = db.prepare(`
    INSERT INTO economic_indicator_catalog (
      indicator_key, provider, display_name_ko, category, frequency, unit, currency,
      mapping_json, source_url, active, verified_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(indicator_key) DO UPDATE SET
      provider = excluded.provider,
      display_name_ko = excluded.display_name_ko,
      category = excluded.category,
      frequency = excluded.frequency,
      unit = excluded.unit,
      currency = excluded.currency,
      mapping_json = excluded.mapping_json,
      source_url = excluded.source_url,
      active = excluded.active,
      verified_at = excluded.verified_at,
      updated_at = CURRENT_TIMESTAMP
  `);

  for (const item of MVP_CATALOG) {
    if (existing.c > 0) {
      const row = db
        .prepare('SELECT indicator_key FROM economic_indicator_catalog WHERE indicator_key = ?')
        .get(item.indicatorKey);
      if (row) continue;
    }
    upsert.run(
      item.indicatorKey,
      item.provider,
      item.displayNameKo,
      item.category,
      item.frequency,
      item.unit ?? null,
      item.currency ?? null,
      JSON.stringify(item.mapping),
      item.sourceUrl ?? null,
      item.active ? 1 : 0,
      item.verifiedAt ?? null,
    );
  }
}

export function seedDefaultBidScenario() {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM bid_cost_scenarios WHERE id = ?').get(
    DEFAULT_BID_SCENARIO.id,
  );
  if (existing) return;
  db.prepare(
    `INSERT INTO bid_cost_scenarios (id, name, base_cost, base_fx, weights_json, risk_weights_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    DEFAULT_BID_SCENARIO.id,
    DEFAULT_BID_SCENARIO.name,
    DEFAULT_BID_SCENARIO.baseCost,
    DEFAULT_BID_SCENARIO.baseFx,
    JSON.stringify(DEFAULT_BID_SCENARIO.weights),
    JSON.stringify(DEFAULT_BID_SCENARIO.riskWeights ?? {}),
  );
}
