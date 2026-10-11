import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import type { UarCatalogStatus } from "../api";

export function UarCatalogNotice({ provider, status, loading, selectedModel, modelIds }: {
  provider: string;
  status?: UarCatalogStatus | null;
  loading?: boolean;
  selectedModel?: string;
  modelIds?: string[];
}) {
  const { t } = useTranslation();
  if (provider !== "uar") return null;
  const state = loading ? "loading" : status?.state ?? "unavailable";
  const missingModel = state === "ready" && !!selectedModel && selectedModel !== "default" && !modelIds?.includes(selectedModel);
  return (
    <div role="status" className="rounded-lg border border-border-subtle bg-bg-subtle p-3 text-xs space-y-1">
      <p>{t(`providers.uar_catalog_${state}`)}</p>
      {missingModel && <p className="text-error">{t("providers.uar_model_unavailable", { model: selectedModel })}</p>}
      {status?.error && <p className="text-error break-words">{status.error}</p>}
      {(state === "empty" || state === "unavailable" || missingModel) && (
        <Link to="/providers" className="text-brand underline">{t("providers.uar_catalog_configure")}</Link>
      )}
    </div>
  );
}
