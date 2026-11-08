"use client";

import { cn } from "cn";
import { Building2, LoaderCircle, MapPin } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  estimateOpenApiCompanies,
  getOpenApiCompany,
  searchOpenApiCompanies,
} from "@/lib/actions";
import { COMUNI } from "@/lib/companies/comuni";
import type {
  OpenApiCompanyMarketing,
  OpenApiCompanyResult,
} from "@/lib/companies/openapi";
import { openApiCompanySearchInputSchema } from "@/lib/zod-schemas";
import { texts } from "@/texts";
import { AtecoPicker } from "./ateco-picker";

const PAGE_SIZE = 20;
const ALL_STATUS = "__all__";
const STATUSES = [
  "ATTIVA",
  "REGISTRATA",
  "IN_ISCRIZIONE",
  "INATTIVA",
  "SOSPESA",
  "CESSATA",
] as const;

interface PickerItem {
  /** Valore inviato all'API (Belfiore / codice ATECO). */
  value: string;
  /** Testo mostrato e cercabile. */
  label: string;
  /** Hint mono a destra (sigla provincia). */
  sub?: string;
}

const COMUNE_ITEMS: readonly PickerItem[] = COMUNI.map(
  ([name, code, prov]) => ({ value: code, label: name, sub: prov }),
);
const COMUNE_BY_CODE = new Map(
  COMUNI.map(([name, code, prov]) => [code, `${name} (${prov})`]),
);

interface Filters {
  /** Codice Belfiore dal picker — "" = nessun filtro comune. */
  townCode: string;
  /** Testo nel campo comune: conta solo se seguito da un pick. */
  comuneText: string;
  /** Codice ATECO dal tree picker (divisione o sottocategoria). */
  atecoCode: string;
  activityStatus: string;
}

interface DetailState {
  row: OpenApiCompanyResult;
  data: OpenApiCompanyMarketing | null;
  loading: boolean;
}

const eur3 = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});
const eur0 = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const int0 = new Intl.NumberFormat("it-IT");

function statusLabel(v: string) {
  if (v === "IN_ISCRIZIONE") return texts.openapiStatusInIscrizione;
  return v.charAt(0) + v.slice(1).toLowerCase();
}

