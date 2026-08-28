"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { searchParks, parseLatLong, type Park } from "@/lib/api";
import type { StopCoord } from "./TripMap";

const TripMap = dynamic(() => import("./TripMap"), { ssr: false });
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/lib/toast";
import { SyncNotice } from "@/app/components/ui";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TripStop {
  id: string;
  parkCode: string;
  parkName: string;
  day: number;
  notes: string;
  lat?: number;
  lng?: number;
}

interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  stops: TripStop[];
  notes: string;
  createdAt: string;
  isPublic?: boolean;
}

interface AiItineraryDay {
  day: number;
  label: string;
  parkName: string;
  activities: string[];
  tip: string;
}

interface AiItinerary {
  summary: string;
  days: AiItineraryDay[];
  packingAdditions: string[];
}

interface PlannerMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  action?: "draft" | "apply";
  parkOptions?: Park[];
  suggestions?: string[];
}

interface TripIntent {
  destination?: string;
  destinations?: string[];
  days?: number;
  dateText?: string;
  startDate?: string;
  endDate?: string;
  startLocation?: string;
  travelers?: string;
  difficulty?: string;
  lodging?: string;
  concerns?: string;
  travelMode?: "car" | "flight";
  departureTime?: string;
  focus?: string;
}

interface PlanningStep {
  icon: string;
  text: string;
}

interface PlannerAgentResponse {
  status: "needs_info" | "ready_to_draft";
  message: string;
  missingFields?: string[];
  normalizedTrip?: TripIntent;
}

type IconName =
  | "arrowUp"
  | "calendar"
  | "check"
  | "chevron"
  | "close"
  | "map"
  | "message"
  | "note"
  | "panel"
  | "plus"
  | "print"
  | "refresh"
  | "route"
  | "search"
  | "share"
  | "trash";

const STORAGE_KEY = "trailquest_trips";
const PACKED_STORAGE_KEY = "trailquest_packed_items";
const SUGGESTED_PACKING_STORAGE_KEY = "trailquest_suggested_packing";
const CHAT_STORAGE_PREFIX = "trailquest_chat_messages";
const DAY_MS = 86400000;
const TRIP_STARTERS = [
  {
    name: "Yosemite long weekend",
    label: "3 days",
    detail: "Arrival day, main hike, short route before leaving.",
    notes: "Check parking early, shuttle timing, and a rainy-day backup.",
  },
  {
    name: "Utah parks road trip",
    label: "5 days",
    detail: "Compare drive time, heat, and permit notes.",
    notes: "Keep hikes short in the afternoon and add water stops.",
  },
  {
    name: "Olympic rain backup plan",
    label: "2 days",
    detail: "Forest walk, coast stop, and flexible weather notes.",
    notes: "Pack rain shell, check road status, and save an indoor backup.",
  },
  {
    name: "Family day hike",
    label: "1 day",
    detail: "Easy trail, lunch stop, parking note, and backup viewpoint.",
    notes: "Keep the route short, add restroom stops, and check pets on trails.",
  },
];

const INITIAL_PLANNER_MESSAGES: PlannerMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    text: "Tell me where you want to go, when, who is coming, and where you are starting from. I will ask for anything missing before drafting the itinerary.",
  },
];

const PLANNING_STEPS: PlanningStep[] = [
  { icon: "🗓️", text: "Checking dates..." },
  { icon: "🌦️", text: "Reviewing seasonal weather..." },
  { icon: "🛣️", text: "Estimating drive time and road access..." },
  { icon: "🥾", text: "Matching trails to your pace..." },
  { icon: "🎒", text: "Building packing list..." },
  { icon: "🧭", text: "Drafting your route..." },
];

function parseInputDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getTripDays(startDate: string, endDate: string): number {
  const start = parseInputDate(startDate);
  const end = parseInputDate(endDate);
  if (!start || !end) return 0;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_MS));
}

function formatDate(value: string): string {
  const date = parseInputDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateSummary(trip: Trip): string {
  if (trip.startDate && trip.endDate) {
    return `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`;
  }
  if (trip.startDate) return `Starts ${formatDate(trip.startDate)}`;
  if (trip.endDate) return `Ends ${formatDate(trip.endDate)}`;
  return "Dates not set";
}

function stopSummary(count: number): string {
  return `${count} ${count === 1 ? "stop" : "stops"}`;
}

function createdSummary(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Draft";
  return `Draft - ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)}`;
}

function packingCategory(item: string): string {
  const lower = item.toLowerCase();
  if (lower.includes("water") || lower.includes("snack") || lower.includes("food") || lower.includes("stove")) return "Water + food";
  if (lower.includes("boot") || lower.includes("sock") || lower.includes("jacket") || lower.includes("hat") || lower.includes("glove") || lower.includes("layer")) return "Clothing";
  if (lower.includes("map") || lower.includes("navigation") || lower.includes("gps") || lower.includes("charger")) return "Navigation";
  if (lower.includes("first aid") || lower.includes("whistle") || lower.includes("sunscreen") || lower.includes("headlamp") || lower.includes("knife")) return "Safety";
  if (lower.includes("id") || lower.includes("pass") || lower.includes("permit")) return "Park documents";
  return "Camp";
}

function groupPackingItems(items: string[]): [string, string[]][] {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const category = packingCategory(item);
    groups.set(category, [...(groups.get(category) ?? []), item]);
  }
  return Array.from(groups.entries());
}

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeParkName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bnational historical park\b/g, "")
    .replace(/\bnational historic site\b/g, "")
    .replace(/\bnational\b/g, "")
    .replace(/\bpark\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBestParkMatch(parks: Park[], destination: string): Park | null {
  const normalizedDestination = normalizeParkName(destination);
  if (!normalizedDestination) return null;
  const destinationWords = normalizedDestination.split(" ").filter((word) => word.length > 2);

  return parks.find((park) => normalizeParkName(park.fullName) === normalizedDestination)
    ?? parks.find((park) => {
      const normalizedPark = normalizeParkName(park.fullName);
      return normalizedPark.includes(normalizedDestination) || normalizedDestination.includes(normalizedPark);
    })
    ?? parks.find((park) => {
      const normalizedPark = normalizeParkName(park.fullName);
      return destinationWords.length > 0 && destinationWords.every((word) => normalizedPark.includes(word));
    })
    ?? null;
}

function filterParkMatches(parks: Park[], destination: string): Park[] {
  const normalizedDestination = normalizeParkName(destination);
  const destinationWords = normalizedDestination.split(" ").filter((word) => word.length > 2);
  if (!normalizedDestination || destinationWords.length === 0) return [];
  return parks.filter((park) => {
    const normalizedPark = normalizeParkName(park.fullName);
    return normalizedPark === normalizedDestination
      || normalizedPark.includes(normalizedDestination)
      || destinationWords.every((word) => normalizedPark.includes(word));
  });
}

function knownParkOption(destination: string): Park | null {
  const normalizedDestination = normalizeParkName(destination);
  const known: Array<Pick<Park, "parkCode" | "fullName" | "states" | "latLong" | "url" | "designation"> & { aliases: string[] }> = [
    {
      aliases: ["zion", "zion national park"],
      parkCode: "zion",
      fullName: "Zion National Park",
      states: "UT",
      latLong: "lat:37.29839254, long:-113.0265138",
      url: "https://www.nps.gov/zion/index.htm",
      designation: "National Park",
    },
    {
      aliases: ["bryce", "bryce canyon", "bryce canyon national park"],
      parkCode: "brca",
      fullName: "Bryce Canyon National Park",
      states: "UT",
      latLong: "lat:37.58399144, long:-112.1826689",
      url: "https://www.nps.gov/brca/index.htm",
      designation: "National Park",
    },
    {
      aliases: ["yosemite", "yosemite national park"],
      parkCode: "yose",
      fullName: "Yosemite National Park",
      states: "CA",
      latLong: "lat:37.84883288, long:-119.5571873",
      url: "https://www.nps.gov/yose/index.htm",
      designation: "National Park",
    },
    {
      aliases: ["olympic", "olympic national park"],
      parkCode: "olym",
      fullName: "Olympic National Park",
      states: "WA",
      latLong: "lat:47.80392754, long:-123.6663848",
      url: "https://www.nps.gov/olym/index.htm",
      designation: "National Park",
    },
    {
      aliases: ["grand canyon", "grand canyon national park"],
      parkCode: "grca",
      fullName: "Grand Canyon National Park",
      states: "AZ",
      latLong: "lat:36.0001165336, long:-112.121516363",
      url: "https://www.nps.gov/grca/index.htm",
      designation: "National Park",
    },
    {
      aliases: ["acadia", "acadia national park"],
      parkCode: "acad",
      fullName: "Acadia National Park",
      states: "ME",
      latLong: "lat:44.409286, long:-68.247501",
      url: "https://www.nps.gov/acad/index.htm",
      designation: "National Park",
    },
    {
      aliases: ["denali", "denali national park"],
      parkCode: "dena",
      fullName: "Denali National Park & Preserve",
      states: "AK",
      latLong: "lat:63.29777484, long:-151.0526568",
      url: "https://www.nps.gov/dena/index.htm",
      designation: "National Park & Preserve",
    },
    {
      aliases: ["yellowstone", "yellowstone national park"],
      parkCode: "yell",
      fullName: "Yellowstone National Park",
      states: "ID,MT,WY",
      latLong: "lat:44.59824417, long:-110.5471695",
      url: "https://www.nps.gov/yell/index.htm",
      designation: "National Park",
    },
    {
      aliases: ["glacier", "glacier national park"],
      parkCode: "glac",
      fullName: "Glacier National Park",
      states: "MT",
      latLong: "lat:48.68414678, long:-113.8009306",
      url: "https://www.nps.gov/glac/index.htm",
      designation: "National Park",
    },
    {
      aliases: ["arches", "arches national park"],
      parkCode: "arch",
      fullName: "Arches National Park",
      states: "UT",
      latLong: "lat:38.72261844, long:-109.5863666",
      url: "https://www.nps.gov/arch/index.htm",
      designation: "National Park",
    },
    {
      aliases: ["sequoia", "sequoia national park"],
      parkCode: "seki",
      fullName: "Sequoia & Kings Canyon National Parks",
      states: "CA",
      latLong: "lat:36.4863662, long:-118.5657516",
      url: "https://www.nps.gov/seki/index.htm",
      designation: "National Parks",
    },
    {
      aliases: ["rocky mountain", "rocky mountain national park"],
      parkCode: "romo",
      fullName: "Rocky Mountain National Park",
      states: "CO",
      latLong: "lat:40.3556924, long:-105.6972879",
      url: "https://www.nps.gov/romo/index.htm",
      designation: "National Park",
    },
  ];
  const match = known.find((park) => {
    const aliases = park.aliases.map(normalizeParkName);
    return aliases.some((alias) => normalizedDestination === alias || normalizedDestination.includes(alias));
  });
  if (!match) return null;
  return {
    parkCode: match.parkCode,
    fullName: match.fullName,
    states: match.states,
    latLong: match.latLong,
    url: match.url,
    designation: match.designation,
    description: "",
    images: [],
    entranceFees: [],
    activities: [],
    operatingHours: [],
    contacts: { phoneNumbers: [], emailAddresses: [] },
    addresses: [],
  };
}

function detectDestinations(text: string): string[] {
  const lower = text.toLowerCase();
  const matches: Array<{ destination: string; index: number }> = [
    { destination: "bryce canyon", index: lower.search(/\bbryce(?:\s+canyon)?\b/) },
    { destination: "zion", index: lower.search(/\bzion\b/) },
    { destination: "yosemite", index: lower.search(/\byosemite\b/) },
    { destination: "olympic", index: lower.search(/\bolympic\b/) },
    { destination: "grand canyon", index: lower.search(/\bgrand\s+canyon\b/) },
    { destination: "acadia", index: lower.search(/\bacadia\b/) },
    { destination: "denali", index: lower.search(/\bdenali\b/) },
    { destination: "yellowstone", index: lower.search(/\byellowstone\b/) },
    { destination: "glacier", index: lower.search(/\bglacier\b/) },
    { destination: "arches", index: lower.search(/\barches\b/) },
    { destination: "sequoia", index: lower.search(/\bsequoia\b/) },
    { destination: "rocky mountain", index: lower.search(/\brocky\s+mountain\b/) },
  ].filter((match) => match.index >= 0);

  return matches
    .sort((a, b) => a.index - b.index)
    .map((match) => match.destination)
    .filter((destination, index, all) => all.indexOf(destination) === index);
}

function detectTravelMode(text: string): TripIntent["travelMode"] | undefined {
  const lower = text.toLowerCase();
  if (/\b(car|drive|driving|road trip|roadtrip|by road)\b/.test(lower)) return "car";
  if (/\b(fly|flight|flying|airport|plane)\b/.test(lower)) return "flight";
  return undefined;
}

function detectDepartureTime(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/\b(before dawn|pre dawn|predawn)\b/.test(lower)) return "Before dawn";
  if (/\bearly morning\b/.test(lower)) return "Early morning";
  if (/\bafter lunch\b/.test(lower)) return "After lunch";
  if (/\bevening\b/.test(lower)) return "Evening";
  const match = text.match(/\b(?:leave|depart|start|start driving|heading out|go)\s+(?:at|around|about)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.))\b/i)
    ?? text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.))\b/i);
  return match?.[1]?.replace(/\./g, "").toUpperCase();
}

