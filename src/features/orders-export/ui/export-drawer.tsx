import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogBody, DialogContent, DialogFooter, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Card, CardContent } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";

import { useCurrentContext } from "@/shared/hooks/use-current-context";
import { getErrorMessage } from "@/shared/api/errors";
import { exportToExcel } from "@/shared/lib/excel";
import type { OrdersQuery } from "@/shared/types";

import { exportApi } from "../api";
import { PRESETS } from "../model/presets";
import { buildSheets } from "../lib/build-sheets";
import { buildMeta } from "../lib/build-meta";
import { buildFilename } from "../lib/build-filename";
import type { Grain, PresetId } from "../model/types";

interface ExportDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: OrdersQuery;
  branchName: string;
  shiftLabel: string | null;
  totalApprox: number;
}

export function ExportDrawer({
  open,
  onClose,
  filters,
  branchName,
  shiftLabel,
  totalApprox,
}: ExportDrawerProps) {
  const { t } = useTranslation();
  const { orgLogo } = useCurrentContext();

  const [preset, setPreset] = useState<PresetId>("accountant_daily");
  const [grains, setGrains] = useState<Grain[]>(["order"]);
  const [customFilename, setCustomFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const [customizeExpanded, setCustomizeExpanded] = useState(false);

  // Sync grains when preset changes
  const handlePresetChange = (presetId: PresetId) => {
    setPreset(presetId);
    const selectedSpec = PRESETS.find((p) => p.id === presetId);
    if (selectedSpec) {
      setGrains(selectedSpec.grains);
    }
  };

  // Safe slugify helper for branch slug
  const branchSlug = branchName
    ? branchName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : "branch";

  // Build merged filters for the current selection
  const activePresetSpec = PRESETS.find((p) => p.id === preset)!;
  const { page: _page, per_page: _per_page, ...cleanFilters } = filters;
  const mergedFilters = {
    ...cleanFilters,
    ...activePresetSpec.filterOverrides,
  };

  const defaultFilename = buildFilename({
    presetId: preset,
    branchSlug,
    from: mergedFilters.from || null,
    to: mergedFilters.to || null,
  });

  // Reset local state when drawer is opened
  useEffect(() => {
    if (open) {
      setPreset("accountant_daily");
      setGrains(["order"]);
      setCustomFilename("");
      setBusy(false);
      setCustomizeExpanded(false);
    }
  }, [open]);

  const handleExport = async () => {
    if (!filters.branch_id) {
      toast.error(t("ordersExport.selectBranchError") || "Please select a branch first");
      return;
    }
    if (grains.length === 0) {
      toast.error(t("ordersExport.noGrainsSelected") || "Please select at least one sheet to export");
      return;
    }

    setBusy(true);
    try {
      // Omit pagination parameters
      const reqFilters: OrdersQuery = {
        ...mergedFilters,
      };

      const res = await exportApi.exportOrders(reqFilters);

      if (!res.data || res.data.length === 0) {
        toast.error(t("ordersExport.noOrders"));
        return;
      }

      const sheets = buildSheets(res.data, grains, t);
      const meta = buildMeta({
        branchName,
        from: reqFilters.from || null,
        to: reqFilters.to || null,
        payment: reqFilters.payment_method || null,
        status: reqFilters.status || null,
        shiftLabel,
        t,
      });

      const filename = customFilename || defaultFilename;

      await exportToExcel({
        filename,
        sheets,
        meta,
        logoUrl: orgLogo || undefined,
      });

      toast.success(t("ordersExport.success") || "Export completed successfully!");
      onClose();
    } catch (e) {
      const msg = getErrorMessage(e);
      if (msg.includes("Export too large")) {
        toast.error(t("ordersExport.tooLarge"));
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleGrain = (grain: Grain) => {
    if (grains.includes(grain)) {
      setGrains(grains.filter((g) => g !== grain));
    } else {
      setGrains([...grains, grain]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent sheet="right" showClose={!busy} className="p-0 flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b p-6 flex items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-bold">{t("ordersExport.title")}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">{t("ordersExport.subtitle")}</p>
          </div>
        </div>

        {/* Scrollable Body */}
        <DialogBody className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Preset Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("ordersExport.presets.title") || "Export Presets"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                const isSelected = preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetChange(p.id)}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-start transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50 hover:border-border"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold">{t(p.i18nKey)}</p>
                      <p className="text-xs text-muted-foreground leading-normal">{t(p.description)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customize Grains Section */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setCustomizeExpanded(!customizeExpanded)}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <span>{t("ordersExport.customizeBtn") || "Customize export sheets"}</span>
              {customizeExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {customizeExpanded && (
              <Card className="border-dashed bg-muted/20">
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t("ordersExport.grainsSection")}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(["order", "line_item", "payment", "deduction"] as Grain[]).map((g) => (
                      <label
                        key={g}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={grains.includes(g)}
                          onCheckedChange={() => toggleGrain(g)}
                          disabled={preset !== "custom"}
                        />
                        <div className="text-start">
                          <p className="text-sm font-semibold">{t(`ordersExport.grains.${g}`)}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {preset !== "custom" && (
                    <p className="text-[10px] text-warning flex items-center gap-1">
                      <AlertTriangle size={11} />
                      {t("ordersExport.lockedGrainsHint") || "Select the 'Custom' preset to toggle columns."}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Filters Summary Card */}
          <Card className="bg-muted/30 border-0">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("ordersExport.filtersSummary")}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("orders.branch")}</p>
                  <p className="font-semibold">{branchName || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("orders.date")}</p>
                  <p className="font-semibold">
                    {mergedFilters.from && mergedFilters.to
                      ? `${mergedFilters.from.slice(0, 10)} → ${mergedFilters.to.slice(0, 10)}`
                      : t("orders.allTime")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("orders.payment")}</p>
                  <p className="font-semibold">
                    {mergedFilters.payment_method
                      ? t(`payments.${mergedFilters.payment_method}`, {
                          defaultValue: mergedFilters.payment_method,
                        })
                      : t("orders.allMethods") || "All Methods"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("common.status")}</p>
                  <p className="font-semibold">
                    {mergedFilters.status
                      ? t(`orderStatus.${mergedFilters.status}`, { defaultValue: mergedFilters.status })
                      : t("orders.allStatuses") || "All Statuses"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filename Input */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t("ordersExport.filename")}</Label>
            <div className="space-y-1.5">
              <Input
                placeholder={defaultFilename}
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                disabled={busy}
              />
              <p className="text-[10px] text-muted-foreground">{t("ordersExport.filenameHint")}</p>
            </div>
          </div>
        </DialogBody>

        {/* Footer */}
        <DialogFooter className="sticky bottom-0 z-10 bg-background border-t p-6 flex flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {t("ordersExport.rowEstimate", { count: totalApprox })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              {t("ordersExport.cancelButton")}
            </Button>
            <Button
              loading={busy}
              disabled={grains.length === 0 || !filters.branch_id}
              onClick={handleExport}
            >
              {t("ordersExport.exportButton")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
