import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { countryName } from "../lib/geo";

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 5);
      return;
    }

    map.fitBounds(
      points.map((point) => [point.lat, point.lng]),
      { padding: [32, 32], maxZoom: 5 }
    );
  }, [map, points]);

  return null;
}

function TrafficMap({ points = [] }) {
  if (!points.length) return null;

  const max = Math.max(...points.map((point) => point.count || 0), 1);
  const center = [points[0].lat, points[0].lng];

  return (
    <div className="relative isolate h-64 overflow-hidden rounded-xl border border-ink/10">
      <MapContainer
        center={center}
        zoom={2}
        scrollWheelZoom={false}
        worldCopyJump
        className="h-full w-full"
      >
        {/* Leaflet itself needs no key. OpenStreetMap's public tile server is
            keyless too and requires the attribution below. CARTO's CDN now
            serves an "API key required" tile without an account, so it must
            not be used as a drop-in replacement. */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          className="map-tiles-soft"
        />
        <FitBounds points={points} />
        {points.map((point) => {
          const place = [point.city, countryName(point.country)]
            .filter(Boolean)
            .join(", ");

          return (
            <CircleMarker
              key={`${point.lat}:${point.lng}`}
              center={[point.lat, point.lng]}
              radius={8 + Math.round((point.count / max) * 16)}
              pathOptions={{
                color: "#6d5ef6",
                fillColor: "#6d5ef6",
                fillOpacity: 0.38,
                weight: 1.5,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                <span className="text-[11px] font-semibold">
                  {place || "Unknown location"}
                </span>
                <br />
                {point.count.toLocaleString()}{" "}
                {point.count === 1 ? "visit" : "visits"}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default TrafficMap;