function detectTripFocus(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/\b(hike only|hiking only|only hikes|hikes only)\b/.test(lower)) return "hikes only";
  if (/\b(scenic only|scenic spots only|viewpoints only|views only)\b/.test(lower)) return "scenic spots only";
  if (/\b(both|mix|mixed|hikes and scenic|hiking and scenic)\b/.test(lower)) return "hikes and scenic spots";
  if (/\b(family|kid friendly|kid-friendly|easy)\b/.test(lower)) return "easy family-friendly stops";
  if (/\b(photo|photography|sunrise|sunset)\b/.test(lower)) return "photography and viewpoints";
  return undefined;
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateRange(text: string): { dateText: string; startDate: string; endDate: string; days: number } | null {
  const match = text.match(/\b(?:from\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|sept|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:\s*(?:to|-|through)\s*(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|sept|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+)?(\d{1,2}))?(?:,\s*(\d{4}))?/i);
  const dayFirstMatch = text.match(/\b(?:from\s+)?(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|sept|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s*(?:to|-|through)\s*(\d{1,2})\s*(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|sept|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))?)?(?:,\s*(\d{4}))?/i);
  if (!match && !dayFirstMatch) return null;
  const startMonthName = (match?.[1] ?? dayFirstMatch?.[2] ?? "").toLowerCase();
  const startDay = Number(match?.[2] ?? dayFirstMatch?.[1]);
  const endMonthName = (match?.[3] ?? dayFirstMatch?.[4] ?? startMonthName).toLowerCase();
  const endDay = Number(match?.[4] ?? dayFirstMatch?.[3] ?? startDay);
  const currentYear = new Date().getFullYear();
  const yearText = match?.[5] ?? dayFirstMatch?.[5];
  const year = yearText ? Number(yearText) : currentYear;
  const startDate = new Date(year, MONTH_INDEX[startMonthName], startDay);
  let endDate = new Date(year, MONTH_INDEX[endMonthName], endDay);
  if (endDate < startDate) {
    endDate = new Date(year + 1, MONTH_INDEX[endMonthName], endDay);
  }
  const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1);
  return {
    dateText: (match?.[0] ?? dayFirstMatch?.[0] ?? "").replace(/^from\s+/i, "").trim(),
    startDate: toInputDate(startDate),
    endDate: toInputDate(endDate),
    days,
  };
}

function parseTripIntent(text: string, previous: TripIntent = {}): TripIntent {
  const lower = text.toLowerCase();
  const destinations = uniqueItems([...detectDestinations(text), ...(previous.destinations ?? [])]);
  const destinationMatch = lower.match(/\b(zion|bryce canyon|bryce|yosemite|olympic|grand canyon|acadia|denali|yellowstone|glacier|arches|sequoia|rocky mountain)\b/);
  const daysMatch = lower.match(/\b(\d{1,2})\s*(?:day|days|night|nights)\b/);
  const routeFromMatch = text.match(/\bfrom\s+([A-Za-z\s,.-]+?)\s+to\s+([A-Za-z\s,.-]+?)(?=\s+(?:from|in|on|for|with|and|but)\b|$)/i);
  const fromMatch = text.match(/\bfrom\s+([A-Za-z\s,.-]+?)(?=\s+(?:in|on|for|with|to|and|but)\b|$)/i);
  const dateMatch = text.match(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|sept|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|winter|spring|summer|fall|autumn|christmas|thanksgiving|this weekend|next weekend|next month|this month)\b(?:\s+\d{1,2})?(?:\s*-\s*\d{1,2})?(?:,\s*\d{4})?/i);
  const dateRange = parseDateRange(text);
  const travelersMatch = lower.match(/\b(family|kids|children|solo|couple|seniors?|friends|group)\b/);
  const difficultyMatch = lower.match(/\b(easy|moderate|hard|strenuous|accessible|kid-friendly|family-friendly)\b/);
  const lodgingMatch = lower.match(/\b(hotel|camping|campground|rv|cabin|lodge|airbnb)\b/);
  const travelMode = detectTravelMode(text) ?? previous.travelMode;
  const concerns = [
    lower.includes("weather") ? "weather" : "",
    lower.includes("road") || lower.includes("drive") || lower.includes("snow") || travelMode === "car" ? "road access" : "",
    lower.includes("permit") ? "permits" : "",
  ].filter(Boolean).join(", ");

  return {
    ...previous,
    destinations,
    destination: destinationMatch?.[0] ?? routeFromMatch?.[2]?.trim().replace(/[.?!]$/, "") ?? previous.destination,
    days: daysMatch ? Number(daysMatch[1]) : dateRange?.days ?? previous.days,
    dateText: dateRange?.dateText ?? dateMatch?.[0] ?? previous.dateText,
    startDate: dateRange?.startDate ?? previous.startDate,
    endDate: dateRange?.endDate ?? previous.endDate,
    startLocation: routeFromMatch?.[1]?.trim().replace(/[.?!]$/, "") ?? fromMatch?.[1]?.trim().replace(/[.?!]$/, "") ?? previous.startLocation,
    travelers: travelersMatch?.[0] ?? previous.travelers,
    difficulty: difficultyMatch?.[0] ?? previous.difficulty,
    lodging: lodgingMatch?.[0] ?? previous.lodging,
    concerns: concerns || previous.concerns,
    travelMode,
    departureTime: detectDepartureTime(text) ?? previous.departureTime,
    focus: detectTripFocus(text) ?? previous.focus,
  };
}

function getMissingTripFields(intent: TripIntent, hasStops: boolean, hasDates = false, hasTripLength = false): string[] {
  const missing: string[] = [];
  if (!hasStops && !intent.destination && !intent.destinations?.length) missing.push("park or destination");
  if (!intent.dateText && !hasDates) missing.push("dates or season");
  if (!intent.days && !hasTripLength) missing.push("trip length");
  if (!intent.startLocation) missing.push("starting place");
  if (intent.travelMode === "car" && !intent.departureTime) missing.push("departure time");
  if (!intent.focus) missing.push("trip focus");
  return missing;
}

function buildFollowUpQuestion(intent: TripIntent, hasStops: boolean, hasDates = false, hasTripLength = false): string {
  const primaryDestination = intent.destinations?.[0] ?? intent.destination;
  const destination = primaryDestination ? `${primaryDestination[0].toUpperCase()}${primaryDestination.slice(1)}` : "That";
  if (!intent.dateText && !hasDates && !intent.focus) {
    return `${destination} works. What dates or season should I plan for, and what should the trip focus on?`;
  }
  if (!intent.dateText && !hasDates) {
    return `${destination} works. What dates or season should I plan around?`;
  }
  if (!intent.days && !hasTripLength) {
    return `${destination} works. How many days do you have for this trip?`;
  }
  if (intent.travelMode === "car" && !intent.departureTime && !intent.focus) {
    return `${destination} works. Since you are going by car, what time do you want to leave, and what should the trip focus on?`;
  }
  if (intent.travelMode === "car" && !intent.departureTime) {
    return `${destination} works. What time do you want to leave on the first driving day?`;
  }
  if (!intent.focus) {
    return "What kind of guide should I build: hikes only, scenic spots only, both, family-friendly, or photography stops?";
  }
  if (primaryDestination && !hasStops) {
    return `${destination} is a good start. When are you going, how many days do you have, and where are you starting from?`;
  }
  const missing = getMissingTripFields(intent, hasStops, hasDates, hasTripLength);
  if (missing.length === 0) {
    return "I have enough to draft this. Add any must-see trail or lodging preference now, or send “draft itinerary”.";
  }
  return `I can plan that. I still need ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ", and a few travel details" : ""}.`;
}

function buildFollowUpSuggestions(intent: TripIntent): string[] {
  if (!intent.dateText) {
    return ["Sep 5 to Sep 10", "This weekend", "Next month", "Summer trip"];
  }
  if (intent.travelMode === "car" && !intent.departureTime && !intent.focus) {
    return [
      "Leave 5 AM, both hikes and scenic",
      "Leave 7 AM, scenic spots only",
      "Leave after lunch, easy family-friendly",
      "Leave before dawn, hikes only",
    ];
  }
  if (intent.travelMode === "car" && !intent.departureTime) {
    return ["Leave at 5 AM", "Leave at 7 AM", "Leave after lunch"];
  }
  if (!intent.focus) {
    return ["Hikes only", "Scenic spots only", "Both hikes and scenic", "Family-friendly"];
  }
  return [];
}

function formatPlanningContext(intent: TripIntent): string {
  return [
    intent.destinations?.length ? `Destinations in order: ${intent.destinations.join(", ")}` : "",
    intent.destination && !intent.destinations?.length ? `Destination: ${intent.destination}` : "",
    intent.days ? `Length: ${intent.days} days` : "",
    intent.dateText ? `Dates or season: ${intent.dateText}` : "",
    intent.startLocation ? `Starting from: ${intent.startLocation}` : "",
    intent.travelMode ? `Travel mode: ${intent.travelMode}` : "",
    intent.departureTime ? `Preferred departure time: ${intent.departureTime}` : "",
    intent.focus ? `Trip focus: ${intent.focus}` : "",
    intent.travelers ? `Travelers: ${intent.travelers}` : "",
    intent.difficulty ? `Pace: ${intent.difficulty}` : "",
    intent.lodging ? `Lodging: ${intent.lodging}` : "",
    intent.concerns ? `Concerns: ${intent.concerns}` : "",
  ].filter(Boolean).join("\n");
}

function formatDraftContext(draft: AiItinerary | null): string {
  if (!draft) return "";
  return [
    `Current draft summary: ${draft.summary}`,
    ...draft.days.map((day) => `Day ${day.day}: ${day.label} at ${day.parkName}; ${day.activities.join(", ")}; tip: ${day.tip}`),
  ].join("\n");
}

function parseTimedActivity(activity: string): { time?: string; label: string } {
  const match = activity.match(/^([0-9]{1,2}(?::[0-9]{2})?\s*(?:AM|PM)?\s*(?:-|–|to)\s*[0-9]{1,2}(?::[0-9]{2})?\s*(?:AM|PM)?)\s*(?:-|–|:)\s*(.+)$/i);
  if (!match) return { label: activity };
  return {
    time: match[1].replace(/\s+/g, " ").trim(),
    label: match[2].trim(),
  };
}

