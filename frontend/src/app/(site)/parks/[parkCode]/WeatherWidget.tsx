"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

interface WeatherData {
  available: boolean;
  current?: {
    temp: number;
    feels_like: number;
    description: string;
    icon: string;
    humidity: number;
    wind_speed: number;
  };
}

export default function WeatherWidget({ lat, lng }: { lat: number; lng: number }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/weather?lat=${lat}&lon=${lng}`)
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then(setWeather)
      .catch(() => setWeather({ available: false }));
  }, [lat, lng]);

  if (!weather) {
    return (
      <div className="p-5 rounded-2xl animate-pulse" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
        <div className="h-2.5 w-28 rounded-full mb-4" style={{ background: "var(--linen)" }} />
        <div className="flex gap-3">
          <div className="h-12 w-12 rounded-xl shrink-0" style={{ background: "var(--linen)" }} />
          <div className="space-y-2 flex-1">
            <div className="h-7 w-20 rounded-full" style={{ background: "var(--linen)" }} />
            <div className="h-2.5 w-28 rounded-full" style={{ background: "var(--linen)" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!weather.available || !weather.current) return null;

  const { current } = weather;

  return (
    <div className="p-5 rounded-2xl" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
      <p className="text-[11px] tracking-[0.15em] font-semibold uppercase mb-4" style={{ color: "var(--muted)" }}>
        Current Weather
      </p>
      <div className="flex items-center gap-3 mb-4">
        <Image
          src={`https://openweathermap.org/img/wn/${current.icon}@2x.png`}
          alt={current.description}
          width={48}
          height={48}
        />
        <div>
          <p className="text-3xl font-bold" style={{ color: "var(--ink)" }}>{current.temp}°F</p>
          <p className="text-xs capitalize mt-0.5" style={{ color: "var(--muted)" }}>{current.description}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        {[
          { label: "Feels like", value: `${current.feels_like}°F` },
          { label: "Humidity", value: `${current.humidity}%` },
          { label: "Wind", value: `${current.wind_speed} mph` },
        ].map(({ label, value }) => (
          <div key={label} className="p-2.5 rounded-lg" style={{ background: "var(--surface-soft)" }}>
            <dt style={{ color: "var(--muted)" }}>{label}</dt>
            <dd className="font-semibold mt-0.5" style={{ color: "var(--ink)" }}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
