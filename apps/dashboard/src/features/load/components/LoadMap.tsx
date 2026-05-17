import L from "leaflet";
import type React from "react";
import { useEffect, useMemo } from "react";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  ZoomControl,
} from "react-leaflet";
import { useRoute } from "@/features/geocoding";
import type { Load, Location } from "@/features/load/types/load";

const EU_CENTER: [number, number] = [50, 10];
const EU_ZOOM = 4;

const PICKUP_COLOR = "#2563eb";
const DROPOFF_COLOR = "#0f172a";

const hasCoords = (loc: Location): loc is Location & { latitude: number; longitude: number } =>
  loc.latitude !== null &&
  loc.latitude !== undefined &&
  loc.longitude !== null &&
  loc.longitude !== undefined;

const dotHtml = (fill: string, label: string) => `
  <div style="
    width: 22px;
    height: 22px;
    border-radius: 9999px;
    background: ${fill};
    border: 2px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 11px;
    font-weight: 600;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    line-height: 1;
  ">${label}</div>
`;

const makeDot = (fill: string, label: string) =>
  L.divIcon({
    html: dotHtml(fill, label),
    className: "twy-map-dot",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const FitBounds: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) {
      map.setView(EU_CENTER, EU_ZOOM);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 10);
      return;
    }
    map.fitBounds(L.latLngBounds(points.map((p) => L.latLng(p[0], p[1]))), {
      padding: [80, 80],
      maxZoom: 11,
    });
  }, [map, points]);
  return null;
};

export const LoadMap: React.FC<{ load?: Load | null }> = ({ load }) => {
  const pickupStops = load?.pickups.filter(hasCoords) ?? [];
  const dropoffStops = load?.dropoffs.filter(hasCoords) ?? [];

  const pickupPts: [number, number][] = pickupStops.map((s) => [s.latitude, s.longitude]);
  const dropoffPts: [number, number][] = dropoffStops.map((s) => [s.latitude, s.longitude]);
  const allPts = [...pickupPts, ...dropoffPts];

  const routeCoords: Array<[number, number]> = allPts.map(([lat, lng]) => [lng, lat]);
  const { data: route, isError: routeError } = useRoute(routeCoords);

  const pickupIcons = useMemo(
    () =>
      pickupStops.map((_, i) => makeDot(PICKUP_COLOR, pickupStops.length > 1 ? String(i + 1) : "")),
    [pickupStops],
  );
  const dropoffIcons = useMemo(
    () =>
      dropoffStops.map((_, i) =>
        makeDot(DROPOFF_COLOR, dropoffStops.length > 1 ? String(i + 1) : ""),
      ),
    [dropoffStops],
  );

  const showFallbackPolyline = allPts.length >= 2 && (!route || routeError);

  return (
    <MapContainer
      center={EU_CENTER}
      zoom={EU_ZOOM}
      scrollWheelZoom
      zoomSnap={0.5}
      wheelDebounceTime={40}
      zoomControl={false}
      className="h-full w-full"
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
      />
      <ZoomControl position="bottomright" />
      <FitBounds points={allPts} />
      {pickupStops.map((stop, i) => (
        <Marker
          key={`pu-${stop.placeId ?? stop.address}-${stop.latitude},${stop.longitude}`}
          position={pickupPts[i]}
          icon={pickupIcons[i]}
        />
      ))}
      {dropoffStops.map((stop, i) => (
        <Marker
          key={`do-${stop.placeId ?? stop.address}-${stop.latitude},${stop.longitude}`}
          position={dropoffPts[i]}
          icon={dropoffIcons[i]}
        />
      ))}
      {route && !routeError && (
        <GeoJSON
          key={route.geometry.coordinates.length}
          data={route.geometry}
          pathOptions={{ color: DROPOFF_COLOR, weight: 3, opacity: 0.9 }}
        />
      )}
      {showFallbackPolyline && (
        <Polyline
          positions={allPts}
          pathOptions={{ color: DROPOFF_COLOR, weight: 2, dashArray: "6 8", opacity: 0.6 }}
        />
      )}
    </MapContainer>
  );
};
