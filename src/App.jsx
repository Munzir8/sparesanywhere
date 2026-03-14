import { useState, useEffect, useCallback } from "react";
import emailjs from "@emailjs/browser";
import * as XLSX from "xlsx";

// ─── EMAILJS CONFIG — fill these in after setting up EmailJS ─────────────────
const EMAILJS_SERVICE_ID  = "munzirkhan812@gmail.com";   // from emailjs.com → Email Services
const EMAILJS_TEMPLATE_ID = "template_ldql2g6";  // from emailjs.com → Email Templates
const EMAILJS_PUBLIC_KEY  = "bC187q-CO5pMEBWGA";  // from emailjs.com → Account → Public Key
// ─────────────────────────────────────────────────────────────────────────────

// ─── PASTE YOUR SUPABASE CREDENTIALS HERE ───────────────────────────────────
const SUPABASE_URL = "https://yrvhwbfcraxpivoaiuxa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlydmh3YmZjcmF4cGl2b2FpdXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyOTk4NTYsImV4cCI6MjA4ODg3NTg1Nn0.3iRlq-XIEG2DumgNxwmTQpwR8Qc_zT1ttTf8RiVNvaY";
// ────────────────────────────────────────────────────────────────────────────

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
  try {
    return await sbFetch("/orders?order=created_at.desc");
  } catch (e) { console.error(e); return []; }
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

// Map DB snake_case → camelCase for UI
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

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');`;
const BASE = `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } html, body, #root { width: 100%; min-height: 100vh; } body { background: #0A0A0A; }`;

export default function App() {
  const [view, setView] = useState("home");
  const [adminPw, setAdminPw] = useState("");
  const [adminAuth, setAdminAuth] = useState(false);
  const [pwError, setPwError] = useState(false);
  const ADMIN_PASSWORD = "munzir2025";

  // Admin card only appears when URL contains ?admin (e.g. yoursite.com/?admin)
  // Bookmark that URL on your laptop — regular visitors will never see the admin section
  const isAdminDevice = new URLSearchParams(window.location.search).has("admin");

  function enterAdmin() {
    if (adminPw === ADMIN_PASSWORD) { setAdminAuth(true); setView("admin"); setPwError(false); }
    else setPwError(true);
  }

  if (view === "garage") return <GaragePortal onBack={() => setView("home")} />;
  if (view === "admin" && adminAuth) return <AdminDashboard onBack={() => { setView("home"); setAdminAuth(false); }} />;

  return (
    <>
      <style>{FONT}{BASE}{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%,100% { opacity:1; } 50% { opacity:0.7; } }
        @keyframes carDrive { 0%{transform:translateX(-150px) scaleX(1);} 47%{transform:translateX(150px) scaleX(1);} 50%{transform:translateX(150px) scaleX(-1);} 97%{transform:translateX(-150px) scaleX(-1);} 100%{transform:translateX(-150px) scaleX(1);} }
        @keyframes carBob { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-1px);} }
        @keyframes wheelSpin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
        .walker-wrap { position:relative; height:28px; margin:0.3rem 0 0.1rem; overflow:visible; }
        .walker { position:absolute; left:50%; top:0; animation:carDrive 10s linear infinite; }
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
        .cards { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1.5rem; max-width:680px; width:100%; animation:fadeUp 0.6s 0.3s ease both; opacity:0; animation-fill-mode:forwards; }
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
                {/* Car body */}
                <polyline points="2,16 4,9 11,9 15,4 29,4 33,9 40,9 42,16" />
                {/* Bottom gaps around wheels */}
                <line x1="2" y1="16" x2="5" y2="16" />
                <line x1="13" y1="16" x2="28" y2="16" />
                <line x1="36" y1="16" x2="42" y2="16" />
                {/* Front wheel */}
                <g className="wheel-f">
                  <circle cx="9" cy="18" r="4" />
                  <line x1="9" y1="14" x2="9" y2="22" />
                  <line x1="5" y1="18" x2="13" y2="18" />
                </g>
                {/* Rear wheel */}
                <g className="wheel-r">
                  <circle cx="32" cy="18" r="4" />
                  <line x1="32" y1="14" x2="32" y2="22" />
                  <line x1="28" y1="18" x2="36" y2="18" />
                </g>
                {/* Headlight */}
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
              <div className="wa-info">
                <div className="wa-region">London</div>
                <div className="wa-number">+44 7494 806066</div>
              </div>
            </a>
            <a className="wa-btn" href="https://wa.me/2349168340653" target="_blank" rel="noopener noreferrer">
              <span className="wa-icon">💬</span>
              <div className="wa-info">
                <div className="wa-region">Lagos</div>
                <div className="wa-number">+234 9168 340653</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

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
      // Send email notification
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
                    <input
                      className="src-input"
                      value={srcQuery}
                      onChange={e => setSrcQuery(e.target.value)}
                      placeholder="e.g. Front Brake Caliper BMW 5 Series 2019"
                    />
                  </div>
                  <div className="src-btns">
                    <a className="src-btn ebay-uk" target="_blank" rel="noopener noreferrer"
                      href={`https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(srcQuery)}&_sacat=6000`}>
                      🛒 eBay UK
                    </a>
                    <a className="src-btn ebay-gl" target="_blank" rel="noopener noreferrer"
                      href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(srcQuery)}&_sacat=6028`}>
                      🌍 eBay Global
                    </a>
                    <a className="src-btn google" target="_blank" rel="noopener noreferrer"
                      href={`https://www.google.com/search?q=${encodeURIComponent(srcQuery)}&tbm=shop`}>
                      🔍 Google Shopping
                    </a>
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
