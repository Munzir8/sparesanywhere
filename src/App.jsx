import { useState, useEffect, useCallback } from "react";
import emailjs from "@emailjs/browser";
import * as XLSX from "xlsx";

// ─── EMAILJS CONFIG ───────────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID  = "munzirkhan812@gmail.com";
const EMAILJS_TEMPLATE_ID = "template_ldql2g6";
const EMAILJS_PUBLIC_KEY  = "bC187q-CO5pMEBWGA";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://yrvhwbfcraxpivoaiuxa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlydmh3YmZjcmF4cGl2b2FpdXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyOTk4NTYsImV4cCI6MjA4ODg3NTg1Nn0.3iRlq-XIEG2DumgNxwmTQpwR8Qc_zT1ttTf8RiVNvaY";

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...opts.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const txt = await res.text();
  return txt ? JSON.parse(txt) : [];
}

async function loadOrders() {
  try { return await sbFetch("/orders?order=created_at.desc"); }
  catch (e) { console.error(e); return []; }
}
async function createOrder(order) {
  const row = {
    id: order.id, garage: order.garage, car: order.car, year: order.year,
    part: order.part, notes: order.notes, photos: order.photos,
    status: "pending", quote: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  return sbFetch("/orders", { method: "POST", body: JSON.stringify(row) });
}
async function patchOrder(id, changes) {
  return sbFetch(`/orders?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...changes, updated_at: new Date().toISOString() }),
  });
}
async function removeOrder(id) {
  return sbFetch(`/orders?id=eq.${id}`, { method: "DELETE" });
}
function mapOrder(o) {
  return { ...o, createdAt: o.created_at, updatedAt: o.updated_at };
}

const STATUS = {
  pending:   { label: "Pending",   color: "#F59E0B" },
  quoted:    { label: "Quoted",    color: "#3B82F6" },
  confirmed: { label: "Confirmed", color: "#8B5CF6" },
  sourcing:  { label: "Sourcing",  color: "#06B6D4" },
  fulfilled: { label: "Fulfilled", color: "#10B981" },
  cancelled: { label: "Cancelled", color: "#EF4444" },
};

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap');`;
const BASE = `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } html, body, #root { width: 100%; min-height: 100vh; } body { background: #0A0A0A; }`;

// ─── STORIES DATA ─────────────────────────────────────────────────────────────
// To add a new story: copy one of the objects below, change the content, add to the array.
const STORIES = [
  {
    id: "rolls-royce-silver-seraph-whitewalls",
    tag: "Classic & Vintage",
    date: "March 2025",
    location: "UK",
    readTime: "4 min read",
    title: "Finding white-wall tyres for a Rolls-Royce Silver Seraph in Lagos",
    lede: "Nobody in Lagos had them. Nobody in Nigeria had them. The previous owner had spent three weeks calling every tyre importer he knew.",
    excerpt: "Four matching white-wall tyres for a Silver Seraph. Not manufactured at scale since the early 2000s. We found them in Coventry.",
    emoji: "🏎",
    content: [
      { type: "section", heading: "The brief", text: "A client in Victoria Island came to us with a straightforward request on paper: four matching white-wall tyres for a Rolls-Royce Silver Seraph. The Seraph ran on 235/70 R16s — not a common size in 2025, and the white-wall variant hasn't been manufactured at scale since the early 2000s. The client had already spent three weeks calling tyre importers across Lagos. Everyone said the same thing: not available, try UK, try USA, try Dubai." },
      { type: "callout", text: "We don't just forward you to the same dead ends. If we take the job, we find it." },
      { type: "section", heading: "The hunt", text: "We started with the obvious routes — specialist UK Rolls-Royce suppliers, classic car tyre importers in Germany, and two contacts in the UAE who deal in prestige vehicle parts. All three confirmed the same thing: white-wall in that spec was discontinued and existing stock was scattered across private hands. The breakthrough came through a classic car forum thread from 2019. Someone in Coventry had bought eight of them for a restoration project and used only four. A quick message, a phone call, and a confirmed price later — we had the four tyres we needed." },
      { type: "section", heading: "The outcome", text: "The tyres arrived in Lagos twelve days after the initial enquiry. The client had them fitted at his preferred workshop in Lekki the following week. The Silver Seraph looked exactly as it should." },
    ],
    outcome: {
      "Vehicle": "Rolls-Royce Silver Seraph",
      "Part": "White-wall tyres × 4 (235/70 R16)",
      "Source": "Private seller, Coventry, UK",
      "Time to source": "10 days",
      "Client's previous attempts": "3 weeks, unsuccessful",
    },
  },
  {
    id: "toyota-tundra-engine-dubai",
    tag: "Import Sourcing",
    date: "January 2025",
    location: "UAE",
    readTime: "3 min read",
    title: "A Toyota Tundra V8 engine from Dubai — delivered in 11 days",
    lede: "Seized engine. Fleet deadline. Every local supplier said six to eight weeks minimum.",
    excerpt: "Low-mileage V8 from a UAE breaker. In Lagos before the client expected a quote.",
    emoji: "🔩",
    content: [
      { type: "section", heading: "The brief", text: "A transport company in Ikeja had a Toyota Tundra with a seized V8 engine. One truck down meant one route uncovered. Their operations manager called us on a Tuesday morning — they needed the engine before the end of the month. Local suppliers quoted six to eight weeks. Some didn't stock the part at all." },
      { type: "section", heading: "The hunt", text: "The 5.7L V8 1UR-FE engine used in the Tundra has a strong presence in the UAE — high import volumes mean high turnover, and the breaker yard market there is well-developed. We contacted three Dubai-based breakers the same day. By Wednesday we had two viable options: a 2019 unit with 38,000km, and a 2020 with 61,000km. We went with the 2019. Shipping was arranged through our freight partner in Jebel Ali." },
      { type: "callout", text: "Dubai is often the fastest route for Japanese and American vehicle parts. People overlook it." },
      { type: "section", heading: "The outcome", text: "Engine landed in Lagos on day eleven. Cleared customs on day thirteen. The client's mechanic had it fitted by the end of that week. The truck was back on the road two weeks after the initial call — four weeks ahead of what any local supplier had quoted." },
    ],
    outcome: {
      "Vehicle": "Toyota Tundra (2018)",
      "Part": "5.7L V8 1UR-FE Engine",
      "Source": "Breaker yard, Dubai, UAE",
      "Mileage": "38,000km",
      "Time to source": "11 days",
      "Local supplier quote": "6–8 weeks",
    },
  },
  {
    id: "mercedes-560sel-brake-callipers",
    tag: "Classic & Vintage",
    date: "December 2024",
    location: "Germany",
    readTime: "3 min read",
    title: "Brake callipers for a 1987 Mercedes 560 SEL — discontinued everywhere",
    lede: "The owner had been searching for three months. The part was discontinued in 2009. We found them in two weeks.",
    excerpt: "Knowing exactly which German breaker yards to call made all the difference.",
    emoji: "⚙️",
    content: [
      { type: "section", heading: "The brief", text: "A classic car enthusiast in Lekki Phase 1 had a 1987 Mercedes-Benz 560 SEL in restoration. Everything was going well until the brake callipers — the originals were seized beyond reconditioning and replacement units hadn't been manufactured since 2009. The owner had spent three months searching online and through local Mercedes specialists." },
      { type: "section", heading: "The hunt", text: "The W126 560 SEL is a well-documented classic in Germany, where the enthusiast and restoration community is large. The key is knowing which breaker yards specialise in 1980s Mercedes rather than calling general suppliers. We contacted four specialist yards in Bavaria and Baden-Württemberg directly. Two had nothing. One had a single calliper. The fourth — a yard outside Stuttgart that deals exclusively in W116 and W126 cars — had a full matching set, removed from a low-mileage 560 SEL written off in a parking incident." },
      { type: "callout", text: "For classic European cars, Germany is almost always the right place to look first." },
      { type: "section", heading: "The outcome", text: "Matching pair shipped from Stuttgart within three days of confirmation. Arrived in Lagos two weeks after the initial enquiry. The restoration continued on schedule." },
    ],
    outcome: {
      "Vehicle": "Mercedes-Benz 560 SEL (1987, W126)",
      "Part": "Front brake callipers (matching pair)",
      "Source": "Specialist breaker, Stuttgart, Germany",
      "Time to source": "14 days",
      "Owner's previous search": "3 months, unsuccessful",
    },
  },
];

const STORY_TAGS = ["All", "Classic & Vintage", "Import Sourcing", "Urgent Jobs"];

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("home");
  const [adminPw, setAdminPw] = useState("");
  const [adminAuth, setAdminAuth] = useState(false);
  const [pwError, setPwError] = useState(false);
  const [storyId, setStoryId] = useState(null);
  const ADMIN_PASSWORD = "munzir2025";

  useEffect(() => {
    document.title = "SpareAnywhere | Car Parts Sourced from London, Dubai & Lagos";
    const setName = (name, content) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    const setProp = (prop, content) => {
      let el = document.querySelector(`meta[property="${prop}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setName("description", "SpareAnywhere sources OEM and aftermarket car parts from London, Dubai and Lagos. Submit your part request and get a quote within 48 hours.");
    setName("keywords", "car parts, auto parts, spare parts, automotive parts, OEM parts, aftermarket parts, car parts London, car parts Dubai, car parts Lagos, car parts Nigeria");
    setName("robots", "index, follow");
    setProp("og:title", "SpareAnywhere | Car Parts from London, Dubai & Lagos");
    setProp("og:description", "Source any car part worldwide. OEM & aftermarket. Fast turnaround.");
    setProp("og:url", "https://sparesanywhere.com");
    setProp("og:type", "website");
  }, []);

  const isAdminDevice = new URLSearchParams(window.location.search).has("admin");

  function enterAdmin() {
    if (adminPw === ADMIN_PASSWORD) { setAdminAuth(true); setView("admin"); setPwError(false); }
    else setPwError(true);
  }

  if (view === "garage") return <GaragePortal onBack={() => setView("home")} />;
  if (view === "admin" && adminAuth) return <AdminDashboard onBack={() => { setView("home"); setAdminAuth(false); }} />;
  if (view === "stories") return <StoriesPage onBack={() => setView("home")} onStory={(id) => { setStoryId(id); setView("story"); }} />;
  if (view === "story") return <StoryDetail storyId={storyId} onBack={() => setView("home")} onStories={() => setView("stories")} />;

  return (
    <>
      <style>{FONT}{BASE}{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%,100% { opacity:1; } 50% { opacity:0.7; } }
        @keyframes carDrive { 0%{left:0;transform:scaleX(1);} 47%{left:calc(100% - 44px);transform:scaleX(1);} 50%{left:calc(100% - 44px);transform:scaleX(-1);} 97%{left:0;transform:scaleX(-1);} 100%{left:0;transform:scaleX(1);} }
        @keyframes carBob { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-1px);} }
        @keyframes wheelSpin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
        .walker-wrap { position:relative; height:28px; margin:0.3rem auto 0.1rem; overflow:visible; width:min(400px, 90vw); }
        .walker { position:absolute; top:0; left:0; animation:carDrive 10s linear infinite; }
        .car-svg { animation:carBob 0.8s ease-in-out infinite; overflow:visible; }
        .wheel-f { animation:wheelSpin 1.5s linear infinite; transform-origin:9px 18px; }
        .wheel-r { animation:wheelSpin 1.5s linear infinite; transform-origin:32px 18px; }
        .home { width:100%; min-height:100vh; background:#0A0A0A; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Syne',sans-serif; padding:2rem; }
        .brand { text-align:center; animation:fadeUp 0.6s ease both; }
        .logo { font-size:clamp(1.6rem,5vw,3rem); font-weight:800; color:#F5F0E8; letter-spacing:-0.03em; margin-bottom:0.25rem; }
        .logo > span:first-of-type { color:#C9A84C; animation:shimmer 4s ease-in-out infinite; display:inline-block; }
        .logo-bar { width:2rem; height:1px; background:#C9A84C; margin:0.6rem auto; opacity:0.5; }
        .sub { font-family:'DM Mono',monospace; font-size:0.75rem; color:#555; letter-spacing:0.15em; text-transform:uppercase; margin-bottom:0.75rem; }
        .tagline { font-family:'DM Mono',monospace; font-size:0.72rem; color:#C0392B; letter-spacing:0.05em; margin-bottom:1.5rem; }
        .stats { display:flex; gap:2rem; justify-content:center; margin-bottom:3.5rem; animation:fadeUp 0.6s 0.15s ease both; opacity:0; animation-fill-mode:forwards; flex-wrap:wrap; }
        .stat { text-align:center; }
        .stat-num { font-size:1.1rem; font-weight:800; color:#C9A84C; letter-spacing:-0.02em; }
        .stat-lbl { font-family:'DM Mono',monospace; font-size:0.6rem; color:#444; letter-spacing:0.1em; text-transform:uppercase; margin-top:0.15rem; }
        .stat-div { width:1px; background:#1E1E1E; align-self:stretch; }
        .cards { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1.5rem; max-width:900px; width:100%; animation:fadeUp 0.6s 0.3s ease both; opacity:0; animation-fill-mode:forwards; }
        @media(max-width:520px){.cards{grid-template-columns:1fr;}}
        .card { border:1px solid #222; border-radius:2px; padding:2.5rem 2rem; background:#111; transition:all 0.2s; }
        .card.clickable { cursor:pointer; }
        .card.clickable:hover { border-color:#C9A84C; background:#141414; transform:translateY(-2px); }
        .card-icon { font-size:2rem; margin-bottom:1rem; }
        .card-title { font-size:1.25rem; font-weight:700; color:#F5F0E8; margin-bottom:0.5rem; }
        .card-desc { font-family:'DM Mono',monospace; font-size:0.72rem; color:#666; line-height:1.6; margin-bottom:1.25rem; }
        .pw-input { width:100%; background:#0A0A0A; border:1px solid #333; color:#F5F0E8; font-family:'DM Mono',monospace; font-size:0.85rem; padding:0.6rem 1rem; border-radius:2px; outline:none; margin-bottom:0.5rem; }
        .pw-input:focus { border-color:#C9A84C; }
        .pw-btn { width:100%; background:#C9A84C; color:#0A0A0A; border:none; font-family:'Syne',sans-serif; font-weight:700; font-size:0.8rem; letter-spacing:0.05em; padding:0.65rem; cursor:pointer; border-radius:2px; transition:opacity 0.2s; }
        .pw-btn:hover { opacity:0.85; }
        .pw-error { font-family:'DM Mono',monospace; font-size:0.7rem; color:#EF4444; margin-top:0.4rem; }
        .contact { margin-top:3rem; text-align:center; animation:fadeUp 0.6s 0.45s ease both; opacity:0; animation-fill-mode:forwards; }
        .contact-lbl { font-family:'DM Mono',monospace; font-size:0.65rem; color:#444; letter-spacing:0.15em; text-transform:uppercase; margin-bottom:1rem; }
        .wa-btns { display:flex; gap:1rem; justify-content:center; flex-wrap:wrap; }
        .wa-btn { display:flex; align-items:center; gap:0.5rem; background:#111; border:1px solid #222; border-radius:2px; padding:0.65rem 1.25rem; text-decoration:none; transition:all 0.2s; }
        .wa-btn:hover { border-color:#25D366; background:#0D1A10; }
        .wa-icon { font-size:1rem; }
        .wa-info { text-align:left; }
        .wa-region { font-family:'DM Mono',monospace; font-size:0.6rem; color:#555; letter-spacing:0.1em; text-transform:uppercase; }
        .wa-number { font-family:'DM Mono',monospace; font-size:0.78rem; color:#F5F0E8; }
      `}</style>
      <div className="home">
        <div className="brand">
          <div className="logo">SPARES<span>ANYWHERE</span></div>
          <div className="walker-wrap">
            <div className="walker">
              <svg className="car-svg" viewBox="0 0 44 24" width="44" height="24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2,16 4,9 11,9 15,4 29,4 33,9 40,9 42,16" />
                <line x1="2" y1="16" x2="5" y2="16" />
                <line x1="13" y1="16" x2="28" y2="16" />
                <line x1="36" y1="16" x2="42" y2="16" />
                <g className="wheel-f">
                  <circle cx="9" cy="18" r="4" />
                  <line x1="9" y1="14" x2="9" y2="22" />
                  <line x1="5" y1="18" x2="13" y2="18" />
                </g>
                <g className="wheel-r">
                  <circle cx="32" cy="18" r="4" />
                  <line x1="32" y1="14" x2="32" y2="22" />
                  <line x1="28" y1="18" x2="36" y2="18" />
                </g>
                <circle cx="41" cy="12" r="1" fill="#C9A84C" />
              </svg>
            </div>
          </div>
          <div className="logo-bar"></div>
          <div className="sub">Automotive Parts</div>
          <div className="sub" style={{marginBottom:"0.75rem"}}>London · Dubai · Lagos</div>
          <div className="tagline">No part too rare. No market too far.</div>
        </div>
        <div className="stats">
          <div className="stat"><div className="stat-num">3</div><div className="stat-lbl">Countries</div></div>
          <div className="stat-div"></div>
          <div className="stat"><div className="stat-num">48h</div><div className="stat-lbl">Avg. Turnaround</div></div>
          <div className="stat-div"></div>
          <div className="stat"><div className="stat-num">OEM</div><div className="stat-lbl">& Aftermarket</div></div>
        </div>
        <div className="cards">
          <div className="card clickable" onClick={() => setView("garage")}>
            <div className="card-icon">🔧</div>
            <div className="card-title">Garage Portal</div>
            <div className="card-desc">Submit part requests, upload VIN plates or reference photos, and track order status.</div>
          </div>
          <div className="card clickable" onClick={() => setView("stories")}>
            <div className="card-icon">📖</div>
            <div className="card-title">Sourcing Stories</div>
            <div className="card-desc">Real jobs. Rare parts. How we found them.</div>
          </div>
          {isAdminDevice && (
          <div className="card">
            <div className="card-icon">📊</div>
            <div className="card-title">Admin Dashboard</div>
            <div className="card-desc">View all incoming orders, add quotes, and update statuses.</div>
            <input className="pw-input" type="password" placeholder="Enter password…" value={adminPw}
              onChange={e => { setAdminPw(e.target.value); setPwError(false); }}
              onKeyDown={e => e.key === "Enter" && enterAdmin()} />
            <button className="pw-btn" onClick={enterAdmin}>ENTER →</button>
            {pwError && <div className="pw-error">Incorrect password</div>}
          </div>
          )}
        </div>
        <div className="contact">
          <div className="contact-lbl">Contact Us on WhatsApp</div>
          <div className="wa-btns">
            <a className="wa-btn" href="https://wa.me/447494806066" target="_blank" rel="noopener noreferrer">
              <span className="wa-icon">💬</span>
              <div className="wa-info"><div className="wa-region">London</div><div className="wa-number">+44 7494 806066</div></div>
            </a>
            <a className="wa-btn" href="https://wa.me/2349168340653" target="_blank" rel="noopener noreferrer">
              <span className="wa-icon">💬</span>
              <div className="wa-info"><div className="wa-region">Lagos</div><div className="wa-number">+234 9168 340653</div></div>
            </a>
            <a className="wa-btn" href="https://wa.me/971557997247" target="_blank" rel="noopener noreferrer">
              <span className="wa-icon">💬</span>
              <div className="wa-info"><div className="wa-region">Dubai</div><div className="wa-number">+971 557 997247</div></div>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── STORIES LISTING PAGE ─────────────────────────────────────────────────────
function StoriesPage({ onBack, onStory }) {
  const [activeTag, setActiveTag] = useState("All");

  const filtered = activeTag === "All" ? STORIES : STORIES.filter(s => s.tag === activeTag);
  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <>
      <style>{FONT}{BASE}{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .str-page { width:100%; min-height:100vh; background:#0A0A0A; font-family:'Syne',sans-serif; color:#F5F0E8; }
        .str-nav { border-bottom:1px solid #1A1A1A; padding:1.2rem 2rem; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; background:#0A0A0A; }
        .str-logo { font-size:1.1rem; font-weight:800; color:#F5F0E8; letter-spacing:-0.02em; cursor:pointer; }
        .str-logo span { color:#C9A84C; }
        .str-nav-btn { font-family:'DM Mono',monospace; font-size:0.7rem; letter-spacing:0.1em; text-transform:uppercase; background:none; border:1px solid #222; padding:0.4rem 1rem; border-radius:2px; cursor:pointer; transition:all 0.2s; color:#F5F0E8; }
        .str-nav-btn:hover { border-color:#C9A84C; color:#C9A84C; }
        .str-header { max-width:1100px; margin:0 auto; padding:4rem 2rem 2.5rem; border-bottom:1px solid #1A1A1A; animation:fadeUp 0.5s ease both; }
        .str-eyebrow { font-family:'DM Mono',monospace; font-size:0.65rem; letter-spacing:0.2em; text-transform:uppercase; color:#C9A84C; margin-bottom:1rem; }
        .str-h1 { font-family:'Playfair Display',serif; font-size:clamp(2rem,5vw,3.5rem); font-weight:500; line-height:1.15; letter-spacing:-1px; color:#F5F0E8; margin-bottom:1rem; }
        .str-sub { font-family:'DM Mono',monospace; font-size:0.72rem; color:#555; max-width:480px; line-height:1.7; letter-spacing:0.02em; }
        .str-filters { max-width:1100px; margin:0 auto; padding:1.5rem 2rem; display:flex; gap:0.6rem; flex-wrap:wrap; }
        .str-tag { font-family:'DM Mono',monospace; font-size:0.65rem; letter-spacing:0.1em; text-transform:uppercase; padding:0.45rem 1rem; border:1px solid #222; border-radius:2px; background:none; color:#555; cursor:pointer; transition:all 0.15s; }
        .str-tag:hover { border-color:#555; color:#F5F0E8; }
        .str-tag.active { background:#C9A84C; border-color:#C9A84C; color:#0A0A0A; }
        .str-body { max-width:1100px; margin:0 auto; padding:0 2rem 5rem; }
        .str-featured { display:grid; grid-template-columns:1fr 1fr; border:1px solid #1A1A1A; border-radius:2px; overflow:hidden; margin-bottom:1.5rem; cursor:pointer; transition:border-color 0.2s; animation:fadeUp 0.5s 0.1s ease both; opacity:0; animation-fill-mode:forwards; }
        .str-featured:hover { border-color:#C9A84C; }
        @media(max-width:680px){ .str-featured { grid-template-columns:1fr; } }
        .str-feat-img { background:#111; min-height:300px; display:flex; flex-direction:column; align-items:flex-start; justify-content:space-between; padding:2rem; position:relative; overflow:hidden; }
        .str-feat-pattern { position:absolute; inset:0; opacity:0.03; background-image:repeating-linear-gradient(45deg,#C9A84C 0,#C9A84C 1px,transparent 0,transparent 50%); background-size:24px 24px; }
        .str-feat-badge { position:relative; z-index:1; font-family:'DM Mono',monospace; font-size:0.6rem; letter-spacing:0.15em; text-transform:uppercase; border:1px solid #333; padding:0.35rem 0.8rem; border-radius:2px; color:#888; }
        .str-feat-emoji { position:relative; z-index:1; font-size:3.5rem; line-height:1; }
        .str-feat-content { padding:2.5rem; display:flex; flex-direction:column; justify-content:center; background:#0F0F0F; }
        .str-story-meta { display:flex; gap:10px; align-items:center; margin-bottom:1rem; flex-wrap:wrap; }
        .str-story-tag { font-family:'DM Mono',monospace; font-size:0.6rem; letter-spacing:0.12em; text-transform:uppercase; color:#C9A84C; }
        .str-dot { width:3px; height:3px; border-radius:50%; background:#333; flex-shrink:0; }
        .str-date { font-family:'DM Mono',monospace; font-size:0.6rem; color:#444; }
        .str-feat-title { font-family:'Playfair Display',serif; font-size:clamp(1.2rem,2.5vw,1.6rem); font-weight:500; line-height:1.3; letter-spacing:-0.3px; color:#F5F0E8; margin-bottom:0.75rem; }
        .str-feat-excerpt { font-family:'DM Mono',monospace; font-size:0.72rem; color:#666; line-height:1.7; margin-bottom:1.5rem; }
        .str-read-link { font-family:'DM Mono',monospace; font-size:0.68rem; letter-spacing:0.1em; text-transform:uppercase; color:#C9A84C; display:flex; align-items:center; gap:6px; }
        .str-read-link::after { content:'→'; transition:transform 0.2s; }
        .str-featured:hover .str-read-link::after { transform:translateX(4px); }
        .str-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; }
        @media(max-width:800px){ .str-grid { grid-template-columns:repeat(2,1fr); } }
        @media(max-width:520px){ .str-grid { grid-template-columns:1fr; } }
        .str-card { border:1px solid #1A1A1A; border-radius:2px; overflow:hidden; cursor:pointer; transition:all 0.2s; background:#0F0F0F; animation:fadeUp 0.5s ease both; opacity:0; animation-fill-mode:forwards; }
        .str-card:nth-child(1){ animation-delay:0.15s; }
        .str-card:nth-child(2){ animation-delay:0.22s; }
        .str-card:nth-child(3){ animation-delay:0.29s; }
        .str-card:hover { border-color:#C9A84C; transform:translateY(-2px); }
        .str-card-top { height:140px; background:#111; display:flex; align-items:center; justify-content:center; font-size:2.5rem; border-bottom:1px solid #1A1A1A; position:relative; overflow:hidden; }
        .str-card-pattern { position:absolute; inset:0; opacity:0.03; background-image:repeating-linear-gradient(45deg,#C9A84C 0,#C9A84C 1px,transparent 0,transparent 50%); background-size:16px 16px; }
        .str-card-emoji { position:relative; z-index:1; }
        .str-card-body { padding:1.25rem; }
        .str-card-title { font-family:'Playfair Display',serif; font-size:1rem; font-weight:500; line-height:1.4; color:#F5F0E8; margin-bottom:0.6rem; }
        .str-card-excerpt { font-family:'DM Mono',monospace; font-size:0.65rem; color:#555; line-height:1.65; }
        .str-empty { text-align:center; padding:5rem 1rem; font-family:'DM Mono',monospace; font-size:0.75rem; color:#333; letter-spacing:0.05em; }
      `}</style>
      <div className="str-page">
        <nav className="str-nav">
          <div className="str-logo" onClick={onBack}>SPARES<span>ANYWHERE</span></div>
          <button className="str-nav-btn" onClick={onBack}>← Home</button>
        </nav>
        <div className="str-header">
          <p className="str-eyebrow">The Sourcing Files</p>
          <h1 className="str-h1">Every part has<br />a story.</h1>
          <p className="str-sub">Behind every order is a hunt — dead ends, long-shot contacts, and that moment when the right part finally surfaces.</p>
        </div>
        <div className="str-filters">
          {STORY_TAGS.map(t => (
            <button key={t} className={`str-tag${activeTag === t ? " active" : ""}`} onClick={() => setActiveTag(t)}>{t}</button>
          ))}
        </div>
        <div className="str-body">
          {filtered.length === 0 ? (
            <div className="str-empty">No stories in this category yet.</div>
          ) : (
            <>
              {featured && (
                <div className="str-featured" onClick={() => onStory(featured.id)}>
                  <div className="str-feat-img">
                    <div className="str-feat-pattern" />
                    <span className="str-feat-badge">Featured story</span>
                    <span className="str-feat-emoji">{featured.emoji}</span>
                  </div>
                  <div className="str-feat-content">
                    <div className="str-story-meta">
                      <span className="str-story-tag">{featured.tag}</span>
                      <span className="str-dot" />
                      <span className="str-date">{featured.date}</span>
                      <span className="str-dot" />
                      <span className="str-date">{featured.readTime}</span>
                    </div>
                    <h2 className="str-feat-title">{featured.title}</h2>
                    <p className="str-feat-excerpt">{featured.excerpt}</p>
                    <span className="str-read-link">Read the story</span>
                  </div>
                </div>
              )}
              {rest.length > 0 && (
                <div className="str-grid">
                  {rest.map(s => (
                    <div key={s.id} className="str-card" onClick={() => onStory(s.id)}>
                      <div className="str-card-top">
                        <div className="str-card-pattern" />
                        <span className="str-card-emoji">{s.emoji}</span>
                      </div>
                      <div className="str-card-body">
                        <div className="str-story-meta">
                          <span className="str-story-tag">{s.tag}</span>
                          <span className="str-dot" />
                          <span className="str-date">{s.date}</span>
                        </div>
                        <h3 className="str-card-title">{s.title}</h3>
                        <p className="str-card-excerpt">{s.excerpt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── STORY DETAIL PAGE ────────────────────────────────────────────────────────
function StoryDetail({ storyId, onBack, onStories }) {
  const story = STORIES.find(s => s.id === storyId);

  if (!story) return (
    <div style={{background:"#0A0A0A",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={{fontFamily:"'DM Mono',monospace",color:"#444",fontSize:"0.75rem"}}>Story not found.</p>
    </div>
  );

  return (
    <>
      <style>{FONT}{BASE}{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .sd-page { width:100%; min-height:100vh; background:#0A0A0A; font-family:'Syne',sans-serif; color:#F5F0E8; }
        .sd-nav { border-bottom:1px solid #1A1A1A; padding:1.2rem 2rem; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; background:#0A0A0A; }
        .sd-logo { font-size:1.1rem; font-weight:800; color:#F5F0E8; letter-spacing:-0.02em; cursor:pointer; }
        .sd-logo span { color:#C9A84C; }
        .sd-nav-btn { font-family:'DM Mono',monospace; font-size:0.7rem; letter-spacing:0.1em; text-transform:uppercase; background:none; border:1px solid #222; padding:0.4rem 1rem; border-radius:2px; cursor:pointer; transition:all 0.2s; color:#F5F0E8; }
        .sd-nav-btn:hover { border-color:#C9A84C; color:#C9A84C; }
        .sd-article { max-width:680px; margin:0 auto; padding:3.5rem 2rem 6rem; animation:fadeUp 0.5s ease both; }
        .sd-breadcrumb { font-family:'DM Mono',monospace; font-size:0.65rem; letter-spacing:0.12em; text-transform:uppercase; color:#444; margin-bottom:2rem; display:flex; gap:8px; align-items:center; cursor:pointer; transition:color 0.2s; }
        .sd-breadcrumb:hover { color:#C9A84C; }
        .sd-breadcrumb::before { content:'←'; }
        .sd-eyebrow { font-family:'DM Mono',monospace; font-size:0.62rem; letter-spacing:0.18em; text-transform:uppercase; color:#C9A84C; margin-bottom:1rem; }
        .sd-title { font-family:'Playfair Display',serif; font-size:clamp(1.6rem,4vw,2.5rem); font-weight:500; line-height:1.2; letter-spacing:-0.5px; color:#F5F0E8; margin-bottom:1.5rem; }
        .sd-meta { display:flex; gap:1.2rem; align-items:center; padding:1rem 0; border-top:1px solid #1A1A1A; border-bottom:1px solid #1A1A1A; margin-bottom:2.5rem; flex-wrap:wrap; }
        .sd-meta-item { font-family:'DM Mono',monospace; font-size:0.65rem; letter-spacing:0.05em; color:#555; }
        .sd-meta-item strong { color:#888; font-weight:500; }
        .sd-lede { font-family:'Playfair Display',serif; font-size:1.1rem; font-weight:400; font-style:italic; color:#888; line-height:1.7; margin-bottom:2rem; padding-bottom:2rem; border-bottom:1px solid #1A1A1A; }
        .sd-section-heading { font-family:'Syne',sans-serif; font-size:0.68rem; font-weight:700; letter-spacing:0.15em; text-transform:uppercase; color:#C9A84C; margin:2.5rem 0 1rem; }
        .sd-para { font-family:'DM Mono',monospace; font-size:0.78rem; color:#888; line-height:1.9; margin-bottom:1.25rem; font-weight:300; }
        .sd-callout { border-left:2px solid #C9A84C; padding:1rem 1.5rem; background:#0D0B07; margin:2rem 0; border-radius:0 2px 2px 0; }
        .sd-callout p { font-family:'Playfair Display',serif; font-style:italic; font-size:1rem; color:#C9A84C; margin:0; line-height:1.6; }
        .sd-outcome { background:#0F0F0F; border:1px solid #1A1A1A; border-radius:2px; padding:1.5rem; margin:2.5rem 0; }
        .sd-outcome-label { font-family:'DM Mono',monospace; font-size:0.6rem; letter-spacing:0.2em; text-transform:uppercase; color:#C9A84C; margin-bottom:1rem; }
        .sd-outcome-row { display:flex; justify-content:space-between; align-items:flex-start; padding:0.65rem 0; border-bottom:1px solid #141414; gap:1rem; }
        .sd-outcome-row:last-child { border:none; padding-bottom:0; }
        .sd-outcome-key { font-family:'DM Mono',monospace; font-size:0.65rem; color:#444; letter-spacing:0.04em; flex-shrink:0; }
        .sd-outcome-val { font-family:'DM Mono',monospace; font-size:0.65rem; color:#F5F0E8; font-weight:500; text-align:right; }
        .sd-footer { margin-top:4rem; padding-top:2rem; border-top:1px solid #1A1A1A; display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap; }
        .sd-footer-btn { font-family:'DM Mono',monospace; font-size:0.65rem; letter-spacing:0.12em; text-transform:uppercase; background:none; border:1px solid #222; color:#F5F0E8; padding:0.6rem 1.25rem; border-radius:2px; cursor:pointer; transition:all 0.2s; }
        .sd-footer-btn:hover { border-color:#C9A84C; color:#C9A84C; }
        .sd-footer-btn.primary { background:#C9A84C; border-color:#C9A84C; color:#0A0A0A; font-weight:700; }
        .sd-footer-btn.primary:hover { opacity:0.85; color:#0A0A0A; }
      `}</style>
      <div className="sd-page">
        <nav className="sd-nav">
          <div className="sd-logo" onClick={onBack}>SPARES<span>ANYWHERE</span></div>
          <button className="sd-nav-btn" onClick={onStories}>← All Stories</button>
        </nav>
        <article className="sd-article">
          <div className="sd-breadcrumb" onClick={onStories}>The Sourcing Files</div>
          <p className="sd-eyebrow">{story.tag} · {story.date}</p>
          <h1 className="sd-title">{story.title}</h1>
          <div className="sd-meta">
            <span className="sd-meta-item"><strong>{story.readTime}</strong></span>
            <span className="sd-meta-item">·</span>
            <span className="sd-meta-item">Sourced from <strong>{story.location}</strong></span>
          </div>
          <p className="sd-lede">{story.lede}</p>
          {story.content.map((block, i) => {
            if (block.type === "section") return (
              <div key={i}>
                <h3 className="sd-section-heading">{block.heading}</h3>
                <p className="sd-para">{block.text}</p>
              </div>
            );
            if (block.type === "callout") return (
              <div key={i} className="sd-callout"><p>"{block.text}"</p></div>
            );
            return null;
          })}
          {story.outcome && (
            <div className="sd-outcome">
              <div className="sd-outcome-label">Job summary</div>
              {Object.entries(story.outcome).map(([k, v]) => (
                <div key={k} className="sd-outcome-row">
                  <span className="sd-outcome-key">{k}</span>
                  <span className="sd-outcome-val">{v}</span>
                </div>
              ))}
            </div>
          )}
          <div className="sd-footer">
            <button className="sd-footer-btn" onClick={onStories}>← All stories</button>
            <button className="sd-footer-btn primary" onClick={onBack}>Submit a part request →</button>
          </div>
        </article>
      </div>
    </>
  );
}

// ─── GARAGE PORTAL ────────────────────────────────────────────────────────────
function GaragePortal({ onBack }) {
  const [form, setForm] = useState({ garage: "", car: "", year: "", part: "", notes: "", photos: [] });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handlePhoto(e) {
    Array.from(e.target.files).forEach(file => {
      const r = new FileReader();
      r.onload = ev => setForm(f => ({ ...f, photos: [...f.photos, { name: file.name, data: ev.target.result }] }));
      r.readAsDataURL(file);
    });
  }

  async function handleSubmit() {
    if (!form.garage || !form.car || !form.part) return;
    setSubmitting(true); setError("");
    const order = { id: "ORD-" + Date.now().toString(36).toUpperCase(), ...form };
    try {
      await createOrder(order);
      try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          order_id:  order.id,
          garage:    order.garage,
          car:       `${order.car}${order.year ? " (" + order.year + ")" : ""}`,
          part:      order.part,
          notes:     order.notes || "None",
          to_email:  "munzirkhan812@gmail.com",
        }, EMAILJS_PUBLIC_KEY);
      } catch (emailErr) { console.error("Email failed:", emailErr); }
      setSubmitted(true);
      setForm({ garage: "", car: "", year: "", part: "", notes: "", photos: [] });
      setTimeout(() => { setSubmitted(false); }, 3000);
    } catch (e) {
      setError("Failed to submit. Check your connection and try again.");
    }
    setSubmitting(false);
  }

  return (
    <>
      <style>{FONT}{BASE}{`
        .portal { min-height:100vh; background:#0D0D0D; font-family:'Syne',sans-serif; }
        .hdr { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 2rem; border-bottom:1px solid #1A1A1A; }
        .hdr-logo { font-size:1.1rem; font-weight:800; color:#F5F0E8; }
        .hdr-logo span { color:#C9A84C; }
        .back { font-family:'DM Mono',monospace; font-size:0.72rem; color:#555; cursor:pointer; letter-spacing:0.1em; text-transform:uppercase; border:1px solid #222; padding:0.4rem 0.9rem; border-radius:2px; background:none; transition:all 0.2s; }
        .back:hover { color:#C9A84C; border-color:#C9A84C; }
        .body { max-width:720px; margin:0 auto; padding:2rem 1.5rem; }
        .tabs { display:flex; border-bottom:1px solid #1A1A1A; margin-bottom:2.5rem; }
        .t { font-family:'DM Mono',monospace; font-size:0.75rem; letter-spacing:0.1em; text-transform:uppercase; padding:0.75rem 1.5rem; cursor:pointer; color:#555; border-bottom:2px solid transparent; margin-bottom:-1px; transition:all 0.2s; }
        .t.on { color:#C9A84C; border-bottom-color:#C9A84C; }
        .h1 { font-size:1.5rem; font-weight:800; color:#F5F0E8; margin-bottom:1.75rem; letter-spacing:-0.02em; }
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
        @media(max-width:520px){.grid2{grid-template-columns:1fr;}}
        .f { display:flex; flex-direction:column; gap:0.4rem; }
        .f.full { grid-column:1/-1; }
        .f label { font-family:'DM Mono',monospace; font-size:0.7rem; color:#666; letter-spacing:0.1em; text-transform:uppercase; }
        .f label .req { color:#C9A84C; }
        .f input, .f textarea { background:#111; border:1px solid #222; color:#F5F0E8; font-family:'DM Mono',monospace; font-size:0.85rem; padding:0.7rem 1rem; border-radius:2px; outline:none; width:100%; transition:border-color 0.2s; }
        .f input:focus, .f textarea:focus { border-color:#C9A84C; }
        .f textarea { resize:vertical; min-height:90px; }
        .upload-zone { border:1px dashed #333; border-radius:2px; padding:1.5rem; text-align:center; cursor:pointer; transition:border-color 0.2s; }
        .upload-zone:hover { border-color:#C9A84C; }
        .upload-zone input { display:none; }
        .upload-hint { font-family:'DM Mono',monospace; font-size:0.75rem; color:#555; }
        .upload-hint span { color:#C9A84C; }
        .thumbs { display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.75rem; }
        .thumb { width:70px; height:70px; object-fit:cover; border-radius:2px; border:1px solid #333; }
        .submit { margin-top:2rem; width:100%; background:#C9A84C; color:#0A0A0A; border:none; font-family:'Syne',sans-serif; font-weight:800; font-size:0.9rem; letter-spacing:0.08em; padding:1rem; cursor:pointer; border-radius:2px; transition:opacity 0.2s; text-transform:uppercase; }
        .submit:hover:not(:disabled) { opacity:0.85; }
        .submit:disabled { opacity:0.4; cursor:not-allowed; }
        .err { font-family:'DM Mono',monospace; font-size:0.72rem; color:#EF4444; margin-top:0.75rem; }
        .success { text-align:center; padding:3rem 1rem; }
        .success-icon { font-size:3rem; margin-bottom:1rem; }
        .success-title { font-size:1.5rem; font-weight:700; color:#10B981; margin-bottom:0.5rem; }
        .success-sub { font-family:'DM Mono',monospace; font-size:0.75rem; color:#555; }
        .olist { display:flex; flex-direction:column; gap:1rem; }
        .ocard { background:#111; border:1px solid #1A1A1A; border-radius:2px; padding:1.25rem 1.5rem; }
        .ocard-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem; }
        .oid { font-family:'DM Mono',monospace; font-size:0.72rem; color:#C9A84C; }
        .pill { font-family:'DM Mono',monospace; font-size:0.65rem; letter-spacing:0.08em; text-transform:uppercase; padding:0.25rem 0.6rem; border-radius:99px; }
        .opart { font-size:1rem; font-weight:700; color:#F5F0E8; margin-bottom:0.2rem; }
        .ocar { font-family:'DM Mono',monospace; font-size:0.72rem; color:#888; }
        .oquote { font-family:'DM Mono',monospace; font-size:0.78rem; color:#10B981; margin-top:0.5rem; }
        .odate { font-family:'DM Mono',monospace; font-size:0.65rem; color:#444; margin-top:0.5rem; }
        .empty { text-align:center; padding:4rem 1rem; font-family:'DM Mono',monospace; font-size:0.75rem; color:#444; }
      `}</style>
      <div className="portal">
        <div className="hdr">
          <div className="hdr-logo">SPARES<span>ANYWHERE</span> <span style={{fontWeight:400,color:"#555",fontSize:"0.85rem"}}>/ Garage Portal</span></div>
          <button className="back" onClick={onBack}>← Back</button>
        </div>
        <div className="body">
          {submitted ? (
            <div className="success">
              <div className="success-icon">✅</div>
              <div className="success-title">Order Submitted!</div>
              <div className="success-sub">Your request has been received. We'll be in touch shortly.</div>
            </div>
          ) : (
            <>
              <div className="h1">Submit Part Request</div>
              <div className="grid2">
                <div className="f"><label>Garage Name <span className="req">*</span></label><input placeholder="e.g. Lagos Auto Works" value={form.garage} onChange={e=>setForm(f=>({...f,garage:e.target.value}))}/></div>
                <div className="f"><label>Car Make & Model <span className="req">*</span></label><input placeholder="e.g. BMW 5 Series" value={form.car} onChange={e=>setForm(f=>({...f,car:e.target.value}))}/></div>
                <div className="f"><label>Year</label><input placeholder="e.g. 2019" value={form.year} onChange={e=>setForm(f=>({...f,year:e.target.value}))}/></div>
                <div className="f"><label>Part Required <span className="req">*</span></label><input placeholder="e.g. Front Brake Caliper" value={form.part} onChange={e=>setForm(f=>({...f,part:e.target.value}))}/></div>
                <div className="f full"><label>Additional Notes</label><textarea placeholder="Part number, OEM/aftermarket preference, urgency…" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
                <div className="f full">
                  <label>Photos (VIN Plate / Part Reference)</label>
                  <div className="upload-zone" onClick={()=>document.getElementById("photo-inp").click()}>
                    <input id="photo-inp" type="file" accept="image/*" multiple onChange={handlePhoto}/>
                    <div className="upload-hint">Click to upload — <span>VIN plates, part photos, damage reference</span></div>
                  </div>
                  {form.photos.length > 0 && <div className="thumbs">{form.photos.map((p,i)=><img key={i} src={p.data} alt={p.name} className="thumb"/>)}</div>}
                </div>
              </div>
              <button className="submit" onClick={handleSubmit} disabled={submitting||!form.garage||!form.car||!form.part}>
                {submitting ? "Submitting…" : "Submit Order →"}
              </button>
              {error && <div className="err">{error}</div>}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard({ onBack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState(null);
  const [quoteInput, setQuoteInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [srcQuery, setSrcQuery] = useState("");

  const fetch = useCallback(async () => {
    const o = await loadOrders(); setOrders(o.map(mapOrder)); setLoading(false);
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const counts = Object.keys(STATUS).reduce((a, s) => { a[s] = orders.filter(o => o.status === s).length; return a; }, {});

  function downloadExcel() {
    const wb = XLSX.utils.book_new();
    orders.forEach((o, idx) => {
      const carTitle = `${(o.car || "Order").toUpperCase()} ${o.year || ""}`.trim();
      const date = new Date(o.createdAt).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
      const data = [
        [`🚗  ${carTitle} — ORDER SUMMARY`],
        [`Order ID: ${o.id}  |  Garage: ${o.garage}  |  Date: ${date}`],
        [],
        ["#", "Part Name", "Notes", "Qty", "Buy Price (£)", "Total Cost (£)", "Sell Price (£)", "Total Sell (£)", "Profit (£)", "Status"],
        [1, o.part, o.notes || "", 1, "", "=E5*D5", "", "=G5*D5", "=H5-F5", o.status],
        [],
        ["", "ORDER TOTAL", "", "", "", "=F5", "", "=H5", "=I5", ""],
        [],
        ["📊  ORDER SUMMARY", "", "", "", "Total Cost (£)", "Total Revenue (£)", "Gross Profit (£)", "Margin %"],
        ["", "", "", "", "=F7", "=H7", "=I7", "=IFERROR(I10/H10,0)"],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!cols"] = [6,22,20,5,13,13,13,13,10,10].map(w => ({ wch: w }));
      const sheetName = `${carTitle.slice(0, 25)} #${idx + 1}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    });
    XLSX.writeFile(wb, "SpareAnywhere_Orders.xlsx");
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this order? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await removeOrder(id);
      setOrders(prev => prev.filter(o => o.id !== id));
      setSel(null);
    } catch (e) { console.error(e); }
    setDeleting(false);
  }

  async function updateOrder(id, changes) {
    setSaving(true);
    try {
      await patchOrder(id, changes);
      const fresh = await loadOrders();
      const mapped = fresh.map(mapOrder);
      setOrders(mapped);
      if (sel?.id === id) setSel(mapped.find(o => o.id === id));
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  return (
    <>
      <style>{FONT}{BASE}{`
        .adm { min-height:100vh; background:#080808; font-family:'Syne',sans-serif; display:flex; flex-direction:column; }
        .ahdr { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 2rem; border-bottom:1px solid #1A1A1A; }
        .alogo { font-size:1.1rem; font-weight:800; color:#F5F0E8; }
        .alogo span { color:#C9A84C; }
        .back { font-family:'DM Mono',monospace; font-size:0.72rem; color:#555; cursor:pointer; letter-spacing:0.1em; text-transform:uppercase; border:1px solid #222; padding:0.4rem 0.9rem; border-radius:2px; background:none; transition:all 0.2s; }
        .back:hover { color:#C9A84C; border-color:#C9A84C; }
        .abody { display:flex; flex:1; overflow:hidden; min-height:0; }
        .aside { width:240px; border-right:1px solid #1A1A1A; padding:1.5rem 1rem; flex-shrink:0; overflow-y:auto; }
        @media(max-width:700px){.abody{flex-direction:column;}.aside{width:100%;border-right:none;border-bottom:1px solid #1A1A1A;overflow-y:visible;}}
        .aside-lbl { font-family:'DM Mono',monospace; font-size:0.65rem; color:#444; letter-spacing:0.15em; text-transform:uppercase; margin-bottom:0.75rem; padding-left:0.5rem; }
        .fb { display:flex; justify-content:space-between; align-items:center; width:100%; background:none; border:none; padding:0.5rem 0.75rem; cursor:pointer; border-radius:2px; font-family:'Syne',sans-serif; font-size:0.82rem; color:#888; transition:all 0.15s; text-align:left; }
        .fb:hover { background:#111; color:#F5F0E8; }
        .fb.on { background:#161610; color:#C9A84C; }
        .fc { font-family:'DM Mono',monospace; font-size:0.7rem; color:#444; }
        .amain { flex:1; overflow-y:auto; padding:1.5rem; }
        .stats { display:flex; gap:1rem; margin-bottom:2rem; flex-wrap:wrap; }
        .sbox { background:#111; border:1px solid #1A1A1A; border-radius:2px; padding:1rem 1.25rem; min-width:110px; }
        .snum { font-size:1.75rem; font-weight:800; color:#F5F0E8; }
        .slbl { font-family:'DM Mono',monospace; font-size:0.65rem; color:#555; margin-top:0.2rem; letter-spacing:0.1em; text-transform:uppercase; }
        .orow { background:#111; border:1px solid #1A1A1A; border-radius:2px; padding:1rem 1.25rem; cursor:pointer; transition:all 0.15s; display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:0.75rem; }
        .orow:hover { border-color:#333; background:#141414; }
        .orow.sel { border-color:#C9A84C; background:#141410; }
        .orow-id { font-family:'DM Mono',monospace; font-size:0.7rem; color:#C9A84C; margin-bottom:0.3rem; }
        .orow-part { font-size:0.95rem; font-weight:700; color:#F5F0E8; }
        .orow-meta { font-family:'DM Mono',monospace; font-size:0.7rem; color:#666; margin-top:0.2rem; }
        .pill { font-family:'DM Mono',monospace; font-size:0.65rem; letter-spacing:0.08em; text-transform:uppercase; padding:0.25rem 0.6rem; border-radius:99px; white-space:nowrap; }
        .detail { background:#111; border:1px solid #C9A84C; border-radius:2px; padding:1.75rem; margin-top:1.5rem; }
        .dtitle { font-size:1.2rem; font-weight:800; color:#F5F0E8; margin-bottom:0.25rem; }
        .did { font-family:'DM Mono',monospace; font-size:0.72rem; color:#C9A84C; margin-bottom:1.5rem; }
        .dgrid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem; }
        @media(max-width:500px){.dgrid{grid-template-columns:1fr;}}
        .dfield label { font-family:'DM Mono',monospace; font-size:0.65rem; color:#555; letter-spacing:0.1em; text-transform:uppercase; display:block; margin-bottom:0.3rem; }
        .dfield p { font-size:0.88rem; color:#DDD; }
        .dphotos { display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1.5rem; }
        .dphoto { width:90px; height:90px; object-fit:cover; border-radius:2px; border:1px solid #333; cursor:pointer; }
        .dlbl { font-family:'DM Mono',monospace; font-size:0.65rem; color:#555; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:0.75rem; }
        .sgrid { display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1.5rem; }
        .sopt { font-family:'DM Mono',monospace; font-size:0.7rem; letter-spacing:0.06em; text-transform:uppercase; padding:0.35rem 0.75rem; border-radius:2px; border:1px solid #222; cursor:pointer; transition:all 0.15s; background:none; color:#666; }
        .sopt:hover { border-color:#555; color:#EEE; }
        .sopt.on { color:#0A0A0A; border-color:transparent; }
        .qrow { display:flex; gap:0.75rem; margin-bottom:1.5rem; align-items:center; }
        .qi { flex:1; background:#0A0A0A; border:1px solid #333; color:#F5F0E8; font-family:'DM Mono',monospace; font-size:0.85rem; padding:0.6rem 1rem; border-radius:2px; outline:none; }
        .qi:focus { border-color:#C9A84C; }
        .qbtn { background:#C9A84C; color:#0A0A0A; border:none; font-family:'Syne',sans-serif; font-weight:700; font-size:0.78rem; padding:0.6rem 1.25rem; cursor:pointer; border-radius:2px; white-space:nowrap; transition:opacity 0.2s; }
        .qbtn:hover { opacity:0.85; }
        .xlbtn { font-family:'DM Mono',monospace; font-size:0.7rem; color:#555; cursor:pointer; letter-spacing:0.1em; text-transform:uppercase; border:1px solid #222; padding:0.4rem 0.9rem; border-radius:2px; background:none; transition:all 0.2s; }
        .xlbtn:hover { color:#10B981; border-color:#10B981; }
        .delbtn { width:100%; background:none; border:1px solid #3A1A1A; color:#EF4444; font-family:'Syne',sans-serif; font-weight:700; font-size:0.78rem; letter-spacing:0.05em; padding:0.65rem; cursor:pointer; border-radius:2px; transition:all 0.2s; margin-top:0.5rem; }
        .delbtn:hover { background:#1A0505; border-color:#EF4444; }
        .src-box { background:#0A0A0A; border:1px solid #1A1A1A; border-radius:2px; padding:1.25rem; margin-bottom:1.5rem; }
        .src-row { display:flex; gap:0.5rem; margin-bottom:0.75rem; }
        .src-input { flex:1; background:#111; border:1px solid #222; color:#F5F0E8; font-family:'DM Mono',monospace; font-size:0.82rem; padding:0.55rem 0.9rem; border-radius:2px; outline:none; }
        .src-input:focus { border-color:#C9A84C; }
        .src-btns { display:flex; gap:0.5rem; flex-wrap:wrap; }
        .src-btn { display:flex; align-items:center; gap:0.4rem; font-family:'DM Mono',monospace; font-size:0.7rem; letter-spacing:0.06em; text-transform:uppercase; padding:0.45rem 0.9rem; border-radius:2px; border:1px solid #222; cursor:pointer; background:none; color:#888; transition:all 0.15s; text-decoration:none; }
        .src-btn:hover { color:#F5F0E8; border-color:#555; background:#111; }
        .src-btn.ebay-uk:hover { border-color:#E53238; color:#E53238; }
        .src-btn.ebay-gl:hover { border-color:#0064D2; color:#0064D2; }
        .src-btn.google:hover { border-color:#34A853; color:#34A853; }
        .cquote { font-family:'DM Mono',monospace; font-size:0.78rem; color:#10B981; background:#0A1A0F; border:1px solid #1A3A1F; padding:0.6rem 1rem; border-radius:2px; margin-bottom:1.5rem; }
        .notes { background:#0A0A0A; border:1px solid #1A1A1A; border-radius:2px; padding:0.75rem 1rem; font-family:'DM Mono',monospace; font-size:0.78rem; color:#888; line-height:1.6; margin-bottom:1.5rem; }
        .empty { text-align:center; padding:4rem 1rem; font-family:'DM Mono',monospace; font-size:0.75rem; color:#444; }
        .h1 { font-size:1.5rem; font-weight:800; color:#F5F0E8; margin-bottom:1.75rem; letter-spacing:-0.02em; }
      `}</style>
      <div className="adm">
        <div className="ahdr">
          <div className="alogo">SPARES<span>ANYWHERE</span> <span style={{fontWeight:400,color:"#555",fontSize:"0.85rem"}}>/ Admin</span></div>
          <div style={{display:"flex",gap:"0.75rem"}}>
            <button className="xlbtn" onClick={downloadExcel} disabled={orders.length===0}>⬇ Download Excel</button>
            <button className="back" onClick={onBack}>← Exit</button>
          </div>
        </div>
        <div className="abody">
          <div className="aside">
            <div className="aside-lbl">Filter</div>
            <button className={`fb ${filter==="all"?"on":""}`} onClick={()=>setFilter("all")}>All Orders <span className="fc">{orders.length}</span></button>
            {Object.entries(STATUS).map(([k,s])=>(
              <button key={k} className={`fb ${filter===k?"on":""}`} onClick={()=>setFilter(k)}>
                {s.label} <span className="fc">{counts[k]||0}</span>
              </button>
            ))}
          </div>
          <div className="amain">
            <div className="stats">
              <div className="sbox"><div className="snum">{orders.length}</div><div className="slbl">Total</div></div>
              <div className="sbox"><div className="snum">{counts.pending||0}</div><div className="slbl">Pending</div></div>
              <div className="sbox"><div className="snum">{counts.fulfilled||0}</div><div className="slbl">Fulfilled</div></div>
            </div>
            {loading ? <div className="empty">Loading orders…</div> : filtered.length===0 ? (
              <div className="empty">No orders here yet.</div>
            ) : filtered.map(o=>(
              <div key={o.id} className={`orow ${sel?.id===o.id?"sel":""}`} onClick={()=>{setSel(o);setQuoteInput(o.quote||"");setSrcQuery(`${o.part} ${o.car} ${o.year||""}`.trim());}}>
                <div>
                  <div className="orow-id">{o.id}</div>
                  <div className="orow-part">{o.part}</div>
                  <div className="orow-meta">{o.car} {o.year&&`· ${o.year}`} · {o.garage}</div>
                </div>
                <span className="pill" style={{background:STATUS[o.status]?.color+"22",color:STATUS[o.status]?.color}}>{STATUS[o.status]?.label}</span>
              </div>
            ))}
            {sel && (
              <div className="detail">
                <div className="dtitle">{sel.part}</div>
                <div className="did">{sel.id} · {new Date(sel.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>
                <div className="dgrid">
                  <div className="dfield"><label>Garage</label><p>{sel.garage}</p></div>
                  <div className="dfield"><label>Vehicle</label><p>{sel.car} {sel.year}</p></div>
                </div>
                {sel.notes && <><div className="dlbl">Notes from Garage</div><div className="notes">{sel.notes}</div></>}
                {sel.photos?.length>0 && (
                  <><div className="dlbl">Attached Photos</div>
                  <div className="dphotos">{sel.photos.map((p,i)=><img key={i} src={p.data} alt={p.name} className="dphoto" onClick={()=>window.open(p.data)}/>)}</div></>
                )}
                <div className="dlbl">Update Status</div>
                <div className="sgrid">
                  {Object.entries(STATUS).map(([k,s])=>(
                    <button key={k} className={`sopt ${sel.status===k?"on":""}`}
                      style={sel.status===k?{background:s.color,borderColor:s.color}:{}}
                      onClick={()=>updateOrder(sel.id,{status:k})}>
                      {s.label}
                    </button>
                  ))}
                </div>
                {sel.quote && <div className="cquote">💰 Current quote: {sel.quote}</div>}
                <div className="dlbl">Add / Update Quote</div>
                <div className="qrow">
                  <input className="qi" placeholder="e.g. ₦85,000 — OEM, ships 5–7 days" value={quoteInput} onChange={e=>setQuoteInput(e.target.value)}/>
                  <button className="qbtn" onClick={()=>updateOrder(sel.id,{quote:quoteInput,status:"quoted"})} disabled={saving}>
                    {saving?"Saving…":"Save Quote"}
                  </button>
                </div>
                <div className="dlbl">Source Parts</div>
                <div className="src-box">
                  <div className="src-row">
                    <input className="src-input" value={srcQuery} onChange={e=>setSrcQuery(e.target.value)} placeholder="e.g. Front Brake Caliper BMW 5 Series 2019"/>
                  </div>
                  <div className="src-btns">
                    <a className="src-btn ebay-uk" target="_blank" rel="noopener noreferrer" href={`https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(srcQuery)}&_sacat=6000`}>🛒 eBay UK</a>
                    <a className="src-btn ebay-gl" target="_blank" rel="noopener noreferrer" href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(srcQuery)}&_sacat=6028`}>🌍 eBay Global</a>
                    <a className="src-btn google" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/search?q=${encodeURIComponent(srcQuery)}&tbm=shop`}>🔍 Google Shopping</a>
                  </div>
                </div>
                <button className="delbtn" onClick={()=>handleDelete(sel.id)} disabled={deleting}>
                  {deleting ? "Deleting…" : "🗑 Delete Order"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
