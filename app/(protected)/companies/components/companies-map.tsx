"use client";

import L from "leaflet";
import { useEffect, useRef, useState } from "react";

import type { CompanyResult } from "@/lib/companies/serpapi";
import "leaflet/dist/leaflet.css";

interface CompaniesMapProps {
  companies: CompanyResult[];
  /** Centro della ricerca (città geocodificata) — assente prima della 1a search. */
  center: { lat: number; lng: number } | null;
  /** Raggio selezionato in metri — disegna il cerchio dell'area di ricerca. */
  radiusM: number;
  /** Index highlighted on the map (click OR hover from the list). */
  highlightedIndex: number | null;
  /** Index selected from the list — the map centers on it. */
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}

// Normal: small dot in the companies tone — highlighted: primary teardrop pin.
// Tile layer: OpenStreetMap standard (free, no key).
const dotIcon = L.divIcon({
  className: "",
  html: `<div style="width:12px;height:12px;border-radius:9999px;background:var(--companies);border:2px solid var(--card);box-shadow:0 0 0 2px var(--companies)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="26" height="34" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="var(--primary)"/><circle cx="12" cy="11.5" r="5" fill="var(--card)"/></svg>`,
  iconSize: [26, 34],
  iconAnchor: [13, 32],
});

export default function CompaniesMap({
  companies,
  center,
  radiusM,
  highlightedIndex,
  selectedIndex,
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

  // Fit only when the searched area changes — appending results ("Carica
  // altri") must not reset the user's zoom/pan.
  const fitKey = center
    ? `${center.lat},${center.lng},${radiusM}`
    : companies.map((c) => c.key).join("|");

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
    if (!map || !center) return;
    const circle = L.circle([center.lat, center.lng], {
      radius: radiusM,
      color: "var(--primary)",
      weight: 1.5,
      fillOpacity: 0.08,
    }).addTo(map);
    return () => {
      circle.remove();
    };
  }, [map, center, radiusM]);

  useEffect(() => {
    if (!map) return;
    const markers = companies.map((c, i) => {
      if (c.lat == null || c.lon == null) return null;
      const content = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = c.name;
      content.appendChild(title);
      if (c.address) {
        content.appendChild(document.createElement("br"));
        content.appendChild(document.createTextNode(c.address));
      }
      return L.marker([c.lat, c.lon], {
        icon: i === highlightedRef.current ? pinIcon : dotIcon,
      })
        .on("click", () => onSelectRef.current(i))
        .on("mouseover", () => onHoverRef.current(i))
        .on("mouseout", () => onHoverRef.current(null))
        .bindPopup(content)
        .addTo(map);
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
      m?.setIcon(i === highlightedIndex ? pinIcon : dotIcon);
    });
  }, [map, highlightedIndex]);

  // Fit sul cerchio del raggio quando c'è (mostra l'area cercata),
  // altrimenti sui pin dei risultati — keyed on fitKey, not the data.
  // biome-ignore lint/correctness/useExhaustiveDependencies: fitKey gates the fit
  useEffect(() => {
    if (!map || !fitKey) return;
    const cs = companiesRef.current;
    const b = center
      ? L.latLng(center.lat, center.lng).toBounds(radiusM * 2)
      : cs
          .filter(
            (c): c is CompanyResult & { lat: number; lon: number } =>
              c.lat != null && c.lon != null,
          )
          .map((c) => [c.lat, c.lon] as [number, number]);
    if (Array.isArray(b) ? b.length > 0 : b) {
      map.fitBounds(b, { padding: [30, 30] });
    }
  }, [map, fitKey]);

  // Pan to the selected card only when the SELECTION changes — load-more
  // appends must not re-pan.
  useEffect(() => {
    if (!map || selectedIndex == null) return;
    const c = companiesRef.current[selectedIndex];
    if (!c || c.lat == null || c.lon == null) return;
    // No animate:true — the pan animation outlives <Activity> hide and
    // crashes on the detached node ("_leaflet_pos" of undefined).
    map.setView([c.lat, c.lon], map.getZoom(), { animate: false });
  }, [map, selectedIndex]);

  return <div ref={containerRef} className="h-full w-full" />;
}
