import React, { useState, useEffect, useMemo } from "react";
import { Search, Flame, Clock, CheckCircle2, AlertCircle, Send, LayoutDashboard, UserPlus } from "lucide-react";

// ============================================================
// CLIENT CONFIG — add a business here, then load the app with
// ?client=their_id in the URL, or pick it from the switcher below.
// This is the same shape as the client_configs sheet in the n8n workflow.
// ============================================================
const CLIENTS = {
  skyline_realty: {
    business_name: "Skyline Realty",
    tagline: "Real estate",
    headline: "Tell us what you're looking for.",
    subtext:
      "Share a few details and a property specialist will reach out — usually within the hour during business hours.",
    message_label: "What are you looking for?",
    message_placeholder:
      "e.g. 3 bed apartment in DHA, budget around 20M, looking to move within a month",
    accent: "#B8674D",
    hot_threshold: 70,
    webhook_url: "https://dividers-engraved-hypnosis.ngrok-free.dev/webhook/57ae595d-d7a4-47a9-8e2d-430c4f5f3f20",
    sheet_id: "1AT1PrdPCd74Kku_BBXwW5k3BYDDXnUsKEQBOx6QiS_M",
    sample: [
      { name: "Ahmed Khan", email: "ahmed@example.com", phone: "0300 1234567", score: 90, status: "hot", reason: "Mentioned budget above 15M, clear timeline, asked about a specific property.", time: "2 min ago" },
      { name: "Bilal Ahmed", email: "bilal.a@example.com", phone: "0333 4455667", score: 78, status: "hot", reason: "Asked about a specific listing and mentioned moving within 6 weeks.", time: "1 hr ago" },
      { name: "Sara Malik", email: "sara.malik@example.com", phone: "0301 9876543", score: 42, status: "nurture", reason: "Browsing only — no budget or timeline mentioned yet.", time: "3 hrs ago" },
      { name: "Hina Raza", email: "hina.raza@example.com", phone: "0345 1122334", score: 35, status: "nurture", reason: "General inquiry, no specific budget or property mentioned.", time: "Yesterday" },
      { name: "Omar Sheikh", email: "omar.s@example.com", phone: "0321 7788990", score: 81, status: "hot", reason: "Pre-approved for mortgage and asking about move-in dates.", time: "Yesterday" },
    ],
  },
  bright_smile_dental: {
    business_name: "Bright Smile Dental",
    tagline: "Dental clinic",
    headline: "Tell us what's going on.",
    subtext:
      "Share a few details and our front desk will reach out to find you an appointment that works.",
    message_label: "What do you need help with?",
    message_placeholder:
      "e.g. tooth pain on lower left side for 2 days, looking for the earliest appointment",
    accent: "#5B7C99",
    hot_threshold: 60,
    webhook_url: "https://dividers-engraved-hypnosis.ngrok-free.dev/webhook/57ae595d-d7a4-47a9-8e2d-430c4f5f3f20",
    sheet_id: "YOUR_DENTAL_SHEET_ID",
    sample: [
      { name: "Fatima Noor", email: "fatima.n@example.com", phone: "0312 5566778", score: 85, status: "hot", reason: "Mentioned tooth pain and asked for earliest available appointment.", time: "12 min ago" },
      { name: "Usman Tariq", email: "usman.t@example.com", phone: "0322 3344556", score: 30, status: "nurture", reason: "Asked about pricing only, no urgency mentioned.", time: "Yesterday" },
    ],
  },
};

const DEFAULT_CLIENT = "skyline_realty";

// Get this from console.cloud.google.com -> APIs & Services -> Credentials.
// Also enable the "Google Sheets API" for your project, and share each
// client's sheet as "Anyone with the link: Viewer".
const GOOGLE_SHEETS_API_KEY = "AIzaSyDfi3nrIhTWQT7-o8xR0tJZ4WELDvNHkKw";

