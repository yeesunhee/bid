import { query, queryOne } from './db.ts';
import { MVP_CATALOG, DEFAULT_BID_SCENARIO } from './economic/catalog.ts';

export async function seedEconomicCatalog() {
  const existing = await queryOne<{ c: number }>(
    'SELECT COUNT(*)::int AS c FROM economic_indicator_catalog',
  );
  const catalogCount = existing?.c ?? 0;

  for (const item of MVP_CATALOG) {
    if (catalogCount > 0) {
      const row = await queryOne(
        'SELECT indicator_key FROM economic_indicator_catalog WHERE indicator_key = $1',
        [item.indicatorKey],
      );
      if (row) continue;
    }
    await query(
      `INSERT INTO economic_indicator_catalog (
         indicator_key, provider, display_name_ko, category, frequency, unit, currency,
         mapping_json, source_url, active, verified_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
       ON CONFLICT (indicator_key) DO UPDATE SET
         provider = EXCLUDED.provider,
         display_name_ko = EXCLUDED.display_name_ko,
         category = EXCLUDED.category,
         frequency = EXCLUDED.frequency,
         unit = EXCLUDED.unit,
         currency = EXCLUDED.currency,
         mapping_json = EXCLUDED.mapping_json,
         source_url = EXCLUDED.source_url,
         active = EXCLUDED.active,
         verified_at = EXCLUDED.verified_at,
         updated_at = CURRENT_TIMESTAMP`,
      [
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
      ],
    );
  }
}

export async function seedDefaultBidScenario() {
  const existing = await queryOne('SELECT id FROM bid_cost_scenarios WHERE id = $1', [
    DEFAULT_BID_SCENARIO.id,
  ]);
  if (existing) return;
  await query(
    `INSERT INTO bid_cost_scenarios (id, name, base_cost, base_fx, weights_json, risk_weights_json)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      DEFAULT_BID_SCENARIO.id,
      DEFAULT_BID_SCENARIO.name,
      DEFAULT_BID_SCENARIO.baseCost,
      DEFAULT_BID_SCENARIO.baseFx,
      JSON.stringify(DEFAULT_BID_SCENARIO.weights),
      JSON.stringify(DEFAULT_BID_SCENARIO.riskWeights ?? {}),
    ],
  );
}
