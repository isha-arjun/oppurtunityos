"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Niche = { slug: string; name: string; description: string | null };
type Opportunity = {
  id: string; title: string; summary: string; category_slugs: string[];
  opportunity_type: string; geography: string; buyer_name: string | null;
  estimated_value: string | null; eligibility_notes: string | null;
  deadline_at: string | null; official_source_url: string; source_name: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
let client: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey) client = createClient(supabaseUrl, supabaseKey);

const demoNiches: Niche[] = [
  { slug: "it-software", name: "IT & Software", description: "Software, SaaS and technology opportunities" },
  { slug: "ai-automation", name: "AI & Automation", description: "AI, automation and data projects" },
  { slug: "digital-marketing", name: "Digital Marketing", description: "Marketing, content and growth contracts" },
  { slug: "web-design", name: "Web Design", description: "Websites, UI/UX and creative projects" },
  { slug: "manufacturing", name: "Manufacturing", description: "Manufacturing and supply opportunities" },
  { slug: "construction", name: "Construction", description: "Construction and infrastructure tenders" },
  { slug: "healthcare", name: "Healthcare", description: "Healthcare and life-sciences programmes" },
  { slug: "education", name: "Education", description: "Education and training opportunities" },
  { slug: "renewable-energy", name: "Renewable Energy", description: "Clean energy and sustainability" },
  { slug: "general-business", name: "General Business", description: "Cross-industry business opportunities" }
];

const typeLabels: Record<string, string> = {
  tender: "Tender", grant: "Grant", accelerator: "Startup programme",
  procurement: "Procurement", partnership: "Partnership", lead: "Business lead"
};

