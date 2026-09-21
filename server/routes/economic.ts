import { Router } from 'express';
import { requireAuth } from '../auth.ts';
import { calculateBidCost } from '../economic/calculate.ts';
import {
  buildDashboard,
  buildIndicatorSummaries,
  listBidScenarios,
  loadBidScenario,
  needsRefresh,
  refreshAll,
  saveBidScenario,
} from '../economic/refresh.ts';
import type { BidCostScenario } from '../../src/types/index.ts';

const router = Router();

async function ensureCache() {
  if (await needsRefresh()) {
    return refreshAll(false);
  }
  return { errors: [] as { provider: string; message: string }[] };
}

router.get('/summary', async (_req, res) => {
  try {
    const { errors } = await ensureCache();
    const dashboard = await buildDashboard(errors);
    res.json(dashboard.summary);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.get('/indicators', async (req, res) => {
  try {
    const { errors } = await ensureCache();
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    let items = await buildIndicatorSummaries();
    if (category) items = items.filter((i) => i.catalog.category === category);
    res.json({ indicators: items, errors });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.get('/indicators/:key', async (req, res) => {
  try {
    await ensureCache();
    const items = await buildIndicatorSummaries([req.params.key]);
    if (items.length === 0) {
      res.status(404).json({ error: '지표를 찾을 수 없습니다.' });
      return;
    }
    const item = items[0];
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const series = item.series.filter((p) => {
      if (from && p.period < from) return false;
      if (to && p.period > to) return false;
      return true;
    });
    res.json({ ...item, series });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.get('/series', async (req, res) => {
  try {
    await ensureCache();
    const keys = typeof req.query.keys === 'string' ? req.query.keys.split(',').filter(Boolean) : [];
    res.json({ indicators: await buildIndicatorSummaries(keys.length ? keys : undefined) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.get('/dashboard', async (_req, res) => {
  try {
    const { errors } = await ensureCache();
    res.json(await buildDashboard(errors));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.post('/refresh', requireAuth, async (_req, res) => {
  try {
    const result = await refreshAll(true);
    res.json({ ok: true, ...result, dashboard: await buildDashboard(result.errors) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.get('/bid-cost', async (_req, res) => {
  try {
    res.json({ scenarios: await listBidScenarios(), default: await loadBidScenario() });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.put('/bid-cost', async (req, res) => {
  const body = req.body as BidCostScenario;
  if (!body?.id || !Array.isArray(body.weights)) {
    res.status(400).json({ error: '원가 시나리오 형식이 올바르지 않습니다.' });
    return;
  }
  try {
    await saveBidScenario({
      id: String(body.id),
      name: String(body.name ?? '시나리오'),
      baseCost: body.baseCost === null || body.baseCost === undefined ? null : Number(body.baseCost),
      baseFx: body.baseFx === null || body.baseFx === undefined ? null : Number(body.baseFx),
      weights: body.weights,
      riskWeights: body.riskWeights,
    });
    res.json(await loadBidScenario(body.id));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.post('/bid-cost/calculate', async (req, res) => {
  try {
    await ensureCache();
    const scenario = (req.body?.scenario as BidCostScenario | undefined) ?? (await loadBidScenario());
    const indicators = await buildIndicatorSummaries();
    res.json(calculateBidCost(scenario, indicators));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