function useClientFromUrl() {
  const [clientId, setClientId] = useState(DEFAULT_CLIENT);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("client");
    if (c && CLIENTS[c]) setClientId(c);
  }, []);
  return [clientId, setClientId];
}

function ScoreDial({ value, color, size = 56 }) {
  const [display, setDisplay] = useState(0);
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    let frame;
    let start = null;
    const duration = 700;
    const animate = (t) => {
      if (!start) start = t;
      const progress = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const offset = circumference - (display / 100) * circumference;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(28,43,51,0.08)" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke 0.3s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600,
          fontSize: size * 0.3,
          color: "#2A2A28",
        }}
      >
        {display}
      </div>
    </div>
  );
}

function IntakeView({ config, clientId }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [phase, setPhase] = useState("idle"); // idle | scoring | done
  const [result, setResult] = useState(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.message) return;
    setPhase("scoring");

    // Real submission to your n8n webhook. The workflow scores the lead
    // and acts on it (CRM, WhatsApp/Slack alert, etc) in the background —
    // this request just confirms the lead was received.
    fetch(config.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: form.message,
        source: "Website form",
        client_id: clientId,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Request failed");
        setResult({ status: "submitted" });
        setPhase("done");
      })
      .catch(() => {
        setPhase("idle");
        setResult({ status: "error" });
      });
  };

  const reset = () => {
    setForm({ name: "", email: "", phone: "", message: "" });
    setPhase("idle");
    setResult(null);
  };

  return (
    <div className="card">
      <div className="accent-bar" style={{ background: `linear-gradient(90deg, ${config.accent}, #1C2B33 140%)` }} />
      <p className="eyebrow" style={{ color: config.accent }}>{config.business_name}</p>

      {phase !== "done" && (
        <>
          <h1>{config.headline}</h1>
          <p className="sub">{config.subtext}</p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Full name</label>
              <input value={form.name} onChange={update("name")} placeholder="e.g. Ahmed Khan" disabled={phase === "scoring"} />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" disabled={phase === "scoring"} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={update("phone")} placeholder="03XX XXXXXXX" disabled={phase === "scoring"} />
            </div>
            <div className="field">
              <label>{config.message_label}</label>
              <textarea value={form.message} onChange={update("message")} placeholder={config.message_placeholder} disabled={phase === "scoring"} />
            </div>

            <button type="submit" disabled={phase === "scoring"} style={{ background: phase === "scoring" ? "#7A8B7A" : "#1C2B33" }}>
              {phase === "scoring" ? (
                <span className="btn-loading"><Send size={15} className="pulse-icon" /> Sending…</span>
              ) : (
                "Send enquiry"
              )}
            </button>
          </form>

          {phase === "scoring" && (
            <div className="scoring-trace">
              <TraceLine delay={0} text="Sending to your business" />
              <TraceLine delay={500} text="Scoring enquiry" />
              <TraceLine delay={950} text="Notifying team via WhatsApp" />
            </div>
          )}
        </>
      )}

      {phase === "done" && result && (
        <div className="result-pane">
          {result.status === "error" ? (
            <>
              <AlertCircle size={36} color="#B8674D" />
              <h2>Something went wrong.</h2>
              <p className="sub" style={{ marginBottom: 24 }}>
                Your enquiry didn't go through. Please try again in a moment.
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 size={36} color="#7A8B7A" />
              <h2>Thanks, {form.name.split(" ")[0]}.</h2>
              <p className="sub" style={{ marginBottom: 24 }}>
                We've got your enquiry and someone will be in touch shortly.
              </p>
            </>
          )}
          <button className="ghost-btn" onClick={reset}>Send another enquiry</button>
        </div>
      )}

      <p className="footnote">{config.business_name} · this is a live demo of the intake step</p>

      <style>{`
        .card { width: 100%; max-width: 460px; background: #fff; border-radius: 16px; border: 1px solid rgba(28,43,51,0.1); box-shadow: 0 1px 2px rgba(28,43,51,0.04), 0 18px 40px -24px rgba(28,43,51,0.25); padding: 40px 36px 32px; position: relative; overflow: hidden; }
        .accent-bar { position: absolute; top: 0; left: 0; width: 100%; height: 4px; }
        .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 14px; font-weight: 600; }
        h1 { font-family: 'Fraunces', serif; font-weight: 600; font-size: 27px; line-height: 1.2; letter-spacing: -0.01em; color: #1C2B33; margin: 0 0 10px; }
        h2 { font-family: 'Fraunces', serif; font-weight: 600; font-size: 22px; color: #1C2B33; margin: 14px 0 6px; }
        .sub { font-size: 14px; line-height: 1.55; color: rgba(42,42,40,0.62); margin: 0 0 28px; }
        form { display: flex; flex-direction: column; gap: 16px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        label { font-size: 12px; font-weight: 600; color: #1C2B33; }
        input, textarea { font-family: 'Inter', sans-serif; font-size: 14.5px; padding: 11px 13px; border-radius: 9px; border: 1.5px solid rgba(28,43,51,0.12); background: #F6F3EC; color: #2A2A28; outline: none; transition: border-color 0.15s, background 0.15s; resize: none; width: 100%; box-sizing: border-box; }
        input:focus, textarea:focus { border-color: ${config.accent}; background: #fff; }
        textarea { min-height: 84px; line-height: 1.5; }
        button { margin-top: 6px; font-family: 'Inter', sans-serif; font-size: 14.5px; font-weight: 600; color: #fff; border: none; border-radius: 9px; padding: 13px 18px; cursor: pointer; transition: background 0.15s, transform 0.1s; }
        button:active:not(:disabled) { transform: scale(0.99); }
        button:disabled { cursor: default; }
        .btn-loading { display: inline-flex; align-items: center; gap: 8px; justify-content: center; width: 100%; }
        .pulse-icon { animation: pulse 1.1s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        .scoring-trace { margin-top: 18px; display: flex; flex-direction: column; gap: 8px; }
        .footnote { margin-top: 24px; font-size: 11px; color: rgba(42,42,40,0.4); text-align: center; }
        .result-pane { text-align: center; padding: 20px 0 4px; }
        .ghost-btn { background: transparent; color: #1C2B33; border: 1.5px solid rgba(28,43,51,0.15); width: 100%; }
        .ghost-btn:hover { background: #F6F3EC; }
      `}</style>
    </div>
  );
}

