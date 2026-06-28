# AI Lead Qualification System

An automated pipeline that reads inbound customer enquiries, scores them using an LLM against business-specific criteria, and instantly routes them — hot leads trigger real-time alerts and a booking link, cold leads enter a nurture sequence. Built to be **multi-tenant**: one workflow and one frontend can serve multiple businesses through configuration alone, with no rebuilding required per client.

## The problem

Most small businesses lose leads not because they can't deliver, but because no one follows up in time. A message comes in, sits in an inbox or spreadsheet, and by the time someone replies, the customer has already gone elsewhere. This system removes that delay by judging and acting on every lead the moment it arrives.

## How it works

```
Customer submits enquiry (web form)
        │
        ▼
  n8n Webhook trigger
        │
        ▼
  Clean & normalize lead data
        │
        ▼
  Look up business config (per client_id)
        │
        ▼
  Build dynamic AI prompt (business rules + lead data)
        │
        ▼
  LLM scores the lead (0–100) + gives reasoning
        │
        ▼
     Score ≥ threshold?
      /          \
   YES            NO
    │              │
    ▼              ▼
Hot path:       Cold path:
- Update CRM    - Update CRM
- Instant alert - Nurture email
  (Slack/        - Wait + re-check
   WhatsApp)
- Booking link
    │              │
    └──────┬───────┘
           ▼
     Log to dashboard
           │
           ▼
   Error handler (on failure)
```

## Features

- **Dynamic, config-driven scoring** — business rules (ideal customer profile, qualifying/disqualifying signals, hot-lead threshold) are stored as data, not hardcoded, so the same AI prompt template serves any client
- **Multi-tenant by design** — add a new client by adding one config entry, not by duplicating the workflow
- **Real-time routing** — hot leads get an instant Slack/WhatsApp alert and an auto-sent booking link; cold leads are queued into a nurture sequence instead of being dropped
- **Live dashboard** — a React frontend shows every lead, its score, and status, with search and filtering
- **Resilient by design** — a dedicated error-handling workflow catches failures (bad API responses, expired credentials, malformed AI output) and alerts the operator instead of silently losing a lead

## Tech stack

| Layer | Tool |
|---|---|
| Workflow orchestration | [n8n](https://n8n.io) (self-hosted) |
| AI scoring | LLM via Groq API (Llama 3.3) |
| Data storage | Google Sheets (client configs + leads log) |
| Alerts | Slack / WhatsApp (Twilio) |
| Frontend | React, lucide-react icons |
| Deployment | Vercel |
| Local tunneling (dev) | ngrok |

## Project structure

```
├── src/
│   ├── App.jsx          # Intake form + live dashboard (React)
│   └── index.js         # React entry point
├── public/
│   └── index.html
├── test-webhook.js       # Standalone Node script for testing the webhook directly
├── package.json
└── README.md
```

## How the AI scoring works

Each client has a config (stored in Google Sheets) shaped like:

```json
{
  "business_name": "Skyline Realty",
  "industry": "Real estate",
  "ideal_customer": "First-time buyers with budget above 15M PKR",
  "qualifying_signals": "mentions budget, mentions timeline, asks about specific property",
  "disqualifying_signals": "just browsing, no budget mentioned, spam",
  "hot_threshold": 70,
  "tone": "professional but warm"
}
```

This config is merged with the incoming lead's message into a single prompt template inside an n8n Code node, then sent to the LLM, which returns:

```json
{
  "score": 90,
  "reason": "Mentioned a budget above 15M, gave a timeline, and asked about a specific property.",
  "recommended_action": "book_call"
}
```

An IF node compares `score` against that client's `hot_threshold` to decide which path the lead takes — no part of this logic is hardcoded to one client.

## Running the frontend locally

```bash
npm install
npm start
```

Runs at `http://localhost:3000`.

### Environment variables

Create a `.env` file in the project root:

```
REACT_APP_GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key
```

Required for the dashboard to read live data from Google Sheets. Without it, the dashboard falls back to sample data automatically.

## Configuring a new client

Open `src/App.jsx` and add an entry to the `CLIENTS` object:

```javascript
your_client_id: {
  business_name: "Their Business Name",
  headline: "Your custom form headline.",
  subtext: "Your custom form subtext.",
  message_label: "What do you need help with?",
  message_placeholder: "Example enquiry text",
  accent: "#HEXCOLOR",
  hot_threshold: 70,
  webhook_url: "your-n8n-webhook-url",
  sheet_id: "their-google-sheet-id",
}
```

Then add a matching row to the `client_configs` Google Sheet with the same `client_id`, containing that business's qualifying/disqualifying signals and tone.

Visit the form with `?client=your_client_id` in the URL, or add a button to the client switcher in the UI.

## Testing the webhook directly

Rather than testing through the UI every time, use the included script:

```bash
node test-webhook.js hot     # sends a lead that should score high
node test-webhook.js cold    # sends a lead that should score low
node test-webhook.js custom  # edit CUSTOM_LEAD in the file to try your own message
```

Update `WEBHOOK_URL` inside the script to match your n8n instance.

## Deployment notes

- The frontend deploys cleanly to Vercel (`npm run build` is the standard build command)
- The n8n backend needs to be publicly reachable for a deployed frontend to use it — options are n8n Cloud, a self-hosted instance on a public server, or ngrok for temporary demos
- If using ngrok, requests from a browser need the `ngrok-skip-browser-warning: true` header to bypass the interstitial page (already included in `test-webhook.js` and the form's fetch call)

## What this taught me

Most of the real work here wasn't the happy path — it was diagnosing failures that don't announce themselves clearly:
- Async webhook responses (`Respond Immediately` mode) can mask downstream node failures, since the client already got a 200 before the rest of the workflow finishes
- Google Sheets nodes cache column mappings at setup time; if sheet headers change afterward, writes fail silently until the node is refreshed or rebuilt
- Deployment environments (Vercel) can fail in ways that never show up locally — file permissions on committed `node_modules`, and CI treating lint warnings as hard errors
- Local-only services (`localhost`) are invisible to the outside world by definition; a publicly deployed frontend needs its backend to be public too

## License

This project is for portfolio and educational purposes.
