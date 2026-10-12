import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useUarChatTarget } from "../lib/queries/uarChat";
import { useUarStatus } from "../lib/queries/uar";
import { useSaveUarChatTarget } from "../lib/mutations/uarChat";
import type { UarTargetCard } from "../api";

const field = "w-full rounded-lg border border-border-subtle bg-main p-2 text-sm text-text-main focus-visible:outline-2 focus-visible:outline-brand";
const usable = (card: UarTargetCard) => card.uar.available && card.uar.delegation_available;

export function UarTargetSettings({ agentId }: { agentId: string }) {
  const { t } = useTranslation();
  const id = useId();
  const query = useUarChatTarget(agentId);
  const status = useUarStatus();
  const save = useSaveUarChatTarget();
  const [search, setSearch] = useState("");
  const [targetId, setTargetId] = useState("");
  const [override, setOverride] = useState("");
  const saved = query.data?.target;
  useEffect(() => {
    setTargetId(saved?.targetId ?? "");
    setOverride(saved?.targetId.startsWith("uar:agent:") ? saved.modelOverride ?? "" : "");
  }, [agentId, saved?.targetId, saved?.modelOverride]);
  const cards = query.data?.catalog?.data ?? [];
  const selected = cards.find((card) => card.id === targetId);
  const missing = !!targetId && !selected;
  const filtered = cards.filter((card) => [card.id, card.uar.display_name, card.uar.provider_id, card.uar.model_id]
    .some((value) => value?.toLocaleLowerCase().includes(search.toLocaleLowerCase())));
  const visible = selected && !filtered.includes(selected) ? [selected, ...filtered] : filtered;
  const models = cards.filter((card) => card.uar.kind === "model" && card.uar.available &&
    selected?.uar.allowed_model_overrides?.includes(card.id));
  const changed = targetId !== saved?.targetId ||
    (selected?.uar.kind === "agent" && override !== (saved?.modelOverride ?? ""));
  const model = override || (selected?.uar.provider_id && selected.uar.model_id
    ? `${selected.uar.provider_id}/${selected.uar.model_id}` : t("uar_chat.not_configured"));
  const error = save.error ?? query.error;
  return <section className="rounded-xl border border-border-subtle bg-surface p-4 space-y-3" aria-label={t("uar_chat.target")}>
    <div className="flex justify-between items-center gap-3">
      <h3 className="font-semibold text-sm">{t("uar_chat.target")}</h3>
      <button type="button" className="inline-flex items-center gap-1 text-xs text-brand p-1" onClick={() => void query.refetch()} disabled={query.isFetching}>
        <RefreshCw className="h-3.5 w-3.5" />{t("common.refresh")}
      </button>
    </div>
    {!saved && <p className="text-xs text-text-dim">{t("uar_chat.legacy")}</p>}
    <label className="block text-xs space-y-1" htmlFor={`${id}-search`}>
      <span>{t("uar_chat.search")}</span>
      <input id={`${id}-search`} type="search" className={field} value={search} onChange={(event) => setSearch(event.target.value)} />
    </label>
    <label className="block text-xs space-y-1" htmlFor={`${id}-target`}>
      <span>{t("uar_chat.target")}</span>
      <select id={`${id}-target`} className={field} value={targetId} onChange={(event) => { setTargetId(event.target.value); setOverride(""); }} disabled={query.isLoading}>
        <option value="">{t("uar_chat.choose")}</option>
        {missing && <option value={targetId}>{targetId} — {t("uar_chat.unavailable")}</option>}
        {(["agent", "model"] as const).map((kind) => <optgroup key={kind} label={t(`uar_chat.group_${kind}`)}>
          {visible.filter((card) => card.uar.kind === kind).map((card) => <option key={card.id} value={card.id} disabled={!usable(card)}>
            {card.uar.display_name} · {card.uar.provider_id ?? card.uar.agent_id ?? "UAR"}/{card.uar.model_id ?? "—"}{!usable(card) ? ` — ${t("uar_chat.unavailable")}` : ""}
          </option>)}
        </optgroup>)}
      </select>
    </label>
    {(missing || (selected && !usable(selected))) && <p role="status" className="text-xs text-error">{selected?.uar.delegation_reason ?? selected?.uar.reason ?? t("uar_chat.saved_unavailable")}</p>}
    {selected?.uar.kind === "agent" && <details open={!!override} className="text-xs">
      <summary className="cursor-pointer py-2">{t("uar_chat.advanced")}</summary>
      <label htmlFor={`${id}-override`} className="block space-y-1">
        <span>{t("uar_chat.model")}</span>
        <select id={`${id}-override`} className={field} value={override} onChange={(event) => setOverride(event.target.value)}>
          <option value="">{t("uar_chat.configured_model")}</option>
          {override && !models.some((card) => card.id === override) && <option value={override} disabled>{override} — {t("uar_chat.unavailable")}</option>}
          {models.map((card) => <option value={card.id} key={card.id}>{card.uar.display_name} · {card.id}</option>)}
        </select>
      </label>
      <p className="text-text-dim mt-1">{t("uar_chat.override_policy")}</p>
    </details>}
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs break-all">
      <dt className="text-text-dim">{t("uar_chat.instance")}</dt><dd>{saved?.instanceId ?? status.data?.selected_instance_id ?? t("uar_chat.not_configured")}</dd>
      <dt className="text-text-dim">{t("uar_chat.agent")}</dt><dd>{selected?.uar.agent_id ?? "—"}</dd>
      <dt className="text-text-dim">{t("uar_chat.model")}</dt><dd>{model}</dd>
      <dt className="text-text-dim">{t("uar_chat.workspace")}</dt><dd>{saved?.workspaceId ?? t("uar_chat.selected_workspace")}</dd>
      <dt className="text-text-dim">{t("uar_chat.memory")}</dt><dd>{t("uar_chat.memory_scope")}</dd>
    </dl>
    <p className="text-xs text-text-dim">{t("uar_chat.ownership")}</p>
    {(error || query.data?.error) && <p role="alert" className="text-xs text-error break-words">{error?.message ?? query.data?.error}</p>}
    {query.isLoading && <p role="status" className="text-xs">{t("common.loading")}</p>}
    {!query.isLoading && !cards.length && <p className="text-xs text-text-dim">{t("uar_chat.empty")}</p>}
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="rounded-lg bg-brand text-white px-3 py-2 text-sm disabled:opacity-50" disabled={!selected || !usable(selected) || !changed || save.isPending || (!!override && !models.some((card) => card.id === override))} onClick={() => save.mutate({ agentId, targetId, modelOverride: selected?.uar.kind === "agent" ? override || null : null })}>{t("uar_chat.save")}</button>
      <Link to="/providers" className="text-xs text-brand underline">{t("uar_chat.configure")}</Link>
      {save.isSuccess && !changed && <span role="status" className="text-xs text-success">{t("uar_chat.saved")}</span>}
    </div>
  </section>;
}
