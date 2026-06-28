/**
 * test-webhook.js
 *
 * Standalone script to send test leads straight to your n8n webhook,
 * without going through the React app, ngrok, or PowerShell quoting issues.
 *
 * USAGE:
 *   node test-webhook.js hot      -> sends a lead that should score high
 *   node test-webhook.js cold     -> sends a lead that should score low
 *   node test-webhook.js custom   -> sends the CUSTOM_LEAD object below
 *
 * Requires Node.js 18+ (has fetch built in). If you're on an older version,
 * run: npm install node-fetch  and uncomment the import line below.
 */

// Uncomment this line if using Node < 18:
// import fetch from "node-fetch";

// ====== CONFIG — edit these for your setup ======
const WEBHOOK_URL = "http://localhost:5678/webhook/57ae595d-d7a4-47a9-8e2d-430c4f5f3f20";
// If testing through ngrok instead, swap to your current ngrok URL, e.g.:
// const WEBHOOK_URL = "https://your-current-ngrok-url.ngrok-free.dev/webhook/57ae595d-d7a4-47a9-8e2d-430c4f5f3f20";

const CLIENT_ID = "skyline_realty";

// ====== SAMPLE LEADS ======
const HOT_LEAD = {
  name: "Ahmed Khan",
  email: "ahmed.test@example.com",
  phone: "03001234567",
  message:
    "Looking for a 3 bed apartment in DHA, budget around 20M, want to move in next month",
  source: "Website form",
  client_id: CLIENT_ID,
};

const COLD_LEAD = {
  name: "Safeer Malik",
  email: "sara.test@example.com",
  phone: "03019876543",
  message: "just curious what kind of properties you have, no rush",
  source: "Website form",
  client_id: CLIENT_ID,
};

// Edit this freely to try your own test messages
const CUSTOM_LEAD = {
  name: "Test Person",
  email: "test.person@example.com",
  phone: "03001112222",
  message: "Write any test message here to see how it scores.",
  source: "Website form",
  client_id: CLIENT_ID,
};

// ====== SCRIPT LOGIC — no need to edit below this line ======

const mode = process.argv[2] || "hot";

const leads = {
  hot: HOT_LEAD,
  cold: COLD_LEAD,
  custom: CUSTOM_LEAD,
};

const payload = leads[mode];

if (!payload) {
  console.error(`Unknown mode "${mode}". Use one of: hot, cold, custom`);
  process.exit(1);
}

console.log(`\nSending "${mode}" lead to:\n  ${WEBHOOK_URL}\n`);
console.log("Payload:", JSON.stringify(payload, null, 2));

async function run() {
  const started = Date.now();

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Needed if WEBHOOK_URL points at an ngrok tunnel, harmless otherwise:
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(payload),
    });

    const elapsed = Date.now() - started;
    const text = await res.text();

    console.log(`\nStatus: ${res.status} ${res.statusText}  (${elapsed}ms)`);
    console.log("Response body:", text);

    if (res.ok) {
      console.log(
        "\n✅ Request succeeded. Now check n8n's Executions tab and your Google Sheet."
      );
    } else {
      console.log("\n⚠️ Request did not return a success status. See body above.");
    }
  } catch (err) {
    console.error("\n❌ Request failed entirely (network/connection error):");
    console.error(err.message);
    console.error(
      "\nCheck that n8n is running, the workflow is Active, and the URL above is correct."
    );
  }
}

run();