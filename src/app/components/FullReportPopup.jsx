"use client";
// FullReportPopup.jsx
// Shared between:
//   - src/app/dashboard/analysis/[ticker]/page.js  (live, receives real API data)
//   - src/app/page.js                               (landing, receives SAMPLE_REPORT hardcoded data)
//
// Props:
//   report        — { score, verdict, summary, sections, risk_flags, cached, instrumentType }
//   ticker        — string, e.g. "NVDA"
//   name          — string, e.g. "NVIDIA Corp"
//   onClose       — () => void
//   c             — Clarinvest colour tokens object
//   mode          — "dark" | "light"
//   onRegenerate  — optional () => void (shows Regenerate button if provided)

// ── Section label map (covers all 4 instrument schemas) ──────────────────────
const SECTION_LABELS = {
  // Stock
  valuation:        "Valuation",
  growth:           "Growth",
  profitability:    "Profitability",
  catalysts:        "Catalysts",
  outlook:          "Outlook",
  // ETF
  exposure:         "Exposure",
  cost_efficiency:  "Cost Efficiency",
  performance:      "Performance",
  liquidity:        "Liquidity",
  // Index
  composition:      "Composition",
  valuation_context:"Valuation",
  macro_drivers:    "Macro Drivers",
  trend:            "Trend",
  // Commodity
  supply_demand:    "Supply & Demand",
  price_context:    "Price Context",
};

const gs = "'Google Sans Flex','DM Sans',sans-serif";

// ── AI Score ring ─────────────────────────────────────────────────────────────
function ScoreRing({ score, c, size = 72 }) {
  const col    = score >= 80 ? c.green : score >= 55 ? c.text : c.red;
  const r      = (size - 7) / 2;
  const cx2    = size / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size}
        style={{ position:"absolute", top:0, left:0, transform:"rotate(-90deg)" }}>
        <circle cx={cx2} cy={cx2} r={r} fill="none" stroke={col} strokeOpacity={0.18} strokeWidth="4.5"/>
        <circle cx={cx2} cy={cx2} r={r} fill="none" stroke={col} strokeWidth="4.5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontFamily:gs, fontSize: size * 0.28, fontWeight:800, color:col, lineHeight:1 }}>
          {score}
        </span>
        <span style={{ fontFamily:gs, fontSize: size * 0.12, fontWeight:600, color:c.muted,
          letterSpacing:"0.05em", textTransform:"uppercase", marginTop:2 }}>
          AI Score
        </span>
      </div>
    </div>
  );
}

// ── Verdict badge ─────────────────────────────────────────────────────────────
function VerdictBadge({ verdict, c }) {
  const isBull = verdict?.includes("Buy");
  const isBear = verdict?.includes("Sell");
  const col = isBull ? c.green : isBear ? c.red : c.muted;
  const bg  = isBull ? `${c.green}18` : isBear ? `${c.red}18` : c.surface;
  const bd  = isBull ? `${c.green}50` : isBear ? `${c.red}50` : c.border;
  return (
    <span style={{
      fontFamily:gs, fontSize:"0.78rem", fontWeight:700, color:col,
      background:bg, border:`1px solid ${bd}`,
      borderRadius:"5px", padding:"5px 14px", whiteSpace:"nowrap",
    }}>
      {verdict}
    </span>
  );
}

