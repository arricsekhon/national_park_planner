"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface StopCoord {
  id: string;
  parkName: string;
  day: number;
  notes: string;
  lat: number;
  lng: number;
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [48, 48] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 8);
    }
  }, [map, positions]);
  return null;
}

function makeIcon(label: number, first: boolean) {
  const bg = first ? "#176d65" : "#111315";
  return L.divIcon({
    className: "",
    html: `<div style="width:32px;height:32px;background:${bg};border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:700;border:2.5px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.35);font-family:system-ui,sans-serif;">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}

export default function TripMap({ stops }: { stops: StopCoord[] }) {
  if (stops.length === 0) return null;

  const positions: [number, number][] = stops.map((s) => [s.lat, s.lng]);
  const center: [number, number] = [
    stops.reduce((sum, s) => sum + s.lat, 0) / stops.length,
    stops.reduce((sum, s) => sum + s.lng, 0) / stops.length,
  ];

  return (
    <MapContainer
      center={center}
      zoom={5}
      style={{ height: "400px", width: "100%", borderRadius: "12px" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds positions={positions} />

      {positions.length > 1 && (
        <Polyline
          positions={positions}
          pathOptions={{ color: "#176d65", weight: 3, dashArray: "10 7", opacity: 0.85 }}
        />
      )}

      {stops.map((stop, i) => (
        <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={makeIcon(i + 1, i === 0)}>
          <Popup>
            <div style={{ minWidth: 170, fontFamily: "system-ui, sans-serif" }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, color: "#111315" }}>
                {stop.parkName}
              </p>
              <p style={{ fontSize: 12, color: "#176d65", fontWeight: 600, marginBottom: 4 }}>
                Day {stop.day}
              </p>
              {stop.notes && (
                <p style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>{stop.notes}</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
