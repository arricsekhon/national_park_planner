import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getPark, getParkAlerts, getCampgrounds, getThingsToDo,
  parseLatLong, type Park, type Alert, type Campground,
} from "@/lib/api";
import ParkHero from "./ParkHero";
import TrailFilter from "./TrailFilter";
import ParkRatingWidget from "./ParkRatingWidget";
import WeatherWidget from "./WeatherWidget";

export async function generateMetadata({ params }: { params: Promise<{ parkCode: string }> }) {
  const { parkCode } = await params;
  try {
    const park = await getPark(parkCode);
    return {
      title: `${park.fullName} — TrailQuest`,
      description: park.description?.slice(0, 160),
      openGraph: { title: park.fullName, description: park.description?.slice(0, 160), images: park.images?.[0]?.url ? [park.images[0].url] : [] },
    };
  } catch {
    return { title: "Park — TrailQuest" };
  }
}

export default async function ParkPage({ params }: { params: Promise<{ parkCode: string }> }) {
  const { parkCode } = await params;

  let park: Park;
  try {
    park = await getPark(parkCode);
  } catch {
    notFound();
  }

  const coords = parseLatLong(park.latLong);
  const [alerts, campgrounds, thingsToDo] = await Promise.all([
    getParkAlerts(parkCode),
    getCampgrounds(parkCode),
    getThingsToDo(parkCode),
  ]);

  const photos = park.images ?? [];
  const addr = park.addresses?.find((a) => a.type === "Physical") ?? park.addresses?.[0];
  const location = addr ? `${addr.city}, ${addr.stateCode}` : "";

  return (
    <div className="min-h-screen" style={{ background: "var(--surface)" }}>
      <ParkHero
        photos={photos}
        parkCode={park.parkCode}
        parkName={park.fullName}
        parkStates={park.states}
        location={location}
      />

      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <section className="p-7 rounded-2xl" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
            <p className="text-base leading-[1.85]" style={{ color: "#3a4a3a" }}>
              {park.description}
            </p>
            {park.url && (
              <a
                href={park.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold hover:opacity-75 transition-opacity"
                style={{ color: "var(--accent)" }}
              >
                Official NPS Website
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                  <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            )}
          </section>

          {/* Alerts */}
          {alerts.length > 0 && (
            <section aria-label="Alerts and closures">
              <SectionLabel>Alerts &amp; Closures</SectionLabel>
              <div className="space-y-3 mt-4">
                {alerts.map((alert: Alert) => (
                  <div key={alert.id} className="p-4 rounded-xl" style={{ background: "#fffbf0", border: "1px solid rgba(200,134,10,0.18)" }}>
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 text-base" aria-hidden="true">⚠</span>
                      <div>
                        <p className="font-semibold text-sm mb-1" style={{ color: "var(--ink)" }}>{alert.title}</p>
                        <p className="text-sm leading-relaxed" style={{ color: "#6b5a3a" }}>{alert.description}</p>
                        <span className="inline-block mt-2 text-[11px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wide" style={{ background: "rgba(200,134,10,0.12)", color: "#7a4f08" }}>
                          {alert.category}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Activities */}
          {park.activities?.length > 0 && (
            <section className="p-7 rounded-2xl" style={{ background: "white", boxShadow: "var(--shadow-card)" }} aria-label="Activities">
              <SectionLabel>Activities</SectionLabel>
              <ul className="flex flex-wrap gap-2 mt-4" aria-label="Available activities">
                {park.activities.map((a) => (
                  <li key={a.id}>
                    <span className="px-3.5 py-1.5 rounded-full text-sm font-medium" style={{ background: "var(--accent-soft)", color: "#1a4a2a", display: "inline-block" }}>
                      {a.name}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Operating Hours */}
          {park.operatingHours?.length > 0 && (
            <section className="p-7 rounded-2xl" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
              <SectionLabel>Operating Hours</SectionLabel>
              <div className="mt-4 space-y-4">
                {park.operatingHours.map((h, i) => (
                  <div key={i}>
                    <p className="font-semibold text-sm mb-1.5" style={{ color: "var(--ink)" }}>{h.name}</p>
                    {h.description && (
                      <p className="text-sm mb-2 leading-relaxed" style={{ color: "var(--muted-strong)" }}>{h.description}</p>
                    )}
                    {h.standardHours && (
                      <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs mt-2">
                        {Object.entries(h.standardHours).map(([day, hrs]) => (
                          <div key={day} className="flex justify-between py-1 border-b" style={{ borderColor: "var(--line)" }}>
                            <dt className="capitalize font-medium" style={{ color: "var(--muted)" }}>{day}</dt>
                            <dd style={{ color: "var(--ink)" }}>{hrs}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Trails — client island for difficulty filter */}
          {thingsToDo.length > 0 && <TrailFilter thingsToDo={thingsToDo} />}

          {/* Campgrounds */}
          {campgrounds.length > 0 && (
            <section>
              <SectionLabel>Campgrounds ({campgrounds.length})</SectionLabel>
              <div className="space-y-4 mt-4">
                {campgrounds.map((camp: Campground) => {
                  const totalSites = parseInt(camp.campsites?.totalSites ?? "0");
                  const reservable = parseInt(camp.numberOfSitesReservable ?? "0");
                  const fcfs = parseInt(camp.numberOfSitesFirstComeFirstServed ?? "0");
                  const campFee = camp.fees?.[0];
                  return (
                    <div key={camp.id} className="p-6 rounded-2xl" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="font-bold text-base mb-0.5" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>{camp.name}</h3>
                          {totalSites > 0 && (
                            <p className="text-xs" style={{ color: "var(--muted)" }}>
                              {totalSites} total sites
                              {reservable > 0 && ` · ${reservable} reservable`}
                              {fcfs > 0 && ` · ${fcfs} first-come`}
                            </p>
                          )}
                        </div>
                        {campFee && (
                          <span className="font-bold text-sm shrink-0" style={{ color: "var(--accent)" }}>
                            {parseFloat(campFee.cost) === 0 ? "Free" : `$${campFee.cost}/night`}
                          </span>
                        )}
                      </div>
                      {camp.description && (
                        <p className="text-sm leading-relaxed mb-4 line-clamp-3" style={{ color: "#6b7a6b" }}>{camp.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {camp.amenities?.toilets?.[0] && <AmenityChip label={camp.amenities.toilets[0].split(" - ")[0]} />}
                        {camp.amenities?.potableWater?.[0] && <AmenityChip label="Potable Water" />}
                        {camp.amenities?.showers?.[0] && camp.amenities.showers[0] !== "None" && <AmenityChip label="Showers" />}
                        {camp.amenities?.internetConnectivity === "Yes" && <AmenityChip label="WiFi" />}
                        {camp.amenities?.campStore === "Yes - year round" && <AmenityChip label="Camp Store" />}
                        {camp.campsites?.electricalHookups !== "0" && <AmenityChip label="Electric Hookups" />}
                        {camp.campsites?.rvOnly !== "0" && <AmenityChip label="RV Sites" />}
                      </div>
                      <div className="flex gap-2.5 flex-wrap">
                        <a
                          href={camp.reservationUrl || `https://www.recreation.gov/search?q=${encodeURIComponent(camp.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
                          style={{ background: "var(--accent)" }}
                        >
                          {camp.reservationUrl ? "Reserve a Site" : "Search Recreation.gov"}
                        </a>
                        {camp.url && (
                          <a
                            href={camp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold px-4 py-2 rounded-lg transition-colors hover:bg-stone-50"
                            style={{ color: "var(--accent)", border: "1px solid rgba(45,90,61,0.2)" }}
                          >
                            More Info
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Map */}
          {coords && (
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.18},${coords.lat - 0.18},${coords.lng + 0.18},${coords.lat + 0.18}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
                width="100%"
                height="220"
                style={{ border: 0, display: "block" }}
                loading="lazy"
                title={`Map of ${park.fullName}`}
              />
              <div className="px-4 py-3" style={{ background: "white", borderTop: "1px solid var(--line)" }}>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(park.fullName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity"
                  style={{ color: "var(--accent)" }}
                >
                  Get directions in Google Maps
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
            </div>
          )}

          {/* Weather — loads client-side after page render so it doesn't block the server */}
          {coords && <WeatherWidget lat={coords.lat} lng={coords.lng} />}

          {/* Entrance fees */}
          {park.entranceFees?.length > 0 && (
            <div className="p-5 rounded-2xl" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
              <p className="text-[11px] tracking-[0.15em] font-semibold uppercase mb-4" style={{ color: "var(--muted)" }}>
                Entrance Fees
              </p>
              <dl className="space-y-3">
                {park.entranceFees.map((f, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-start gap-2 pb-3"
                    style={{ borderBottom: i < park.entranceFees.length - 1 ? "1px solid var(--line)" : "none" }}
                  >
                    <div>
                      <dt className="text-xs font-semibold" style={{ color: "var(--ink)" }}>{f.title}</dt>
                      <dd className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--muted)" }}>{f.description}</dd>
                    </div>
                    <span className="font-bold text-sm shrink-0" style={{ color: "var(--accent)" }}>
                      {parseFloat(f.cost) === 0 ? "Free" : `$${f.cost}`}
                    </span>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Rating — client island (only shows when user has marked "been") */}
          <ParkRatingWidget parkCode={park.parkCode} />

          {/* Contact */}
          {park.contacts?.phoneNumbers?.length > 0 && (
            <div className="p-5 rounded-2xl" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
              <p className="text-[11px] tracking-[0.15em] font-semibold uppercase mb-4" style={{ color: "var(--muted)" }}>
                Contact
              </p>
              <address className="not-italic space-y-2">
                {park.contacts.phoneNumbers.slice(0, 2).map((ph, i) => (
                  <p key={i} className="text-sm" style={{ color: "var(--accent)" }}>
                    <a href={`tel:${ph.phoneNumber}`} className="hover:opacity-70 transition-opacity">
                      {ph.phoneNumber}
                    </a>{" "}
                    <span className="text-xs" style={{ color: "var(--muted)" }}>({ph.type})</span>
                  </p>
                ))}
                {park.contacts.emailAddresses?.[0] && (
                  <p className="text-sm" style={{ color: "var(--accent)" }}>
                    <a href={`mailto:${park.contacts.emailAddresses[0].emailAddress}`} className="hover:opacity-70 transition-opacity">
                      {park.contacts.emailAddresses[0].emailAddress}
                    </a>
                  </p>
                )}
              </address>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
      {children}
    </h2>
  );
}

function AmenityChip({ label }: { label: string }) {
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full font-medium"
      style={{ background: "var(--surface-soft)", color: "var(--muted-strong)", border: "1px solid rgba(26,58,42,0.1)" }}
    >
      {label}
    </span>
  );
}
