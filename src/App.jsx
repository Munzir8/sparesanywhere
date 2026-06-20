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

// ─── ORDERS ───────────────────────────────────────────────────────────────────
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

// ─── STORIES ──────────────────────────────────────────────────────────────────
async function loadStories(adminMode = false) {
  try {
    const filter = adminMode ? "" : "&published=eq.true";
    return await sbFetch(`/stories?order=created_at.desc${filter}`);
  } catch (e) { console.error(e); return []; }
}
async function createStory(story) {
  return sbFetch("/stories", { method: "POST", body: JSON.stringify(story) });
}
async function updateStory(id, changes) {
  return sbFetch(`/stories?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(changes),
  });
}
async function deleteStory(id) {
  return sbFetch(`/stories?id=eq.${id}`, { method: "DELETE" });
}

const STATUS = {
  pending:   { label: "Pending",   color: "#F59E0B" },
  quoted:    { label: "Quoted",    color: "#3B82F6" },
  confirmed: { label: "Confirmed", color: "#8B5CF6" },
  sourcing:  { label: "Sourcing",  color: "#06B6D4" },
  fulfilled: { label: "Fulfilled", color: "#10B981" },
  cancelled: { label: "Cancelled", color: "#EF4444" },
};

const STORY_TAGS = ["All", "Classic & Vintage", "Import Sourcing", "Urgent Jobs"];
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap');`;
const BASE = `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } html, body, #root { width: 100%; min-height: 100vh; } body { background: #171717; }`;

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
    setName("description", "SpareAnywhere sources OEM and aftermarket car parts from London, Dubai and Lagos.");
    setName("keywords", "car parts, auto parts, spare parts, OEM parts, aftermarket parts, car parts Lagos, car parts Dubai, car parts London");
    setName("robots", "index, follow");
    setProp("og:title", "SpareAnywhere | Car Parts from London, Dubai & Lagos");
    setProp("og:description", "Source any car part worldwide. OEM & aftermarket. Fast turnaround.");
    setProp("og:url", "https://sparesanywhere.com");
    setProp("og:type", "website");
  }, []);

  const isAdminDevice = new URLSearchParams(window.location.search).has("admin");

  // Scroll-reveal observer
  useEffect(() => {
    if (view !== "home") return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("revealed"); });
    }, { threshold: 0.15 });
    document.querySelectorAll(".reveal").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [view]);

  function enterAdmin() {
    if (adminPw === ADMIN_PASSWORD) { setAdminAuth(true); setView("admin"); setPwError(false); }
    else setPwError(true);
  }

  if (view === "garage") return <GaragePortal onBack={() => setView("home")} />;
  if (view === "admin" && adminAuth) return <AdminDashboard onBack={() => { setView("home"); setAdminAuth(false); }} />;
  if (view === "stories") return <StoriesPage onBack={() => setView("home")} onStory={(id) => { setStoryId(id); setView("story"); }} />;
  if (view === "story") return <StoryDetail storyId={storyId} onBack={() => setView("home")} onStories={() => setView("stories")} />;
  if (view === "track") return <TrackOrder onBack={() => setView("home")} />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes carDrive { 0%{left:0;transform:scaleX(1);} 47%{left:calc(100% - 44px);transform:scaleX(1);} 50%{left:calc(100% - 44px);transform:scaleX(-1);} 97%{left:0;transform:scaleX(-1);} 100%{left:0;transform:scaleX(1);} }
        @keyframes carBob { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-1px);} }
        @keyframes wheelSpin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
        html { scroll-behavior:smooth; }

        .lp-wrap { width:100%; background:#F3EFE6; font-family:'Syne',sans-serif; color:#1A1A1A; overflow-x:hidden; }

        .reveal { opacity:0; transform:translateY(28px); transition:opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1); }
        .reveal.revealed { opacity:1; transform:translateY(0); }
        .stagger.revealed > *:nth-child(1){transition-delay:0ms;}
        .stagger.revealed > *:nth-child(2){transition-delay:100ms;}
        .stagger.revealed > *:nth-child(3){transition-delay:200ms;}

        /* NAV */
        .lp-nav { position:sticky; top:0; z-index:20; display:flex; align-items:center; justify-content:space-between; padding:1.25rem 2.5rem; background:rgba(243,239,230,0.92); backdrop-filter:blur(8px); border-bottom:1px solid #E2DCC9; }
        .lp-logo { font-size:1.05rem; font-weight:800; letter-spacing:-0.01em; color:#1A1A1A; }
        .lp-logo span { color:#C9A84C; }
        .lp-nav-links { display:flex; gap:2rem; }
        .lp-nav-links a, .lp-nav-links button { font-family:'DM Mono',monospace; font-size:0.72rem; letter-spacing:0.05em; text-transform:uppercase; color:#5A5A52; background:none; border:none; cursor:pointer; transition:color 0.2s; }
        .lp-nav-links a:hover, .lp-nav-links button:hover { color:#1A1A1A; }
        @media(max-width:680px){ .lp-nav-links { display:none; } }

        /* HERO */
        .lp-hero { padding:7rem 2.5rem 5rem; max-width:1100px; margin:0 auto; }
        .lp-hero-eyebrow { font-family:'DM Mono',monospace; font-size:0.72rem; letter-spacing:0.15em; text-transform:uppercase; color:#C9A84C; margin-bottom:1.25rem; animation:fadeUp 0.7s ease both; }
        .lp-hero-title { font-size:clamp(2.4rem,6vw,4.2rem); font-weight:700; line-height:1.05; letter-spacing:-0.02em; color:#1A1A1A; max-width:760px; animation:fadeUp 0.8s 0.1s ease both; }
        .lp-hero-sub { font-family:'DM Mono',monospace; font-size:0.9rem; color:#6B6B60; max-width:520px; line-height:1.7; margin-top:1.5rem; animation:fadeUp 0.8s 0.2s ease both; }
        .lp-hero-cta { display:flex; gap:1rem; margin-top:2.5rem; flex-wrap:wrap; animation:fadeUp 0.8s 0.3s ease both; }
        .lp-btn { font-family:'DM Mono',monospace; font-size:0.72rem; letter-spacing:0.08em; text-transform:uppercase; padding:0.85rem 1.75rem; border-radius:3px; cursor:pointer; transition:all 0.2s; }
        .lp-btn.fill { background:#1A1A1A; color:#F3EFE6; border:1px solid #1A1A1A; }
        .lp-btn.fill:hover { background:#C9A84C; border-color:#C9A84C; color:#1A1A1A; }
        .lp-btn.ghost { background:transparent; color:#1A1A1A; border:1px solid #1A1A1A; }
        .lp-btn.ghost:hover { background:#1A1A1A; color:#F3EFE6; }

        .lp-walker-wrap { position:relative; height:24px; margin:2rem 0 0; overflow:visible; width:200px; }
        .lp-walker { position:absolute; top:0; left:0; animation:carDrive 9s linear infinite; }
        .lp-car-svg { animation:carBob 0.8s ease-in-out infinite; overflow:visible; }
        .lp-wheel-f { animation:wheelSpin 1.5s linear infinite; transform-origin:9px 18px; }
        .lp-wheel-r { animation:wheelSpin 1.5s linear infinite; transform-origin:32px 18px; }

        /* MANIFESTO */
        .lp-manifesto { max-width:1100px; margin:0 auto; padding:4rem 2.5rem; border-top:1px solid #E2DCC9; display:grid; grid-template-columns:200px 1fr; gap:2rem; }
        @media(max-width:680px){ .lp-manifesto { grid-template-columns:1fr; } }
        .lp-manifesto-label { font-family:'DM Mono',monospace; font-size:0.7rem; letter-spacing:0.15em; text-transform:uppercase; color:#C9A84C; }
        .lp-manifesto-text { font-size:clamp(1.3rem,2.8vw,1.9rem); font-weight:600; line-height:1.4; letter-spacing:-0.01em; color:#1A1A1A; }
        .lp-manifesto-text .dim { color:#9A958A; }

        /* SERVICES — numbered like 001/002/003 */
        .lp-services { max-width:1100px; margin:0 auto; padding:1rem 2.5rem 4rem; border-top:1px solid #E2DCC9; }
        .lp-services-heading { font-family:'DM Mono',monospace; font-size:0.7rem; letter-spacing:0.15em; text-transform:uppercase; color:#9A958A; padding:2rem 0 1rem; }
        .lp-service-row { display:grid; grid-template-columns:90px 1fr 200px; gap:1.5rem; align-items:start; padding:2rem 0; border-top:1px solid #E2DCC9; cursor:pointer; transition:background 0.2s; }
        @media(max-width:680px){ .lp-service-row { grid-template-columns:60px 1fr; } .lp-service-row > *:nth-child(3){ display:none; } }
        .lp-service-row:hover { background:#EAE4D4; }
        .lp-service-num { font-family:'DM Mono',monospace; font-size:0.78rem; color:#C9A84C; padding-top:0.2rem; }
        .lp-service-body h3 { font-size:1.3rem; font-weight:700; margin-bottom:0.5rem; color:#1A1A1A; }
        .lp-service-body p { font-family:'DM Mono',monospace; font-size:0.78rem; color:#6B6B60; line-height:1.6; max-width:480px; }
        .lp-service-tags { display:flex; flex-direction:column; gap:0.3rem; align-items:flex-end; }
        .lp-service-tag { font-family:'DM Mono',monospace; font-size:0.65rem; color:#9A958A; letter-spacing:0.05em; }
        .lp-service-link { font-family:'DM Mono',monospace; font-size:0.7rem; color:#1A1A1A; margin-top:0.5rem; display:flex; align-items:center; gap:6px; }
        .lp-service-link::after { content:'→'; transition:transform 0.2s; }
        .lp-service-row:hover .lp-service-link::after { transform:translateX(4px); }

        /* PROCESS — 1,2,3,4 steps */
        .lp-process { max-width:1100px; margin:0 auto; padding:4rem 2.5rem; border-top:1px solid #E2DCC9; }
        .lp-process-heading { font-family:'DM Mono',monospace; font-size:0.7rem; letter-spacing:0.15em; text-transform:uppercase; color:#9A958A; margin-bottom:2.5rem; }
        .lp-process-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:2rem; }
        @media(max-width:760px){ .lp-process-grid { grid-template-columns:1fr 1fr; } }
        @media(max-width:480px){ .lp-process-grid { grid-template-columns:1fr; } }
        .lp-process-num { font-size:2.2rem; font-weight:800; color:#E2DCC9; margin-bottom:0.75rem; line-height:1; }
        .lp-process-title { font-size:1.05rem; font-weight:700; color:#1A1A1A; margin-bottom:0.5rem; }
        .lp-process-desc { font-family:'DM Mono',monospace; font-size:0.76rem; color:#6B6B60; line-height:1.6; }

        /* TESTIMONIALS */
        .lp-testimonials { max-width:1100px; margin:0 auto; padding:4rem 2.5rem; border-top:1px solid #E2DCC9; }
        .lp-test-heading { font-family:'DM Mono',monospace; font-size:0.7rem; letter-spacing:0.15em; text-transform:uppercase; color:#9A958A; margin-bottom:2.5rem; }
        .lp-test-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem; }
        @media(max-width:760px){ .lp-test-grid { grid-template-columns:1fr; } }
        .lp-test-card { background:#FAF7F0; border:1px solid #E2DCC9; border-radius:3px; padding:1.75rem; }
        .lp-test-text { font-size:0.92rem; line-height:1.6; color:#2A2A24; margin-bottom:1.25rem; }
        .lp-test-name { font-family:'DM Mono',monospace; font-size:0.72rem; font-weight:500; color:#1A1A1A; }
        .lp-test-role { font-family:'DM Mono',monospace; font-size:0.68rem; color:#9A958A; margin-top:0.15rem; }

        /* CONTACT */
        .lp-contact { max-width:1100px; margin:0 auto; padding:4rem 2.5rem 5rem; border-top:1px solid #E2DCC9; text-align:center; }
        .lp-contact-eyebrow { font-family:'DM Mono',monospace; font-size:0.7rem; letter-spacing:0.15em; text-transform:uppercase; color:#C9A84C; margin-bottom:1rem; }
        .lp-contact-title { font-size:clamp(1.8rem,4vw,2.6rem); font-weight:700; color:#1A1A1A; margin-bottom:2.5rem; }
        .lp-wa-row { display:flex; gap:1rem; justify-content:center; flex-wrap:wrap; }
        .lp-wa-btn { display:flex; align-items:center; gap:0.6rem; background:#FAF7F0; border:1px solid #E2DCC9; border-radius:3px; padding:0.75rem 1.5rem; text-decoration:none; transition:all 0.2s; }
        .lp-wa-btn:hover { border-color:#C9A84C; transform:translateY(-2px); }
        .lp-wa-region { font-family:'DM Mono',monospace; font-size:0.62rem; color:#9A958A; letter-spacing:0.08em; text-transform:uppercase; }
        .lp-wa-number { font-family:'DM Mono',monospace; font-size:0.78rem; color:#1A1A1A; }

        .lp-admin-box { max-width:280px; margin:2rem auto 0; }
        .lp-pw-input { width:100%; background:#fff; border:1px solid #D8D2BE; color:#1A1A1A; font-family:'DM Mono',monospace; font-size:0.85rem; padding:0.65rem 1rem; border-radius:3px; outline:none; margin-bottom:0.5rem; }
        .lp-pw-input:focus { border-color:#C9A84C; }
        .lp-pw-error { font-family:'DM Mono',monospace; font-size:0.7rem; color:#C0392B; margin-top:0.4rem; }

        .lp-footer { text-align:center; padding:2rem; font-family:'DM Mono',monospace; font-size:0.65rem; color:#9A958A; letter-spacing:0.08em; border-top:1px solid #E2DCC9; }
      `}</style>

      <div className="lp-wrap">

        {/* NAV */}
        <nav className="lp-nav">
          <div className="lp-logo">SPARES<span>ANYWHERE</span></div>
          <div className="lp-nav-links">
            <button onClick={() => setView("garage")}>Garage Portal</button>
            <button onClick={() => setView("stories")}>Stories</button>
            <button onClick={() => setView("track")}>Track Order</button>
          </div>
        </nav>

        {/* HERO */}
        <div className="lp-hero">
          <div className="lp-hero-eyebrow">Automotive Parts · London · Dubai · Lagos</div>
          <h1 className="lp-hero-title">We find the part your garage can't.</h1>
          <p className="lp-hero-sub">SpareAnywhere sources OEM and aftermarket parts across three markets — built for garages that need the rare part, not just the easy one.</p>
          <div className="lp-hero-cta">
            <button className="lp-btn fill" onClick={() => setView("garage")}>Submit a Request</button>
            <button className="lp-btn ghost" onClick={() => setView("track")}>Track an Order</button>
          </div>
          <div className="lp-walker-wrap">
            <div className="lp-walker">
              <svg className="lp-car-svg" viewBox="0 0 44 24" width="44" height="24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2,16 4,9 11,9 15,4 29,4 33,9 40,9 42,16" />
                <line x1="2" y1="16" x2="5" y2="16" />
                <line x1="13" y1="16" x2="28" y2="16" />
                <line x1="36" y1="16" x2="42" y2="16" />
                <g className="lp-wheel-f"><circle cx="9" cy="18" r="4" /><line x1="9" y1="14" x2="9" y2="22" /><line x1="5" y1="18" x2="13" y2="18" /></g>
                <g className="lp-wheel-r"><circle cx="32" cy="18" r="4" /><line x1="32" y1="14" x2="32" y2="22" /><line x1="28" y1="18" x2="36" y2="18" /></g>
              </svg>
            </div>
          </div>
        </div>

        {/* MANIFESTO */}
        <div className="lp-manifesto reveal">
          <div className="lp-manifesto-label">manifesto</div>
          <div className="lp-manifesto-text">
            We don't treat sourcing as a commodity.<br/>
            <span className="dim">Every part has a story — where it came from, who needs it, why it matters.</span><br/>
            We find it properly, or we don't take the job.
          </div>
        </div>

        {/* SERVICES */}
        <div className="lp-services">
          <div className="lp-services-heading reveal">how we can help</div>

          <div className="lp-service-row reveal" onClick={() => setView("garage")}>
            <div className="lp-service-num">001</div>
            <div className="lp-service-body">
              <h3>Garage Portal</h3>
              <p>Submit part requests, upload VIN plates or reference photos, and get a quote within 48 hours.</p>
              <div className="lp-service-link">Open Portal</div>
            </div>
            <div className="lp-service-tags">
              <span className="lp-service-tag">VIN UPLOAD</span>
              <span className="lp-service-tag">PHOTO REFERENCE</span>
              <span className="lp-service-tag">48H QUOTE</span>
            </div>
          </div>

          <div className="lp-service-row reveal" onClick={() => setView("stories")}>
            <div className="lp-service-num">002</div>
            <div className="lp-service-body">
              <h3>Sourcing Stories</h3>
              <p>Real jobs, rare parts, and how we tracked them down across London, Dubai, and Lagos.</p>
              <div className="lp-service-link">Read Stories</div>
            </div>
            <div className="lp-service-tags">
              <span className="lp-service-tag">CASE STUDIES</span>
              <span className="lp-service-tag">REAL ORDERS</span>
            </div>
          </div>

          <div className="lp-service-row reveal" onClick={() => setView("track")}>
            <div className="lp-service-num">003</div>
            <div className="lp-service-body">
              <h3>Track Your Order</h3>
              <p>Enter your Order ID and see exactly where your part is — pending, quoted, sourcing, or fulfilled.</p>
              <div className="lp-service-link">Track Now</div>
            </div>
            <div className="lp-service-tags">
              <span className="lp-service-tag">LIVE STATUS</span>
              <span className="lp-service-tag">NO LOGIN</span>
            </div>
          </div>

          {isAdminDevice && (
            <div className="lp-admin-box">
              <input className="lp-pw-input" type="password" placeholder="Admin password…" value={adminPw}
                onChange={e => { setAdminPw(e.target.value); setPwError(false); }}
                onKeyDown={e => e.key === "Enter" && enterAdmin()} />
              <button className="lp-btn fill" style={{width:"100%"}} onClick={enterAdmin}>Enter Admin →</button>
              {pwError && <div className="lp-pw-error">Incorrect password</div>}
            </div>
          )}
        </div>

        {/* PROCESS */}
        <div className="lp-process">
          <div className="lp-process-heading reveal">the process</div>
          <div className="lp-process-grid reveal stagger">
            <div>
              <div className="lp-process-num">1</div>
              <div className="lp-process-title">Submit the request</div>
              <div className="lp-process-desc">Tell us the part, the car, and upload a reference photo if you have one.</div>
            </div>
            <div>
              <div className="lp-process-num">2</div>
              <div className="lp-process-title">We source it</div>
              <div className="lp-process-desc">We check our network across London, Dubai, and Lagos for the fastest route.</div>
            </div>
            <div>
              <div className="lp-process-num">3</div>
              <div className="lp-process-title">You get a quote</div>
              <div className="lp-process-desc">Usually within 48 hours — OEM or aftermarket, your choice.</div>
            </div>
            <div>
              <div className="lp-process-num">4</div>
              <div className="lp-process-title">Delivered</div>
              <div className="lp-process-desc">Track it the whole way, right up to your garage door.</div>
            </div>
          </div>
        </div>

        {/* TESTIMONIALS */}
        <div className="lp-testimonials">
          <div className="lp-test-heading reveal">what garages say</div>
          <div className="lp-test-grid reveal stagger">
            <div className="lp-test-card">
              <p className="lp-test-text">"Needed a part nobody in Lagos stocked. Had it sourced from the UK in under two weeks."</p>
              <div className="lp-test-name">Workshop Owner</div>
              <div className="lp-test-role">Victoria Island, Lagos</div>
            </div>
            <div className="lp-test-card">
              <p className="lp-test-text">"Quick responses, fair quotes, and they actually find the rare stuff other suppliers give up on."</p>
              <div className="lp-test-name">Garage Manager</div>
              <div className="lp-test-role">Lekki, Lagos</div>
            </div>
            <div className="lp-test-card">
              <p className="lp-test-text">"Tracked our order the whole way through. No chasing, no guessing — just knew where it was."</p>
              <div className="lp-test-name">Fleet Operator</div>
              <div className="lp-test-role">Ikeja, Lagos</div>
            </div>
          </div>
        </div>

        {/* CONTACT */}
        <div className="lp-contact reveal">
          <div className="lp-contact-eyebrow">contact</div>
          <div className="lp-contact-title">Talk to us on WhatsApp.</div>
          <div className="lp-wa-row">
            <a className="lp-wa-btn" href="https://wa.me/447494806066" target="_blank" rel="noopener noreferrer">
              <span>💬</span>
              <div><div className="lp-wa-region">London</div><div className="lp-wa-number">+44 7494 806066</div></div>
            </a>
            <a className="lp-wa-btn" href="https://wa.me/2349168340653" target="_blank" rel="noopener noreferrer">
              <span>💬</span>
              <div><div className="lp-wa-region">Lagos</div><div className="lp-wa-number">+234 9168 340653</div></div>
            </a>
            <a className="lp-wa-btn" href="https://wa.me/971557997247" target="_blank" rel="noopener noreferrer">
              <span>💬</span>
              <div><div className="lp-wa-region">Dubai</div><div className="lp-wa-number">+971 557 997247</div></div>
            </a>
          </div>
        </div>

        <div className="lp-footer">SPARESANYWHERE © {new Date().getFullYear()} — LONDON · DUBAI · LAGOS</div>

      </div>
    </>
  );
}

// ─── PUBLIC STORIES PAGE ──────────────────────────────────────────────────────
function StoriesPage({ onBack, onStory }) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState("All");

  useEffect(() => {
    loadStories(false).then(s => { setStories(s); setLoading(false); });
  }, []);

  const filtered = activeTag === "All" ? stories : stories.filter(s => s.tag === activeTag);
  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <>
      <style>{FONT}{BASE}{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .str-page { width:100%; min-height:100vh; background:#171717; font-family:'Syne',sans-serif; color:#F5F0E8; }
        .str-nav { border-bottom:1px solid #2C2C2C; padding:1.2rem 2rem; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; background:#171717; }
        .str-logo { font-size:1.1rem; font-weight:800; color:#F5F0E8; letter-spacing:-0.02em; cursor:pointer; }
        .str-logo span { color:#C9A84C; }
        .str-nav-btn { font-family:'DM Mono',monospace; font-size:0.7rem; letter-spacing:0.1em; text-transform:uppercase; background:none; border:1px solid #3A3A3A; padding:0.4rem 1rem; border-radius:2px; cursor:pointer; transition:all 0.2s; color:#F5F0E8; }
        .str-nav-btn:hover { border-color:#C9A84C; color:#C9A84C; }
        .str-header { max-width:1100px; margin:0 auto; padding:4rem 2rem 2.5rem; border-bottom:1px solid #2C2C2C; animation:fadeUp 0.5s ease both; }
        .str-eyebrow { font-family:'DM Mono',monospace; font-size:0.65rem; letter-spacing:0.2em; text-transform:uppercase; color:#C9A84C; margin-bottom:1rem; }
        .str-h1 { font-family:'Playfair Display',serif; font-size:clamp(2rem,5vw,3.5rem); font-weight:500; line-height:1.15; letter-spacing:-1px; color:#F5F0E8; margin-bottom:1rem; }
        .str-sub { font-family:'DM Mono',monospace; font-size:0.72rem; color:#9A9A9A; max-width:480px; line-height:1.7; }
        .str-filters { max-width:1100px; margin:0 auto; padding:1.5rem 2rem; display:flex; gap:0.6rem; flex-wrap:wrap; }
        .str-tag { font-family:'DM Mono',monospace; font-size:0.65rem; letter-spacing:0.1em; text-transform:uppercase; padding:0.45rem 1rem; border:1px solid #3A3A3A; border-radius:2px; background:none; color:#9A9A9A; cursor:pointer; transition:all 0.15s; }
        .str-tag:hover { border-color:#9A9A9A; color:#F5F0E8; }
        .str-tag.active { background:#C9A84C; border-color:#C9A84C; color:#171717; }
        .str-body { max-width:1100px; margin:0 auto; padding:0 2rem 5rem; }
        .str-featured { display:grid; grid-template-columns:1fr 1fr; border:1px solid #2C2C2C; border-radius:2px; overflow:hidden; margin-bottom:1.5rem; cursor:pointer; transition:border-color 0.2s; animation:fadeUp 0.5s 0.1s ease both; opacity:0; animation-fill-mode:forwards; }
        .str-featured:hover { border-color:#C9A84C; }
        @media(max-width:680px){ .str-featured { grid-template-columns:1fr; } }
        .str-feat-img { background:#222222; min-height:300px; display:flex; flex-direction:column; align-items:flex-start; justify-content:space-between; padding:2rem; position:relative; overflow:hidden; }
        .str-feat-img img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0.45; }
        .str-feat-pattern { position:absolute; inset:0; opacity:0.03; background-image:repeating-linear-gradient(45deg,#C9A84C 0,#C9A84C 1px,transparent 0,transparent 50%); background-size:24px 24px; }
        .str-feat-badge { position:relative; z-index:1; font-family:'DM Mono',monospace; font-size:0.6rem; letter-spacing:0.15em; text-transform:uppercase; border:1px solid #4A4A4A; padding:0.35rem 0.8rem; border-radius:2px; color:#BBBBBB; }
        .str-feat-emoji { position:relative; z-index:1; font-size:3.5rem; line-height:1; }
        .str-feat-content { padding:2.5rem; display:flex; flex-direction:column; justify-content:center; background:#1E1E1E; }
        .str-story-meta { display:flex; gap:10px; align-items:center; margin-bottom:1rem; flex-wrap:wrap; }
        .str-story-tag { font-family:'DM Mono',monospace; font-size:0.6rem; letter-spacing:0.12em; text-transform:uppercase; color:#C9A84C; }
        .str-dot { width:3px; height:3px; border-radius:50%; background:#4A4A4A; flex-shrink:0; }
        .str-date { font-family:'DM Mono',monospace; font-size:0.6rem; color:#888888; }
        .str-feat-title { font-family:'Playfair Display',serif; font-size:clamp(1.2rem,2.5vw,1.6rem); font-weight:500; line-height:1.3; letter-spacing:-0.3px; color:#F5F0E8; margin-bottom:0.75rem; }
        .str-feat-excerpt { font-family:'DM Mono',monospace; font-size:0.72rem; color:#AAAAAA; line-height:1.7; margin-bottom:1.5rem; }
        .str-read-link { font-family:'DM Mono',monospace; font-size:0.68rem; letter-spacing:0.1em; text-transform:uppercase; color:#C9A84C; display:flex; align-items:center; gap:6px; }
        .str-read-link::after { content:'→'; transition:transform 0.2s; }
        .str-featured:hover .str-read-link::after { transform:translateX(4px); }
        .str-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; }
        @media(max-width:800px){ .str-grid { grid-template-columns:repeat(2,1fr); } }
        @media(max-width:520px){ .str-grid { grid-template-columns:1fr; } }
        .str-card { border:1px solid #2C2C2C; border-radius:2px; overflow:hidden; cursor:pointer; transition:all 0.2s; background:#1E1E1E; }
        .str-card:hover { border-color:#C9A84C; transform:translateY(-2px); }
        .str-card-top { height:160px; background:#222222; display:flex; align-items:center; justify-content:center; font-size:2.5rem; border-bottom:1px solid #2C2C2C; position:relative; overflow:hidden; }
        .str-card-top img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0.45; }
        .str-card-pattern { position:absolute; inset:0; opacity:0.03; background-image:repeating-linear-gradient(45deg,#C9A84C 0,#C9A84C 1px,transparent 0,transparent 50%); background-size:16px 16px; }
        .str-card-emoji { position:relative; z-index:1; }
        .str-card-body { padding:1.25rem; }
        .str-card-title { font-family:'Playfair Display',serif; font-size:1rem; font-weight:500; line-height:1.4; color:#F5F0E8; margin-bottom:0.6rem; }
        .str-card-excerpt { font-family:'DM Mono',monospace; font-size:0.65rem; color:#9A9A9A; line-height:1.65; }
        .str-empty { text-align:center; padding:5rem 1rem; font-family:'DM Mono',monospace; font-size:0.75rem; color:#4A4A4A; }
        .str-loading { text-align:center; padding:5rem 1rem; font-family:'DM Mono',monospace; font-size:0.75rem; color:#888888; letter-spacing:0.1em; }
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
          {loading ? (
            <div className="str-loading">Loading stories…</div>
          ) : filtered.length === 0 ? (
            <div className="str-empty">No stories yet. Check back soon.</div>
          ) : (
            <>
              {featured && (
                <div className="str-featured" onClick={() => onStory(featured.id)}>
                  <div className="str-feat-img">
                    {featured.content?.find(b => b.type === "image") && (
                      <img src={featured.content.find(b => b.type === "image").data} alt="" />
                    )}
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
                      <span className="str-date">{featured.read_time}</span>
                    </div>
                    <h2 className="str-feat-title">{featured.title}</h2>
                    <p className="str-feat-excerpt">{featured.excerpt}</p>
                    <span className="str-read-link">Read the story</span>
                  </div>
                </div>
              )}
              {rest.length > 0 && (
                <div className="str-grid">
                  {rest.map(s => {
                    const firstImg = s.content?.find(b => b.type === "image");
                    return (
                      <div key={s.id} className="str-card" onClick={() => onStory(s.id)}>
                        <div className="str-card-top">
                          {firstImg ? <img src={firstImg.data} alt="" /> : <div className="str-card-pattern" />}
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
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── PUBLIC STORY DETAIL ──────────────────────────────────────────────────────
function StoryDetail({ storyId, onBack, onStories }) {
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStories(false).then(all => {
      setStory(all.find(s => s.id === storyId) || null);
      setLoading(false);
    });
  }, [storyId]);

  if (loading) return (
    <div style={{background:"#171717",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={{fontFamily:"'DM Mono',monospace",color:"#888888",fontSize:"0.75rem",letterSpacing:"0.1em"}}>Loading…</p>
    </div>
  );
  if (!story) return (
    <div style={{background:"#171717",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={{fontFamily:"'DM Mono',monospace",color:"#888888",fontSize:"0.75rem"}}>Story not found.</p>
    </div>
  );

  return (
    <>
      <style>{FONT}{BASE}{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .sd-page { width:100%; min-height:100vh; background:#171717; font-family:'Syne',sans-serif; color:#F5F0E8; }
        .sd-nav { border-bottom:1px solid #2C2C2C; padding:1.2rem 2rem; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; background:#171717; }
        .sd-logo { font-size:1.1rem; font-weight:800; color:#F5F0E8; letter-spacing:-0.02em; cursor:pointer; }
        .sd-logo span { color:#C9A84C; }
        .sd-nav-btn { font-family:'DM Mono',monospace; font-size:0.7rem; letter-spacing:0.1em; text-transform:uppercase; background:none; border:1px solid #3A3A3A; padding:0.4rem 1rem; border-radius:2px; cursor:pointer; transition:all 0.2s; color:#F5F0E8; }
        .sd-nav-btn:hover { border-color:#C9A84C; color:#C9A84C; }
        .sd-article { max-width:680px; margin:0 auto; padding:3.5rem 2rem 6rem; animation:fadeUp 0.5s ease both; }
        .sd-breadcrumb { font-family:'DM Mono',monospace; font-size:0.65rem; letter-spacing:0.12em; text-transform:uppercase; color:#888888; margin-bottom:2rem; display:flex; gap:8px; align-items:center; cursor:pointer; transition:color 0.2s; }
        .sd-breadcrumb:hover { color:#C9A84C; }
        .sd-breadcrumb::before { content:'←'; }
        .sd-eyebrow { font-family:'DM Mono',monospace; font-size:0.62rem; letter-spacing:0.18em; text-transform:uppercase; color:#C9A84C; margin-bottom:1rem; }
        .sd-title { font-family:'Playfair Display',serif; font-size:clamp(1.6rem,4vw,2.5rem); font-weight:500; line-height:1.2; letter-spacing:-0.5px; color:#F5F0E8; margin-bottom:1.5rem; }
        .sd-meta { display:flex; gap:1.2rem; align-items:center; padding:1rem 0; border-top:1px solid #2C2C2C; border-bottom:1px solid #2C2C2C; margin-bottom:2.5rem; flex-wrap:wrap; }
        .sd-meta-item { font-family:'DM Mono',monospace; font-size:0.65rem; letter-spacing:0.05em; color:#9A9A9A; }
        .sd-meta-item strong { color:#BBBBBB; font-weight:500; }
        .sd-lede { font-family:'Playfair Display',serif; font-size:1.1rem; font-weight:400; font-style:italic; color:#BBBBBB; line-height:1.7; margin-bottom:2rem; padding-bottom:2rem; border-bottom:1px solid #2C2C2C; }
        .sd-section-heading { font-family:'Syne',sans-serif; font-size:0.68rem; font-weight:700; letter-spacing:0.15em; text-transform:uppercase; color:#C9A84C; margin:2.5rem 0 1rem; }
        .sd-para { font-family:'DM Mono',monospace; font-size:0.78rem; color:#BBBBBB; line-height:1.9; margin-bottom:1.25rem; font-weight:300; }
        .sd-callout { border-left:2px solid #C9A84C; padding:1rem 1.5rem; background:#0D0B07; margin:2rem 0; border-radius:0 2px 2px 0; }
        .sd-callout p { font-family:'Playfair Display',serif; font-style:italic; font-size:1rem; color:#C9A84C; margin:0; line-height:1.6; }
        .sd-img { width:100%; border-radius:2px; margin:2rem 0 0.5rem; border:1px solid #2C2C2C; object-fit:cover; max-height:420px; }
        .sd-img-caption { font-family:'DM Mono',monospace; font-size:0.62rem; color:#888888; text-align:center; margin-bottom:2rem; letter-spacing:0.05em; }
        .sd-outcome { background:#1E1E1E; border:1px solid #2C2C2C; border-radius:2px; padding:1.5rem; margin:2.5rem 0; }
        .sd-outcome-label { font-family:'DM Mono',monospace; font-size:0.6rem; letter-spacing:0.2em; text-transform:uppercase; color:#C9A84C; margin-bottom:1rem; }
        .sd-outcome-row { display:flex; justify-content:space-between; align-items:flex-start; padding:0.65rem 0; border-bottom:1px solid #141414; gap:1rem; }
        .sd-outcome-row:last-child { border:none; padding-bottom:0; }
        .sd-outcome-key { font-family:'DM Mono',monospace; font-size:0.65rem; color:#888888; flex-shrink:0; }
        .sd-outcome-val { font-family:'DM Mono',monospace; font-size:0.65rem; color:#F5F0E8; font-weight:500; text-align:right; }
        .sd-footer { margin-top:4rem; padding-top:2rem; border-top:1px solid #2C2C2C; display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap; }
        .sd-footer-btn { font-family:'DM Mono',monospace; font-size:0.65rem; letter-spacing:0.12em; text-transform:uppercase; background:none; border:1px solid #3A3A3A; color:#F5F0E8; padding:0.6rem 1.25rem; border-radius:2px; cursor:pointer; transition:all 0.2s; }
        .sd-footer-btn:hover { border-color:#C9A84C; color:#C9A84C; }
        .sd-footer-btn.primary { background:#C9A84C; border-color:#C9A84C; color:#171717; font-weight:700; }
        .sd-footer-btn.primary:hover { opacity:0.85; color:#171717; }
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
            <span className="sd-meta-item"><strong>{story.read_time}</strong></span>
            <span className="sd-meta-item">·</span>
            <span className="sd-meta-item">Sourced from <strong>{story.location}</strong></span>
          </div>
          <p className="sd-lede">{story.lede}</p>
          {story.content?.map((block, i) => {
            if (block.type === "section") return (
              <div key={i}>
                <h3 className="sd-section-heading">{block.heading}</h3>
                <p className="sd-para">{block.text}</p>
              </div>
            );
            if (block.type === "callout") return (
              <div key={i} className="sd-callout"><p>"{block.text}"</p></div>
            );
            if (block.type === "image") return (
              <div key={i}>
                <img className="sd-img" src={block.data} alt={block.caption || ""} />
                {block.caption && <p className="sd-img-caption">{block.caption}</p>}
              </div>
            );
            return null;
          })}
          {story.outcome && Object.keys(story.outcome).length > 0 && (
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

// ─── TRACK ORDER ──────────────────────────────────────────────────────────────
const STATUS_FLOW = ["pending", "quoted", "confirmed", "sourcing", "fulfilled"];

function TrackOrder({ onBack }) {
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  async function handleTrack() {
    if (!orderId.trim()) return;
    setSearching(true); setError(""); setOrder(null); setProgress(0);
    try {
      const results = await sbFetch(`/orders?id=eq.${encodeURIComponent(orderId.trim().toUpperCase())}`);
      if (results.length === 0) {
        setError("No order found with that ID. Double check it and try again.");
      } else {
        const o = mapOrder(results[0]);
        setOrder(o);
        const idx = o.status === "cancelled" ? -1 : STATUS_FLOW.indexOf(o.status);
        const pct = idx < 0 ? 0 : (idx / (STATUS_FLOW.length - 1)) * 100;
        setTimeout(() => setProgress(pct), 150);
      }
    } catch (e) {
      setError("Something went wrong. Check your connection and try again.");
    }
    setSearching(false);
  }

  const currentIdx = order ? STATUS_FLOW.indexOf(order.status) : -1;

  return (
    <>
      <style>{FONT}{BASE}{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { box-shadow:0 0 0 0 rgba(201,168,76,0.5); } 50% { box-shadow:0 0 0 8px rgba(201,168,76,0); } }
        .trk-page { min-height:100vh; background:#171717; font-family:'Syne',sans-serif; }
        .trk-hdr { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 2rem; border-bottom:1px solid #2C2C2C; }
        .trk-logo { font-size:1.1rem; font-weight:800; color:#F5F0E8; }
        .trk-logo span { color:#C9A84C; }
        .trk-back { font-family:'DM Mono',monospace; font-size:0.72rem; cursor:pointer; letter-spacing:0.1em; text-transform:uppercase; border:1px solid #3A3A3A; padding:0.4rem 0.9rem; border-radius:2px; background:none; transition:all 0.2s; color:#F5F0E8; }
        .trk-back:hover { border-color:#C9A84C; color:#C9A84C; }
        .trk-body { max-width:560px; margin:0 auto; padding:3.5rem 1.5rem 5rem; animation:fadeUp 0.5s ease both; }
        .trk-h1 { font-size:1.6rem; font-weight:800; color:#F5F0E8; margin-bottom:0.5rem; letter-spacing:-0.02em; }
        .trk-sub { font-family:'DM Mono',monospace; font-size:0.78rem; color:#AAAAAA; margin-bottom:2rem; line-height:1.6; }
        .trk-row { display:flex; gap:0.6rem; margin-bottom:0.75rem; }
        .trk-input { flex:1; background:#222222; border:1px solid #3A3A3A; color:#F5F0E8; font-family:'DM Mono',monospace; font-size:0.9rem; padding:0.8rem 1rem; border-radius:2px; outline:none; transition:border-color 0.2s; text-transform:uppercase; }
        .trk-input:focus { border-color:#C9A84C; }
        .trk-btn { background:#C9A84C; color:#171717; border:none; font-family:'Syne',sans-serif; font-weight:800; font-size:0.85rem; padding:0 1.5rem; cursor:pointer; border-radius:2px; transition:opacity 0.2s; white-space:nowrap; }
        .trk-btn:hover:not(:disabled) { opacity:0.85; }
        .trk-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .trk-err { font-family:'DM Mono',monospace; font-size:0.75rem; color:#EF4444; margin-bottom:1rem; }
        .trk-result { background:#222222; border:1px solid #2C2C2C; border-radius:2px; padding:1.75rem; margin-top:2rem; animation:fadeUp 0.5s ease both; }
        .trk-oid { font-family:'DM Mono',monospace; font-size:0.75rem; color:#C9A84C; margin-bottom:0.3rem; }
        .trk-part { font-size:1.15rem; font-weight:800; color:#F5F0E8; margin-bottom:0.25rem; }
        .trk-car { font-family:'DM Mono',monospace; font-size:0.78rem; color:#BBBBBB; margin-bottom:2rem; }
        .trk-timeline { position:relative; padding:0 4px; margin-bottom:2rem; }
        .trk-track-bg { position:absolute; top:13px; left:14px; right:14px; height:2px; background:#3A3A3A; }
        .trk-track-fill { position:absolute; top:13px; left:14px; height:2px; background:#C9A84C; transition:width 1.4s cubic-bezier(0.4,0,0.2,1); width:0%; }
        .trk-steps { display:flex; justify-content:space-between; position:relative; }
        .trk-step { text-align:center; flex:1; }
        .trk-dot { width:26px; height:26px; border-radius:50%; margin:0 auto 8px; border:2px solid #3A3A3A; background:#171717; transition:all 0.4s ease; display:flex; align-items:center; justify-content:center; font-size:0.7rem; }
        .trk-dot.done { background:#C9A84C; border-color:#C9A84C; color:#171717; }
        .trk-dot.current { background:#C9A84C; border-color:#C9A84C; color:#171717; animation:pulse 1.8s infinite; }
        .trk-step-lbl { font-family:'DM Mono',monospace; font-size:0.62rem; letter-spacing:0.05em; text-transform:uppercase; color:#9A9A9A; }
        .trk-step-lbl.active { color:#C9A84C; font-weight:500; }
        .trk-quote { font-family:'DM Mono',monospace; font-size:0.82rem; color:#10B981; background:#0A1A0F; border:1px solid #1A3A1F; padding:0.75rem 1rem; border-radius:2px; margin-top:1.5rem; }
        .trk-cancelled { font-family:'DM Mono',monospace; font-size:0.82rem; color:#EF4444; background:#1A0505; border:1px solid #3A1A1A; padding:0.75rem 1rem; border-radius:2px; text-align:center; }
        .trk-hint { font-family:'DM Mono',monospace; font-size:0.68rem; color:#888888; margin-top:1.5rem; line-height:1.6; }
      `}</style>
      <div className="trk-page">
        <div className="trk-hdr">
          <div className="trk-logo">SPARES<span>ANYWHERE</span></div>
          <button className="trk-back" onClick={onBack}>← Home</button>
        </div>
        <div className="trk-body">
          <div className="trk-h1">Track Your Order</div>
          <div className="trk-sub">Enter the Order ID from your confirmation to see live status.</div>
          <div className="trk-row">
            <input
              className="trk-input"
              placeholder="e.g. ORD-AB12CD"
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleTrack()}
            />
            <button className="trk-btn" onClick={handleTrack} disabled={searching || !orderId.trim()}>
              {searching ? "Searching…" : "Track →"}
            </button>
          </div>
          {error && <div className="trk-err">{error}</div>}

          {order && (
            <div className="trk-result">
              <div className="trk-oid">{order.id}</div>
              <div className="trk-part">{order.part}</div>
              <div className="trk-car">{order.car} {order.year && `· ${order.year}`} · {order.garage}</div>

              {order.status === "cancelled" ? (
                <div className="trk-cancelled">This order has been cancelled. Contact us on WhatsApp if you have questions.</div>
              ) : (
                <div className="trk-timeline">
                  <div className="trk-track-bg" style={{right: "14px"}}></div>
                  <div className="trk-track-fill" style={{width: `calc(${progress}% * 0.92)`}}></div>
                  <div className="trk-steps">
                    {STATUS_FLOW.map((s, i) => (
                      <div key={s} className="trk-step">
                        <div className={`trk-dot ${i < currentIdx ? "done" : i === currentIdx ? "current" : ""}`}>
                          {i < currentIdx ? "✓" : ""}
                        </div>
                        <div className={`trk-step-lbl ${i === currentIdx ? "active" : ""}`}>{STATUS[s].label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {order.quote && <div className="trk-quote">💰 Quote: {order.quote}</div>}
            </div>
          )}

          <div className="trk-hint">Order ID was sent to you when you submitted your part request. Lost it? Contact us on WhatsApp with your garage name and we'll look it up.</div>
        </div>
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
          order_id: order.id, garage: order.garage,
          car: `${order.car}${order.year ? " (" + order.year + ")" : ""}`,
          part: order.part, notes: order.notes || "None",
          to_email: "munzirkhan812@gmail.com",
        }, EMAILJS_PUBLIC_KEY);
      } catch (emailErr) { console.error("Email failed:", emailErr); }
      setSubmitted(true);
      setForm({ garage: "", car: "", year: "", part: "", notes: "", photos: [] });
      setTimeout(() => { setSubmitted(false); }, 3000);
    } catch (e) { setError("Failed to submit. Check your connection and try again."); }
    setSubmitting(false);
  }

  return (
    <>
      <style>{FONT}{BASE}{`
        .portal { min-height:100vh; background:#1C1C1C; font-family:'Syne',sans-serif; }
        .hdr { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 2rem; border-bottom:1px solid #2C2C2C; }
        .hdr-logo { font-size:1.1rem; font-weight:800; color:#F5F0E8; }
        .hdr-logo span { color:#C9A84C; }
        .back { font-family:'DM Mono',monospace; font-size:0.72rem; cursor:pointer; letter-spacing:0.1em; text-transform:uppercase; border:1px solid #3A3A3A; padding:0.4rem 0.9rem; border-radius:2px; background:none; transition:all 0.2s; color:#F5F0E8; }
        .back:hover { color:#C9A84C; border-color:#C9A84C; }
        .body { max-width:720px; margin:0 auto; padding:2rem 1.5rem; }
        .h1 { font-size:1.5rem; font-weight:800; color:#F5F0E8; margin-bottom:1.75rem; letter-spacing:-0.02em; }
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
        @media(max-width:520px){.grid2{grid-template-columns:1fr;}}
        .f { display:flex; flex-direction:column; gap:0.4rem; }
        .f.full { grid-column:1/-1; }
        .f label { font-family:'DM Mono',monospace; font-size:0.7rem; color:#AAAAAA; letter-spacing:0.1em; text-transform:uppercase; }
        .f label .req { color:#C9A84C; }
        .f input, .f textarea { background:#222222; border:1px solid #3A3A3A; color:#F5F0E8; font-family:'DM Mono',monospace; font-size:0.85rem; padding:0.7rem 1rem; border-radius:2px; outline:none; width:100%; transition:border-color 0.2s; }
        .f input:focus, .f textarea:focus { border-color:#C9A84C; }
        .f textarea { resize:vertical; min-height:90px; }
        .upload-zone { border:1px dashed #4A4A4A; border-radius:2px; padding:1.5rem; text-align:center; cursor:pointer; transition:border-color 0.2s; }
        .upload-zone:hover { border-color:#C9A84C; }
        .upload-zone input { display:none; }
        .upload-hint { font-family:'DM Mono',monospace; font-size:0.75rem; color:#9A9A9A; }
        .upload-hint span { color:#C9A84C; }
        .thumbs { display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.75rem; }
        .thumb { width:70px; height:70px; object-fit:cover; border-radius:2px; border:1px solid #4A4A4A; }
        .submit { margin-top:2rem; width:100%; background:#C9A84C; color:#171717; border:none; font-family:'Syne',sans-serif; font-weight:800; font-size:0.9rem; letter-spacing:0.08em; padding:1rem; cursor:pointer; border-radius:2px; transition:opacity 0.2s; text-transform:uppercase; }
        .submit:hover:not(:disabled) { opacity:0.85; }
        .submit:disabled { opacity:0.4; cursor:not-allowed; }
        .err { font-family:'DM Mono',monospace; font-size:0.72rem; color:#EF4444; margin-top:0.75rem; }
        .success { text-align:center; padding:3rem 1rem; }
        .success-icon { font-size:3rem; margin-bottom:1rem; }
        .success-title { font-size:1.5rem; font-weight:700; color:#10B981; margin-bottom:0.5rem; }
        .success-sub { font-family:'DM Mono',monospace; font-size:0.75rem; color:#9A9A9A; }
        .empty { text-align:center; padding:4rem 1rem; font-family:'DM Mono',monospace; font-size:0.75rem; color:#888888; }
      `}</style>
      <div className="portal">
        <div className="hdr">
          <div className="hdr-logo">SPARES<span>ANYWHERE</span> <span style={{fontWeight:400,color:"#9A9A9A",fontSize:"0.85rem"}}>/ Garage Portal</span></div>
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
  const [adminTab, setAdminTab] = useState("orders");
  return (
    <>
      <style>{FONT}{BASE}{`
        .adm { min-height:100vh; background:#1A1A1A; font-family:'Syne',sans-serif; display:flex; flex-direction:column; }
        .ahdr { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 2rem; border-bottom:1px solid #2C2C2C; flex-wrap:wrap; gap:1rem; }
        .alogo { font-size:1.1rem; font-weight:800; color:#F5F0E8; }
        .alogo span { color:#C9A84C; }
        .atabs { display:flex; border-bottom:1px solid #2C2C2C; }
        .atab { font-family:'DM Mono',monospace; font-size:0.72rem; letter-spacing:0.1em; text-transform:uppercase; padding:0.9rem 1.75rem; cursor:pointer; color:#9A9A9A; border-bottom:2px solid transparent; margin-bottom:-1px; transition:all 0.2s; background:none; border-top:none; border-left:none; border-right:none; }
        .atab:hover { color:#F5F0E8; }
        .atab.on { color:#C9A84C; border-bottom-color:#C9A84C; }
        .back { font-family:'DM Mono',monospace; font-size:0.72rem; cursor:pointer; letter-spacing:0.1em; text-transform:uppercase; border:1px solid #3A3A3A; padding:0.4rem 0.9rem; border-radius:2px; background:none; transition:all 0.2s; color:#F5F0E8; }
        .back:hover { color:#C9A84C; border-color:#C9A84C; }
      `}</style>
      <div className="adm">
        <div className="ahdr">
          <div className="alogo">SPARES<span>ANYWHERE</span> <span style={{fontWeight:400,color:"#9A9A9A",fontSize:"0.85rem"}}>/ Admin</span></div>
          <button className="back" onClick={onBack}>← Exit</button>
        </div>
        <div className="atabs">
          <button className={`atab${adminTab==="orders"?" on":""}`} onClick={()=>setAdminTab("orders")}>Orders</button>
          <button className={`atab${adminTab==="stories"?" on":""}`} onClick={()=>setAdminTab("stories")}>Stories</button>
        </div>
        {adminTab === "orders" ? <OrdersPanel /> : <StoriesPanel />}
      </div>
    </>
  );
}

// ─── ORDERS PANEL ─────────────────────────────────────────────────────────────
function OrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState(null);
  const [quoteInput, setQuoteInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [srcQuery, setSrcQuery] = useState("");

  const fetchOrders = useCallback(async () => {
    const o = await loadOrders(); setOrders(o.map(mapOrder)); setLoading(false);
  }, []);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

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
        ["#","Part Name","Notes","Qty","Buy Price (£)","Total Cost (£)","Sell Price (£)","Total Sell (£)","Profit (£)","Status"],
        [1, o.part, o.notes||"", 1, "", "=E5*D5", "", "=G5*D5", "=H5-F5", o.status],
        [],
        ["","ORDER TOTAL","","","","=F5","","=H5","=I5",""],
        [],
        ["📊  ORDER SUMMARY","","","","Total Cost (£)","Total Revenue (£)","Gross Profit (£)","Margin %"],
        ["","","","","=F7","=H7","=I7","=IFERROR(I10/H10,0)"],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!cols"] = [6,22,20,5,13,13,13,13,10,10].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, `${carTitle.slice(0,25)} #${idx+1}`.slice(0,31));
    });
    XLSX.writeFile(wb, "SpareAnywhere_Orders.xlsx");
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this order? Cannot be undone.")) return;
    setDeleting(true);
    try { await removeOrder(id); setOrders(prev => prev.filter(o => o.id !== id)); setSel(null); }
    catch (e) { console.error(e); }
    setDeleting(false);
  }

  async function updateOrder(id, changes) {
    setSaving(true);
    try {
      await patchOrder(id, changes);
      const fresh = await loadOrders(); const mapped = fresh.map(mapOrder);
      setOrders(mapped);
      if (sel?.id === id) setSel(mapped.find(o => o.id === id));
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  return (
    <>
      <style>{`
        .abody { display:flex; flex:1; overflow:hidden; min-height:0; }
        .aside { width:240px; border-right:1px solid #2C2C2C; padding:1.5rem 1rem; flex-shrink:0; overflow-y:auto; }
        @media(max-width:700px){.abody{flex-direction:column;}.aside{width:100%;border-right:none;border-bottom:1px solid #2C2C2C;overflow-y:visible;}}
        .aside-lbl { font-family:'DM Mono',monospace; font-size:0.65rem; color:#888888; letter-spacing:0.15em; text-transform:uppercase; margin-bottom:0.75rem; padding-left:0.5rem; }
        .fb { display:flex; justify-content:space-between; align-items:center; width:100%; background:none; border:none; padding:0.5rem 0.75rem; cursor:pointer; border-radius:2px; font-family:'Syne',sans-serif; font-size:0.82rem; color:#BBBBBB; transition:all 0.15s; text-align:left; }
        .fb:hover { background:#222222; color:#F5F0E8; }
        .fb.on { background:#161610; color:#C9A84C; }
        .fc { font-family:'DM Mono',monospace; font-size:0.7rem; color:#888888; }
        .amain { flex:1; overflow-y:auto; padding:1.5rem; }
        .stats { display:flex; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap; }
        .sbox { background:#222222; border:1px solid #2C2C2C; border-radius:2px; padding:1rem 1.25rem; min-width:110px; }
        .snum { font-size:1.75rem; font-weight:800; color:#F5F0E8; }
        .slbl { font-family:'DM Mono',monospace; font-size:0.65rem; color:#9A9A9A; margin-top:0.2rem; letter-spacing:0.1em; text-transform:uppercase; }
        .orow { background:#222222; border:1px solid #2C2C2C; border-radius:2px; padding:1rem 1.25rem; cursor:pointer; transition:all 0.15s; display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:0.75rem; }
        .orow:hover { border-color:#4A4A4A; background:#141414; }
        .orow.sel { border-color:#C9A84C; background:#141410; }
        .orow-id { font-family:'DM Mono',monospace; font-size:0.7rem; color:#C9A84C; margin-bottom:0.3rem; }
        .orow-part { font-size:0.95rem; font-weight:700; color:#F5F0E8; }
        .orow-meta { font-family:'DM Mono',monospace; font-size:0.7rem; color:#AAAAAA; margin-top:0.2rem; }
        .pill { font-family:'DM Mono',monospace; font-size:0.65rem; letter-spacing:0.08em; text-transform:uppercase; padding:0.25rem 0.6rem; border-radius:99px; white-space:nowrap; }
        .detail { background:#222222; border:1px solid #C9A84C; border-radius:2px; padding:1.75rem; margin-top:1.5rem; }
        .dtitle { font-size:1.2rem; font-weight:800; color:#F5F0E8; margin-bottom:0.25rem; }
        .did { font-family:'DM Mono',monospace; font-size:0.72rem; color:#C9A84C; margin-bottom:1.5rem; }
        .dgrid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem; }
        @media(max-width:500px){.dgrid{grid-template-columns:1fr;}}
        .dfield label { font-family:'DM Mono',monospace; font-size:0.65rem; color:#9A9A9A; letter-spacing:0.1em; text-transform:uppercase; display:block; margin-bottom:0.3rem; }
        .dfield p { font-size:0.88rem; color:#DDD; }
        .dphotos { display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1.5rem; }
        .dphoto { width:90px; height:90px; object-fit:cover; border-radius:2px; border:1px solid #4A4A4A; cursor:pointer; }
        .dlbl { font-family:'DM Mono',monospace; font-size:0.65rem; color:#9A9A9A; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:0.75rem; }
        .sgrid { display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1.5rem; }
        .sopt { font-family:'DM Mono',monospace; font-size:0.7rem; letter-spacing:0.06em; text-transform:uppercase; padding:0.35rem 0.75rem; border-radius:2px; border:1px solid #3A3A3A; cursor:pointer; transition:all 0.15s; background:none; color:#AAAAAA; }
        .sopt:hover { border-color:#9A9A9A; color:#EEE; }
        .sopt.on { color:#171717; border-color:transparent; }
        .qrow { display:flex; gap:0.75rem; margin-bottom:1.5rem; align-items:center; }
        .qi { flex:1; background:#171717; border:1px solid #4A4A4A; color:#F5F0E8; font-family:'DM Mono',monospace; font-size:0.85rem; padding:0.6rem 1rem; border-radius:2px; outline:none; }
        .qi:focus { border-color:#C9A84C; }
        .qbtn { background:#C9A84C; color:#171717; border:none; font-family:'Syne',sans-serif; font-weight:700; font-size:0.78rem; padding:0.6rem 1.25rem; cursor:pointer; border-radius:2px; white-space:nowrap; transition:opacity 0.2s; }
        .qbtn:hover { opacity:0.85; }
        .xlbtn { font-family:'DM Mono',monospace; font-size:0.7rem; cursor:pointer; letter-spacing:0.1em; text-transform:uppercase; border:1px solid #3A3A3A; padding:0.4rem 0.9rem; border-radius:2px; background:none; transition:all 0.2s; color:#F5F0E8; }
        .xlbtn:hover { color:#10B981; border-color:#10B981; }
        .delbtn { width:100%; background:none; border:1px solid #3A1A1A; color:#EF4444; font-family:'Syne',sans-serif; font-weight:700; font-size:0.78rem; letter-spacing:0.05em; padding:0.65rem; cursor:pointer; border-radius:2px; transition:all 0.2s; margin-top:0.5rem; }
        .delbtn:hover { background:#1A0505; border-color:#EF4444; }
        .src-box { background:#171717; border:1px solid #2C2C2C; border-radius:2px; padding:1.25rem; margin-bottom:1.5rem; }
        .src-row { display:flex; gap:0.5rem; margin-bottom:0.75rem; }
        .src-input { flex:1; background:#222222; border:1px solid #3A3A3A; color:#F5F0E8; font-family:'DM Mono',monospace; font-size:0.82rem; padding:0.55rem 0.9rem; border-radius:2px; outline:none; }
        .src-input:focus { border-color:#C9A84C; }
        .src-btns { display:flex; gap:0.5rem; flex-wrap:wrap; }
        .src-btn { display:flex; align-items:center; gap:0.4rem; font-family:'DM Mono',monospace; font-size:0.7rem; letter-spacing:0.06em; text-transform:uppercase; padding:0.45rem 0.9rem; border-radius:2px; border:1px solid #3A3A3A; cursor:pointer; background:none; color:#BBBBBB; transition:all 0.15s; text-decoration:none; }
        .src-btn:hover { color:#F5F0E8; border-color:#9A9A9A; background:#222222; }
        .src-btn.ebay-uk:hover { border-color:#E53238; color:#E53238; }
        .src-btn.ebay-gl:hover { border-color:#0064D2; color:#0064D2; }
        .src-btn.google:hover { border-color:#34A853; color:#34A853; }
        .cquote { font-family:'DM Mono',monospace; font-size:0.78rem; color:#10B981; background:#0A1A0F; border:1px solid #1A3A1F; padding:0.6rem 1rem; border-radius:2px; margin-bottom:1.5rem; }
        .notes { background:#171717; border:1px solid #2C2C2C; border-radius:2px; padding:0.75rem 1rem; font-family:'DM Mono',monospace; font-size:0.78rem; color:#BBBBBB; line-height:1.6; margin-bottom:1.5rem; }
        .empty { text-align:center; padding:4rem 1rem; font-family:'DM Mono',monospace; font-size:0.75rem; color:#888888; }
      `}</style>
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
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem",flexWrap:"wrap",gap:"0.75rem"}}>
            <div className="stats" style={{margin:0}}>
              <div className="sbox"><div className="snum">{orders.length}</div><div className="slbl">Total</div></div>
              <div className="sbox"><div className="snum">{counts.pending||0}</div><div className="slbl">Pending</div></div>
              <div className="sbox"><div className="snum">{counts.fulfilled||0}</div><div className="slbl">Fulfilled</div></div>
            </div>
            <button className="xlbtn" onClick={downloadExcel} disabled={orders.length===0}>⬇ Download Excel</button>
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
    </>
  );
}

// ─── STORIES PANEL (ADMIN) ────────────────────────────────────────────────────
function StoriesPanel() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const EMPTY = {
    id:"", tag:"Import Sourcing", date:"", location:"", read_time:"3 min read",
    title:"", lede:"", excerpt:"", emoji:"🔩", content:[], outcome:{}, published:true,
  };
  const [form, setForm] = useState(EMPTY);
  const [outcomeRows, setOutcomeRows] = useState([{key:"",val:""}]);
  const [newBlock, setNewBlock] = useState({type:"section",heading:"",text:""});

  const fetch = useCallback(async () => {
    const s = await loadStories(true); setStories(s); setLoading(false);
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  function startNew() {
    setForm(EMPTY); setOutcomeRows([{key:"",val:""}]);
    setNewBlock({type:"section",heading:"",text:""}); setEditing("new");
  }
  function startEdit(s) {
    setForm({...s});
    const rows = Object.entries(s.outcome||{}).map(([key,val])=>({key,val}));
    setOutcomeRows(rows.length?rows:[{key:"",val:""}]);
    setNewBlock({type:"section",heading:"",text:""}); setEditing(s);
  }

  function addBlock() {
    if (newBlock.type==="section" && (!newBlock.heading||!newBlock.text)) return;
    if (newBlock.type==="callout" && !newBlock.text) return;
    setForm(f=>({...f,content:[...f.content,{...newBlock}]}));
    setNewBlock({type:"section",heading:"",text:""});
  }
  function removeBlock(i) { setForm(f=>({...f,content:f.content.filter((_,idx)=>idx!==i)})); }
  function moveBlock(i,dir) {
    setForm(f=>{
      const c=[...f.content]; const j=i+dir;
      if(j<0||j>=c.length) return f;
      [c[i],c[j]]=[c[j],c[i]]; return {...f,content:c};
    });
  }
  function handleImg(e) {
    const file=e.target.files[0]; if(!file) return;
    const r=new FileReader();
    r.onload=ev=>{
      const cap=window.prompt("Caption for this photo (optional):")||"";
      setForm(f=>({...f,content:[...f.content,{type:"image",data:ev.target.result,caption:cap}]}));
    };
    r.readAsDataURL(file);
    e.target.value="";
  }

  async function save() {
    if (!form.title||!form.tag||!form.date) { alert("Title, category and date are required."); return; }
    setSaving(true);
    const outcome=outcomeRows.reduce((acc,{key,val})=>{ if(key.trim()) acc[key.trim()]=val.trim(); return acc; },{});
    const data={...form, id:form.id||"story-"+Date.now().toString(36), outcome};
    try {
      editing==="new" ? await createStory(data) : await updateStory(data.id, data);
      await fetch(); setEditing(null);
    } catch(e) { console.error(e); alert("Save failed: "+e.message); }
    setSaving(false);
  }

  async function del(id) {
    if(!window.confirm("Delete this story?")) return;
    setDeleting(true);
    try { await deleteStory(id); await fetch(); setEditing(null); }
    catch(e){ console.error(e); }
    setDeleting(false);
  }

  if (editing) return (
    <>
      <style>{`
        .sp { flex:1; overflow-y:auto; padding:2rem; max-width:820px; }
        .sp-hdr { display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem; }
        .sp-ttl { font-size:1.1rem; font-weight:800; color:#F5F0E8; }
        .sp-btn { font-family:'DM Mono',monospace; font-size:0.7rem; letter-spacing:0.1em; text-transform:uppercase; border:1px solid #3A3A3A; padding:0.5rem 1.1rem; border-radius:2px; cursor:pointer; background:none; color:#F5F0E8; transition:all 0.2s; }
        .sp-btn:hover { border-color:#C9A84C; color:#C9A84C; }
        .sp-btn.p { background:#C9A84C; border-color:#C9A84C; color:#171717; font-weight:700; }
        .sp-btn.p:hover { opacity:0.85; color:#171717; }
        .sp-btn.d { border-color:#3A1A1A; color:#EF4444; }
        .sp-btn.d:hover { background:#1A0505; border-color:#EF4444; }
        .sp-sec { background:#1E1E1E; border:1px solid #2C2C2C; border-radius:2px; padding:1.5rem; margin-bottom:1.5rem; }
        .sp-sec-lbl { font-family:'DM Mono',monospace; font-size:0.62rem; letter-spacing:0.2em; text-transform:uppercase; color:#C9A84C; margin-bottom:1.25rem; }
        .sp-g2 { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
        @media(max-width:600px){.sp-g2{grid-template-columns:1fr;}}
        .sp-f { display:flex; flex-direction:column; gap:0.4rem; margin-bottom:1rem; }
        .sp-f label { font-family:'DM Mono',monospace; font-size:0.62rem; color:#9A9A9A; letter-spacing:0.1em; text-transform:uppercase; }
        .sp-f input,.sp-f textarea,.sp-f select { background:#222222; border:1px solid #3A3A3A; color:#F5F0E8; font-family:'DM Mono',monospace; font-size:0.8rem; padding:0.6rem 1rem; border-radius:2px; outline:none; width:100%; transition:border-color 0.2s; }
        .sp-f input:focus,.sp-f textarea:focus,.sp-f select:focus { border-color:#C9A84C; }
        .sp-f textarea { resize:vertical; min-height:80px; }
        .sp-f select option { background:#222222; }
        .sp-block { background:#222222; border:1px solid #3A3A3A; border-radius:2px; padding:1rem; margin-bottom:0.75rem; }
        .sp-block-type { font-family:'DM Mono',monospace; font-size:0.58rem; letter-spacing:0.15em; text-transform:uppercase; color:#C9A84C; margin-bottom:0.5rem; }
        .sp-block-text { font-family:'DM Mono',monospace; font-size:0.72rem; color:#BBBBBB; line-height:1.6; }
        .sp-block-acts { display:flex; gap:0.4rem; margin-top:0.75rem; }
        .sp-bb { font-family:'DM Mono',monospace; font-size:0.6rem; letter-spacing:0.08em; text-transform:uppercase; border:1px solid #3A3A3A; padding:0.25rem 0.6rem; border-radius:2px; cursor:pointer; background:none; color:#AAAAAA; transition:all 0.15s; }
        .sp-bb:hover { color:#F5F0E8; border-color:#9A9A9A; }
        .sp-bb.d:hover { color:#EF4444; border-color:#EF4444; }
        .sp-block-img { width:100%; max-height:180px; object-fit:cover; border-radius:2px; margin-bottom:0.5rem; }
        .sp-new-block { background:#171717; border:1px dashed #3A3A3A; border-radius:2px; padding:1.25rem; margin-top:0.5rem; }
        .sp-add { font-family:'DM Mono',monospace; font-size:0.65rem; letter-spacing:0.1em; text-transform:uppercase; border:1px dashed #4A4A4A; padding:0.5rem 1rem; border-radius:2px; cursor:pointer; background:none; color:#9A9A9A; transition:all 0.2s; margin-top:0.5rem; display:inline-block; }
        .sp-add:hover { border-color:#C9A84C; color:#C9A84C; }
        .sp-or { display:grid; grid-template-columns:1fr 1fr auto; gap:0.5rem; margin-bottom:0.5rem; align-items:center; }
        .sp-or input { background:#222222; border:1px solid #3A3A3A; color:#F5F0E8; font-family:'DM Mono',monospace; font-size:0.75rem; padding:0.5rem 0.75rem; border-radius:2px; outline:none; }
        .sp-or input:focus { border-color:#C9A84C; }
        .sp-rm { background:none; border:1px solid #2A1A1A; color:#EF4444; border-radius:2px; cursor:pointer; padding:0.4rem 0.6rem; font-size:0.7rem; transition:all 0.15s; }
        .sp-rm:hover { background:#1A0505; }
        .sp-tog { display:flex; align-items:center; gap:0.75rem; padding-top:0.4rem; }
        .sp-tog input[type=checkbox] { width:18px; height:18px; accent-color:#C9A84C; cursor:pointer; }
        .sp-tog label { font-family:'DM Mono',monospace; font-size:0.72rem; color:#BBBBBB; cursor:pointer; }
      `}</style>
      <div className="sp">
        <div className="sp-hdr">
          <div className="sp-ttl">{editing==="new"?"New Story":"Edit Story"}</div>
          <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
            {editing!=="new" && <button className="sp-btn d" onClick={()=>del(form.id)} disabled={deleting}>{deleting?"Deleting…":"Delete"}</button>}
            <button className="sp-btn" onClick={()=>setEditing(null)}>Cancel</button>
            <button className="sp-btn p" onClick={save} disabled={saving}>{saving?"Saving…":"Save Story"}</button>
          </div>
        </div>

        <div className="sp-sec">
          <div className="sp-sec-lbl">Story Details</div>
          <div className="sp-g2">
            <div className="sp-f"><label>Emoji</label><input value={form.emoji} onChange={e=>setForm(f=>({...f,emoji:e.target.value}))} placeholder="🔩"/></div>
            <div className="sp-f"><label>Category</label>
              <select value={form.tag} onChange={e=>setForm(f=>({...f,tag:e.target.value}))}>
                <option>Classic & Vintage</option><option>Import Sourcing</option><option>Urgent Jobs</option>
              </select>
            </div>
            <div className="sp-f"><label>Date</label><input value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} placeholder="e.g. March 2025"/></div>
            <div className="sp-f"><label>Source Country</label><input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="e.g. UK"/></div>
            <div className="sp-f"><label>Read Time</label><input value={form.read_time} onChange={e=>setForm(f=>({...f,read_time:e.target.value}))} placeholder="e.g. 4 min read"/></div>
            <div className="sp-f"><label>Status</label>
              <div className="sp-tog">
                <input type="checkbox" id="pub" checked={form.published} onChange={e=>setForm(f=>({...f,published:e.target.checked}))}/>
                <label htmlFor="pub">{form.published?"Live on site":"Draft (hidden)"}</label>
              </div>
            </div>
          </div>
          <div className="sp-f"><label>Title</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Story headline"/></div>
          <div className="sp-f"><label>Lede (italic opening line)</label><textarea value={form.lede} onChange={e=>setForm(f=>({...f,lede:e.target.value}))} placeholder="Hook the reader in one sentence…"/></div>
          <div className="sp-f"><label>Excerpt (card preview)</label><textarea value={form.excerpt} onChange={e=>setForm(f=>({...f,excerpt:e.target.value}))} placeholder="Short summary for the stories listing page…"/></div>
        </div>

        <div className="sp-sec">
          <div className="sp-sec-lbl">Story Content</div>
          {form.content.map((b,i)=>(
            <div key={i} className="sp-block">
              <div className="sp-block-type">{b.type}</div>
              {b.type==="image" && <img className="sp-block-img" src={b.data} alt={b.caption}/>}
              {b.type==="section" && <><strong style={{color:"#F5F0E8",fontSize:"0.8rem"}}>{b.heading}</strong><p className="sp-block-text" style={{marginTop:"0.35rem"}}>{b.text}</p></>}
              {b.type==="callout" && <p className="sp-block-text" style={{color:"#C9A84C",fontStyle:"italic"}}>"{b.text}"</p>}
              {b.caption && <p className="sp-block-text" style={{marginTop:"0.25rem",fontSize:"0.6rem",color:"#9A9A9A"}}>{b.caption}</p>}
              <div className="sp-block-acts">
                <button className="sp-bb" onClick={()=>moveBlock(i,-1)}>↑</button>
                <button className="sp-bb" onClick={()=>moveBlock(i,1)}>↓</button>
                <button className="sp-bb d" onClick={()=>removeBlock(i)}>Remove</button>
              </div>
            </div>
          ))}
          <div className="sp-new-block">
            <div className="sp-f"><label>Block Type</label>
              <select value={newBlock.type} onChange={e=>setNewBlock(b=>({...b,type:e.target.value,heading:"",text:""}))}>
                <option value="section">Section (heading + paragraph)</option>
                <option value="callout">Callout (pull quote)</option>
              </select>
            </div>
            {newBlock.type==="section" && <div className="sp-f"><label>Heading</label><input value={newBlock.heading} onChange={e=>setNewBlock(b=>({...b,heading:e.target.value}))} placeholder="e.g. The brief"/></div>}
            <div className="sp-f"><label>Text</label><textarea value={newBlock.text} onChange={e=>setNewBlock(b=>({...b,text:e.target.value}))} placeholder={newBlock.type==="callout"?"Pull quote…":"Paragraph text…"}/></div>
            <button className="sp-add" onClick={addBlock}>+ Add Block</button>
          </div>
          <div style={{marginTop:"1rem"}}>
            <input type="file" accept="image/*" id="simg" style={{display:"none"}} onChange={handleImg}/>
            <label className="sp-add" htmlFor="simg" style={{cursor:"pointer"}}>📷 Add Photo</label>
          </div>
        </div>

        <div className="sp-sec">
          <div className="sp-sec-lbl">Job Summary Table</div>
          {outcomeRows.map((row,i)=>(
            <div key={i} className="sp-or">
              <input placeholder="Label e.g. Vehicle" value={row.key} onChange={e=>{const r=[...outcomeRows];r[i]={...r[i],key:e.target.value};setOutcomeRows(r);}}/>
              <input placeholder="Value e.g. Rolls-Royce Seraph" value={row.val} onChange={e=>{const r=[...outcomeRows];r[i]={...r[i],val:e.target.value};setOutcomeRows(r);}}/>
              <button className="sp-rm" onClick={()=>setOutcomeRows(r=>r.filter((_,idx)=>idx!==i))}>✕</button>
            </div>
          ))}
          <button className="sp-add" onClick={()=>setOutcomeRows(r=>[...r,{key:"",val:""}])}>+ Add Row</button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        .sp-list { flex:1; overflow-y:auto; padding:2rem; }
        .sp-list-hdr { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
        .sp-list-ttl { font-size:1.1rem; font-weight:800; color:#F5F0E8; }
        .sp-new { font-family:'DM Mono',monospace; font-size:0.72rem; letter-spacing:0.1em; text-transform:uppercase; background:#C9A84C; border:none; color:#171717; padding:0.6rem 1.25rem; border-radius:2px; cursor:pointer; font-weight:700; transition:opacity 0.2s; }
        .sp-new:hover { opacity:0.85; }
        .sp-row { background:#222222; border:1px solid #2C2C2C; border-radius:2px; padding:1rem 1.25rem; display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:0.75rem; cursor:pointer; transition:all 0.15s; }
        .sp-row:hover { border-color:#4A4A4A; background:#141414; }
        .sp-emoji { font-size:1.5rem; flex-shrink:0; }
        .sp-info { flex:1; min-width:0; }
        .sp-info-title { font-size:0.95rem; font-weight:700; color:#F5F0E8; margin-bottom:0.2rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .sp-info-meta { font-family:'DM Mono',monospace; font-size:0.65rem; color:#9A9A9A; }
        .sp-live { font-family:'DM Mono',monospace; font-size:0.6rem; letter-spacing:0.1em; text-transform:uppercase; padding:0.2rem 0.6rem; border-radius:99px; background:#0A1A0F; color:#10B981; border:1px solid #1A3A1F; flex-shrink:0; }
        .sp-draft { font-family:'DM Mono',monospace; font-size:0.6rem; letter-spacing:0.1em; text-transform:uppercase; padding:0.2rem 0.6rem; border-radius:99px; background:#2C2C2C; color:#9A9A9A; border:1px solid #3A3A3A; flex-shrink:0; }
        .sp-mt { text-align:center; padding:5rem 1rem; font-family:'DM Mono',monospace; font-size:0.75rem; color:#4A4A4A; }
      `}</style>
      <div className="sp-list">
        <div className="sp-list-hdr">
          <div className="sp-list-ttl">Sourcing Stories</div>
          <button className="sp-new" onClick={startNew}>+ New Story</button>
        </div>
        {loading ? <div className="sp-mt">Loading…</div> : stories.length===0 ? (
          <div className="sp-mt">No stories yet. Click "New Story" to write your first one.</div>
        ) : stories.map(s=>(
          <div key={s.id} className="sp-row" onClick={()=>startEdit(s)}>
            <span className="sp-emoji">{s.emoji}</span>
            <div className="sp-info">
              <div className="sp-info-title">{s.title}</div>
              <div className="sp-info-meta">{s.tag} · {s.date} · {s.location}</div>
            </div>
            <span className={s.published?"sp-live":"sp-draft"}>{s.published?"Live":"Draft"}</span>
          </div>
        ))}
      </div>
    </>
  );
}
