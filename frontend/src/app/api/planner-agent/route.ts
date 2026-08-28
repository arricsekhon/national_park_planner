import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are TrailQuest's trip planning agent.

Decide whether the user gave enough information to draft a national park trip.
You do not write the final itinerary. You only normalize the user's request and decide the next action.

Important:
- If the user only gives a park name, ask for dates or season, trip length, and starting place.
- If the user is driving or says "by car", also ask what time they want to leave on the first driving day.
- Ask what trip focus they want before drafting: hikes only, scenic spots only, both hikes and scenic spots, family-friendly, photography, or another focus.
- If the user gives destination, date range or trip length, starting place, required car departure time when driving, and trip focus, mark it ready_to_draft.
- Traveler type, difficulty, lodging, must-see trails, and concerns are useful but optional after the required fields above.
- For "from SF to Zion from Sep 10 to Sep 15", startLocation is "San Francisco", destination is "Zion National Park", and dates are Sep 10 to Sep 15.
- For "make plan for Zion from SF from 5 Sep to 10 Sep", startLocation is "San Francisco", destination is "Zion National Park", and dates are Sep 5 to Sep 10.
- Infer common abbreviations like SF = San Francisco, LA = Los Angeles, NYC = New York City.
- Never invent additional destinations or intermediate stops.
- normalizedTrip.destination must be the user's requested destination only.
- Do not replace the requested destination with an unrelated park, historic site, monument, or nearby attraction.
- Keep message to 1-2 short plain-text sentences.
- Do not use markdown, bold text, numbered lists, bullets, or numbered questions.
- If asking follow-up questions, ask conversationally in one sentence.
- Return ONLY valid JSON.

Return this shape:
{
  "status": "needs_info" | "ready_to_draft",
  "message": "concise assistant response",
  "missingFields": ["field"],
  "normalizedTrip": {
    "destination": "park or place",
    "startLocation": "city or place",
    "dateText": "human date range or season",
    "startDate": "YYYY-MM-DD if known",
    "endDate": "YYYY-MM-DD if known",
    "days": 1,
    "travelers": "family/solo/couple/etc if known",
    "difficulty": "easy/moderate/hard/etc if known",
    "lodging": "hotel/camping/RV/etc if known",
    "concerns": "weather, roads, permits, etc if known",
    "travelMode": "car or flight if known",
    "departureTime": "preferred departure time if known",
    "focus": "hikes only/scenic spots only/both/family-friendly/photography/etc if known"
  }
}`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const body = await req.json() as {
      message: string;
      currentTrip?: {
        name?: string;
        startDate?: string;
        endDate?: string;
        stops?: { parkName: string; parkCode: string; day: number }[];
        notes?: string;
      };
      currentIntent?: Record<string, unknown>;
    };

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            userMessage: body.message,
            currentTrip: body.currentTrip ?? null,
            currentIntent: body.currentIntent ?? null,
          }),
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    try {
      return NextResponse.json(JSON.parse(raw));
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Invalid JSON from planner agent");
      return NextResponse.json(JSON.parse(match[0]));
    }
  } catch (err) {
    console.error("[planner-agent]", err);
    return NextResponse.json({ error: "Planner agent failed." }, { status: 500 });
  }
}