function cleanAssistantText(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatAssistantMessage(text: string): { intro: string; questions: string[] } {
  const cleaned = cleanAssistantText(text);
  const parts = cleaned
    .split(/\s+\d+\.\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return { intro: cleaned, questions: [] };
  }

  return {
    intro: parts[0].replace(/:\s*$/, "."),
    questions: parts.slice(1).map((part) => part.replace(/^\d+\.\s*/, "")),
  };
}

function generatePackingList(stops: TripStop[], startDate: string, endDate: string): string[] {
  const start = parseInputDate(startDate);
  const days = start && endDate ? Math.max(1, getTripDays(startDate, endDate)) : 1;
  const month = start ? start.getMonth() : new Date().getMonth();
  const isCold = month <= 2 || month >= 10;
  const isMultiDay = days > 1;

  const list = [
    "Water (2-3L per person per day)",
    "Trail snacks / energy bars",
    "Hiking boots or trail shoes",
    "Wool or moisture-wicking socks",
    "Navigation (downloaded maps / GPS)",
    "First aid kit",
    "Sunscreen SPF 30+",
    "Sunglasses",
    "Headlamp + extra batteries",
    "Emergency whistle",
    "Pocket knife or multi-tool",
    "Phone charger / power bank",
    "ID and park pass",
  ];

  if (isCold) {
    list.push("Insulated jacket / puffy", "Gloves and warm hat", "Thermal base layer");
  } else {
    list.push("Breathable hat or sun hat", "Lightweight rain jacket");
  }

  if (isMultiDay) {
    list.push(
      `Tent or shelter for ${days} nights`,
      "Sleeping bag rated for conditions",
      "Sleeping pad",
      `Food for ${days} days`,
      "Bear canister or hang bag",
      "Camp stove + fuel",
      "Water filter / purification tablets",
      "Trekking poles",
      "Camp towel",
      "Toiletry kit + waste bags",
    );
  }

  if (stops.length > 1) list.push("Detailed area map (paper backup)");
  return list;
}

function loadTrips(): Trip[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveTrips(trips: Trip[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

function loadPackedItems(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PACKED_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function savePackedItems(items: Record<string, string[]>) {
  localStorage.setItem(PACKED_STORAGE_KEY, JSON.stringify(items));
}

function loadSuggestedPacking(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SUGGESTED_PACKING_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveSuggestedPacking(items: Record<string, string[]>) {
  localStorage.setItem(SUGGESTED_PACKING_STORAGE_KEY, JSON.stringify(items));
}

function chatStorageKey(tripId: string): string {
  return `${CHAT_STORAGE_PREFIX}:${tripId}`;
}

function toStoredPlannerMessage(message: PlannerMessage): PlannerMessage {
  return {
    id: message.id,
    role: message.role,
    text: message.text,
    action: message.action,
  };
}

function normalizePlannerMessages(messages: PlannerMessage[]): PlannerMessage[] {
  if (!messages.length) return INITIAL_PLANNER_MESSAGES;
  const hasWelcome = messages.some((message) => message.text === INITIAL_PLANNER_MESSAGES[0].text);
  return hasWelcome ? messages : [...INITIAL_PLANNER_MESSAGES, ...messages];
}

function loadLocalTripChat(tripId: string): PlannerMessage[] {
  if (typeof window === "undefined") return INITIAL_PLANNER_MESSAGES;
  try {
    const parsed = JSON.parse(localStorage.getItem(chatStorageKey(tripId)) ?? "[]") as PlannerMessage[];
    return normalizePlannerMessages(
      parsed.filter((message) =>
        message
        && (message.role === "assistant" || message.role === "user")
        && typeof message.text === "string"
      )
    );
  } catch {
    return INITIAL_PLANNER_MESSAGES;
  }
}

function saveLocalTripChat(tripId: string, messages: PlannerMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(chatStorageKey(tripId), JSON.stringify(messages.map(toStoredPlannerMessage)));
}

function deleteLocalTripChat(tripId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(chatStorageKey(tripId));
}

function uniqueItems(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rowToTrip(row: Record<string, unknown>): Trip {
  return {
    id: row.id as string,
    name: row.name as string,
    startDate: (row.start_date as string) ?? "",
    endDate: (row.end_date as string) ?? "",
    stops: (row.stops as TripStop[]) ?? [],
    notes: (row.notes as string) ?? "",
    createdAt: row.created_at as string,
    isPublic: (row.is_public as boolean) ?? false,
  };
}

export default function PlannerPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tripsReady, setTripsReady] = useState(false);
  const [parkSearch, setParkSearch] = useState("");
  const [parkResults, setParkResults] = useState<Park[]>([]);
  const [searching, setSearching] = useState(false);
  const [showChecklist, setShowChecklist] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<"saved" | "error" | null>(null);
  const [packedItemsByTrip, setPackedItemsByTrip] = useState<Record<string, string[]>>(() => loadPackedItems());
  const [suggestedPackingByTrip, setSuggestedPackingByTrip] = useState<Record<string, string[]>>(() => loadSuggestedPacking());
  const [mobileTab, setMobileTab] = useState<"trips" | "chat" | "plan" | "map" | "notes">("trips");
  const [tripSheetOpen, setTripSheetOpen] = useState(false);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiItinerary | null>(null);
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [aiError, setAiError] = useState("");
  const [assistantThinking, setAssistantThinking] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [plannerMessages, setPlannerMessages] = useState<PlannerMessage[]>(INITIAL_PLANNER_MESSAGES);
  const [tripIntent, setTripIntent] = useState<TripIntent>({});
  const [planningSteps, setPlanningSteps] = useState<PlanningStep[]>([]);
  const [tripsRailOpen, setTripsRailOpen] = useState(true);
  const chatLocallyUpdatedTripIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      queueMicrotask(() => {
        const loaded = loadTrips();
        setTrips(loaded);
        setActiveId(loaded[0]?.id ?? null);
        setTripsReady(true);
      });
      return;
    }

    supabase
      .from("trips")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        let loaded = data ? data.map((r) => rowToTrip(r as Record<string, unknown>)) : [];

        // Migrate any _draft trip from localStorage into Supabase
        const lsTrips = loadTrips();
        const draft = lsTrips.find((t) => t.id === "_draft");
        if (draft) {
          const migratedDraft: Trip = { ...draft, id: createLocalId("trip") };
          loaded = [migratedDraft, ...loaded];
          void supabase.from("trips").insert({
            id: migratedDraft.id,
            user_id: user.id,
            name: migratedDraft.name,
            start_date: migratedDraft.startDate,
            end_date: migratedDraft.endDate,
            stops: migratedDraft.stops,
            notes: migratedDraft.notes,
            created_at: migratedDraft.createdAt,
          });
          const remaining = lsTrips.filter((t) => t.id !== "_draft");
          saveTrips(remaining);
        }

        setTrips(loaded);
        setActiveId(loaded[0]?.id ?? null);
        setTripsReady(true);
      });
  }, [user, authLoading]);

  const activeTrip = trips.find((t) => t.id === activeId) ?? null;
  const activeTripId = activeTrip?.id ?? null;

  // Auto-switch to editor on mobile when a trip is selected
  useEffect(() => {
    if (!activeId) return;
    const timer = window.setTimeout(() => setMobileTab("chat"), 0);
    return () => window.clearTimeout(timer);
  }, [activeId]);

  useEffect(() => {
    if (!activeTripId) {
      queueMicrotask(() => {
        setPlannerMessages(INITIAL_PLANNER_MESSAGES);
        setTripIntent({});
        setPlanningSteps([]);
        setAiError("");
        setAssistantThinking(false);
        setAiResult(null);
        setDraftDialogOpen(false);
      });
      return;
    }

    const tripId = activeTripId;
    let cancelled = false;

    async function loadTripChat() {
      if (chatLocallyUpdatedTripIdRef.current === tripId) {
        chatLocallyUpdatedTripIdRef.current = null;
        return;
      }

      setTripIntent({});
      setPlanningSteps([]);
      setAiError("");
      setAssistantThinking(false);
      setAiResult(null);
      setDraftDialogOpen(false);

      if (!user) {
        setPlannerMessages(loadLocalTripChat(tripId));
        return;
      }

      const { data, error } = await supabase
        .from("trip_chat_messages")
        .select("id, role, text, action, created_at")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("[planner] chat load error:", error);
        setPlannerMessages(INITIAL_PLANNER_MESSAGES);
        return;
      }

      const messages = (data ?? [])
        .filter((message) =>
          (message.role === "assistant" || message.role === "user")
          && typeof message.text === "string"
        )
        .map((message) => ({
          id: message.id as string,
          role: message.role as PlannerMessage["role"],
          text: message.text as string,
          action: message.action === "draft" || message.action === "apply" ? message.action : undefined,
        }));

      setPlannerMessages(normalizePlannerMessages(messages));
    }

    void loadTripChat();

    return () => {
      cancelled = true;
    };
  }, [activeTripId, user]);

  const updateTrip = useCallback((updated: Trip) => {
    setTrips((prev) => {
      const next = prev.map((t) => (t.id === updated.id ? updated : t));
      if (!user) saveTrips(next);
      return next;
    });
    if (user) {
      void supabase.from("trips").update({
        name: updated.name,
        start_date: updated.startDate,
        end_date: updated.endDate,
        stops: updated.stops,
        notes: updated.notes,
      }).eq("id", updated.id).eq("user_id", user.id);
    }
  }, [user]);

  const resetPlannerChat = (tripId = activeTrip?.id) => {
    setPlannerMessages(INITIAL_PLANNER_MESSAGES);
    setTripIntent({});
    setPlanningSteps([]);
    setChatInput("");
    setAiError("");
    setAssistantThinking(false);
    setAiResult(null);
    setDraftDialogOpen(false);
    setParkSearch("");
    setParkResults([]);
    if (!tripId) return;
    if (user) {
      void supabase.from("trip_chat_messages").delete().eq("trip_id", tripId).eq("user_id", user.id);
    } else {
      deleteLocalTripChat(tripId);
    }
  };

  const newTrip = (starter?: { name?: string; notes?: string }) => {
    const trip: Trip = {
      id: createLocalId("trip"),
      name: starter?.name ?? "My Trip",
      startDate: "",
      endDate: "",
      stops: [],
      notes: starter?.notes ?? "",
      createdAt: new Date().toISOString(),
    };
    const next = [trip, ...trips];
    setTrips(next);
    setActiveId(trip.id);
    resetPlannerChat(trip.id);
    if (user) {
      supabase.from("trips").insert({
        id: trip.id,
        user_id: user.id,
        name: trip.name,
        start_date: trip.startDate,
        end_date: trip.endDate,
        stops: trip.stops,
        notes: trip.notes,
        created_at: trip.createdAt,
      }).then(({ error }) => {
        if (error) console.error("[planner] insert error:", error);
      });
    } else {
      saveTrips(next);
    }
  };

  const saveTrip = async () => {
    if (!activeTrip) return;
    setSaving(true);
    if (!user) {
      saveTrips(trips);
      setSaving(false);
      setSaveMsg("saved");
      setTimeout(() => setSaveMsg(null), 2500);
      return;
    }
    const { error } = await supabase.from("trips").upsert({
      id: activeTrip.id,
      user_id: user.id,
      name: activeTrip.name,
      start_date: activeTrip.startDate,
      end_date: activeTrip.endDate,
      stops: activeTrip.stops,
      notes: activeTrip.notes,
      created_at: activeTrip.createdAt,
    });
    setSaving(false);
    if (error) {
      console.error("[planner] save error:", error);
      setSaveMsg("error");
      toast("Failed to save trip", "error");
    } else {
      setSaveMsg("saved");
      toast("Trip saved");
    }
    setTimeout(() => setSaveMsg(null), 2500);
  };

  const deleteTrip = (id: string) => {
    const next = trips.filter((t) => t.id !== id);
    setTrips(next);
    setActiveId(next[0]?.id ?? null);
    if (user) {
      void supabase.from("trips").delete().eq("id", id).eq("user_id", user.id);
      void supabase.from("trip_chat_messages").delete().eq("trip_id", id).eq("user_id", user.id);
    } else {
      saveTrips(next);
      deleteLocalTripChat(id);
    }
  };

  const searchIdRef = useRef(0);
  const searchForParks = useCallback(async (q: string) => {
    if (!q.trim()) {
      setParkResults([]);
      return;
    }
    const id = ++searchIdRef.current;
    setSearching(true);
    try {
      const data = await searchParks(q, "", 0, 8);
      if (id !== searchIdRef.current) return;
      setParkResults(data.parks);
    } catch {
      if (id !== searchIdRef.current) return;
      setParkResults([]);
    } finally {
      if (id === searchIdRef.current) setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchForParks(parkSearch), 350);
    return () => clearTimeout(t);
  }, [parkSearch, searchForParks]);

  const createStopFromPark = (park: Park, day: number): TripStop => {
    const coords = parseLatLong(park.latLong ?? "");
    return {
      id: createLocalId("stop"),
      parkCode: park.parkCode,
      parkName: park.fullName,
      day,
      notes: "",
      ...(coords ?? {}),
    };
  };

  const addStop = (park: Park) => {
    const stop = createStopFromPark(park, activeTrip ? (activeTrip.stops[activeTrip.stops.length - 1]?.day ?? 0) + 1 : 1);
    if (!activeTrip) {
      const trip: Trip = {
        id: createLocalId("trip"),
        name: "My Trip",
        startDate: "",
        endDate: "",
        stops: [stop],
        notes: "",
        createdAt: new Date().toISOString(),
      };
      const next = [trip, ...trips];
      setTrips(next);
      setActiveId(trip.id);
      if (user) {
        void supabase.from("trips").insert({
          id: trip.id,
          user_id: user.id,
          name: trip.name,
          start_date: trip.startDate,
          end_date: trip.endDate,
          stops: trip.stops,
          notes: trip.notes,
          created_at: trip.createdAt,
        });
      } else {
        saveTrips(next);
      }
      resetPlannerChat(trip.id);
      return;
    }
    updateTrip({ ...activeTrip, stops: [...activeTrip.stops, stop] });
    setParkSearch("");
    setParkResults([]);
  };

  const removeStop = (stopId: string) => {
    if (!activeTrip) return;
    updateTrip({ ...activeTrip, stops: activeTrip.stops.filter((s) => s.id !== stopId) });
  };

  const updateStop = (stopId: string, patch: Partial<TripStop>) => {
    if (!activeTrip) return;
    const stops = activeTrip.stops.map((stop) => (stop.id === stopId ? { ...stop, ...patch } : stop));
    updateTrip({ ...activeTrip, stops });
  };

  const suggestedPacking = activeTrip ? suggestedPackingByTrip[activeTrip.id] ?? [] : [];
  const packingList = activeTrip
    ? uniqueItems([...generatePackingList(activeTrip.stops, activeTrip.startDate, activeTrip.endDate), ...suggestedPacking])
    : [];
  const packedItems = activeTrip ? packedItemsByTrip[activeTrip.id] ?? [] : [];
  const packedCount = packedItems.filter((item) => packingList.includes(item)).length;
  const tripDays = activeTrip ? getTripDays(activeTrip.startDate, activeTrip.endDate) : 0;

  const togglePackedItem = (item: string, checked: boolean) => {
    if (!activeTrip) return;
    setPackedItemsByTrip((prev) => {
      const current = new Set(prev[activeTrip.id] ?? []);
      if (checked) {
        current.add(item);
      } else {
        current.delete(item);
      }
      const next = { ...prev, [activeTrip.id]: Array.from(current) };
      savePackedItems(next);
      return next;
    });
  };

  const addPlannerMessage = (message: Omit<PlannerMessage, "id">, tripId = activeTrip?.id) => {
    if (message.role === "assistant") setAssistantThinking(false);
    const nextMessage = { ...message, id: createLocalId("msg") };
    if (tripId) chatLocallyUpdatedTripIdRef.current = tripId;
    setPlannerMessages((prev) => {
      const next = [...prev, nextMessage];
      if (tripId && !user) saveLocalTripChat(tripId, next);
      return next;
    });

    if (tripId && user) {
      void supabase.from("trip_chat_messages").insert({
        trip_id: tripId,
        user_id: user.id,
        role: nextMessage.role,
        text: nextMessage.text,
        action: nextMessage.action ?? null,
      });
    }
  };

  const askPlannerAgent = async (message: string): Promise<PlannerAgentResponse | null> => {
    const res = await fetch("/api/planner-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        currentTrip: activeTrip ? {
          name: activeTrip.name,
          startDate: activeTrip.startDate,
          endDate: activeTrip.endDate,
          stops: activeTrip.stops,
          notes: activeTrip.notes,
        } : null,
        currentIntent: tripIntent,
      }),
    });
    if (!res.ok) return null;
    return res.json() as Promise<PlannerAgentResponse>;
  };

  const generateItinerary = async (source: "button" | "chat" = "button", intentOverride = tripIntent, tripOverride = activeTrip) => {
    if (!tripOverride || !tripOverride.stops.length) return;
    setAiLoading(true);
    setPlanningSteps(source === "chat" ? PLANNING_STEPS : []);
    setAiError("");
    setAiResult(null);
    try {
      const res = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripName: tripOverride.name,
          startDate: tripOverride.startDate,
          endDate: tripOverride.endDate,
          tripDays: getTripDays(tripOverride.startDate, tripOverride.endDate) || intentOverride.days || tripOverride.stops.length,
          stops: tripOverride.stops,
          planningContext: [formatPlanningContext(intentOverride), formatDraftContext(aiResult)].filter(Boolean).join("\n\n"),
        }),
      });
      const data = await res.json() as AiItinerary & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setAiResult(data);
      setDraftDialogOpen(true);
      if (source === "chat") {
        addPlannerMessage({
          role: "assistant",
          text: `I drafted ${data.days.length} ${data.days.length === 1 ? "day" : "days"} for ${tripOverride.name || "this trip"}. Review it, then apply it to update the editable stops.`,
          action: "apply",
        }, tripOverride.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setAiError(message);
      if (source === "chat") {
        addPlannerMessage({
          role: "assistant",
          text: `I could not draft the itinerary yet: ${message}`,
        }, tripOverride.id);
      }
    } finally {
      setAiLoading(false);
      setPlanningSteps([]);
    }
  };

  const applyItinerary = () => {
    if (!activeTrip || !aiResult) return;
    const updatedStops = aiResult.days.map((day) => {
      const normalizedAiPark = normalizeParkName(day.parkName);
      const sourceStop = activeTrip.stops.find((stop) => {
        const normalizedStopPark = normalizeParkName(stop.parkName);
        return normalizedAiPark === normalizedStopPark
          || normalizedAiPark.includes(normalizedStopPark)
          || normalizedStopPark.includes(normalizedAiPark);
      }) ?? activeTrip.stops.find((stop) => stop.day === day.day) ?? activeTrip.stops[0];
      const isTravelDay = normalizeParkName(day.parkName) === "travel day";
      const notes = day.activities.join(" · ") + (day.tip ? ` — ${day.tip}` : "");
      return {
        id: createLocalId(`ai-day-${day.day}`),
        parkCode: isTravelDay ? `travel-day-${day.day}` : sourceStop?.parkCode ?? createLocalId("park"),
        parkName: isTravelDay ? "Travel Day" : day.parkName || sourceStop?.parkName || "Planned Day",
        day: day.day,
        notes,
        lat: isTravelDay ? undefined : sourceStop?.lat,
        lng: isTravelDay ? undefined : sourceStop?.lng,
      };
    });
    updateTrip({
      ...activeTrip,
      startDate: tripIntent.startDate ?? activeTrip.startDate,
      endDate: tripIntent.endDate ?? activeTrip.endDate,
      stops: updatedStops,
    });
    if (aiResult.packingAdditions?.length) {
      setSuggestedPackingByTrip((prev) => {
        const next = {
          ...prev,
          [activeTrip.id]: uniqueItems([...(prev[activeTrip.id] ?? []), ...aiResult.packingAdditions]),
        };
        saveSuggestedPacking(next);
        return next;
      });
    }
    setAiResult(null);
    setDraftDialogOpen(false);
    setMobileTab("plan");
    toast("Itinerary applied to your planner!");
    addPlannerMessage({
      role: "assistant",
      text: "Applied. The itinerary panel now shows the day-by-day plan, and the trip dates are updated at the top.",
    });
  };

  const reviseDraftInChat = () => {
    setDraftDialogOpen(false);
    setMobileTab("chat");
    setChatInput("Make this itinerary ");
    addPlannerMessage({
      role: "assistant",
      text: "What should I change before you apply it? You can ask for a slower pace, kid-friendly stops, less driving, different trails, lodging notes, or packing changes.",
    });
  };

  const selectParkFromChat = async (park: Park) => {
    if (!activeTrip) return;
    const stop = createStopFromPark(park, (activeTrip.stops[activeTrip.stops.length - 1]?.day ?? 0) + 1);
    const updatedTrip: Trip = {
      ...activeTrip,
      startDate: tripIntent.startDate ?? activeTrip.startDate,
      endDate: tripIntent.endDate ?? activeTrip.endDate,
      stops: [...activeTrip.stops, stop],
    };
    updateTrip(updatedTrip);
    setParkSearch("");
    setParkResults([]);
    addPlannerMessage({
      role: "assistant",
      text: `Added ${park.fullName}. I will draft the itinerary from this official park stop now.`,
    });

    const missing = getMissingTripFields(
      tripIntent,
      true,
      Boolean(updatedTrip.startDate || updatedTrip.endDate),
      getTripDays(updatedTrip.startDate, updatedTrip.endDate) > 0 || Boolean(tripIntent.days)
    );
    if (missing.length > 0) {
      const hasUpdatedDates = Boolean(updatedTrip.startDate || updatedTrip.endDate);
      const hasUpdatedTripLength = getTripDays(updatedTrip.startDate, updatedTrip.endDate) > 0 || Boolean(tripIntent.days);
      addPlannerMessage({
        role: "assistant",
        text: buildFollowUpQuestion(tripIntent, true, hasUpdatedDates, hasUpdatedTripLength),
        suggestions: buildFollowUpSuggestions(tripIntent),
      });
      return;
    }

    await generateItinerary("chat", tripIntent, updatedTrip);
  };

  const handlePlannerPrompt = async (prompt: string) => {
    const text = prompt.trim();
    if (!text) return;
    setChatInput("");

    let workingTrip = activeTrip;
    if (!workingTrip) {
      const trip: Trip = {
        id: createLocalId("trip"),
        name: "TrailQuest draft",
        startDate: "",
        endDate: "",
        stops: [],
        notes: "",
        createdAt: new Date().toISOString(),
      };
      const next = [trip, ...trips];
      setTrips(next);
      setActiveId(trip.id);
      workingTrip = trip;
      if (user) {
        void supabase.from("trips").insert({
          id: trip.id,
          user_id: user.id,
          name: trip.name,
          start_date: trip.startDate,
          end_date: trip.endDate,
          stops: trip.stops,
          notes: trip.notes,
          created_at: trip.createdAt,
        });
      } else {
        saveTrips(next);
      }
    }

    addPlannerMessage({ role: "user", text }, workingTrip.id);
    setAssistantThinking(true);
    const addWorkingMessage = (message: Omit<PlannerMessage, "id">) => addPlannerMessage(message, workingTrip.id);

    const agentResponse = await askPlannerAgent(text).catch(() => {
      setAssistantThinking(false);
      return null;
    });
    const agentIntent = agentResponse?.normalizedTrip ?? {};
    const nextIntent = { ...parseTripIntent(text, tripIntent), ...agentIntent };
    const hasStops = workingTrip.stops.length > 0;
    const hasDates = Boolean(workingTrip.startDate || workingTrip.endDate || nextIntent.startDate || nextIntent.endDate);
    const hasTripLength = getTripDays(workingTrip.startDate, workingTrip.endDate) > 0 || Boolean(nextIntent.days);
    const missing = getMissingTripFields(nextIntent, hasStops, hasDates, hasTripLength);
    const shouldDraft = missing.length === 0;
    const onlyParkName = nextIntent.destination ? text.toLowerCase().trim() === nextIntent.destination.toLowerCase() : false;
    const tripWithIntent: Trip = {
      ...workingTrip,
      startDate: nextIntent.startDate ?? workingTrip.startDate,
      endDate: nextIntent.endDate ?? workingTrip.endDate,
    };

    setTripIntent(nextIntent);
    updateTrip(tripWithIntent);

    if (onlyParkName) {
      addWorkingMessage({
        role: "assistant",
        text: buildFollowUpQuestion(nextIntent, hasStops, hasDates, hasTripLength),
        suggestions: buildFollowUpSuggestions(nextIntent),
      });
      return;
    }

    if (!hasStops) {
      const requestedDestinations = nextIntent.destinations?.length
        ? nextIntent.destinations
        : nextIntent.destination
          ? [nextIntent.destination]
          : [];
      if (requestedDestinations.length) {
        if (shouldDraft) {
          setAiLoading(true);
          setPlanningSteps(PLANNING_STEPS);
          addWorkingMessage({
            role: "assistant",
            text: agentResponse?.message ?? "I have enough to start. I am matching the park to TrailQuest data before drafting the route.",
          });
          try {
            const resolvedParks: Park[] = [];
            const unresolvedOptions: Park[] = [];

            for (const destination of requestedDestinations) {
              const knownPark = knownParkOption(destination);
              if (knownPark) {
                resolvedParks.push(knownPark);
                continue;
              }

              const data = await searchParks(destination, "", 0, 8);
              const matches = filterParkMatches(data.parks, destination);
              const park = findBestParkMatch(matches, destination);
              if (park) {
                resolvedParks.push(park);
              } else {
                unresolvedOptions.push(...matches);
              }
            }

            if (resolvedParks.length !== requestedDestinations.length) {
              setAiLoading(false);
              setPlanningSteps([]);
              const missingDestinations = requestedDestinations.filter((destination) =>
                !resolvedParks.some((park) => normalizeParkName(park.fullName).includes(normalizeParkName(destination)))
              );
              const destinationExample = (missingDestinations.length ? missingDestinations : requestedDestinations)
                .map((destination) => `${destination.replace(/\b\w/g, (char) => char.toUpperCase())} National Park`)
                .join(" and ");
              const parkOptions = uniqueItems(unresolvedOptions.map((park) => park.parkCode))
                .map((parkCode) => unresolvedOptions.find((park) => park.parkCode === parkCode))
                .filter((park): park is Park => Boolean(park))
                .slice(0, 4);
              addWorkingMessage({
                role: "assistant",
                text: parkOptions.length
                  ? "I found possible official park matches. Pick the missing park here in chat, then I will draft the itinerary."
                  : `I could not find every official park match. Try the destination again by full official name, like “${destinationExample}”.`,
                parkOptions: parkOptions.length ? parkOptions : undefined,
              });
              return;
            }

            const updatedTrip = {
              ...tripWithIntent,
              stops: resolvedParks.map((park, index) => createStopFromPark(park, index + 1)),
            };
            updateTrip(updatedTrip);
            setParkSearch("");
            setParkResults([]);
            await generateItinerary("chat", nextIntent, updatedTrip);
          } catch {
            setAiLoading(false);
            setPlanningSteps([]);
            const fallbackParks = requestedDestinations
              .map((destination) => knownParkOption(destination))
              .filter((park): park is Park => Boolean(park));
            if (fallbackParks.length === requestedDestinations.length) {
              const updatedTrip = {
                ...tripWithIntent,
                stops: fallbackParks.map((park, index) => createStopFromPark(park, index + 1)),
              };
              updateTrip(updatedTrip);
              setParkSearch("");
              setParkResults([]);
              addWorkingMessage({
                role: "assistant",
                text: `I matched ${fallbackParks.map((park) => park.fullName).join(" and ")} from the built-in park list. I will draft the itinerary now.`,
              });
              await generateItinerary("chat", nextIntent, updatedTrip);
              return;
            }
            const destinationExample = requestedDestinations.length
              ? requestedDestinations.map((destination) => `${destination.replace(/\b\w/g, (char) => char.toUpperCase())} National Park`).join(" and ")
              : "the full park name";
            addWorkingMessage({
              role: "assistant",
              text: `I could not load live park matches yet. Try the destination again by full official name, like “${destinationExample}”.`,
              parkOptions: fallbackParks.length ? fallbackParks : undefined,
            });
          }
          return;
        }
        addWorkingMessage({
          role: "assistant",
          text: buildFollowUpQuestion(nextIntent, hasStops, hasDates, hasTripLength),
          suggestions: buildFollowUpSuggestions(nextIntent),
        });
      } else {
        addWorkingMessage({
          role: "assistant",
          text: buildFollowUpQuestion(nextIntent, hasStops, hasDates, hasTripLength),
          suggestions: buildFollowUpSuggestions(nextIntent),
        });
      }
      return;
    }

    if (!shouldDraft) {
      addWorkingMessage({
        role: "assistant",
        text: buildFollowUpQuestion(nextIntent, hasStops, hasDates, hasTripLength),
        suggestions: buildFollowUpSuggestions(nextIntent),
      });
      return;
    }

    addWorkingMessage({
      role: "assistant",
      text: agentResponse?.message ?? "I have enough to draft this around your stops, dates, starting place, travel style, weather assumptions, road access, and packing needs.",
    });
    void generateItinerary("chat", nextIntent, tripWithIntent);
  };

  return (
    <div
      className="min-h-screen pt-[var(--nav-h)]"
      style={{
        background:
          "linear-gradient(180deg, rgba(251,251,248,0.92) 0%, rgba(245,246,243,0.96) 48%, rgba(251,251,248,1) 100%)",
      }}
    >
      {!user && (
        <SyncNotice>Sign in to sync trips across devices.</SyncNotice>
      )}
      <div className="sticky top-[var(--nav-h)] z-30 border-b bg-white/95 px-3 py-2 backdrop-blur lg:hidden" style={{ borderColor: "var(--line)" }}>
        <Tabs value={mobileTab} onValueChange={(value) => setMobileTab(value as typeof mobileTab)} className="gap-0">
          <TabsList className="grid h-10 w-full grid-cols-5 rounded-lg bg-[var(--surface)] p-1">
            <TabsTrigger value="trips" className="rounded-md text-xs">Trips</TabsTrigger>
            <TabsTrigger value="chat" className="rounded-md text-xs" disabled={!activeTrip}>Chat</TabsTrigger>
            <TabsTrigger value="plan" className="rounded-md text-xs" disabled={!activeTrip}>Plan</TabsTrigger>
            <TabsTrigger value="map" className="rounded-md text-xs" disabled={!activeTrip}>Map</TabsTrigger>
            <TabsTrigger value="notes" className="rounded-md text-xs" disabled={!activeTrip}>Notes</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className={`${tripsRailOpen ? "lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]" : "lg:grid-cols-[64px_minmax(0,1fr)]"} relative mx-auto grid min-h-[calc(100vh-66px)] w-full max-w-[1760px] gap-4 px-3 py-3 sm:px-4 sm:py-4`}>
        {!tripsRailOpen && (
          <TooltipProvider>
            <aside
              className="hidden rounded-lg border bg-white/78 px-2 py-3 lg:sticky lg:top-[82px] lg:flex lg:h-[calc(100vh-98px)] lg:flex-col lg:items-center"
              style={{ borderColor: "var(--line)", backdropFilter: "blur(18px)", boxShadow: "var(--shadow-sm)" }}
              aria-label="Collapsed trips navigation"
            >
              <div className="flex flex-col items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={() => setTripsRailOpen(true)}
                      variant="ghost"
                      size="icon-lg"
                      className="h-10 w-10 rounded-lg text-[var(--ink)] hover:bg-[var(--surface)]"
                      aria-label="Show trips"
                    >
                      <Icon name="panel" className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Show trips</TooltipContent>
                </Tooltip>
              </div>
            </aside>
          </TooltipProvider>
        )}
        <aside
          className={`${mobileTab === "trips" ? "block" : "hidden"} ${tripsRailOpen ? "lg:block" : "lg:hidden"} rounded-lg border bg-white/75 p-3.5 lg:sticky lg:top-[82px] lg:h-[calc(100vh-98px)]`}
          style={{ borderColor: "var(--line)", backdropFilter: "blur(18px)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                Planner
              </p>
              <h1 className="mt-1 text-xl font-semibold" style={{ color: "var(--ink)" }}>
                Trips
              </h1>
              <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
                Draft routes, dates, packing, and notes.
              </p>
            </div>
            <TooltipProvider>
              <div className="flex shrink-0 items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={() => setTripsRailOpen(false)}
                      variant="outline"
                      size="icon-lg"
                      className="hidden h-10 w-10 rounded-lg border-[#d8ddd8] bg-white text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)] lg:inline-flex"
                      aria-label="Hide trips"
                    >
                      <Icon name="panel" className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Hide trips</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={() => newTrip()}
                      size="icon-lg"
                      className="bg-[var(--ink)] text-white shadow-[0_12px_26px_rgba(17,19,21,0.16)] hover:bg-[var(--ink)]/90"
                      aria-label="New trip"
                      title="New trip"
                    >
                      <Icon name="plus" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>New trip</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg border bg-[var(--surface)] px-3 py-2" style={{ borderColor: "var(--line)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              {trips.length} {trips.length === 1 ? "trip" : "trips"} {user ? "synced" : "saved locally"}
            </span>
            <Badge variant="secondary" className="rounded-md bg-[var(--sand)] px-2 py-1 text-[11px] font-semibold text-[var(--ink)]">
              Drafts
            </Badge>
          </div>

          <div className="mt-3 space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-250px)]">
            {!tripsReady && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Card key={i} size="sm" className="border bg-white/75 shadow-none" style={{ borderColor: "var(--line)" }}>
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-8 w-8 shrink-0 rounded-md bg-[var(--linen)]" />
                      <div className="flex-1 space-y-2 pt-0.5">
                        <Skeleton className="h-3.5 w-3/4 rounded-full bg-[var(--linen)]" />
                        <Skeleton className="h-3 w-1/2 rounded-full bg-[var(--linen)]" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {tripsReady && trips.length === 0 && (
              <div className="rounded-lg border p-3" style={{ borderColor: "var(--line)", background: "rgba(251,251,248,0.72)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Start with a trip shape</p>
                <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
                  Pick a starter or create a blank route.
                </p>
                <div className="mt-3 grid gap-2">
                  {TRIP_STARTERS.map((starter) => (
                    <button
                      key={starter.name}
                      type="button"
                      onClick={() => newTrip(starter)}
                      className="rounded-lg border bg-white px-3 py-2.5 text-left transition hover:-translate-y-0.5"
                      style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                    >
                      <span className="block text-xs font-semibold">{starter.name}</span>
                      <span className="mt-0.5 block text-[11px]" style={{ color: "var(--muted)" }}>{starter.label}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => newTrip()}
                    className="rounded-lg border border-dashed bg-white px-3 py-2.5 text-left transition hover:-translate-y-0.5"
                    style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                  >
                    <span className="block text-xs font-semibold">Blank trip</span>
                    <span className="mt-0.5 block text-[11px]" style={{ color: "var(--muted)" }}>Start from scratch</span>
                  </button>
                </div>
              </div>
            )}

            {trips.map((trip) => {
              const active = activeId === trip.id;
              return (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => setActiveId(trip.id)}
                  className="w-full rounded-lg border p-3 text-left transition hover:-translate-y-0.5"
                  style={{
                    background: active ? "var(--ink)" : "rgba(255,255,255,0.72)",
                    borderColor: active ? "var(--ink)" : "var(--line)",
                    color: active ? "white" : "var(--ink)",
                    boxShadow: active ? "0 14px 32px rgba(17,19,21,0.18)" : "none",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                      style={{ background: active ? "rgba(255,255,255,0.12)" : "var(--accent-soft)", color: active ? "white" : "var(--accent)" }}
                    >
                      <Icon name="route" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="block truncate text-sm font-semibold">{trip.name || "Untitled trip"}</span>
                        <span className="shrink-0 text-[11px] font-semibold opacity-80">Open</span>
                      </span>
                      <span className="mt-1 block truncate text-xs" style={{ color: active ? "rgba(255,255,255,0.68)" : "var(--muted)" }}>
                        {dateSummary(trip)}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ background: active ? "rgba(255,255,255,0.12)" : "var(--surface-soft)", color: active ? "white" : "var(--muted-strong)" }}>
                          {stopSummary(trip.stops.length)}
                        </span>
                        <span className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ background: active ? "rgba(255,255,255,0.12)" : "var(--sand)", color: active ? "white" : "var(--ink)" }}>
                          {createdSummary(trip.createdAt)}
                        </span>
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className={`${mobileTab === "trips" ? "hidden" : "block"} lg:block min-w-0`}>
          {!activeTrip ? (
            <div
              className="min-h-[calc(100vh-98px)] rounded-lg border bg-white/80 p-5 sm:p-7"
              style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}
            >
              <div className="flex min-h-[calc(100vh-154px)] flex-col items-center justify-center px-1 text-center sm:px-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>
                  Trip planner
                </p>
                <h2 className="mt-3 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl" style={{ color: "var(--ink)" }}>
                  Start with a park stop.
                </h2>
                <Popover open={Boolean(parkSearch.trim())}>
                  <PopoverAnchor asChild>
                    <div className="relative mt-8 w-full max-w-xl text-left">
                      <Icon name="search" className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-[var(--muted)]" />
                      <Input
                        type="text"
                        placeholder="Add a park stop..."
                        value={parkSearch}
                        onChange={(e) => setParkSearch(e.target.value)}
                        className="h-16 rounded-2xl border-[#d8ddd8] bg-white pl-14 pr-5 text-lg font-medium text-[var(--ink)] shadow-[0_14px_36px_rgba(17,19,21,0.06)] placeholder:text-[var(--muted)]"
                      />
                    </div>
                  </PopoverAnchor>
                  <PopoverContent
                    align="center"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                    className="w-[min(92vw,34rem)] overflow-hidden rounded-lg border bg-white p-0"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <Command shouldFilter={false} className="rounded-lg bg-white">
                      <CommandList>
                        {searching && (
                          <div className="space-y-2 p-3">
                            {[1, 2, 3].map((item) => (
                              <div key={item} className="flex items-center gap-3">
                                <Skeleton className="h-9 w-9 rounded-md bg-[var(--linen)]" />
                                <div className="flex-1 space-y-2">
                                  <Skeleton className="h-3.5 w-3/4 bg-[var(--linen)]" />
                                  <Skeleton className="h-3 w-1/3 bg-[var(--linen)]" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {!searching && parkResults.length === 0 && <CommandEmpty>No parks found.</CommandEmpty>}
                        <CommandGroup heading="Add a stop">
                          {parkResults.map((park) => (
                            <CommandItem
                              key={park.parkCode}
                              value={park.fullName}
                              onSelect={() => addStop(park)}
                              className="cursor-pointer rounded-md px-3 py-3"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#edf5ef] text-[#1f7668]">
                                <Icon name="plus" className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">{park.fullName}</span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  {park.states || "National Park Service"}
                                </span>
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button type="button" onClick={() => setParkSearch("Zion")} variant="outline" className="h-9 bg-white">
                    Try Zion
                  </Button>
                  <Button type="button" onClick={() => newTrip()} variant="outline" className="h-9 bg-white text-[var(--accent)]">
                    Blank trip
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Card
                className="gap-0 rounded-lg border bg-white py-0"
                style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}
              >
                <CardHeader className="px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                      <Sheet open={tripSheetOpen} onOpenChange={setTripSheetOpen}>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 bg-white lg:hidden">
                            <Icon name="chevron" className="h-3.5 w-3.5 rotate-90" />
                            Trips
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[88vw] max-w-sm gap-0 bg-white p-0">
                          <SheetHeader className="border-b" style={{ borderColor: "var(--line)" }}>
                            <SheetTitle>Saved trips</SheetTitle>
                            <SheetDescription>Open a route, dates, packing, and notes.</SheetDescription>
                          </SheetHeader>
                          <div className="flex-1 overflow-y-auto p-3">
                            <Button
                              type="button"
                              onClick={() => {
                                newTrip();
                                setTripSheetOpen(false);
                              }}
                              className="mb-3 w-full bg-[var(--ink)] text-white hover:bg-[var(--ink)]/90"
                            >
                              <Icon name="plus" className="h-4 w-4" />
                              New trip
                            </Button>
                            <div className="space-y-2">
                              {trips.map((trip) => (
                                <button
                                  key={trip.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveId(trip.id);
                                    setMobileTab("plan");
                                    setTripSheetOpen(false);
                                  }}
                                  className="w-full rounded-lg border bg-white p-3 text-left"
                                  style={{ borderColor: activeId === trip.id ? "var(--accent)" : "var(--line)" }}
                                >
                                  <span className="block truncate text-sm font-semibold" style={{ color: "var(--ink)" }}>
                                    {trip.name || "Untitled trip"}
                                  </span>
                                  <span className="mt-1 block text-xs" style={{ color: "var(--muted)" }}>
                                    {dateSummary(trip)} · {stopSummary(trip.stops.length)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </SheetContent>
                      </Sheet>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#e4f1ed] text-lg">
                        🏔️
                      </span>
                      Trip summary
                    </div>
                    <Input
                      type="text"
                      value={activeTrip.name}
                      onChange={(e) => updateTrip({ ...activeTrip, name: e.target.value })}
                      className="mt-2 h-auto w-full border-none bg-transparent p-0 text-3xl font-semibold leading-tight text-[var(--ink)] shadow-none focus-visible:ring-0 md:text-4xl"
                      style={{ background: "transparent", color: "var(--ink)" }}
                      placeholder="Trip name"
                    />
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <Badge variant="outline" className="h-8 gap-2 rounded-md border-[#d8ddd8] bg-[#fbfbf8] px-3 text-[var(--muted-strong)]">
                        <Icon name="calendar" className="h-4 w-4" />
                        {dateSummary(activeTrip)}
                      </Badge>
                      <Badge variant="outline" className="h-8 gap-2 rounded-md border-[#d7e2dc] bg-[#f1f7f3] px-3 text-[#356b5a]">
                        <Icon name="map" className="h-4 w-4" />
                        {stopSummary(activeTrip.stops.length)}
                      </Badge>
                      <Badge variant="outline" className="h-8 gap-2 rounded-md border-[#d8ddd8] bg-[#fbfbf8] px-3 text-[var(--muted-strong)]">
                        <Icon name="check" className="h-4 w-4" />
                        {packedCount} of {packingList.length} packed
                      </Badge>
                      <Badge variant="secondary" className="h-8 rounded-md bg-[#eee5d6] px-3 text-xs font-semibold text-[var(--ink)]">
                        {user ? "Draft" : "Saved locally"}
                      </Badge>
                    </div>
                  </div>

                  <TooltipProvider>
                    <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            onClick={saveTrip}
                            disabled={saving}
                            variant="outline"
                            className="h-10 flex-1 gap-2 rounded-md border-[#d8ddd8] bg-white px-4 text-sm font-semibold shadow-sm hover:bg-[#fbfbf8] sm:flex-none"
                            style={{
                              color: saveMsg === "saved" ? "var(--accent)" : saveMsg === "error" ? "#b42318" : "var(--ink)",
                              borderColor: saveMsg === "saved" ? "rgba(23,109,101,0.28)" : saveMsg === "error" ? "rgba(180,35,24,0.24)" : "var(--line)",
                              background: saveMsg === "saved" ? "var(--accent-soft)" : "white",
                            }}
                          >
                            <Icon name={saveMsg === "error" ? "close" : "check"} className="h-4 w-4" />
                            {saving ? "Saving" : saveMsg === "saved" ? "Saved" : saveMsg === "error" ? "Retry" : "Save"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Save trip changes</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            onClick={() => deleteTrip(activeTrip.id)}
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-md text-[#9f241b] hover:bg-red-50 hover:text-[#9f241b]"
                            aria-label="Delete this trip"
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete this trip</TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </div>
                {saveMsg === "error" && (
                  <Alert variant="destructive" className="mt-4 border-red-200 bg-red-50">
                    <AlertTitle>Trip was not saved</AlertTitle>
                    <AlertDescription>Try saving again. Your edits are still on this page.</AlertDescription>
                  </Alert>
                )}
                </CardHeader>

                <Separator className="bg-[var(--line)]" />
                <CardContent className="grid max-w-[720px] gap-3 px-4 py-4 sm:px-5 md:grid-cols-2">
                  <TripDatePicker
                    label="Start date"
                    value={activeTrip.startDate}
                    onChange={(value) => updateTrip({ ...activeTrip, startDate: value })}
                  />
                  <TripDatePicker
                    label="End date"
                    value={activeTrip.endDate}
                    onChange={(value) => updateTrip({ ...activeTrip, endDate: value })}
                  />
                </CardContent>
              </Card>

              <div className="mt-4 grid gap-4 xl:grid-cols-[560px_minmax(0,1fr)] 2xl:grid-cols-[620px_minmax(0,1fr)]">
                <Card className={`${mobileTab === "chat" ? "flex" : "hidden"} min-h-[620px] flex-col gap-0 overflow-hidden rounded-lg border bg-white py-0 xl:sticky xl:top-[82px] xl:flex xl:h-[calc(100vh-98px)]`} style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                  <CardHeader className="px-5 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-2xl font-semibold text-[var(--ink)]">
                          Plan with TrailQuest
                        </CardTitle>
                        <p className="mt-2 text-lg leading-7" style={{ color: "var(--muted)" }}>
                          How can I help plan this trip?
                        </p>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              onClick={() => resetPlannerChat()}
                              variant="outline"
                              size="icon-lg"
                              className="h-11 w-11 rounded-full border-[#d8ddd8] bg-white text-[var(--ink)] hover:bg-[var(--surface)]"
                              aria-label="Reset chat"
                            >
                              <Icon name="refresh" className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reset chat</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardHeader>
                  <Separator className="bg-[var(--line)]" />
                  <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-5 py-5">
                    {aiError && (
                      <Alert variant="destructive" className="border-red-200 bg-red-50">
                        <AlertTitle>Could not draft itinerary</AlertTitle>
                        <AlertDescription>{aiError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex min-h-[320px] flex-1 flex-col overflow-y-auto">
                      <div className="space-y-3">
                          {plannerMessages.map((message) => (
                            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[88%] rounded-lg border px-3 py-2.5 text-sm leading-6 ${
                                  message.role === "user"
                                    ? "bg-[var(--ink)] text-white"
                                    : "bg-[var(--surface)] text-[var(--ink-soft)]"
                                }`}
                                style={{
                                  borderColor: message.role === "user" ? "var(--ink)" : "var(--line)",
                                }}
                              >
                                {message.role === "assistant" ? (
                                  (() => {
                                    const formatted = formatAssistantMessage(message.text);
                                    return (
                                      <div className="space-y-3">
                                        <p>{formatted.intro}</p>
                                        {formatted.questions.length > 0 && (
                                          <div className="grid gap-2">
                                            {formatted.questions.map((question, index) => (
                                              <div key={`${message.id}-q-${index}`} className="rounded-md border bg-white px-3 py-2" style={{ borderColor: "var(--line)" }}>
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                                                  Detail {index + 1}
                                                </span>
                                                <p className="mt-1 text-sm leading-5 text-[var(--ink-soft)]">{question}</p>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <p>{message.text}</p>
                                )}
                                {message.suggestions?.length ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {message.suggestions.map((suggestion) => (
                                      <Button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => void handlePlannerPrompt(suggestion)}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 rounded-full bg-white px-3 text-xs font-semibold text-[var(--accent)]"
                                      >
                                        {suggestion}
                                      </Button>
                                    ))}
                                  </div>
                                ) : null}
                                {message.parkOptions?.length ? (
                                  <div className="mt-3 grid gap-2">
                                    {message.parkOptions.map((park) => (
                                      <Button
                                        key={park.parkCode}
                                        type="button"
                                        onClick={() => void selectParkFromChat(park)}
                                        variant="outline"
                                        className="h-auto justify-start rounded-lg bg-white px-3 py-2 text-left text-[var(--ink)]"
                                      >
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#edf5ef] text-[#1f7668]">
                                          <Icon name="plus" className="h-4 w-4" />
                                        </span>
                                        <span className="min-w-0">
                                          <span className="block truncate text-sm font-semibold">{park.fullName}</span>
                                          <span className="block truncate text-xs text-[var(--muted)]">{park.states || "National Park Service"}</span>
                                        </span>
                                      </Button>
                                    ))}
                                  </div>
                                ) : null}
                                {message.action === "draft" && (
                                  <Button
                                    type="button"
                                    onClick={() => setMobileTab("chat")}
                                    variant="outline"
                                    size="sm"
                                    className="mt-3 h-8 bg-white text-xs text-[var(--accent)]"
                                  >
                                    Continue in chat
                                  </Button>
                                )}
                                {message.action === "apply" && aiResult && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      onClick={() => setDraftDialogOpen(true)}
                                      variant="outline"
                                      size="sm"
                                      className="h-8 bg-white text-xs text-[var(--accent)]"
                                    >
                                      Review draft
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={applyItinerary}
                                      size="sm"
                                      className="h-8 bg-[var(--accent)] text-xs text-white hover:bg-[var(--accent)]/90"
                                    >
                                      <Icon name="check" className="h-3.5 w-3.5" />
                                      Apply to planner
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={() => {
                                        setAiResult(null);
                                        setDraftDialogOpen(false);
                                      }}
                                      variant="outline"
                                      size="sm"
                                      className="h-8 bg-white text-xs"
                                    >
                                      Discard
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {assistantThinking && !aiLoading && (
                            <div className="flex justify-start">
                              <div className="max-w-[88%] rounded-lg border bg-[var(--surface)] px-3 py-3 text-sm text-[var(--ink-soft)]" style={{ borderColor: "var(--line)" }}>
                                <div className="flex items-center gap-3">
                                  <div className="flex -space-x-1.5" aria-hidden="true">
                                    {["🧭", "🥾", "🚗"].map((icon, index) => (
                                      <span
                                        key={icon}
                                        className="flex h-7 w-7 items-center justify-center rounded-full border bg-white text-sm shadow-sm animate-pulse"
                                        style={{
                                          borderColor: "var(--line)",
                                          animationDelay: `${index * 160}ms`,
                                        }}
                                      >
                                        {icon}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="font-medium">Reading your trip details...</span>
                                </div>
                              </div>
                            </div>
                          )}
                          {aiLoading && (
                            <div className="flex justify-start">
                              <div className="w-full max-w-[88%] rounded-lg border bg-[var(--surface)] px-3 py-3 text-sm text-[var(--muted)]" style={{ borderColor: "var(--line)" }}>
                                <div className="space-y-2">
                                  {(planningSteps.length ? planningSteps : PLANNING_STEPS).map((step, index) => (
                                    <div key={step.text} className="flex items-center gap-2">
                                      <span className="w-6 text-base" aria-hidden="true">{step.icon}</span>
                                      <span className={index === 0 ? "font-semibold text-[var(--ink)]" : ""}>{step.text}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                    </div>

                    <form
                      className="rounded-3xl bg-[var(--surface-soft)] p-2.5"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handlePlannerPrompt(chatInput);
                      }}
                    >
                      <Textarea
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        placeholder="Tell TrailQuest where, when, and who’s going..."
                        rows={2}
                        className="planner-chat-textarea min-h-14 resize-none rounded-none border-0 bg-transparent px-3 py-2 text-base leading-6 text-[var(--ink)] shadow-none outline-none focus-visible:border-0 focus-visible:ring-0"
                        style={{ background: "transparent", boxShadow: "none" }}
                      />
                      <div className="flex items-center justify-end gap-2 px-1">
                        <Button
                          type="submit"
                          disabled={!chatInput.trim() || assistantThinking || aiLoading}
                          size="icon-lg"
                          className="h-11 w-11 rounded-full bg-[var(--ink)] text-white opacity-100 hover:bg-[var(--ink)]/90 disabled:bg-[var(--ink)] disabled:text-white disabled:opacity-100"
                          aria-label="Send message"
                        >
                          <Icon name="arrowUp" className="h-5 w-5" />
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <div className={`${mobileTab === "chat" ? "hidden" : "block"} min-w-0 xl:block`}>
                  <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_370px]">
                <section className="min-w-0 space-y-4">
                  <Card className={`${mobileTab === "plan" ? "block" : "hidden"} gap-0 overflow-visible rounded-lg border bg-white py-0 xl:block`} style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                    <CardHeader className="px-4 py-4 sm:px-5">
                    <div className={`grid gap-4 lg:items-start ${activeTrip.stops.length > 0 ? "lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]" : ""}`}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                            Itinerary
                          </p>
                          <Badge variant="outline" className="rounded-md border-[#d9d2c3] bg-[#f7f1e7] text-[#6e5b39]">
                            {activeTrip.stops.length} {activeTrip.stops.length === 1 ? "stop" : "stops"}
                          </Badge>
                          {tripDays > 0 && (
                            <Badge variant="outline" className="rounded-md border-[#d7e2dc] bg-[#f1f7f3] text-[#356b5a]">
                              {tripDays} {tripDays === 1 ? "day" : "days"}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="mt-1 text-2xl font-semibold text-[var(--ink)]">
                          Live itinerary
                        </CardTitle>
                      </div>
                      {activeTrip.stops.length > 0 && (
                        <Popover open={Boolean(parkSearch.trim())}>
                          <PopoverAnchor asChild>
                            <div className="relative w-full">
                              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                              <Input
                                type="text"
                                placeholder="Add a park stop..."
                                value={parkSearch}
                                onChange={(e) => setParkSearch(e.target.value)}
                                className="h-11 rounded-lg border-[#d8ddd8] bg-[#fbfbf8] pl-10 pr-3 text-sm font-medium text-[var(--ink)]"
                              />
                            </div>
                          </PopoverAnchor>
                          <PopoverContent
                            align="end"
                            onOpenAutoFocus={(event) => event.preventDefault()}
                            className="w-[min(92vw,30rem)] overflow-hidden rounded-lg border bg-white p-0"
                            style={{ borderColor: "var(--line)" }}
                          >
                            <Command shouldFilter={false} className="rounded-lg bg-white">
                              <CommandList>
                                {searching && (
                                  <div className="space-y-2 p-3">
                                    {[1, 2, 3].map((item) => (
                                      <div key={item} className="flex items-center gap-3">
                                        <Skeleton className="h-9 w-9 rounded-md bg-[var(--linen)]" />
                                        <div className="flex-1 space-y-2">
                                          <Skeleton className="h-3.5 w-3/4 bg-[var(--linen)]" />
                                          <Skeleton className="h-3 w-1/3 bg-[var(--linen)]" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {!searching && parkResults.length === 0 && <CommandEmpty>No parks found.</CommandEmpty>}
                                <CommandGroup heading="Add a stop">
                                  {parkResults.map((park) => (
                                    <CommandItem
                                      key={park.parkCode}
                                      value={park.fullName}
                                      onSelect={() => addStop(park)}
                                      className="cursor-pointer rounded-md px-3 py-3"
                                    >
                                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#edf5ef] text-[#1f7668]">
                                        <Icon name="plus" className="h-4 w-4" />
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold">{park.fullName}</span>
                                        <span className="mt-0.5 block text-xs text-muted-foreground">
                                          {park.states || "National Park Service"}
                                        </span>
                                      </span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    {aiError && (
                      <Alert variant="destructive" className="mt-4 border-red-200 bg-red-50">
                        <AlertTitle>Could not draft itinerary</AlertTitle>
                        <AlertDescription>{aiError}</AlertDescription>
                      </Alert>
                    )}
                    </CardHeader>
                    <Separator className="bg-[var(--line)]" />
                    <CardContent className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 rounded-lg border bg-[#fbfaf6] p-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--line)" }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Plan comes from TrailQuest chat</p>
                        <p className="mt-0.5 text-xs leading-5" style={{ color: "var(--muted)" }}>
                          Ask the assistant to create or revise the trip; edit the itinerary here after applying.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => void generateItinerary()}
                        disabled={aiLoading || !activeTrip.stops.length}
                        variant={activeTrip.stops.length ? "default" : "outline"}
                        className={activeTrip.stops.length ? "h-10 bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90" : "h-10 bg-white text-[var(--muted)]"}
                        title={!activeTrip.stops.length ? "Describe the trip in chat first" : "Re-draft itinerary"}
                      >
                        {aiLoading ? (
                          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/><path d="M12 3a9 9 0 019 9"/></svg>
                        ) : (
                          <Icon name="route" className="h-4 w-4" />
                        )}
                        {aiLoading ? "Drafting..." : "Re-draft"}
                      </Button>
                    </div>

                    {activeTrip.stops.length === 0 ? (
                      <div className="mt-4 flex min-h-[180px] flex-col items-center justify-center rounded-lg border px-4 py-8 text-center sm:min-h-[220px]" style={{ borderColor: "var(--line)", background: "rgba(251,251,248,0.7)" }}>
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                          <Icon name="message" className="h-5 w-5" />
                        </span>
                        <p className="mt-3 text-sm font-semibold text-[var(--ink)]">Start in TrailQuest chat</p>
                        <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--muted)]">
                          Describe the full trip in chat. After you apply the draft, the itinerary, dates, stops, map, and notes appear here.
                        </p>
                        <Button type="button" onClick={() => setMobileTab("chat")} variant="outline" className="mt-4 h-9 bg-white text-[var(--accent)] xl:hidden">
                          Open chat
                        </Button>
                      </div>
                    ) : (
                      <div className="relative mt-4 space-y-3">
                        <div className="absolute bottom-8 left-[1.25rem] top-8 hidden w-px bg-[#d7d1c4] sm:block" />
                        <TooltipProvider>
                        {activeTrip.stops.map((stop, i) => (
                          <Card key={stop.id} className="relative gap-0 overflow-visible rounded-lg border bg-white py-0" style={{ borderColor: "var(--line)", boxShadow: "0 10px 28px rgba(17,19,21,0.04)" }}>
                            <CardContent className="grid gap-3 p-3 sm:grid-cols-[38px_minmax(0,1fr)_auto] sm:p-4">
                            <div
                              className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
                              style={{ background: i === 0 ? "var(--accent)" : "#2f3a34" }}
                            >
                              {i + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 pr-10 sm:pr-0">
                                <Link
                                  href={`/parks/${stop.parkCode}`}
                                  className="min-w-0 truncate text-base font-semibold transition hover:opacity-70"
                                  style={{ color: "var(--ink)" }}
                                >
                                  {stop.parkName}
                                </Link>
                                <Badge variant="outline" className="gap-1 rounded-md border-[#d9d2c3] bg-[#f7f1e7] px-2 py-1 text-xs font-semibold text-[#6e5b39]">
                                  Day
                                  <input
                                    aria-label={`Day for ${stop.parkName}`}
                                    type="number"
                                    min={1}
                                    value={stop.day}
                                    onChange={(e) => updateStop(stop.id, { day: Math.max(1, Number(e.target.value) || 1) })}
                                    className="h-4 w-8 border-none bg-transparent p-0 text-xs font-semibold outline-none"
                                    style={{ color: "var(--ink)" }}
                                  />
                                </Badge>
                              </div>
                              <Separator className="mt-3 bg-[var(--line)]/80" />
                              {editingStopId === stop.id || !stop.notes ? (
                                <Textarea
                                  autoFocus={editingStopId === stop.id}
                                  placeholder="Trail ideas, arrival time, campsite..."
                                  value={stop.notes}
                                  rows={3}
                                  onChange={(e) => updateStop(stop.id, { notes: e.target.value })}
                                  onBlur={() => setEditingStopId(null)}
                                  className="mt-3 min-h-24 w-full resize-none rounded-lg border-[#cfded7] bg-[#fbfbf8] px-3 py-2 text-sm leading-6 text-[var(--ink-soft)]"
                                />
                              ) : (
                                <div className="mt-3 cursor-text rounded-md px-1 py-1" onClick={() => setEditingStopId(stop.id)}>
                                  {(() => {
                                    const [activitiesPart, tip] = stop.notes.split(" — ");
                                    const activities = activitiesPart.split(" · ").map(s => s.trim()).filter(Boolean);
                                    const hasDots = stop.notes.includes(" · ");
                                    if (!hasDots) {
                                      return <p className="text-sm leading-6" style={{ color: "var(--ink-soft)" }}>{stop.notes}</p>;
                                    }
                                    return (
                                      <div className="space-y-3">
                                        <div className="space-y-0.5">
                                          {activities.map((act, ai) => (
                                            <div key={ai} className="grid gap-1 rounded-md py-1.5 sm:grid-cols-[6.25rem_14px_minmax(0,1fr)] sm:gap-2">
                                              {(() => {
                                                const timed = parseTimedActivity(act);
                                                return (
                                                  <>
                                                    {timed.time ? (
                                                      <span className="text-[11px] font-semibold uppercase leading-4 text-[#1f7668] sm:text-xs sm:normal-case sm:leading-5">
                                                        {timed.time}
                                                      </span>
                                                    ) : (
                                                      <span className="hidden sm:block" />
                                                    )}
                                                    <span className="relative hidden h-full justify-center sm:flex">
                                                      <span className="mt-2 h-2 w-2 rounded-full bg-[#1f7668]" />
                                                      {ai < activities.length - 1 && <span className="absolute bottom-[-10px] top-5 w-px bg-[#d9e3dd]" />}
                                                    </span>
                                                    <span className="text-sm leading-5" style={{ color: "var(--ink-soft)" }}>{timed.label}</span>
                                                  </>
                                                );
                                              })()}
                                            </div>
                                          ))}
                                        </div>
                                        {tip && (
                                          <div className="rounded-md border-l-2 border-[#1f7668] bg-[#f2f7f4] px-3 py-2">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1f7668]">Guide note</p>
                                            <p className="mt-1 text-xs leading-5 text-[#356b5a]">{tip}</p>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  onClick={() => removeStop(stop.id)}
                                  variant="ghost"
                                  size="icon-lg"
                                  className="absolute right-3 top-3 h-10 w-10 text-[var(--muted)] hover:bg-red-50 hover:text-red-700 sm:static"
                                  aria-label={`Remove ${stop.parkName}`}
                                >
                                  <Icon name="close" className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove stop</TooltipContent>
                            </Tooltip>
                            </CardContent>
                          </Card>
                        ))}
                        </TooltipProvider>
                      </div>
                    )}
                    </CardContent>
                  </Card>

                  {/* Route map — only shown when stops have coordinates */}
                  {(() => {
                    const mappedStops = activeTrip.stops
                      .filter((s): s is TripStop & { lat: number; lng: number } =>
                        typeof s.lat === "number" && typeof s.lng === "number"
                      );
                    const uniqueMappedStops = mappedStops.filter((stop, index, stops) => {
                      const key = stop.parkCode.startsWith("travel-day")
                        ? ""
                        : `${stop.parkCode || normalizeParkName(stop.parkName)}:${stop.lat.toFixed(4)},${stop.lng.toFixed(4)}`;
                      if (!key) return false;
                      return stops.findIndex((candidate) => {
                        const candidateKey = candidate.parkCode.startsWith("travel-day")
                          ? ""
                          : `${candidate.parkCode || normalizeParkName(candidate.parkName)}:${candidate.lat.toFixed(4)},${candidate.lng.toFixed(4)}`;
                        return candidateKey === key;
                      }) === index;
                    });
                    const mapped: StopCoord[] = uniqueMappedStops
                      .map((s, index) => ({ id: s.id, parkName: s.parkName, day: index + 1, notes: s.notes, lat: s.lat, lng: s.lng }));
                    if (mapped.length === 0) {
                      return (
                        <Card className={`${mobileTab === "map" ? "block" : "hidden"} border bg-white xl:hidden`} style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                          <CardHeader>
                            <CardTitle className="text-[var(--ink)]">Map appears after you add a park stop</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm leading-6" style={{ color: "var(--muted)" }}>
                              Add a park with location data from the Plan tab to see the route map here.
                            </p>
                          </CardContent>
                          <CardFooter className="bg-[var(--surface)]">
                            <Button type="button" onClick={() => setMobileTab("plan")} className="w-full bg-[var(--ink)] text-white hover:bg-[var(--ink)]/90">
                              Add first stop
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    }
                    return (
                      <section className={`${mobileTab === "map" ? "block" : "hidden"} overflow-hidden rounded-lg border bg-white xl:block`} style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--line)" }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15"/><path d="M15 6v15"/>
                          </svg>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>Route Map</p>
                          <span className="ml-auto text-xs font-medium" style={{ color: "var(--muted)" }}>{mapped.length} {mapped.length === 1 ? "park" : "parks"}</span>
                        </div>
                        <TripMap stops={mapped} />
                      </section>
                    );
                  })()}
                </section>

                <aside className={`${mobileTab === "notes" ? "block" : "hidden"} space-y-4 xl:sticky xl:top-[82px] xl:block xl:self-start`}>
                  <Card className="gap-0 overflow-hidden border bg-white py-0" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                    <CardHeader className="px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                            <Icon name="check" className="h-4 w-4" />
                            Packing
                          </p>
                          <CardTitle className="mt-1 text-lg text-[var(--ink)]">TrailQuest checklist</CardTitle>
                          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                            {packedCount} of {packingList.length} packed
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge variant="outline" className="rounded-md border-[var(--line)] bg-[var(--accent-soft)] text-[var(--accent)]">
                            {packingList.length} items
                          </Badge>
                          {suggestedPacking.length > 0 && (
                            <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>
                              {suggestedPacking.length} from chat
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all"
                          style={{ width: `${packingList.length ? Math.round((packedCount / packingList.length) * 100) : 0}%` }}
                        />
                      </div>
                    </CardHeader>
                    <Separator className="bg-[var(--line)]" />
                    <CardContent className="max-h-[340px] overflow-y-auto px-3 py-1">
                      <Accordion type="multiple" defaultValue={showChecklist ? groupPackingItems(packingList).map(([category]) => category) : []} onValueChange={(items) => setShowChecklist(items.length > 0)}>
                        {groupPackingItems(packingList).map(([category, items]) => (
                          <AccordionItem key={category} value={category} className="border-[var(--line)]">
                            <AccordionTrigger className="rounded-md px-1 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] hover:no-underline">
                              <span className="flex items-center gap-2">
                                {category}
                                <span className="text-[10px] font-medium tracking-normal text-[var(--muted)]">
                                  {items.length}
                                </span>
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="h-auto space-y-1 pb-2">
                              {items.map((item) => (
                                <label
                                  key={item}
                                  className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-stone-50 ${
                                    suggestedPacking.some((suggested) => suggested.toLowerCase() === item.toLowerCase())
                                      ? "bg-[var(--accent-soft)]/45"
                                      : ""
                                  }`}
                                >
                                  <Checkbox
                                    checked={packedItems.includes(item)}
                                    onCheckedChange={(checked) => togglePackedItem(item, checked === true)}
                                    className="mt-0.5 h-4 w-4 border-[var(--line)] data-checked:border-[var(--accent)] data-checked:bg-[var(--accent)]"
                                  />
                                  <span className="text-sm leading-5" style={{ color: "var(--ink-soft)" }}>
                                    {item}
                                  </span>
                                </label>
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>

                  <div className="rounded-lg border bg-white p-3.5" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                      <Icon name="note" className="h-4 w-4" />
                      Notes
                    </p>
                    <h3 className="mt-1 text-lg font-semibold" style={{ color: "var(--ink)" }}>
                      Trip notes
                    </h3>
                    <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
                      Private reminders only. Chat history stays in the assistant panel.
                    </p>
                    <Textarea
                      value={activeTrip.notes}
                      onChange={(e) => updateTrip({ ...activeTrip, notes: e.target.value })}
                      placeholder="Permits, reservations, lodging, route reminders..."
                      rows={4}
                      className="mt-3 min-h-28 w-full resize-none rounded-lg border-[var(--line)] bg-[#fbfbf8] px-3 py-2.5 text-sm leading-5 text-[var(--ink)] shadow-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/15"
                      style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                    />
                  </div>
                </aside>
              </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      <Dialog open={draftDialogOpen && Boolean(aiResult)} onOpenChange={setDraftDialogOpen}>
        {aiResult && (
          <DialogContent className="flex max-h-[92dvh] max-w-[calc(100vw-1rem)] grid-rows-none flex-col overflow-hidden rounded-xl bg-white p-0 sm:max-h-[85vh] sm:max-w-2xl" style={{ boxShadow: "0 32px 80px rgba(17,19,21,0.24)" }}>
            {/* Header */}
            <DialogHeader className="shrink-0 border-b px-4 py-4 pr-12 sm:px-6 sm:py-5 sm:pr-14" style={{ borderColor: "var(--line)" }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>AI Generated</p>
                </div>
                <DialogTitle className="text-xl font-semibold leading-tight sm:text-2xl" style={{ color: "var(--ink)" }}>Your Itinerary</DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-6 sm:text-base" style={{ color: "var(--muted)" }}>{aiResult.summary}</DialogDescription>
              </div>
            </DialogHeader>

            {/* Days */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-5 sm:px-6">
              {aiResult.days.map((day) => (
                <div key={day.day} className="rounded-lg border p-3 sm:p-4" style={{ borderColor: "var(--line)", background: "rgba(251,251,248,0.7)" }}>
                  <div className="mb-3 flex items-start gap-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                      style={{ background: day.day === 1 ? "var(--accent)" : "var(--ink)" }}
                    >
                      {day.day}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-5" style={{ color: "var(--ink)" }}>{day.label}</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>{day.parkName}</p>
                    </div>
                  </div>
                  <ul className="mb-3 space-y-0.5">
                    {day.activities.map((act, i) => (
                      <li key={i} className="grid gap-1 rounded-md py-1.5 text-sm sm:grid-cols-[6.25rem_14px_minmax(0,1fr)] sm:gap-2" style={{ color: "var(--ink-soft)" }}>
                        {(() => {
                          const timed = parseTimedActivity(act);
                          return (
                            <>
                              {timed.time ? (
                                <span className="text-[11px] font-semibold uppercase leading-4 text-[#1f7668] sm:text-xs sm:normal-case sm:leading-5">
                                  {timed.time}
                                </span>
                              ) : (
                                <span className="hidden sm:block" />
                              )}
                              <span className="relative hidden h-full justify-center sm:flex">
                                <span className="mt-2 h-2 w-2 rounded-full bg-[#1f7668]" />
                                {i < day.activities.length - 1 && <span className="absolute bottom-[-10px] top-5 w-px bg-[#d9e3dd]" />}
                              </span>
                              <span className="leading-5">{timed.label}</span>
                            </>
                          );
                        })()}
                      </li>
                    ))}
                  </ul>
                  {day.tip && (
                    <div className="rounded-md border-l-2 border-[#1f7668] bg-[#f2f7f4] px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1f7668]">Guide note</p>
                      <p className="mt-1 text-xs leading-5 text-[#356b5a]">{day.tip}</p>
                    </div>
                  )}
                </div>
              ))}

              {aiResult.packingAdditions?.length > 0 && (
                <div className="rounded-lg border p-3 sm:p-4" style={{ borderColor: "var(--line)" }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-2" style={{ color: "var(--muted)" }}>Also pack</p>
                  <div className="flex flex-wrap gap-2">
                    {aiResult.packingAdditions.map((item) => (
                      <span key={item} className="max-w-full rounded-md px-2.5 py-1 text-xs font-medium leading-5" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="mx-0 mb-0 flex-col-reverse gap-2 rounded-none border-t bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4" style={{ borderColor: "var(--line)", boxShadow: "0 -10px 24px rgba(17,19,21,0.06)" }}>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                <Button
                  type="button"
                  onClick={() => {
                    setAiResult(null);
                    setDraftDialogOpen(false);
                  }}
                  variant="ghost"
                  className="h-10 text-[var(--muted)]"
                >
                  Discard
                </Button>
                <Button
                  type="button"
                  onClick={reviseDraftInChat}
                  variant="outline"
                  className="h-10 bg-white text-[var(--accent)]"
                >
                  <Icon name="message" className="h-4 w-4" />
                  <span className="truncate">Ask for changes</span>
                </Button>
              </div>
              <Button
                type="button"
                onClick={applyItinerary}
                className="h-11 w-full bg-[var(--ink)] text-white shadow-[0_8px_24px_rgba(17,19,21,0.16)] hover:bg-[var(--ink)]/90 sm:w-auto"
              >
                <Icon name="check" className="h-4 w-4" />
                Apply to planner
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function TripDatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = parseInputDate(value) ?? undefined;

  return (
    <div>
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
        <Icon name="calendar" className="h-4 w-4" />
        {label}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="mt-2 h-10 w-full justify-between rounded-lg border-[#d8ddd8] bg-[#fbfbf8] px-3 text-left text-sm font-semibold text-[var(--ink)] hover:bg-[#f3f8f5]"
          >
            <span>{value ? formatDate(value) : "Select date"}</span>
            <Icon name="calendar" className="h-4 w-4 text-[var(--muted)]" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto rounded-lg border bg-white p-0" style={{ borderColor: "var(--line)" }}>
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) onChange(formatInputDate(date));
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "arrowUp":
      return (
        <svg {...common}>
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      );
    case "map":
      return (
        <svg {...common}>
          <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
          <path d="M9 3v15" />
          <path d="M15 6v15" />
        </svg>
      );
    case "message":
      return (
        <svg {...common}>
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </svg>
      );
    case "note":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h6" />
        </svg>
      );
    case "panel":
      return (
        <svg {...common}>
          <rect width="18" height="18" x="3" y="3" rx="4" />
          <path d="M9 3v18" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "print":
      return (
        <svg {...common}>
          <path d="M6 9V2h12v7" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <path d="M6 14h12v8H6z" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...common}>
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      );
    case "route":
      return (
        <svg {...common}>
          <circle cx="6" cy="19" r="3" />
          <circle cx="18" cy="5" r="3" />
          <path d="M12 19h3a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h3" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case "share":
      return (
        <svg {...common}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4" />
          <path d="m15.4 6.5-6.8 4" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      );
  }
}