function TraceLine({ delay, text }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "rgba(42,42,40,0.55)", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(4px)", transition: "opacity 0.3s, transform 0.3s" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#7A8B7A", flexShrink: 0 }} />
      {text}
    </div>
  );
}

function DashboardView({ config }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("score");
  const [liveRows, setLiveRows] = useState(null);
  const [usingLiveData, setUsingLiveData] = useState(false);

  useEffect(() => {
    const sheetReady =
      config.sheet_id &&
      !config.sheet_id.startsWith("YOUR_") &&
      GOOGLE_SHEETS_API_KEY &&
      !GOOGLE_SHEETS_API_KEY.startsWith("YOUR_");

    if (!sheetReady) {
      setLiveRows(null);
      setUsingLiveData(false);
      return;
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheet_id}/values/leads!A2:G200?key=${GOOGLE_SHEETS_API_KEY}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Sheets request failed");
        return res.json();
      })
      .then((data) => {
        const rows = (data.values || []).map(
          ([name, email, phone, score, status, time, reason]) => ({
            name,
            email,
            phone,
            score: Number(score),
            status,
            time,
            reason,
          })
        );
        setLiveRows(rows);
        setUsingLiveData(true);
      })
      .catch(() => {
        setLiveRows(null);
        setUsingLiveData(false);
      });
  }, [config]);

  const sourceRows = liveRows || config.sample;

  const rows = useMemo(() => {
    let r = [...sourceRows];
    if (filter !== "all") r = r.filter((x) => x.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((x) => x.name.toLowerCase().includes(q) || x.email.toLowerCase().includes(q));
    }
    r.sort((a, b) => (sortBy === "score" ? b.score - a.score : 0));
    return r;
  }, [sourceRows, filter, query, sortBy]);

  const hotCount = sourceRows.filter((x) => x.status === "hot").length;
  const nurtureCount = sourceRows.filter((x) => x.status === "nurture").length;

  return (
    <div className="dash">
      <header>
        <div>
          <p className="eyebrow" style={{ color: config.accent }}>{config.business_name}</p>
          <h1>Lead pipeline</h1>
        </div>
        <div className="stats">
          <Stat label="Hot leads" value={hotCount} color="#9C5640" />
          <Stat label="Nurturing" value={nurtureCount} color="#56685A" />
          <Stat label="Total" value={config.sample.length} color="#1C2B33" />
        </div>
      </header>

      <div className="controls">
        <div className="search">
          <Search size={15} color="rgba(42,42,40,0.4)" />
          <input placeholder="Search leads…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="filters">
          {["all", "hot", "nurture"].map((f) => (
            <button key={f} className={filter === f ? "filter-pill active" : "filter-pill"} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "hot" ? "Hot" : "Nurturing"}
            </button>
          ))}
        </div>
      </div>

      <div className="table-card">
        {rows.length === 0 ? (
          <div className="empty">
            <strong>No leads match this view</strong>
            Try a different filter or search term.
          </div>
        ) : (
          rows.map((lead, i) => (
            <div className={`row row-${lead.status}`} key={lead.email} style={{ animationDelay: `${i * 40}ms` }}>
              <ScoreDial value={lead.score} color={lead.status === "hot" ? "#B8674D" : "#7A8B7A"} size={48} />
              <div className="lead-info">
                <div className="lead-name">{lead.name}</div>
                <div className="lead-email">{lead.email}</div>
              </div>
              <div className="reason">{lead.reason}</div>
              <div className="badge-col">
                <span className={`badge ${lead.status}`}>
                  {lead.status === "hot" ? <Flame size={12} /> : <Clock size={12} />}
                  {lead.status === "hot" ? "Hot lead" : "Nurturing"}
                </span>
                <span className="time">{lead.time}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="hint-note">
        {usingLiveData
          ? `Showing live data from your Google Sheet for ${config.business_name}.`
          : <>Showing sample data. Add a <code>sheet_id</code> per client and a Sheets API key at the top of this file to go live.</>}
      </p>

      <style>{`
        .dash { width: 100%; max-width: 880px; }
        header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 18px; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid rgba(28,43,51,0.1); }
        .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 8px; font-weight: 600; }
        h1 { font-family: 'Fraunces', serif; font-weight: 600; font-size: 26px; color: #1C2B33; margin: 0; }
        .stats { display: flex; gap: 24px; }
        .controls { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .search { display: flex; align-items: center; gap: 8px; background: #fff; border: 1.5px solid rgba(28,43,51,0.12); border-radius: 9px; padding: 9px 13px; flex: 1; min-width: 180px; max-width: 280px; }
        .search input { border: none; outline: none; background: transparent; font-size: 13.5px; width: 100%; font-family: 'Inter', sans-serif; }
        .filters { display: flex; gap: 6px; }
        .filter-pill { font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 600; padding: 8px 14px; border-radius: 100px; border: 1.5px solid rgba(28,43,51,0.12); background: #fff; color: rgba(42,42,40,0.55); cursor: pointer; transition: all 0.15s; }
        .filter-pill.active { background: #1C2B33; color: #fff; border-color: #1C2B33; }
        .table-card { background: #fff; border: 1px solid rgba(28,43,51,0.1); border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px rgba(28,43,51,0.04); }
        .row { display: flex; align-items: center; gap: 16px; padding: 14px 20px; border-bottom: 1px solid rgba(28,43,51,0.08); border-left: 3px solid transparent; animation: slideIn 0.35s ease backwards; }
        .row:last-child { border-bottom: none; }
        .row:hover { background: rgba(28,43,51,0.015); }
        .row-hot { border-left-color: #B8674D; }
        .row-nurture { border-left-color: #7A8B7A; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
        .lead-info { min-width: 140px; }
        .lead-name { font-weight: 600; font-size: 14px; color: #1C2B33; }
        .lead-email { font-size: 12px; color: rgba(42,42,40,0.5); margin-top: 1px; }
        .reason { flex: 1; font-size: 12.5px; color: rgba(42,42,40,0.6); line-height: 1.4; }
        .badge-col { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; min-width: 100px; }
        .badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; padding: 4px 9px; border-radius: 100px; }
        .badge.hot { color: #9C5640; background: rgba(184,103,77,0.12); }
        .badge.nurture { color: #56685A; background: rgba(122,139,122,0.12); }
        .time { font-size: 11px; color: rgba(42,42,40,0.4); font-family: 'JetBrains Mono', monospace; }
        .empty { padding: 50px 20px; text-align: center; color: rgba(42,42,40,0.5); font-size: 13.5px; }
        .empty strong { display: block; color: #1C2B33; font-size: 15px; margin-bottom: 6px; }
        .hint-note { margin-top: 16px; font-size: 11.5px; color: rgba(42,42,40,0.4); text-align: center; }
        .hint-note code { font-family: 'JetBrains Mono', monospace; background: rgba(28,43,51,0.06); padding: 2px 6px; border-radius: 4px; }
        @media (max-width: 640px) { .reason { display: none; } .row { flex-wrap: wrap; } }
      `}</style>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 24, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "rgba(42,42,40,0.5)", marginTop: 3 }}>{label}</div>
    </div>
  );
}