function formatDate(value: string | null) {
  if (!value) return "Deadline not listed";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Deadline not listed" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [niches, setNiches] = useState<Niche[]>(demoNiches);
  const [selected, setSelected] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<"daily" | "weekly">("weekly");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [view, setView] = useState<"home" | "onboarding" | "dashboard">("home");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");

  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    client.from("opportunity_niches").select("slug,name,description").eq("is_active", true).order("sort_order")
      .then(({ data: rows }) => { if (rows?.length) setNiches(rows as Niche[]); });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!client || !session?.user) return;
    refreshData();
  }, [session]);

  async function refreshData() {
    if (!client || !session?.user) return;
    setLoading(true);
    const [{ data: profile }, { data: rows }] = await Promise.all([
      client.from("opportunity_profiles").select("*").eq("user_id", session.user.id).maybeSingle(),
      client.from("opportunities").select("*").eq("is_published", true).eq("verification_status", "verified").order("deadline_at", { ascending: true })
    ]);
    setOpportunities((rows || []) as Opportunity[]);
    if (profile?.onboarding_completed) {
      setSelected(profile.selected_niches || []);
      setFrequency(profile.digest_frequency || "weekly");
      setView("dashboard");
    } else {
      setView("onboarding");
    }
    setLoading(false);
  }

  async function authenticate() {
    if (!client) { setNotice("Supabase environment variables are not configured yet."); return; }
    setLoading(true); setNotice("");
    const result = authMode === "signup"
      ? await client.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
      : await client.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) setNotice(result.error.message);
    else if (authMode === "signup" && !result.data.session) setNotice("Check your inbox to confirm your email, then sign in.");
    else setNotice("You're signed in.");
  }

  async function saveOnboarding() {
    if (!client || !session?.user) return;
    if (!selected.length) { setNotice("Choose at least one interest to continue."); return; }
    setLoading(true); setNotice("");
    const { error } = await client.from("opportunity_profiles").upsert({
      user_id: session.user.id, full_name: fullName || session.user.user_metadata?.full_name || null,
      company_name: company || null, selected_niches: selected, digest_frequency: frequency,
      timezone: "Asia/Kolkata", onboarding_completed: true
    });
    setLoading(false);
    if (error) setNotice(error.message);
    else { setView("dashboard"); setNotice("Your preferences are saved."); }
  }

  const filtered = useMemo(() => opportunities.filter(item =>
    filter === "all" || item.category_slugs?.includes(filter)
  ), [opportunities, filter]);

  async function signOut() { await client?.auth.signOut(); setView("home"); }

  return (
    <main>
      <nav className="nav wrap">
        <a className="brand" href="#"><span className="brand-mark">O</span> Opportunity<span>OS</span></a>
        <div className="nav-actions">
          {session ? <><span className="user-email">{session.user.email}</span><button className="button button-quiet" onClick={signOut}>Sign out</button></> :
            <><button className="button button-quiet" onClick={() => { setAuthMode("login"); setNotice(""); }}>Log in</button><button className="button button-dark" onClick={() => { setAuthMode("signup"); setNotice(""); }}>Get early access <span>↗</span></button></>}
        </div>
      </nav>

      {view === "home" && <section className="hero wrap">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> OPPORTUNITY INTELLIGENCE, SIMPLIFIED</div>
          <h1>Good opportunities<br/><em>should find you.</em></h1>
          <p className="hero-sub">Tenders, grants, startup programmes and business leads — organised around the markets you care about.</p>
          <div className="hero-actions"><button className="button button-dark button-large" onClick={() => { setAuthMode("signup"); setNotice(""); }}>Build my opportunity feed <span>↗</span></button><span className="micro-copy">Curated for your business. No noise.</span></div>
          <div className="trust-row"><span>India-first discovery</span><i/> <span>Verified-source focus</span><i/> <span>One clear dashboard</span></div>
        </div>
        <div className="hero-visual">
          <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
          <div className="visual-card">
            <div className="visual-top"><span className="mini-dot"/> YOUR OPPORTUNITY BRIEF <span className="visual-date">THIS WEEK</span></div>
            <div className="visual-number">01 <span>signal worth exploring</span></div>
            <div className="visual-line"/><div className="visual-row"><span>AI & automation</span><b>High relevance</b></div>
            <div className="visual-line"/><div className="visual-row"><span>Source confidence</span><b>Official source</b></div>
            <div className="visual-foot">A clearer view of what’s next.</div>
          </div>
          <div className="floating-tag tag-top">✳ Curated signals</div><div className="floating-tag tag-bottom">◷ Weekly brief</div>
        </div>
      </section>}

      {view === "home" && <section className="feature-strip"><div className="wrap feature-grid">
        <div><span>01</span><b>Discover</b><p>Relevant opportunities, not endless listings.</p></div>
        <div><span>02</span><b>Understand</b><p>Deadlines, eligibility and source links together.</p></div>
        <div><span>03</span><b>Act</b><p>Keep the next step in one focused workspace.</p></div>
      </div></section>}

      {authMode && !session && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setAuthMode(null); }}>
        <div className="modal">
          <button className="modal-close" onClick={() => setAuthMode(null)}>×</button>
          <div className="eyebrow">OPPORTUNITYOS ACCOUNT</div><h2>{authMode === "signup" ? "Create your account" : "Welcome back"}</h2>
          {authMode === "signup" && <><label>Full name<input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name"/></label></>}
          <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
          <button className="button button-dark button-full" disabled={loading || !email || password.length < 6} onClick={authenticate}>{loading ? "Please wait…" : authMode === "signup" ? "Create account" : "Log in"}</button>
          <p className="switch-auth">{authMode === "signup" ? "Already registered?" : "New here?"} <button onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}>{authMode === "signup" ? "Log in" : "Create an account"}</button></p>
          {notice && <p className="notice">{notice}</p>}
        </div>
      </div>}

      {view === "onboarding" && session && <section className="workspace wrap">
        <div className="workspace-heading"><div className="eyebrow">LET’S PERSONALISE YOUR FEED</div><h1>What opportunities<br/><em>matter to you?</em></h1><p>Choose the areas you want OpportunityOS to keep an eye on.</p></div>
        <div className="onboard-panel">
          <div className="panel-head"><b>Your areas of interest</b><span>{selected.length} selected</span></div>
          <div className="niche-grid">{niches.map(n => <button key={n.slug} className={selected.includes(n.slug) ? "niche selected" : "niche"} onClick={() => setSelected(old => old.includes(n.slug) ? old.filter(x => x !== n.slug) : [...old, n.slug])}><span className="check">{selected.includes(n.slug) ? "✓" : "+"}</span><b>{n.name}</b><small>{n.description}</small></button>)}</div>
          <div className="frequency-row"><div><b>Your opportunity brief</b><small>How often should your digest be prepared?</small></div><select value={frequency} onChange={e => setFrequency(e.target.value as "daily" | "weekly")}><option value="weekly">Weekly</option><option value="daily">Daily</option></select></div>
          <label className="company-label">Business / organisation (optional)<input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Studio"/></label>
          <button className="button button-dark button-large" onClick={saveOnboarding} disabled={loading}>{loading ? "Saving…" : "Save my preferences ↗"}</button>
          {notice && <p className="notice">{notice}</p>}
        </div>
      </section>}

      {view === "dashboard" && session && <section className="dashboard wrap">
        <div className="dashboard-top"><div><div className="eyebrow">YOUR WORKSPACE</div><h1>Your next opportunity<br/><em>starts here.</em></h1></div><button className="button button-quiet" onClick={refreshData}>↻ Refresh</button></div>
        <div className="stats-grid"><div className="stat"><span>VERIFIED MATCHES</span><b>{filtered.length.toString().padStart(2,"0")}</b><small>In your current feed</small></div><div className="stat"><span>YOUR INTERESTS</span><b>{selected.length.toString().padStart(2,"0")}</b><small>Areas selected</small></div><div className="stat"><span>DIGEST FREQUENCY</span><b>{frequency === "daily" ? "Daily" : "Weekly"}</b><small>Asia/Kolkata timezone</small></div></div>
        <div className="feed-heading"><div><div className="eyebrow">CURATED FOR YOUR INTERESTS</div><h2>Opportunity feed</h2></div><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All interests</option>{niches.filter(n => selected.includes(n.slug)).map(n => <option key={n.slug} value={n.slug}>{n.name}</option>)}</select></div>
        {loading ? <div className="empty-state">Loading your opportunity feed…</div> : filtered.length === 0 ? <div className="empty-state"><div className="empty-icon">✳</div><h3>Your feed is ready for its first signal.</h3><p>No verified opportunities match your interests yet. We’ll only show listings with a source that can be checked. No fabricated listings or placeholder deals.</p><span className="empty-note">OPPORTUNITY INGESTION IS NOT CONNECTED YET</span></div> :
          <div className="opportunity-list">{filtered.map(item => <article className="opportunity-card" key={item.id}><div className="opp-type">{typeLabels[item.opportunity_type] || item.opportunity_type}</div><h3>{item.title}</h3><p>{item.summary}</p><div className="opp-meta"><span>{item.buyer_name || item.geography}</span><span>Deadline: {formatDate(item.deadline_at)}</span>{item.estimated_value && <span>{item.estimated_value}</span>}</div>{item.eligibility_notes && <small>{item.eligibility_notes}</small>}<a href={item.official_source_url} target="_blank" rel="noreferrer">View official source ↗</a><div className="source-line">SOURCE: {item.source_name}</div></article>)}</div>}
        <div className="pilot-note"><b>Early-access pilot</b><span>Digest delivery and paid subscriptions are not active yet. This pilot does not collect payments.</span></div>
      </section>}

      {notice && !authMode && view === "home" && <div className="global-notice">{notice}</div>}
      <footer className="footer"><div className="wrap footer-inner"><a className="brand" href="#"><span className="brand-mark">O</span> Opportunity<span>OS</span></a><span>Opportunity intelligence, without the noise.</span><span>© {new Date().getFullYear()} OpportunityOS</span></div></footer>
    </main>
  );
}