// Stessa banda segmentata del SearchBar SerpAPI — etichetta uppercase per
// cella, look "registro". I filtri editabili sono una BOZZA: la stima e i
// risultati mostrati appartengono sempre a `query` (snapshot dell'ultimo
// submit), come nel vecchio flusso.
export function SearchSection() {
  const [draft, setDraft] = useState<Filters>({
    townCode: "",
    comuneText: "",
    atecoCode: "",
    activityStatus: "ATTIVA",
  });
  const [query, setQuery] = useState<Filters | null>(null);
  const [estimate, setEstimate] = useState<{
    count: number;
    cost: number;
  } | null>(null);
  const [results, setResults] = useState<OpenApiCompanyResult[]>([]);
  const [skip, setSkip] = useState(0);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [estimating, startEstimate] = useTransition();
  const [loading, startLoad] = useTransition();

  const searched = query !== null;
  const hasFilter = Boolean(draft.townCode || draft.atecoCode);
  const status = !searched
    ? "idle"
    : results.length === 0 && estimate?.count === 0
      ? "empty"
      : "results";

  function toInput(f: Filters, skip_: number) {
    return {
      townCode: f.townCode || undefined,
      atecoCode: f.atecoCode || undefined,
      activityStatus:
        f.activityStatus === ALL_STATUS
          ? undefined
          : (f.activityStatus as (typeof STATUSES)[number]),
      skip: skip_,
      limit: PAGE_SIZE,
    };
  }

  // Submit = solo dryRun (gratis): conta i record e stima il costo della
  // fetch con l'enrichment scelto. La fetch vera parte su "Carica lista".
  // Prima valida in client con lo STESSO zod dell'action → niente 422/500.
  function onSubmit() {
    // Testo digitato ma mai selezionato → non è un filtro valido.
    if (draft.comuneText.trim() && !draft.townCode) {
      toast.error(texts.openapiPickComuneHint);
      return;
    }
    if (!hasFilter) {
      toast.error(texts.openapiFiltersHint);
      return;
    }
    const parsed = openApiCompanySearchInputSchema.safeParse(toInput(draft, 0));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? texts.errorInvalidFilters);
      return;
    }
    const input = parsed.data;
    startEstimate(async () => {
      try {
        const est = await estimateOpenApiCompanies({
          ...input,
          dataEnrichment: "name",
        });
        setQuery(draft);
        setEstimate(est);
        setResults([]);
        setSkip(0);
      } catch (e) {
        toast.error(apiErrorMessage(e));
      }
    });
  }

  function loadResults(nextSkip: number) {
    if (!query) return;
    startLoad(async () => {
      try {
        const rows = await searchOpenApiCompanies(toInput(query, nextSkip));
        setResults(rows);
        setSkip(nextSkip);
      } catch (e) {
        toast.error(apiErrorMessage(e));
      }
    });
  }

  // Scheda a pagamento per record — SOLO on demand, mai in batch.
  function openDetail(row: OpenApiCompanyResult) {
    setDetail({ row, data: null, loading: true });
    getOpenApiCompany({ id: row.vatCode ?? row.externalId })
      .then((data) => setDetail({ row, data, loading: false }))
      .catch(() => {
        setDetail({ row, data: null, loading: false });
        toast.error(texts.searchError);
      });
  }

  function pickComune(item: PickerItem) {
    setDraft((d) => ({
      ...d,
      townCode: item.value,
      comuneText: `${item.label} (${item.sub})`,
    }));
  }

  // Blur senza pick → il testo torna alla selezione corrente o si svuota.
  // Il testo libero non è MAI un filtro: solo i pick producono codici.
  function revertComune() {
    setDraft((d) => ({
      ...d,
      comuneText: d.townCode ? (COMUNE_BY_CODE.get(d.townCode) ?? "") : "",
    }));
  }

  const total = estimate?.count ?? 0;
  const from = results.length > 0 ? skip + 1 : 0;
  const to = skip + results.length;
  const canPrev = skip > 0;
  const canNext = to < total;

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="bg-card border-border grid rounded-lg border sm:grid-cols-[1.6fr_1.3fr_0.7fr_auto]"
      >
        {/* overflow-hidden rimosso: i dropdown dei picker escono dal form */}
        <label htmlFor="oa-ateco" className={cell}>
          <span className={cellLabel}>{texts.openapiAtecoLabel}</span>
          {/* Bottone readonly → modale ad albero. Nessun testo libero,
              quindi nessuno stato orfano da gestire. */}
          <AtecoPicker
            value={draft.atecoCode}
            onPick={(code) => setDraft((d) => ({ ...d, atecoCode: code }))}
            className={field}
          />
        </label>
        <label htmlFor="oa-town" className={cell}>
          <span className={cellLabel}>{texts.openapiTownCodeLabel}</span>
          <CodePicker
            id="oa-town"
            items={COMUNE_ITEMS}
            text={draft.comuneText}
            onText={(t) =>
              setDraft((d) => ({ ...d, comuneText: t, townCode: "" }))
            }
            onPick={pickComune}
            onBlur={revertComune}
            placeholder={texts.openapiTownCodePlaceholder}
          />
        </label>
        <label htmlFor="oa-status" className={cell}>
          <span className={cellLabel}>{texts.openapiStatusLabel}</span>
          <Select
            value={draft.activityStatus}
            onValueChange={(v) => setDraft({ ...draft, activityStatus: v })}
          >
            <SelectTrigger id="oa-status" className={selectField}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUS}>
                {texts.openapiStatusAll}
              </SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <Button
          type="submit"
          size="lg"
          disabled={estimating || loading}
          className="min-h-12 rounded-none px-6 sm:h-auto sm:min-h-0"
        >
          {estimating ? <LoaderCircle className="animate-spin" /> : null}
          {estimating ? texts.searching : texts.searchAction}
        </Button>
      </form>

      {/* Stima gratuita: count + costo PRIMA di spendere. */}
      {estimate ? (
        <div className="bg-card border-border flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-3">
          <p className="text-sm font-medium">
            {int0.format(total)} {texts.openapiCompaniesWord}
            <span className="text-muted-foreground font-normal">
              {" "}
              · ~{eur3.format(estimate.cost)}
            </span>
          </p>
          <span className="text-muted-foreground rounded-sm border px-1.5 py-0.5 text-[10px] font-medium tracking-[0.08em] uppercase">
            {texts.estimateFreeLabel}
          </span>
          <span className="text-muted-foreground ml-auto text-xs">
            {texts.estimateNote}
          </span>
          {total > 0 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => loadResults(0)}
              disabled={loading}
            >
              {loading ? <LoaderCircle className="animate-spin" /> : null}
              {texts.estimateLoadAction}
            </Button>
          ) : null}
        </div>
      ) : null}

      {status === "idle" ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>{texts.searchIdleTitle}</EmptyTitle>
            <EmptyDescription>{texts.openapiIdleDesc}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {status === "empty" ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>{texts.searchNoResultsTitle}</EmptyTitle>
            <EmptyDescription>{texts.searchNoResultsDesc}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {loading && results.length === 0 ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-md" />
          ))}
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div
            className={cn(
              "bg-card relative flex min-h-0 flex-col rounded-md border transition-opacity",
              loading && "opacity-60",
            )}
          >
            <div className="scroll-list max-h-[70vh] min-h-0 overflow-y-auto">
              <ul className="divide-border divide-y">
                {results.map((c, i) => (
                  <li key={c.externalId} className="flex text-sm">
                    <span className="border-border bg-muted/40 text-muted-foreground flex w-10 shrink-0 items-center justify-center border-r font-mono text-xs font-medium tabular-nums">
                      {String(skip + i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1 px-4 py-3">
                      <p className="truncate leading-6 font-medium">
                        {c.name ?? "—"}
                      </p>
                      <p className="text-muted-foreground flex h-6 items-center gap-1.5 text-[13px] tabular-nums">
                        {c.vatCode ? (
                          <span>
                            {texts.vatShort} {c.vatCode}
                          </span>
                        ) : null}
                        {c.taxCode && c.taxCode !== c.vatCode ? (
                          <span>
                            · {texts.taxShort} {c.taxCode}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-muted-foreground flex h-6 items-center gap-1.5 text-[13px]">
                        {c.town ? (
                          <>
                            <MapPin className="size-3.5 shrink-0" />
                            <span className="truncate">{c.town}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center pr-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openDetail(c)}
                      >
                        {texts.detailAction}
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-border text-muted-foreground flex h-11 items-center gap-3 border-t px-4 text-xs">
              <span className="tabular-nums">
                {from}–{to} {texts.ofLabel} {int0.format(total)}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canPrev || loading}
                  onClick={() => loadResults(skip - PAGE_SIZE)}
                >
                  {texts.prevPageAction}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canNext || loading}
                  onClick={() => loadResults(skip + PAGE_SIZE)}
                >
                  {loading ? <LoaderCircle className="animate-spin" /> : null}
                  {texts.nextPageAction}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-6">
              {detail?.row.name ?? "—"}
            </DialogTitle>
          </DialogHeader>
          {detail?.loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-5 rounded" />
              ))}
            </div>
          ) : detail ? (
            <MarketingDetails marketing={detail.data} fallback={detail.row} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const cell =
  "border-border flex min-w-0 cursor-text flex-col justify-center border-b px-3.5 pt-2 pb-2 transition-colors focus-within:bg-accent/50 sm:border-r sm:border-b-0";
const cellLabel =
  "text-muted-foreground block text-[10px] font-medium tracking-[0.08em] uppercase";
const field =
  "h-8 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0 placeholder:font-normal placeholder:text-muted-foreground/70";
const selectField =
  "h-8 w-full border-0 bg-transparent px-0 text-sm font-medium shadow-none focus:ring-0";

function MarketingDetails({
  marketing,
  fallback,
}: {
  marketing: OpenApiCompanyMarketing | null;
  fallback: OpenApiCompanyResult;
}) {
  const m = marketing;
  const ateco = m?.atecoClassification?.ateco;
  const address = m?.address;
  const rows: { label: string; value: string }[] = [
    {
      label: texts.vatShort,
      value: m?.companyDetails?.vatCode ?? fallback.vatCode ?? "",
    },
    {
      label: texts.taxShort,
      value: m?.companyDetails?.taxCode ?? fallback.taxCode ?? "",
    },
    {
      label: texts.detailStatusLabel,
      value: m?.companyStatus?.activityStatus?.description ?? "",
    },
    {
      label: texts.detailAddressLabel,
      value: address
        ? [
            address.streetName,
            address.zipCode,
            address.town,
            address.province?.code ? `(${address.province.code})` : "",
          ]
            .filter(Boolean)
            .join(" ")
        : "",
    },
    {
      label: texts.detailAtecoLabel,
      value: ateco
        ? `${ateco.code ?? ""} ${ateco.description ?? ""}`.trim()
        : "",
    },
    {
      label: texts.detailTurnoverLabel,
      value: m?.ecofin?.turnover ? eur0.format(m.ecofin.turnover) : "",
    },
    {
      label: texts.detailEmployeesLabel,
      value: m?.employees?.employee ? int0.format(m.employees.employee) : "",
    },
    {
      label: texts.detailReaLabel,
      value: m?.companyDetails?.reaCode ?? "",
    },
    {
      label: texts.detailPhoneLabel,
      value: clean(m?.contacts?.telephoneNumber),
    },
    { label: texts.detailEmailLabel, value: clean(m?.mail?.email) },
    { label: texts.detailPecLabel, value: clean(m?.pec) },
    {
      label: texts.detailWebsiteLabel,
      value: clean(m?.webAndSocial?.website),
    },
  ].filter((r) => r.value);

  const socials = [m?.webAndSocial?.facebook, m?.webAndSocial?.linkedin].filter(
    (s): s is string => Boolean(s),
  );

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {texts.openapiDetailEmpty}
      </p>
    );
  }

  return (
    <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className="min-w-0 truncate" title={r.value}>
            {r.value}
          </dd>
        </div>
      ))}
      {socials.length > 0 ? (
        <div className="contents">
          <dt className="text-muted-foreground">{texts.detailSocialLabel}</dt>
          <dd className="flex min-w-0 gap-3">
            {socials.map((s) => (
              <a
                key={s}
                href={s}
                target="_blank"
                rel="noreferrer"
                className="text-primary truncate hover:underline"
              >
                {s?.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            ))}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

// Contatti arrivano concatenati ("0697276223;", "a@x.it,b@y.it") → prima voce.
function clean(v?: string | null): string {
  return v?.split(/[;,]/)[0]?.trim() ?? "";
}

// ---------------------------------------------------------------------------
// CodePicker — input con dropdown filtrato che produce SOLO codici validi.
// Il testo libero non è mai un filtro: senza pick non si invia nulla all'API.
// ---------------------------------------------------------------------------

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Prefisso prima, poi contains; anche match sul codice ("56" → ristorazione).
function filterItems(items: readonly PickerItem[], q: string): PickerItem[] {
  const n = norm(q.trim());
  if (!n) return items.slice(0, 30);
  const prefix: PickerItem[] = [];
  const rest: PickerItem[] = [];
  for (const it of items) {
    const t = norm(it.label);
    if (t.startsWith(n)) prefix.push(it);
    else if (t.includes(n) || norm(it.value).startsWith(n)) rest.push(it);
    if (prefix.length >= 50) break;
  }
  return [...prefix, ...rest].slice(0, 50);
}

interface CodePickerProps {
  id: string;
  items: readonly PickerItem[];
  text: string;
  onText: (t: string) => void;
  onPick: (item: PickerItem) => void;
  /** Il parent ripristina il testo coerente con la selezione corrente. */
  onBlur: () => void;
  placeholder?: string;
}

function CodePicker({
  id,
  items,
  text,
  onText,
  onPick,
  onBlur,
  placeholder,
}: CodePickerProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const filtered = useMemo(() => filterItems(items, text), [items, text]);

  function pick(item: PickerItem) {
    onPick(item);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Input
        id={id}
        value={text}
        onChange={(e) => {
          onText(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => {
          setOpen(false);
          onBlur();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && open && filtered.length > 0) {
            e.preventDefault();
            const item =
              filtered[Math.min(active, filtered.length - 1)] ?? filtered[0];
            if (item) pick(item);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className={field}
        autoComplete="off"
      />
      {open && filtered.length > 0 ? (
        <ul className="bg-popover text-popover-foreground absolute inset-x-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-md border py-1 shadow-md">
          {filtered.map((item, i) => (
            <li key={item.value}>
              <button
                type="button"
                // onMouseDown+preventDefault: il pick avviene prima del blur.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(item);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm",
                  i === active && "bg-accent",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.sub ? (
                  <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                    {item.sub}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// Errori API → messaggi comprensibili per chi usa la pagina.
function apiErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : "";
  if (msg.includes("invalid townCode")) return texts.errorTownCode;
  if (msg.includes("companyName")) return texts.errorCompanyName;
  if (msg.includes("HTTP 422")) return texts.errorInvalidFilters;
  return msg || texts.searchError;
}
