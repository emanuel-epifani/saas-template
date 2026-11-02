"use client";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

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

// Normal: small muted dot — highlighted: red teardrop pin.
// Tile layer: OpenStreetMap standard (free, no key).
const dotIcon = L.divIcon({
  className: "",
  html: `<div style="width:12px;height:12px;border-radius:9999px;background:var(--muted-foreground);border:2px solid var(--background);box-shadow:0 0 0 2px var(--muted-foreground)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="26" height="34" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="var(--destructive)"/><circle cx="12" cy="11.5" r="5" fill="var(--background)"/></svg>`,
  iconSize: [26, 34],
  iconAnchor: [13, 32],
});

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [30, 30] });
  }, [bounds, map]);
  return null;
}

function CenterOn({
  target,
}: {
  target: { lat: number; lng: number; zoom?: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.setView([target.lat, target.lng], target.zoom ?? map.getZoom(), {
        animate: true,
      });
    }
  }, [target, map]);
  return null;
}

export default function CompaniesMap({
  companies,
  center,
  radiusM,
  highlightedIndex,
  selectedIndex,
  onSelect,
  onHover,
}: CompaniesMapProps) {
  // Fit sul cerchio del raggio quando c'è (mostra l'area cercata),
  // altrimenti sui pin dei risultati.
  const bounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    if (center) return L.latLng(center.lat, center.lng).toBounds(radiusM * 2);
    const pts = companies
      .filter(
        (c): c is CompanyResult & { lat: number; lon: number } =>
          c.lat != null && c.lon != null,
      )
      .map((c) => [c.lat, c.lon] as [number, number]);
    return pts.length > 0 ? pts : null;
  }, [companies, center, radiusM]);

  const selectedTarget = useMemo<{ lat: number; lng: number } | null>(() => {
    const c = selectedIndex != null ? companies[selectedIndex] : undefined;
    if (!c || c.lat == null || c.lon == null) return null;
    return { lat: c.lat, lng: c.lon };
  }, [companies, selectedIndex]);

  return (
    <MapContainer
      center={[45.07, 7.52]}
      zoom={11}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds bounds={bounds} />
      <CenterOn target={selectedTarget} />
      {center ? (
        <Circle
          center={[center.lat, center.lng]}
          radius={radiusM}
          pathOptions={{
            color: "var(--primary)",
            weight: 1.5,
            fillOpacity: 0.08,
          }}
        />
      ) : null}
      {companies.map((c, i) =>
        c.lat != null && c.lon != null ? (
          <Marker
            key={c.key}
            position={[c.lat, c.lon]}
            icon={i === highlightedIndex ? pinIcon : dotIcon}
            eventHandlers={{
              click: () => onSelect(i),
              mouseover: () => onHover(i),
              mouseout: () => onHover(null),
            }}
          >
            <Popup>
              <strong>{c.name}</strong>
              {c.address ? <br /> : null}
              {c.address}
            </Popup>
          </Marker>
        ) : null,
      )}
    </MapContainer>
  );
}
