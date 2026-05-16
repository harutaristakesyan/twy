import L from "leaflet";
import type React from "react";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap, ZoomControl } from "react-leaflet";
import type { Load, Location } from "@/features/load/types/load";

const US_CENTER: [number, number] = [39.5, -98.35];
const US_ZOOM = 4;

const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

// TODO(twy): geocode pickup/dropoff addresses via a real geocoder.
// For now we plot deterministic placeholder coordinates per load + stop, just
// so the map reacts visibly when the user selects a load.
const placeholderCoord = (loadId: string, kind: "pickup" | "dropoff", index: number) => {
  const seed = hashString(`${loadId}:${kind}:${index}`);
  const latJitter = ((seed % 1000) / 1000) * 20 - 10;
  const lngJitter = (((seed >> 10) % 1000) / 1000) * 40 - 20;
  return [US_CENTER[0] + latJitter, US_CENTER[1] + lngJitter] as [number, number];
};

const pinSvg = (fill: string) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 44" width="32" height="44">
    <path d="M16 0C7.2 0 0 7 0 15.7c0 11.4 14.2 26.3 14.8 27 .3.3.7.5 1.2.5s.9-.2 1.2-.5c.6-.7 14.8-15.6 14.8-27C32 7 24.8 0 16 0z" fill="${fill}"/>
    <circle cx="16" cy="15.5" r="5.5" fill="white"/>
  </svg>
`;

const makePin = (fill: string) =>
  L.divIcon({
    html: pinSvg(fill),
    className: "twy-map-pin",
    iconSize: [32, 44],
    iconAnchor: [16, 44],
  });

const FitBounds: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) {
      map.setView(US_CENTER, US_ZOOM);
      return;
    }
    map.fitBounds(L.latLngBounds(points.map((p) => L.latLng(p[0], p[1]))), {
      padding: [80, 80],
      maxZoom: 7,
    });
  }, [map, points]);
  return null;
};

export const LoadMap: React.FC<{ load?: Load | null }> = ({ load }) => {
  const pickupIcon = useMemo(() => makePin("#2563eb"), []);
  const dropoffIcon = useMemo(() => makePin("#eab308"), []);

  const pickupPts: [number, number][] = load
    ? load.pickups.map((_: Location, i) => placeholderCoord(load.id, "pickup", i))
    : [];
  const dropoffPts: [number, number][] = load
    ? load.dropoffs.map((_: Location, i) => placeholderCoord(load.id, "dropoff", i))
    : [];
  const allPts = [...pickupPts, ...dropoffPts];

  return (
    <MapContainer
      center={US_CENTER}
      zoom={US_ZOOM}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
      attributionControl={false}
    >
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ZoomControl position="bottomright" />
      <FitBounds points={allPts} />
      {pickupPts.map((p) => (
        <Marker key={`pu-${p[0]}-${p[1]}`} position={p} icon={pickupIcon} />
      ))}
      {dropoffPts.map((p) => (
        <Marker key={`do-${p[0]}-${p[1]}`} position={p} icon={dropoffIcon} />
      ))}
      {allPts.length >= 2 && (
        <Polyline
          positions={allPts}
          pathOptions={{ color: "#0f172a", weight: 2, dashArray: "6 8" }}
        />
      )}
    </MapContainer>
  );
};
