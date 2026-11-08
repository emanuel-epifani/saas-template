"use client";

import L from "leaflet";
import { useEffect, useRef, useState } from "react";

import type { CompanyResult } from "@/lib/serpapi";
import "leaflet/dist/leaflet.css";

interface CompaniesMapProps {
  companies: CompanyResult[];
  /** Firma della ricerca attiva (term|city) — cambia → fitBounds sui marker. */
  searchKey: string;
  /** Index highlighted on the map (click OR hover from the list). */
  highlightedIndex: number | null;
  /** Index selected from the list — the map centers on it and opens its popup. */
  selectedIndex: number | null;
  /** Index under the pointer — a different one suppresses the pinned popup. */
  hoveredIndex: number | null;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}

// Every result is a numbered teardrop pin; the active one fills with the
// action color — same numbering and same selection rule as the list
// register. Tile layer: OpenStreetMap standard (free, no key),
// desaturated via CSS.
function markerIcon(i: number, active: boolean) {
  return L.divIcon({
    className: "",
    html: `<svg class="map-pin${active ? " is-active" : ""}" width="26" height="32" viewBox="0 0 26 32" aria-hidden="true"><path class="map-pin-shape" d="M13 1C6.4 1 1 6.4 1 13c0 8 12 18 12 18s12-10 12-18C25 6.4 19.6 1 13 1Z"/><text x="13" y="15.5" text-anchor="middle" class="map-pin-num">${i + 1}</text></svg>`,
    iconSize: [26, 32],
    iconAnchor: [13, 32],
  });
}

export default function CompaniesMap({
  companies,
  searchKey,
  highlightedIndex,
  selectedIndex,
  hoveredIndex,
  onSelect,
  onHover,
}: CompaniesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<(L.Marker | null)[]>([]);
  const [map, setMap] = useState<L.Map | null>(null);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  onSelectRef.current = onSelect;
  onHoverRef.current = onHover;
  const highlightedRef = useRef(highlightedIndex);
  highlightedRef.current = highlightedIndex;
  const companiesRef = useRef(companies);
  companiesRef.current = companies;

  // Fit only when the ACTIVE search changes — appending results ("Carica
  // altri") keeps the same searchKey and must not reset the user's zoom/pan.
  const fitKey = searchKey;

  // Imperative Leaflet: Next keeps hidden routes alive and re-runs effects on
  // restore; react-leaflet can't survive that (map container reused). We
  // create a fresh inner element per effect-mount, so Leaflet never sees a
  // recycled node, and tear it down in cleanup.
  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    const el = document.createElement("div");
    el.className = "h-full w-full";
    host.appendChild(el);
    const m = L.map(el, { scrollWheelZoom: true }).setView([45.07, 7.52], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    setMap(m);
    return () => {
      m.remove();
      el.remove();
      setMap(null);
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    const markers = companies.map((c, i) => {
      const content = document.createElement("div");
      const num = document.createElement("span");
      num.className = "map-popup-num";
      num.textContent = String(i + 1);
      content.appendChild(num);
      const title = document.createElement("strong");
      title.textContent = c.name;
      content.appendChild(title);
      if (c.address) {
        content.appendChild(document.createElement("br"));
        content.appendChild(document.createTextNode(c.address));
      }
      return (
        L.marker([c.lat, c.lon], {
          icon: markerIcon(i, i === highlightedRef.current),
        })
          .on("click", () => onSelectRef.current(i))
          .on("mouseover", () => onHoverRef.current(i))
          .on("mouseout", () => onHoverRef.current(null))
          // Offset negativo: la punta del popup sta SOPRA la testa del pin
          // (32px) — altrimenti copre il marker evidenziato.
          .bindPopup(content, { offset: [0, -36] })
          .addTo(map)
      );
    });
    markersRef.current = markers;
    return () => {
      for (const m of markers) m?.remove();
      markersRef.current = [];
    };
  }, [map, companies]);

  useEffect(() => {
    if (!map) return;
    markersRef.current.forEach((m, i) => {
      m?.setIcon(markerIcon(i, i === highlightedIndex));
    });
  }, [map, highlightedIndex]);

  // Fit sui pin dei risultati a ogni nuova ricerca — keyed on fitKey
  // (firma della search), non sui dati: il load-more non deve ri-fittare.
  useEffect(() => {
    if (!map || !fitKey) return;
    const b = companiesRef.current.map(
      (c) => [c.lat, c.lon] as [number, number],
    );
    if (b.length > 0) {
      map.fitBounds(b, { padding: [30, 30] });
    }
  }, [map, fitKey]);

  // On selection the popup is the eye's anchor — the map re-centers only
  // when the pin is off-view or hugging the edge, so a click never makes
  // the user lose their bearings. Load-more appends must not re-pan.
  // Hovering a DIFFERENT row hides the pinned popup: while scanning the
  // list the map stays clean and the pins visible; it reopens when the
  // pointer leaves the list (or returns on the selected row).
  useEffect(() => {
    if (!map) return;
    const suppressed =
      selectedIndex == null ||
      (hoveredIndex != null && hoveredIndex !== selectedIndex);
    if (suppressed) {
      map.closePopup();
      return;
    }
    const c = companiesRef.current[selectedIndex];
    if (!c) return;
    const ll = L.latLng(c.lat, c.lon);
    // No animate:true — the pan animation outlives <Activity> hide and
    // crashes on the detached node ("_leaflet_pos" of undefined).
    if (!map.getBounds().pad(-0.15).contains(ll)) {
      map.setView(ll, map.getZoom(), { animate: false });
    }
    markersRef.current[selectedIndex]?.openPopup();
  }, [map, selectedIndex, hoveredIndex]);

  return <div ref={containerRef} className="h-full w-full" />;
}
