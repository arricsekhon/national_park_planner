import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an expert national park trip planner. Given a list of parks, travel dates, and trip length, generate a practical day-by-day itinerary.

Rules:
- Assign parks to specific days based on trip length
- Use ONLY the parks provided by the user as park destinations
- Do not add unrelated national parks, historic sites, monuments, or waypoint stops
- For travel-only days, set parkName to "Travel Day"
- Each day has 2–4 specific activities (real trail names, viewpoints, visitor centers)
- Every activity must start with a practical time window, for example "6:00-7:30 AM - Depart San Francisco" or "9:00-11:00 AM - Navajo Loop Trail"
- Use the user's preferred departure time for driving days when provided
- Match activities to the user's requested trip focus, such as hikes only, scenic spots only, both, family-friendly, or photography
- Include a short practical tip per day (permits, parking, timing)
- Keep each timed activity concise
- Return ONLY valid JSON, no markdown, no prose outside JSON
- Every object key and string value must be wrapped in double quotes
- Do not include trailing commas or JavaScript-style unquoted values

Return this exact shape:
{
  "summary": "one sentence trip overview",
  "days": [
    {
      "day": 1,
      "label": "short day theme",
      "parkName": "name of park for this day",
      "activities": ["activity 1", "activity 2", "activity 3"],
      "tip": "one practical tip for this day"
    }
  ],
  "packingAdditions": ["item 1", "item 2"]
}`;

function extractJsonObject(raw: string): string {
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Invalid JSON from model");
    return match[0];
  }
}

async function repairItineraryJson(client: Anthropic, raw: string): Promise<unknown> {
  const repair = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: "Repair invalid JSON. Return ONLY valid JSON. Do not add markdown or commentary.",
    messages: [
      {
        role: "user",
        content: `Fix this itinerary JSON so it is valid JSON and preserves the same data. Every string must be quoted.\n\n${raw}`,
      },
    ],
  });
  const repaired = repair.content[0].type === "text" ? repair.content[0].text : "";
  return JSON.parse(extractJsonObject(repaired));
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const { tripName, startDate, endDate, tripDays, stops, planningContext } = await req.json() as {
      tripName: string;
      startDate: string;
      endDate: string;
      tripDays: number;
      stops: { parkName: string; parkCode: string; day: number }[];
      planningContext?: string;
    };

    if (!stops?.length) {
      return NextResponse.json({ error: "Add at least one park stop first." }, { status: 400 });
    }

    const parkList = stops.map((s) => s.parkName).join(", ");
    const userMessage = `Plan a ${tripDays || stops.length}-day trip called "${tripName || "My Trip"}".
Parks to visit: ${parkList}.
${startDate ? `Travel dates: ${startDate} to ${endDate || "TBD"}.` : ""}
${planningContext ? `Trip planning context and revision notes:\n${planningContext}\nUse this context for seasonal weather assumptions, road access, driving pace, lodging fit, traveler needs, safety notes, packing additions, and requested changes to any current draft.` : ""}
Spread the parks across the available days. If there are more days than parks, give popular parks extra days.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    let itinerary;
    try {
      itinerary = JSON.parse(extractJsonObject(raw));
    } catch {
      itinerary = await repairItineraryJson(client, raw);
    }

    return NextResponse.json(itinerary);
  } catch (err) {
    console.error("[generate-itinerary]", err);
    return NextResponse.json(
      { error: "Failed to generate itinerary. Check your API key." },
      { status: 500 }
    );
  }
}