export default function App() {
  const [clientId, setClientId] = useClientFromUrl();
  const [view, setView] = useState("intake");
  const config = CLIENTS[clientId];

  return (
    <div className="app-root">
      <div className="top-bar">
        <div className="client-switch">
          {Object.keys(CLIENTS).map((id) => (
            <button key={id} className={clientId === id ? "client-pill active" : "client-pill"} onClick={() => setClientId(id)}>
              {CLIENTS[id].business_name}
            </button>
          ))}
        </div>
        <div className="view-switch">
          <button className={view === "intake" ? "view-pill active" : "view-pill"} onClick={() => setView("intake")}>
            <UserPlus size={14} /> Intake
          </button>
          <button className={view === "dashboard" ? "view-pill active" : "view-pill"} onClick={() => setView("dashboard")}>
            <LayoutDashboard size={14} /> Dashboard
          </button>
        </div>
      </div>

      <div className="stage">
        {view === "intake" ? <IntakeView config={config} clientId={clientId} /> : <DashboardView config={config} />}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .app-root { min-height: 100vh; background: #F6F3EC; font-family: 'Inter', sans-serif; padding: 28px 20px 60px; -webkit-font-smoothing: antialiased; }
        .top-bar { max-width: 880px; margin: 0 auto 32px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
        .client-switch, .view-switch { display: flex; gap: 6px; }
        .client-pill { font-size: 12.5px; font-weight: 600; padding: 8px 14px; border-radius: 100px; border: 1.5px solid rgba(28,43,51,0.12); background: #fff; color: rgba(42,42,40,0.55); cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif; }
        .client-pill.active { background: #1C2B33; color: #fff; border-color: #1C2B33; }
        .view-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; padding: 8px 14px; border-radius: 100px; border: 1.5px solid rgba(28,43,51,0.12); background: #fff; color: rgba(42,42,40,0.55); cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif; }
        .view-pill.active { background: #B8674D; color: #fff; border-color: #B8674D; }
        .stage { display: flex; justify-content: center; }
      `}</style>
    </div>
  );
}