// ── Risk flag row ─────────────────────────────────────────────────────────────
function RiskFlag({ flag, level, c }) {
  const col = level === "High" ? c.red : level === "Low" ? c.green : c.amber || "#F59E0B";
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"10px 14px", borderBottom:`1px solid ${c.border}`,
    }}>
      <span style={{ fontFamily:gs, fontSize:"0.84rem", color:col, flex:1, paddingRight:"1rem", display:"flex", alignItems:"center", gap:"6px" }}>
        <span style={{ fontSize:"0.78rem", flexShrink:0 }}>⚠</span>{flag}
      </span>
      <span style={{
        fontFamily:gs, fontSize:"0.65rem", fontWeight:700, color:col,
        letterSpacing:"0.06em", textTransform:"uppercase", flexShrink:0,
      }}>
        {level}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FullReportPopup({
  report, ticker, name, onClose, c, mode, onRegenerate,
}) {
  if (!report) return null;

  const { score, verdict, summary, sections = [], risk_flags = [], cached, instrumentType } = report;

  const isDark     = mode === "dark";
  const cardBg     = isDark ? "#0E0E11" : "#FFFFFF";
  const headerBg   = isDark
    ? "linear-gradient(135deg,#131316 0%,#0F0F12 100%)"
    : "linear-gradient(135deg,#FFFFFF 0%,#F5F5F8 100%)";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:"fixed", inset:0, zIndex:500,
          background:"rgba(0,0,0,0.72)",
          backdropFilter:"blur(6px)",
          WebkitBackdropFilter:"blur(6px)",
        }}
      />

      {/* Card */}
      <div style={{
        position:"fixed", top:"50%", left:"50%",
        transform:"translate(-50%,-50%)",
        zIndex:501,
        width:"min(1160px,96vw)",
        maxHeight:"82vh",
        display:"flex", flexDirection:"column",
        background:cardBg,
        border:`1px solid ${c.borderHi || c.border}`,
        borderRadius:"16px",
        boxShadow: isDark
          ? "0 40px 100px rgba(0,0,0,0.65)"
          : "0 20px 60px rgba(0,0,0,0.14)",
        overflow:"hidden",
      }}>

        {/* Header ──────────────────────────────────────────────────────────── */}
        <div style={{
          background:headerBg,
          borderBottom:`1px solid ${c.border}`,
          padding:"1.25rem 1.5rem",
          flexShrink:0,
        }}>
          {/* Top bar: eyebrow + badges + close */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
            <span style={{
              fontFamily:gs, fontSize:"0.62rem", fontWeight:700,
              color:c.green, letterSpacing:"0.16em", textTransform:"uppercase",
            }}>
              AI Analysis
            </span>
            <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>
              {cached && (
                <span style={{
                  fontFamily:gs, fontSize:"0.65rem", color:c.muted,
                  background:c.surface, border:`1px solid ${c.border}`,
                  borderRadius:"4px", padding:"3px 10px",
                }}>
                  Cached · 24h
                </span>
              )}
              {instrumentType && (
                <span style={{
                  fontFamily:gs, fontSize:"0.65rem", color:c.muted,
                  background:c.surface, border:`1px solid ${c.border}`,
                  borderRadius:"4px", padding:"3px 10px", textTransform:"capitalize",
                }}>
                  {instrumentType}
                </span>
              )}
              <button
                onClick={onClose}
                style={{
                  background:c.surface, border:`1px solid ${c.border}`,
                  borderRadius:"7px", padding:"6px 10px",
                  cursor:"pointer", color:c.muted,
                  fontFamily:gs, fontSize:"0.75rem",
                  display:"flex", alignItems:"center", gap:"4px",
                }}>
                ✕ <span style={{ fontSize:"0.55rem", opacity:0.6 }}>ESC</span>
              </button>
            </div>
          </div>

          {/* Score + verdict + summary row */}
          <div style={{ display:"flex", gap:"1.25rem", alignItems:"flex-start" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"8px", flexShrink:0 }}>
              <ScoreRing score={score} c={c} size={70}/>
              <VerdictBadge verdict={verdict} c={c}/>
            </div>
            <div style={{ flex:1 }}>
              <p style={{
                fontFamily:gs, fontSize:"0.96rem", lineHeight:1.72,
                color:c.text, margin:0,
              }}>
                {summary}
              </p>
            </div>
          </div>
        </div>

        {/* Body ────────────────────────────────────────────────────────────── */}
        <div style={{
          flex:1, overflowY:"auto", overflowX:"hidden",
          display:"grid",
          gridTemplateColumns: sections.length > 0 ? "1fr 260px" : "1fr",
        }}>

          {/* Left: prose sections */}
          {sections.length > 0 && (
            <div style={{
              padding:"1.5rem",
              borderRight:`1px solid ${c.border}`,
              display:"flex", flexDirection:"column", gap:"1.5rem",
            }}>
              {sections.map((s, i) => (
                <div key={i}>
                  <p style={{
                    fontFamily:gs, fontSize:"0.62rem", fontWeight:700,
                    color:c.muted, letterSpacing:"0.14em", textTransform:"uppercase",
                    marginBottom:"0.45rem",
                  }}>
                    {SECTION_LABELS[s.key] || s.key.replace(/_/g," ").toUpperCase()}
                  </p>
                  <p style={{
                    fontFamily:gs, fontSize:"0.9rem", lineHeight:1.76,
                    color:c.text, margin:0,
                  }}>
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Right: risk flags */}
          {risk_flags.length > 0 && (
            <div style={{ flexShrink:0 }}>
              <div style={{
                padding:"1rem 1.25rem 0.75rem",
                borderBottom:`1px solid ${c.border}`,
              }}>
                <p style={{
                  fontFamily:gs, fontSize:"0.62rem", fontWeight:700,
                  color:c.muted, letterSpacing:"0.14em", textTransform:"uppercase",
                  margin:0,
                }}>
                  Risk Flags
                </p>
              </div>
              {risk_flags.map((r, i) => (
                <RiskFlag key={i} flag={r.flag} level={r.level} c={c}/>
              ))}
            </div>
          )}
        </div>

        {/* Footer ──────────────────────────────────────────────────────────── */}
        <div style={{
          borderTop:`1px solid ${c.border}`,
          padding:"0.9rem 1.5rem",
          display:"flex", alignItems:"center", gap:"0.75rem",
          background: isDark ? "rgba(9,9,9,0.5)" : "rgba(247,247,245,0.6)",
          flexShrink:0,
        }}>
          <button
            onClick={onClose}
            style={{
              background:"transparent",
              border:`1px solid ${c.border}`,
              borderRadius:"7px", padding:"8px 18px",
              cursor:"pointer", color:c.muted,
              fontFamily:gs, fontSize:"0.82rem",
            }}>
            ← Back to Summary
          </button>

          {onRegenerate && (
            <button
              onClick={onRegenerate}
              style={{
                background:"transparent",
                border:`1px solid ${c.border}`,
                borderRadius:"7px", padding:"8px 18px",
                cursor:"pointer", color:c.muted,
                fontFamily:gs, fontSize:"0.82rem",
              }}>
              Regenerate
            </button>
          )}

          <div style={{ flex:1 }}/>

          <span style={{
            fontFamily:gs, fontSize:"0.68rem", color:c.muted,
            textAlign:"right", lineHeight:1.5,
          }}>
            For informational purposes only. Not financial advice.
          </span>
        </div>
      </div>
    </>
  );
}

// ── Hardcoded NVDA sample for landing page preview ────────────────────────────
// Use as: <FullReportPopup report={NVDA_SAMPLE_REPORT} ticker="NVDA" name="NVIDIA Corp" ... />
export const NVDA_SAMPLE_REPORT = {
  score: 93,
  verdict: "Strong Buy",
  instrumentType: "stock",
  cached: true,
  summary: "NVIDIA's FY2026 results confirm structural, not cyclical, dominance. Revenue of $215.9B (+65% YoY) and a net margin of 55.6% place it among the most profitable large-cap companies in history. CUDA ecosystem lock-in, sovereign AI demand, and a $96.7B free cash flow base support a constructive long-term position, with China export restrictions the primary unresolved risk.",
  sections: [
    {
      key: "valuation",
      body: "At a trailing P/E of 37.75x and EV/EBITDA of 31.4x, NVDA carries a premium to the semiconductor peer median of approximately 22x earnings. The PEG of 0.57 is the critical counterpoint: with EPS growing 66% to $4.93 in FY2026, the multiple is not stretched relative to earnings delivery. P/S of 21x is elevated in absolute terms but consistent with a platform business generating 55.6% net margins, far above any software or hardware peer. The principal multiple compression risk is a deceleration in hyperscaler AI capex, which would reduce near-term earnings growth expectations and unwind the premium.",
    },
    {
      key: "growth",
      body: "Revenue compounded from $26.9B in FY2022 to $215.9B in FY2026, a five-year CAGR above 50%, driven almost entirely by data centre GPU demand rather than mix shift or acquisitions. EPS grew 66% in FY2026 and 572% in FY2024, reflecting the operating leverage of a near-monopoly platform scaling into a structurally expanding market. Free cash flow of $96.7B in FY2026 (up from $8.2B in FY2023) confirms earnings quality is high with minimal working capital distortion. The key durability question is whether hyperscaler capex sustains into FY2027-28: current order backlog commentary and sovereign AI buildout suggest near-term visibility remains strong.",
    },
    {
      key: "profitability",
      body: "Gross margin of 71.1% and operating margin of 60.4% are exceptional for a hardware company, reflecting CUDA platform pricing power and persistent GPU supply constraints relative to demand. ROE of 98.4% and ROIC of 82.1% confirm capital is being deployed at rates that dwarf any reasonable cost of capital estimate, creating substantial economic value per dollar invested. The balance sheet is conservatively structured: $62.6B in cash against $10.0B long-term debt, with interest coverage of 503x. The primary margin risk is product mix: if gaming and automotive segments grow faster than data centre in future periods, blended margins will compress from current peak levels.",
    },
    {
      key: "catalysts",
      body: "The Blackwell GPU architecture ramp is the primary near-term catalyst, with GB200 NVL72 rack-scale systems commanding significantly higher ASPs than the H100 predecessor and early indications of strong hyperscaler demand. Sovereign AI data centre buildout across the Middle East, Europe, and Southeast Asia represents a structurally new demand layer independent of US hyperscaler spending cycles and partially insulated from export restriction risk. The NVIDIA Inference Microservices (NIM) software stack is an emerging recurring revenue layer that could reduce hardware cycle dependency and structurally improve revenue quality. Automotive AI penetration via DRIVE Thor, targeting a $300B+ addressable market by 2030, remains early-stage but represents a credible second growth platform.",
    },
    {
      key: "outlook",
      body: "The fundamental bull case rests on AI infrastructure spending sustaining at current levels and NVIDIA maintaining its architectural lead through the Blackwell and Rubin cycles. Both appear intact for the near term but are not guaranteed beyond 18-24 months. China export restrictions have already materially impacted revenue mix and represent a recurring policy risk with no clear resolution path. AMD's MI300X is gaining inference workload share, particularly in cost-sensitive deployments, though CUDA's ecosystem depth makes wholesale switching economically irrational for most hyperscalers. At 37.75x trailing earnings, the stock prices continued growth but not acceleration: any data centre spending pause or guidance cut would create material near-term downside despite the structural long-term narrative remaining intact.",
    },
  ],
  risk_flags: [
    { flag: "China export restrictions", level: "High" },
    { flag: "Hyperscaler capex cycle risk", level: "High" },
    { flag: "Customer concentration risk", level: "Medium" },
    { flag: "AMD MI300X inference share gains", level: "Medium" },
    { flag: "Blackwell supply chain execution", level: "Low" },
  ],
};
