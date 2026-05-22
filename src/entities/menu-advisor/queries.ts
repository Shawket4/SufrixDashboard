import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { menuAdvisorApi } from "./api";
import type {
  PriceSuggestionFilter, BundleSuggestionFilter, RemovalScenarioFilter,
  Decision, RunRecord,
} from "./schemas";

export const QUERY_KEYS = {
  all: ["menu-advisor"] as const,
  runs: (branchId: string) => [...QUERY_KEYS.all, "runs", branchId] as const,
  latestRun: (branchId: string) => [...QUERY_KEYS.runs(branchId), "latest"] as const,
  activeRun: (branchId: string) => [...QUERY_KEYS.runs(branchId), "active"] as const,
  run: (runId: string) => [...QUERY_KEYS.all, "run", runId] as const,
  priceSuggestions: (runId: string, f?: PriceSuggestionFilter) =>
    [...QUERY_KEYS.run(runId), "price-suggestions", f] as const,
  bundleSuggestions: (runId: string, f?: BundleSuggestionFilter) =>
    [...QUERY_KEYS.run(runId), "bundle-suggestions", f] as const,
  removalScenarios: (runId: string, f?: RemovalScenarioFilter) =>
    [...QUERY_KEYS.run(runId), "removal-scenarios", f] as const,
};

export const useLatestRun = (branchId: string | undefined) =>
  useQuery({
    queryKey: QUERY_KEYS.latestRun(branchId!),
    queryFn: () => menuAdvisorApi.getLatestRun(branchId!),
    enabled: !!branchId,
  });

/**
 * Polls every 5s while a run is active. When the active run completes
 * (data transitions from present to null), latestRun is invalidated so
 * the UI moves out of the "Analyzing..." state.
 */
export const useActiveRun = (branchId: string | undefined) => {
  const qc = useQueryClient();
  const lastDataRef = useRef<RunRecord | null>(null);

  const query = useQuery({
    queryKey: QUERY_KEYS.activeRun(branchId!),
    queryFn: () => menuAdvisorApi.getActiveRun(branchId!),
    enabled: !!branchId,
    refetchInterval: (q) => (q.state.data ? 5000 : false),
  });

  useEffect(() => {
    if (!branchId) return;
    const prev = lastDataRef.current;
    const curr = query.data ?? null;
    if (prev && !curr) {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.latestRun(branchId) });
    }
    lastDataRef.current = curr;
  }, [query.data, branchId, qc]);

  return query;
};

export const useCreateRun = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (branchId: string) => menuAdvisorApi.createRun(branchId),
    onSuccess: (_, branchId) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.activeRun(branchId) });
    },
  });
};

export const usePriceSuggestions = (runId: string | undefined, filters?: PriceSuggestionFilter) =>
  useQuery({
    queryKey: QUERY_KEYS.priceSuggestions(runId!, filters),
    queryFn: () => menuAdvisorApi.getPriceSuggestions(runId!, filters),
    enabled: !!runId,
  });

export const useBundleSuggestions = (runId: string | undefined, filters?: BundleSuggestionFilter) =>
  useQuery({
    queryKey: QUERY_KEYS.bundleSuggestions(runId!, filters),
    queryFn: () => menuAdvisorApi.getBundleSuggestions(runId!, filters),
    enabled: !!runId,
  });

export const useRemovalScenarios = (runId: string | undefined, filters?: RemovalScenarioFilter) =>
  useQuery({
    queryKey: QUERY_KEYS.removalScenarios(runId!, filters),
    queryFn: () => menuAdvisorApi.getRemovalScenarios(runId!, filters),
    enabled: !!runId,
  });

export const useRecordDecision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      suggestion_id: string;
      suggestion_kind: "price" | "bundle" | "removal";
      branch_id: string;
      decision: Decision;
      notes?: string;
    }) => menuAdvisorApi.recordDecision(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
};