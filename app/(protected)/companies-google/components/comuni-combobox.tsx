"use client";

import { X } from "lucide-react";
import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { texts } from "@/texts";

interface Comune {
  /** Nome canonico (maiuscolo) — valore passato al backend. */
  raw: string;
  /** Nome per la UI (Title Case). */
  name: string;
  /** Sigla provincia. */
  prov: string;
  /** Nome normalizzato per il filtro (accenti rimossi, lowercase). */
  key: string;
}

const MIN_CHARS = 2;
const MAX_RESULTS = 20;

const PARTICLES = new Set([
  "di", "del", "della", "dei", "degli", "delle",
  "da", "dal", "dalla",
  "in", "nel", "nella",
  "su", "sul", "sulla",
  "con", "e", "ed", "a", "al", "alla", "per", "tra", "fra",
]);

function titleCase(raw: string): string {
  return raw
    .toLowerCase()
    .split(" ")
    .map((w, i) => {
      const apo = w.indexOf("'");
      if (apo >= 0) {
        const pre = w.slice(0, apo + 1);
        const post = w.slice(apo + 1);
        return pre + (post ? post.charAt(0).toUpperCase() + post.slice(1) : "");
      }
      if (i > 0 && PARTICLES.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function parseComuni(txt: string): Comune[] {
  const out: Comune[] = [];
  for (const line of txt.split("\n")) {
    const i = line.indexOf("|");
    if (i <= 0) continue;
    const raw = line.slice(0, i);
    out.push({
      raw,
      name: titleCase(raw),
      prov: line.slice(i + 1),
      key: normalize(raw),
    });
  }
  return out;
}

export function ComuniCombobox({
  id,
  value,
  onChange,
  inputClassName,
}: {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  inputClassName?: string;
}) {
  const [all, setAll] = useState<Comune[] | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // B2: fetch al mount, una volta. Il file è cachato un anno (next.config).
  useEffect(() => {
    let cancelled = false;
    fetch("/comuni.txt")
      .then((r) =>
        r.ok ? r.text() : Promise.reject(new Error(String(r.status))),
      )
      .then((txt) => {
        if (!cancelled) setAll(parseComuni(txt));
      })
      .catch(() => {
        if (!cancelled) setAll([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const matches = useMemo(() => {
    const q = normalize(query);
    if (q.length < MIN_CHARS || !all) return [];
    const out: Comune[] = [];
    for (const c of all) {
      if (c.key.startsWith(q)) {
        out.push(c);
        if (out.length === MAX_RESULTS) break;
      }
    }
    return out;
  }, [query, all]);

  function select(c: Comune) {
    if (!value.includes(c.raw)) onChange([...value, c.raw]);
    setQuery("");
    setOpen(false);
    setActive(0);
  }

  function remove(raw: string) {
    onChange(value.filter((v) => v !== raw));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(matches.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const pick = matches[active];
      if (pick) {
        e.preventDefault();
        select(pick);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const q = query.trim();
  const showHint = open && q.length < MIN_CHARS;
  const showList = open && q.length >= MIN_CHARS;

  return (
    <div ref={rootRef} className="relative">
      {value.length > 0 ? (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {value.map((raw) => (
            <Badge key={raw} variant="secondary" className="gap-1 pr-1">
              {titleCase(raw)}
              <button
                type="button"
                onClick={() => remove(raw)}
                aria-label={`${texts.comuniRemove} ${titleCase(raw)}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <Input
        id={id}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={texts.comuniPlaceholder}
        aria-label={texts.placesComuniLabel}
        autoComplete="off"
        className={inputClassName}
      />

      {showHint ? (
        <div className="bg-popover text-popover-foreground border-border absolute z-50 mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-md">
          <span className="text-muted-foreground">{texts.comuniMinChars}</span>
        </div>
      ) : null}

      {showList ? (
        <div className="bg-popover text-popover-foreground border-border absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border shadow-md">
          {matches.length === 0 ? (
            <p className="text-muted-foreground px-3 py-2 text-sm">
              {texts.comuniNoResults}
            </p>
          ) : (
            matches.map((c, i) => (
              <button
                key={`${c.raw}|${c.prov}`}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => select(c)}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${
                  i === active ? "bg-accent" : ""
                }`}
              >
                <span>{c.name}</span>
                <span className="text-muted-foreground text-xs">{c.prov}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
