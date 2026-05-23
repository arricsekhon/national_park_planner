# National Parks Hiker Planner

A full-stack trip planning app for exploring U.S. National Park Service sites, comparing parks, building multi-stop routes, checking park conditions, and keeping a lightweight travel journal.

The project is split into:

- `frontend/` - Next.js app with park discovery, trip planning, auth, maps, comparison, profiles, and journal views.
- `backend/` - FastAPI service that proxies National Park Service and OpenWeather data with CORS and rate limiting.

## Features

- Search NPS sites by name, state, activity, and location.
- View park detail pages with photos, alerts, campgrounds, things to do, fees, operating hours, and weather.
- Compare parks side by side.
- Build trips with saved stops, notes, maps, packing support, and AI-generated day-by-day itinerary suggestions.
- Sign up and sign in with Supabase Auth, including Google OAuth.
- Keep a personal park collection and journal.
- Use Google Maps when a browser API key is configured, with Leaflet support for map views.

## Tech Stack

**Frontend**

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth
- Google Maps JavaScript API
- Anthropic SDK

**Backend**

- FastAPI
- Uvicorn
- HTTPX
- SlowAPI rate limiting
- National Park Service API
- OpenWeather API

## Project Structure

```text
.
├── backend/
│   ├── main.py
│   ├── limiter.py
│   ├── routers/
│   │   ├── parks.py
│   │   └── weather.py
│   ├── tests/
│   └── requirements.txt
├── docs/
│   └── supabase-schema.sql
└── frontend/
    ├── src/app/
    │   ├── (site)/
    │   ├── api/generate-itinerary/
    │   └── auth/
    ├── src/lib/
    └── package.json
```

## Prerequisites

- Node.js 20 or newer
- Python 3.11 or newer
- A National Park Service API key
- A Supabase project

Optional integrations:

- OpenWeather API key for weather widgets
- Google Maps browser key for Google map loading
- Anthropic API key for generated itinerary suggestions

## Environment Variables

Create `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Then fill in:

```bash
NPS_API_KEY=your_nps_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
ALLOWED_ORIGINS=http://localhost:3000
```

`NPS_API_KEY` is required for park data. `OPENWEATHER_API_KEY` is optional; weather responses will report unavailable when it is missing.

Create `frontend/.env.local`:

```bash
cp frontend/.env.example frontend/.env.local
```

Then fill in:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_browser_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

`NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:8000` if omitted. `ANTHROPIC_API_KEY` is only needed for the itinerary generation route.

## Supabase Setup

Run `docs/supabase-schema.sql` in the Supabase SQL editor after creating the project and enabling email/password authentication. To use Google sign-in, enable the Google provider in Supabase Auth and add your local and production site URLs to Supabase's allowed redirect URLs.

The schema creates:

- `favorites`
- `visit_status`
- `park_ratings`
- `journal_entries`
- `trips`
- `journal-photos` storage bucket

It also enables row level security so users can manage their own saved parks, trips, ratings, and journal entries. Public trip links are readable when `trips.is_public` is true.

## Local Development

Start the backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Start the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The backend API will be available at [http://localhost:8000](http://localhost:8000). FastAPI docs are available at [http://localhost:8000/docs](http://localhost:8000/docs) while the backend is running.

## Useful Scripts

From `frontend/`:

```bash
npm run dev      # Start the Next.js development server
npm run build    # Build the production frontend
npm run start    # Run the production frontend build
npm run lint     # Run ESLint
```

From `backend/`:

```bash
uvicorn main:app --reload --port 8000
python -m unittest discover -s tests
```

## Verification

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m unittest discover -s tests
```

## API Overview

The FastAPI backend exposes:

- `GET /` - API health/message response.
- `GET /parks` - Search parks with optional `q`, `stateCode`, `limit`, and `start` query parameters.
- `GET /parks/{park_code}` - Fetch one park by NPS park code.
- `GET /parks/{park_code}/alerts` - Fetch active park alerts.
- `GET /parks/{park_code}/campgrounds` - Fetch park campgrounds.
- `GET /parks/{park_code}/thingstodo` - Fetch suggested activities.
- `GET /weather?lat=...&lon=...` - Fetch weather for park coordinates.

The frontend also includes:

- `POST /api/generate-itinerary` - Generates a trip itinerary from selected stops using Anthropic.

## Deployment Notes

The two services can be deployed separately.

Backend:

- The included `backend/Procfile` runs `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- Set `NPS_API_KEY`, `OPENWEATHER_API_KEY`, and `ALLOWED_ORIGINS` in the backend host.
- Set `ALLOWED_ORIGINS` to the deployed frontend URL.

Frontend:

- Deploy `frontend/` as a Next.js app.
- Set `NEXT_PUBLIC_API_BASE_URL` to the deployed backend URL.
- Set Supabase, Google Maps, and Anthropic environment variables as needed.

## Troubleshooting

- **Park searches fail with `NPS_API_KEY not configured`:** add a valid `NPS_API_KEY` to `backend/.env` and restart the backend.
- **Frontend cannot reach the API:** confirm the backend is running on port `8000` and `NEXT_PUBLIC_API_BASE_URL` points to it.
- **Browser CORS errors:** add the frontend origin to `ALLOWED_ORIGINS` in `backend/.env`.
- **Weather is missing:** configure `OPENWEATHER_API_KEY`; the app is designed to continue without it.
- **Itinerary generation fails:** configure `ANTHROPIC_API_KEY` in `frontend/.env.local`.

## License

No license has been specified for this repository.
