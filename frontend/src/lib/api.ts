export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export interface Park {
  parkCode: string;
  fullName: string;
  description: string;
  states: string;
  latLong: string;
  url: string;
  designation?: string;
  images: { url: string; title: string; altText: string }[];
  entranceFees: { cost: string; description: string; title: string }[];
  activities: { id: string; name: string }[];
  operatingHours: { name: string; description: string; standardHours: Record<string, string> }[];
  contacts: { phoneNumbers: { phoneNumber: string; type: string }[]; emailAddresses: { emailAddress: string }[] };
  addresses: { line1: string; city: string; stateCode: string; postalCode: string; type: string }[];
}

export interface ParksResponse {
  total: number;
  parks: Park[];
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  lastIndexedDate: string;
}

export interface WeatherData {
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

export interface Campground {
  id: string;
  name: string;
  description: string;
  reservationInfo: string;
  reservationUrl: string;
  numberOfSitesReservable: string;
  numberOfSitesFirstComeFirstServed: string;
  campsites: { totalSites: string; group: string; rvOnly: string; tentOnly: string; electricalHookups: string };
  amenities: { toilets: string[]; potableWater: string[]; showers: string[]; internetConnectivity: string; cellPhoneReception: string; campStore: string; dumpStation: string; laundry: string };
  fees: { cost: string; description: string; title: string }[];
  images: { url: string; altText: string }[];
  url: string;
}

export interface ThingToDo {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  duration: string;
  images: { url: string; altText: string; title: string }[];
  tags: string[];
  location: string;
  season: string[];
  doFeesApply: string;
  url: string;
  isReservationRequired: string;
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parseLatLong(latLong: string): { lat: number; lng: number } | null {
  if (!latLong) return null;
  const m = latLong.match(/lat:([\d.+-]+),\s*long:([\d.+-]+)/i);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

export async function searchParks(q = "", stateCode = "", start = 0, limit = 500): Promise<ParksResponse> {
  const p = new URLSearchParams({ limit: String(limit), start: String(start) });
  if (q) p.set("q", q);
  if (stateCode) p.set("stateCode", stateCode);
  const res = await fetch(`${API_BASE}/parks?${p}`);
  if (!res.ok) throw new Error("Failed to fetch parks");
  return res.json();
}

export async function getPark(parkCode: string): Promise<Park> {
  const res = await fetch(`${API_BASE}/parks/${parkCode}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("Park not found");
  return res.json();
}

export async function getCampgrounds(parkCode: string): Promise<Campground[]> {
  const res = await fetch(`${API_BASE}/parks/${parkCode}/campgrounds`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.campgrounds ?? [];
}

export async function getThingsToDo(parkCode: string): Promise<ThingToDo[]> {
  const res = await fetch(`${API_BASE}/parks/${parkCode}/thingstodo`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.thingstodo ?? [];
}

export async function getParkAlerts(parkCode: string): Promise<Alert[]> {
  const res = await fetch(`${API_BASE}/parks/${parkCode}/alerts`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.alerts ?? [];
}

export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  try {
    const res = await fetch(`${API_BASE}/weather?lat=${lat}&lon=${lon}`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return { available: false };
    return res.json();
  } catch {
    return { available: false };
  }
}
