import { useCallback, useEffect, useState } from 'react';
import type { BidCostScenario, DashboardPayload } from '../types';
import { api } from '../lib/api';

export function useEconomicDashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.dashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveScenario = useCallback(async (scenario: BidCostScenario) => {
    await api.saveBidCost(scenario);
    const calc = await api.calculateBidCost(scenario);
    setData((prev) => (prev ? { ...prev, bidCost: calc, summary: { ...prev.summary, estimatedCostChangePct: calc.totalCostChangePct, riskLevel: calc.riskLevel, completeness: calc.completeness } } : prev));
    await reload();
  }, [reload]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.refreshEconomic();
      setData(result.dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, reload, saveScenario, refresh };
}
