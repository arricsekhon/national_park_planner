import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const SONNET_ITINERARY_MODEL = "claude-sonnet-5";
const HAIKU_ITINERARY_MODEL = "claude-haiku-4-5-20251001";
const JSON_REPAIR_MODEL = "claude-haiku-4-5-20251001";
const SONNET_TIMEOUT_MS = 12_000;

const SYSTEM_PROMPT = `You are TrailQuest's senior national park itinerary planner. Given parks, travel dates, trip length, and planning context collected by a separate follow-up agent, generate a practical day-by-day itinerary that feels specific, useful, and safe.

Rules:
- Generate exactly the requested number of days
- Assign parks to specific days based on trip length, route order, driving time, and user focus
- Use ONLY the parks provided by the user as park destinations
- Do not add unrelated national parks, historic sites, monuments, or waypoint stops
- For travel-only days, set parkName to "Travel Day"
- Each day has 3–5 specific activities, unless it is a long driving day
- Activities should include real trail names, viewpoints, visitor centers, scenic drives, meals/rest breaks, check-in/check-out, and return drive segments when relevant
- Every activity must start with a practical time window, for example "6:00-7:30 AM - Depart San Francisco" or "9:00-11:00 AM - Navajo Loop Trail"
- Use the user's preferred departure time for driving days when provided
- Include realistic pacing, buffers, early starts for heat/parking, and lower-effort alternatives when the user mentions family, kids, seniors, easy pace, weather, or road concerns
- Match activities to the user's requested trip focus, such as hikes only, scenic spots only, both, family-friendly, or photography
- Tips must be concrete and contextual: permits/reservations, shuttle rules, seasonal road access, heat/cold, elevation, daylight, parking, water, footwear, and safety
- Packing additions must be specific to the selected parks, dates/season, travel mode, and planned activities
- Avoid generic filler such as "enjoy the scenery" or "bring comfortable shoes" unless made specific
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
    model: JSON_REPAIR_MODEL,
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

function getErrorDetails(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      status: "status" in err ? (err as { status?: unknown }).status : undefined,
      type: "type" in err ? (err as { type?: unknown }).type : undefined,
    };
  }

  return {
    name: "UnknownError",
    message: String(err),
  };
}

function logItineraryError(category: string, err: unknown, context?: Record<string, unknown>) {
  console.error("[generate-itinerary]", {
    category,
    ...context,
    error: getErrorDetails(err),
  });
}

async function createItineraryMessage(client: Anthropic, userMessage: string) {
  const createMessage = (model: string, timeoutMs?: number) => {
    const controller = new AbortController();
    const timeout = timeoutMs
      ? setTimeout(() => controller.abort(new Error(`${model} timed out after ${timeoutMs}ms`)), timeoutMs)
      : null;

    return client.messages.create(
      {
        model,
        max_tokens: model.includes("sonnet") ? 4096 : 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      },
      { signal: controller.signal },
    ).finally(() => {
      if (timeout) clearTimeout(timeout);
    });
  };

  try {
    return await createMessage(SONNET_ITINERARY_MODEL, SONNET_TIMEOUT_MS);
  } catch (err) {
    logItineraryError("sonnet_failed_using_haiku_fallback", err, {
      model: SONNET_ITINERARY_MODEL,
      timeoutMs: SONNET_TIMEOUT_MS,
    });
  }

  try {
    return await createMessage(HAIKU_ITINERARY_MODEL);
  } catch (err) {
    logItineraryError("haiku_fallback_failed", err, { model: HAIKU_ITINERARY_MODEL });
    throw err;
  }
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

    const message = await createItineraryMessage(client, userMessage);

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    let itinerary;
    try {
      itinerary = JSON.parse(extractJsonObject(raw));
    } catch (jsonErr) {
      logItineraryError("invalid_model_json_trying_repair", jsonErr, {
        rawPreview: raw.slice(0, 300),
      });

      try {
        itinerary = await repairItineraryJson(client, raw);
      } catch (repairErr) {
        logItineraryError("json_repair_failed", repairErr, {
          rawPreview: raw.slice(0, 300),
        });
        throw repairErr;
      }
    }

    return NextResponse.json(itinerary);
  } catch (err) {
    logItineraryError("request_failed", err);
    return NextResponse.json(
      { error: "Could not generate the itinerary right now. Try again in a minute, or revise the trip details and draft again." },
      { status: 500 }
    );
  }
}
