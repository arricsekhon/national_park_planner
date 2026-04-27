import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an expert national park trip planner. Given a list of parks, travel dates, and trip length, generate a practical day-by-day itinerary.

Rules:
- Assign parks to specific days based on trip length
- Each day has 2–4 specific activities (real trail names, viewpoints, visitor centers)
- Include a short practical tip per day (permits, parking, timing)
- Keep activity names concise (under 8 words each)
- Return ONLY valid JSON, no markdown, no prose outside JSON

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

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const { tripName, startDate, endDate, tripDays, stops } = await req.json() as {
      tripName: string;
      startDate: string;
      endDate: string;
      tripDays: number;
      stops: { parkName: string; parkCode: string; day: number }[];
    };

    if (!stops?.length) {
      return NextResponse.json({ error: "Add at least one park stop first." }, { status: 400 });
    }

    const parkList = stops.map((s) => s.parkName).join(", ");
    const userMessage = `Plan a ${tripDays || stops.length}-day trip called "${tripName || "My Trip"}".
Parks to visit: ${parkList}.
${startDate ? `Travel dates: ${startDate} to ${endDate || "TBD"}.` : ""}
Spread the parks across the available days. If there are more days than parks, give popular parks extra days.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    let itinerary;
    try {
      itinerary = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Invalid JSON from model");
      itinerary = JSON.parse(match[0]);
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
