"use client";
import { useState, useEffect, useRef } from "react";

// ── Type tokens ────────────────────────────────────────────────────────────────
const GS = "'Google Sans Flex','DM Sans',sans-serif";
const NS = "'Noto Serif',Georgia,serif";

// ── Mock 2025 illustrative data ────────────────────────────────────────────────
const DISC = [
  { t:"NVDA",   n:"NVIDIA Corp",      p:"$220.67",   ch:"+4.48%", pos:true,  sc:93, v:"Strong Buy" },
  { t:"AAPL",   n:"Apple Inc",        p:"$310.85",   ch:"+0.82%", pos:true,  sc:82, v:"Buy"        },
  { t:"SPX",    n:"S&P 500 Index",    p:"$7,519",    ch:"-0.02%", pos:false, sc:74, v:"Buy"        },
  { t:"AMZN",   n:"Amazon.com Inc",   p:"$271.85",   ch:"+2.47%", pos:true,  sc:83, v:"Buy"        },
  { t:"XAUUSD", n:"Gold (USD)",       p:"$4,455",    ch:"+1.90%", pos:true, sc:82, v:"Strong Buy" },
];
const DIV = [
  { t:"JNJ",  n:"Johnson & Johnson", y:"3.14%", d:"$4.76", p:"44%", sa:82, gr:68 },
  { t:"KO",   n:"Coca-Cola",         y:"3.08%", d:"$1.88", p:"75%", sa:78, gr:55 },
  { t:"PG",   n:"P&G",               y:"2.51%", d:"$3.76", p:"60%", sa:84, gr:72 },
  { t:"O",    n:"Realty Income",     y:"5.60%", d:"$3.08", p:"76%", sa:71, gr:58 },
  { t:"ABBV", n:"AbbVie",            y:"3.42%", d:"$6.20", p:"48%", sa:77, gr:78 },
];
const PORT = [
  { t:"AAPL", s:"Technology", w:25, col:"#4488FF" },
  { t:"SMH",  s:"ETF · Tech",  w:20, col:"#00E676" },
  { t:"NVDA", s:"Technology", w:15, col:"#A855F7" },
  { t:"AMZN", s:"Consumer",   w:15, col:"#F59E0B" },
  { t:"JNJ",  s:"Healthcare", w:15, col:"#06B6D4" },
  { t:"IAU",  s:"ETF · Gold",  w:10, col:"#EF4444" },
];
const DRIP_D  = [770,835,905,980,1063,1151,1247,1350,1461,1581,1711,1851,2002,2166,2344];
const NOD_D   = [770,800,832,864,899,934,971,1009,1048,1090,1133,1178,1224,1273,1323];
const WHATIF  = [50000,64000,52000,65600,80640,87091];
const PROJ    = [87091,99960,114752,131655,151069,173347,198920,228347,261990,344864];
const PRICE6M = [495,540,615,760,820,875];

// ── Chart helpers ──────────────────────────────────────────────────────────────
function calcPts(data, W, H, mn, mx) {
  const n = data.length;
  return data.map((v,i) =>
    `${((i/(n-1))*W).toFixed(1)},${(H-((v-mn)/(mx-mn))*H*0.88-H*0.06).toFixed(1)}`
  ).join(" ");
}

// ── ChartWithCursor ────────────────────────────────────────────────────────────
function ChartWithCursor({ data, col, W, H, fill, gradId, fmt, c, preserveAspect, secondaryData, secondaryCol, markers, lw=2, dr=3, cw=1, dw=1.5 }) {
  const [cur, setCur] = useState({ v:false, x:0, dx:0, dy:0, val:0 });
  const mn = Math.min(...data)*0.97, mx = Math.max(...data)*1.02, n = data.length;
  const pts = calcPts(data, W, H, mn, mx);
  const secPts = secondaryData ? calcPts(secondaryData, W, H, mn, mx) : null;

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const xR = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.max(0, Math.min(n-1, Math.round(xR*(n-1))));
    const y = H - ((data[idx]-mn)/(mx-mn))*H*0.88 - H*0.06;
    setCur({ v:true, x:xR*W, dx:(idx/(n-1))*W, dy:y, val:data[idx] });
  }

  const label = cur.v ? (fmt ? fmt(cur.val) : String(Math.round(cur.val))) : "";
  const tipW  = Math.max(26, label.length * 4.8 + 10);
  const tipX  = cur.dx > W*0.55 ? cur.dx - tipW - 6 : cur.dx + 6;
  const tipY  = Math.max(0, cur.dy - 22);

  return (
    <svg
      width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{ cursor:"crosshair", overflow:"visible", display:"block" }}
      onMouseMove={onMove}
      onMouseLeave={() => setCur(p => ({ ...p, v:false }))}
      {...(preserveAspect ? { preserveAspectRatio:"none" } : {})}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor={col} stopOpacity="0.2" />
          <stop offset="95%" stopColor={col} stopOpacity="0"   />
        </linearGradient>
      </defs>
      {fill && <path d={`M0,${H} ${pts} L${W},${H} Z`} fill={`url(#${gradId})`} />}
      <polyline points={pts} fill="none" stroke={col} strokeWidth={lw} strokeLinecap="round" strokeLinejoin="round" />
      {secPts && (
        <polyline points={secPts} fill="none" stroke={secondaryCol} strokeWidth="1.0"
          strokeDasharray="4,2" strokeLinecap="round" opacity="0.6" />
      )}
      {markers}
      {cur.v && (
        <>
          <line x1={cur.dx.toFixed(1)} y1="0" x2={cur.dx.toFixed(1)} y2={H}
            stroke={c.text} strokeWidth={cw} />
          <g transform={`translate(${tipX.toFixed(1)},${tipY.toFixed(1)})`}>
            <rect width={tipW} height="16" rx="3"
              fill={c.card} stroke={c.border} strokeWidth="0.5" />
            <text x="6" y="11" fontSize="8" fontWeight="500"
              fontFamily={GS} fill={col}>{label}</text>
          </g>
          <circle cx={cur.dx.toFixed(1)} cy={cur.dy.toFixed(1)}
            r={dr} fill={col} stroke="#fff" strokeWidth={dw} />
        </>
      )}
    </svg>
  );
}

// ── ScoreRing ──────────────────────────────────────────────────────────────────
function ScoreRing({ sc, size=28, c }) {
  const col = sc >= 80 ? c.green : sc >= 65 ? c.text : c.red;
  const r = (size-5)/2, cx = size/2, ci = 2*Math.PI*r, off = ci*(1-sc/100);
  return (
    <div style={{ position:"relative", width:size, height:size, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
      <svg width={size} height={size} style={{ position:"absolute", transform:"rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={c.border} strokeWidth="2.5" />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={col} strokeWidth="2.5"
          strokeDasharray={ci.toFixed(1)} strokeDashoffset={off.toFixed(1)} strokeLinecap="round" />
      </svg>
      <span style={{ fontSize:9, fontWeight:500, color:col, fontFamily:GS, position:"relative" }}>{sc}</span>
    </div>
  );
}

// ── VerdictBadge ───────────────────────────────────────────────────────────────
function VerdictBadge({ v, pos, c }) {
  const col = pos ? c.green : v === "Hold" ? c.muted : c.red;
  return (
    <span style={{ fontSize:10, fontWeight:500, color:col, background:pos?c.greenDim:"transparent",
      border:`0.5px solid ${pos?c.green:c.border}`, borderRadius:3,
      padding:"2px 6px", whiteSpace:"nowrap", fontFamily:GS }}>
      {v}
    </span>
  );
}

// ── PillGroup ──────────────────────────────────────────────────────────────────
function PillGroup({ items, active, onChange, c, small }) {
  return (
    <div style={{ display:"flex", gap:small?4:5, flexWrap:"wrap" }}>
      {items.map(s => (
        <button key={s} onClick={() => onChange(s)} style={{
          fontSize:small?10:11, padding:small?"2px 7px":"3px 10px", borderRadius:50,
          border:`0.5px solid ${active===s?c.text:c.border}`,
          background:active===s?c.text:"transparent",
          color:active===s?c.bg:c.muted,
          cursor:"pointer", whiteSpace:"nowrap", fontFamily:GS, transition:"all .15s",
        }}>{s}</button>
      ))}
    </div>
  );
}

// ── InnerTabs ──────────────────────────────────────────────────────────────────
function InnerTabs({ tabs, active, onChange, c, lg }) {
  return (
    <div style={{ display:"flex", borderBottom:`0.5px solid ${c.border}`, marginBottom:10 }}>
      {tabs.map((t,i) => (
        <button key={t} onClick={() => onChange(i)} style={{
          background:"transparent", border:"none", cursor:"pointer",
          fontSize:lg?13:12, fontWeight:active===i?500:400,
          color:active===i?c.text:c.muted,
          padding:`5px 2px ${lg?9:7}px`,
          borderBottom:active===i?`2px solid ${c.text}`:"2px solid transparent",
          fontFamily:GS, transition:"all .15s", marginRight:lg?20:14,
        }}>{t}</button>
      ))}
    </div>
  );
}

// ── SearchMock ─────────────────────────────────────────────────────────────────
function SearchMock({ placeholder, c, animated }) {
  return (
    <div style={{ position:"relative", marginBottom:16 }}>
      <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:c.muted, fontSize:15, zIndex:2, pointerEvents:"none" }}>⌕</span>
      <div
        className={animated ? "cl-srch-anim" : undefined}
        style={{ background:c.surface, border:`0.5px solid ${c.border}`, borderRadius:7,
          padding:"9px 12px 9px 32px", fontSize:13, color:c.muted, fontFamily:GS,
          position:"relative", overflow:"hidden" }}>
        {placeholder}
      </div>
    </div>
  );
}

// ── MetricCard ─────────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, col, c }) {
  return (
    <div style={{ background:c.surface, borderRadius:8, padding:"8px 10px" }}>
      <div style={{ fontSize:10, color:c.muted, letterSpacing:".06em", textTransform:"uppercase", marginBottom:2, fontFamily:GS }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:500, color:col||c.text, fontFamily:GS }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:c.muted, marginTop:2, fontFamily:GS }}>{sub}</div>}
    </div>
  );
}

// ── Sankey Diagram ─────────────────────────────────────────────────────────────
function SankeyDiagram({ c }) {
  function Rib({ x1, ya1, yb1, x2, ya2, yb2, col }) {
    const mx = (x1+x2)/2;
    return <path d={`M${x1},${ya1}C${mx},${ya1} ${mx},${ya2} ${x2},${ya2}L${x2},${yb2}C${mx},${yb2} ${mx},${yb1} ${x1},${yb1}Z`} fill={col} opacity="0.28" />;
  }
  function Node({ x, y, w, h, col }) {
    return <rect x={x} y={y} width={w} height={h} fill={col} rx="3" />;
  }
  return (
    // viewBox extended left (-70) and top (-28) to give room for external labels
    <svg width="100%" viewBox="-70 -28 590 240" style={{ overflow:"visible" }}>
      {/* Ribbons extend 4px INTO each node — nodes render on top and cover the overlap cleanly */}
      <Rib x1={46} ya1={15} yb1={129} x2={219} ya2={15} yb2={129} col="#4488FF" />
      <Rib x1={46} ya1={129} yb1={175} x2={219} ya2={140} yb2={186} col="#F472B6" />
      <Rib x1={256} ya1={15} yb1={105} x2={429} ya2={15} yb2={105} col="#A78BFA" />
      <Rib x1={256} ya1={110} yb1={129} x2={429} ya2={118} yb2={142} col="#F472B6" />
      {/* Nodes (no inside labels — positioned above/below/left externally) */}
      <Node x={5}   y={15}  w={45} h={160} col="#4488FF" />
      <Node x={215} y={15}  w={45} h={114} col="#A78BFA" />
      <Node x={215} y={140} w={45} h={46}  col="#F472B6" />
      <Node x={425} y={15}  w={45} h={90}  col="#A78BFA" />
      <Node x={425} y={118} w={45} h={24}  col="#F472B6" />
      {/* Revenue — LEFT of node */}
      <text x="2" y="91"  textAnchor="end" fontFamily={GS} fontSize="8.5" fill={c.text} fontWeight="500">Revenue</text>
      <text x="2" y="103" textAnchor="end" fontFamily={GS} fontSize="7.5" fill={c.muted}>$215.94B</text>
      {/* Gross Profit — ABOVE node */}
      <text x="237" y="-12" textAnchor="middle" fontFamily={GS} fontSize="8.5" fill={c.text} fontWeight="500">Gross Profit</text>
      <text x="237" y="-3"  textAnchor="middle" fontFamily={GS} fontSize="7.5" fill={c.muted}>$153.46B</text>
      {/* Cost of Rev. — BELOW node */}
      <text x="237" y="198" textAnchor="middle" fontFamily={GS} fontSize="8.5" fill={c.text} fontWeight="500">Cost of Rev.</text>
      <text x="237" y="208" textAnchor="middle" fontFamily={GS} fontSize="7.5" fill={c.muted}>$62.48B</text>
      {/* Op. Income — ABOVE node */}
      <text x="447" y="-12" textAnchor="middle" fontFamily={GS} fontSize="8.5" fill={c.text} fontWeight="500">Op. Income</text>
      <text x="447" y="-3"  textAnchor="middle" fontFamily={GS} fontSize="7.5" fill={c.muted}>$130.39B</text>
      {/* Op. Expenses — BELOW node */}
      <text x="447" y="155" textAnchor="middle" fontFamily={GS} fontSize="7.5" fill="#F472B6" fontWeight="500">Op. Expenses</text>
      <text x="447" y="165" textAnchor="middle" fontFamily={GS} fontSize="7"   fill="#F472B6" opacity="0.85">$23.08B</text>
    </svg>
  );
}

// ── Bar Chart ──────────────────────────────────────────────────────────────────
function BarChart({ c }) {
  const W=520, H=155, base=132, scl=112/130;
  const rev=[26.9,44.9,60.9,130], ni=[4.4,9.8,29.8,72.9], cx=[80,200,320,440];
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {[0,25,50,75,100,125].map(v => {
        const y = base - Math.round(v*scl);
        return (
          <g key={v}>
            <line x1="38" y1={y} x2={W} y2={y} stroke={c.border} strokeDasharray="3,3" />
            <text x="33" y={y+3} textAnchor="end" fontFamily={GS} fontSize="8" fill={c.muted}>{v}B</text>
          </g>
        );
      })}
      {[0,1,2,3].map(i => {
        const rh = Math.max(5, Math.round(rev[i]*scl));
        const nh = Math.max(4, Math.round(ni[i]*scl));
        return (
          <g key={i}>
            <rect x={cx[i]-22} y={base-rh} width="19" height={rh} fill="#4488FF" rx="2" opacity="0.85" />
            <rect x={cx[i]+4}  y={base-nh} width="19" height={nh} fill="#A78BFA" rx="2" opacity="0.85" />
            <text x={cx[i]} y={base+12} textAnchor="middle" fontFamily={GS} fontSize="9" fill={c.muted}>FY{2022+i}</text>
          </g>
        );
      })}
      <rect x="168" y="6" width="10" height="10" fill="#4488FF" rx="2" />
      <text x="181" y="15" fontFamily={GS} fontSize="9" fill={c.muted}>Revenue</text>
      <rect x="254" y="6" width="10" height="10" fill="#A78BFA" rx="2" />
      <text x="267" y="15" fontFamily={GS} fontSize="9" fill={c.muted}>Net Income</text>
    </svg>
  );
}

// ── SlideDiscovery ─────────────────────────────────────────────────────────────
function SlideDiscovery({ c }) {
  const [showCard, setShowCard] = useState(false);
  const [cardTab, setCardTab]   = useState(0);
  const [mkt, setMkt]           = useState("All");
  const [sec, setSec]           = useState("All");

  const amber = c.amber || "#F59E0B";
  const cardContent = [
    /* Overview */
    <div key="ov">
      <div style={{ background:c.surface, borderLeft:`2.5px solid ${c.border}`, borderRadius:"0 6px 6px 0", padding:"10px 12px", marginBottom:10 }}>
        <p style={{ fontSize:10, color:c.muted, letterSpacing:".08em", textTransform:"uppercase", fontWeight:500, marginBottom:5, fontFamily:GS }}>AI Summary</p>
        <p style={{ fontSize:12, color:c.text, lineHeight:1.65, fontFamily:GS }}>NVDA's dominance in AI accelerators is structural. CUDA lock-in makes switching costly for hyperscalers. Revenue growth and margin expansion support a constructive outlook.</p>
      </div>
      {[["Revenue Growth (YoY)","+65.5%",c.green],["Gross Margin","71.1%",c.green],["P/E Ratio","45.0×",c.text],["24h Volume","171M",c.muted]].map(([l,v,col])=>(
        <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`0.5px solid ${c.border}` }}>
          <span style={{ fontSize:12, color:c.muted, fontFamily:GS }}>{l}</span>
          <span style={{ fontSize:12, fontWeight:500, color:col, fontFamily:GS }}>{v}</span>
        </div>
      ))}
    </div>,
    /* Valuation */
    <div key="val">
      <div style={{ background:c.surface, borderLeft:`2.5px solid ${c.border}`, borderRadius:"0 6px 6px 0", padding:"10px 12px", marginBottom:10 }}>
        <p style={{ fontSize:10, color:c.muted, letterSpacing:".08em", textTransform:"uppercase", fontWeight:500, marginBottom:5, fontFamily:GS }}>Valuation Note</p>
        <p style={{ fontSize:12, color:c.text, lineHeight:1.65, fontFamily:GS }}>Premium to peers, but a PEG of 0.57 signals growth is not fully priced in. The AI infrastructure cycle justifies the multiple for patient investors.</p>
      </div>
      {[["EV/EBITDA","42.3×",c.red],["Price / Sales","25.0×",c.red],["PEG Ratio","0.57",c.green],["vs Sector Avg P/E","+185%",c.text]].map(([l,v,col])=>(
        <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`0.5px solid ${c.border}` }}>
          <span style={{ fontSize:12, color:c.muted, fontFamily:GS }}>{l}</span>
          <span style={{ fontSize:12, fontWeight:500, color:col, fontFamily:GS }}>{v}</span>
        </div>
      ))}
    </div>,
    /* Risk */
    <div key="risk">
      {[["China export restrictions","High",c.red],["Customer concentration","Medium",c.text],["AMD MI300X competition","Low",c.green],["TSMC supply chain","Medium",c.text]].map(([f,l,col])=>(
        <div key={f} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"9px 11px", background:c.surface, borderRadius:7, border:`0.5px solid ${c.border}`, marginBottom:6 }}>
          <span style={{ fontSize:12, color:col, fontFamily:GS }}>⚠ {f}</span>
          <span style={{ fontSize:10, fontWeight:500, color:col, letterSpacing:".05em", textTransform:"uppercase", fontFamily:GS }}>{l}</span>
        </div>
      ))}
    </div>,
  ];

  if (showCard) return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8, marginBottom:12 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
            <span style={{ fontSize:20, fontWeight:500, color:c.text, fontFamily:GS }}>NVDA</span>
            <span style={{ fontSize:10, fontWeight:500, color:c.green, background:c.greenDim, border:`0.5px solid ${c.green}`, borderRadius:4, padding:"2px 7px", fontFamily:GS }}>OPEN</span>
            <span style={{ fontSize:11, color:c.muted, fontFamily:GS }}>NASDAQ</span>
          </div>
          <p style={{ fontSize:12, color:c.muted, fontFamily:GS }}>NVIDIA Corporation · Technology</p>
        </div>
        <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
          <div style={{ textAlign:"right" }}>
            <p style={{ fontSize:18, fontWeight:500, color:c.text, fontFamily:GS }}>$875.40</p>
            <p style={{ fontSize:12, fontWeight:500, color:c.green, fontFamily:GS }}>+$45.12 (+5.4%) · 24h</p>
          </div>
          <button onClick={() => { setShowCard(false); setCardTab(0); }}
            style={{ background:c.surface, border:`0.5px solid ${c.border}`, borderRadius:7, padding:"6px 10px", cursor:"pointer", fontSize:12, color:c.muted, fontFamily:GS }}>
            ✕ ESC
          </button>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <ScoreRing sc={93} c={c} />
        <VerdictBadge v="Strong Buy" pos c={c} />
        <span style={{ fontSize:11, color:c.muted, fontFamily:GS }}>Market Cap: <strong style={{ color:c.text }}>$2.15T</strong></span>
      </div>
      <InnerTabs tabs={["Overview","Valuation","Risk"]} active={cardTab} onChange={setCardTab} c={c} />
      {cardContent[cardTab]}
    </div>
  );

  return (
    <div>
      <SearchMock placeholder="Search by ticker, company, sector…" c={c} animated />
      <div style={{ marginBottom:7 }}><PillGroup items={["All","US","EU 🔜","UK 🔜"]} active={mkt} onChange={setMkt} c={c} /></div>
      <div style={{ marginBottom:12 }}><PillGroup items={["All","Technology","Healthcare","Financials","Energy","Consumer"]} active={sec} onChange={setSec} c={c} /></div>
      <div style={{ overflowX:"auto", borderRadius:8, border:`0.5px solid ${c.border}` }}>
        <table style={{ borderCollapse:"collapse", width:"100%", minWidth:500 }}>
          <thead>
            <tr>
              {["Ticker","Company","Price","24h","AI Score","Verdict"].map((h,i) => (
                <th key={h} style={{ fontSize:10, color:c.muted, fontWeight:500, letterSpacing:".07em", textTransform:"uppercase", padding:"6px 8px", background:c.surface, borderBottom:`0.5px solid ${c.border}`, textAlign:i<2?"left":"right", fontFamily:GS }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DISC.map(s => (
              <tr key={s.t} onClick={() => s.t==="NVDA" && setShowCard(true)}
                style={{ cursor:s.t==="NVDA"?"pointer":"default", transition:"background .12s" }}
                onMouseEnter={e => e.currentTarget.style.background=c.surface}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                <td style={{ padding:"7px 8px", fontFamily:GS }}>
                  <span style={{ fontWeight:500 }}>{s.t}</span>
                  {s.t==="NVDA" && <span style={{ fontSize:10, color:c.blue, marginLeft:5 }}>↗ tap to open</span>}
                </td>
                <td style={{ padding:"7px 8px", color:c.muted, fontFamily:GS, fontSize:12 }}>{s.n}</td>
                <td style={{ padding:"7px 8px", textAlign:"right", fontWeight:500, fontFamily:GS }}>{s.p}</td>
                <td style={{ padding:"7px 8px", textAlign:"right", fontWeight:500, color:s.pos?c.green:c.red, fontFamily:GS }}>{s.ch}</td>
                <td style={{ padding:"7px 8px", textAlign:"right" }}><ScoreRing sc={s.sc} c={c} /></td>
                <td style={{ padding:"7px 8px", textAlign:"right" }}><VerdictBadge v={s.v} pos={s.pos} c={c} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── SlideAnalysis ──────────────────────────────────────────────────────────────
function SlideAnalysis({ c }) {
  const [mainTab, setMainTab]   = useState(0); // 0=Statistics, 1=Financials
  const [statTab, setStatTab]   = useState(0);
  const [finChart, setFinChart] = useState("bar");
  const [rng, setRng]           = useState("6M");
  const [period, setPeriod]     = useState("Annual");

  const statRows = [
    [["Market Cap","$2.15T",c.text],["P/E Ratio","45.0×",c.text],["EPS","$4.93",c.green],["Beta","2.24",c.text],["Div. Yield","0.02%",c.muted]],
    [["PEG Ratio","0.57",c.green],["EV/EBITDA","42.3×",c.red],["P/S Ratio","25.0×",c.red],["P/B Ratio","34.4×",c.text],["Ent. Value","$5.4T",c.text]],
    [["Gross Margin","71.1%",c.green],["Net Margin","55.6%",c.green],["Op. Margin","60.4%",c.green],["Rev. Growth","+65.5%",c.green],["EPS Growth","+66.7%",c.green]],
  ];

  return (
    <div>
      {/* Sub-header */}
      <div style={{ background:c.surface, border:`0.5px solid ${c.border}`, borderRadius:8, padding:"10px 14px", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:20, fontWeight:500, color:c.text, fontFamily:GS }}>NVDA</span>
          <span style={{ fontSize:11, color:c.muted, fontFamily:GS }}>NVIDIA Corporation · NASDAQ · USD</span>
          <span style={{ fontSize:10, fontWeight:500, color:c.green, background:c.greenDim, border:`0.5px solid ${c.green}`, borderRadius:4, padding:"2px 7px", fontFamily:GS }}>OPEN</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ textAlign:"right" }}>
            <p style={{ fontSize:18, fontWeight:500, color:c.text, fontFamily:GS }}>$875.40</p>
            <p style={{ fontSize:12, fontWeight:500, color:c.green, fontFamily:GS }}>+$45.12 (+5.4%) · 24h</p>
          </div>
          <ScoreRing sc={93} size={32} c={c} />
          <VerdictBadge v="Strong Buy" pos c={c} />
        </div>
      </div>

      <InnerTabs tabs={["Statistics","Financials"]} active={mainTab} onChange={i=>{setMainTab(i);setStatTab(0);setFinChart("bar");}} c={c} lg />

      {/* Statistics panel */}
      {mainTab === 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"1.05fr 1fr", gap:14 }}>
          <div>
            <div style={{ borderRadius:8, border:`0.5px solid ${c.border}`, overflow:"visible", marginBottom:10 }}>
              <div style={{ padding:"9px 12px", background:c.surface, display:"flex", justifyContent:"space-between", alignItems:"center", borderRadius:"8px 8px 0 0" }}>
                <span style={{ fontSize:10, color:c.muted, letterSpacing:".08em", textTransform:"uppercase", fontWeight:500, fontFamily:GS }}>Price History · 6 Months</span>
                <PillGroup items={["1W","1M","3M","6M","1Y"]} active={rng} onChange={setRng} c={c} small />
              </div>
              <div style={{ padding:8, overflow:"visible" }}>
                <ChartWithCursor data={PRICE6M} col={c.blue} W={300} H={100} fill lw={1.5}
                  gradId="gAC" fmt={v=>`$${v.toFixed(0)}`} c={c} preserveAspect
                  markers={<>
                    <line x1="60" y1="0" x2="60" y2="100" stroke={c.green} strokeWidth="1.0" strokeDasharray="3,3" opacity="0.8"/>
                    <text x="63" y="9" fontSize="7" fill={c.green} fontFamily={GS} fontWeight="500">Q4 Results</text>
                    <line x1="240" y1="0" x2="240" y2="100" stroke={c.green} strokeWidth="1.0" strokeDasharray="3,3" opacity="0.8"/>
                    <text x="237" y="9" textAnchor="end" fontSize="7" fill={c.green} fontFamily={GS} fontWeight="500">Q1 Results</text>
                  </>}
                />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"0 12px 7px", fontSize:10, color:c.muted, fontFamily:GS }}>
                <span>Jan 2025</span><span>Jun 2025</span>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {[["Market Cap","$2.15T",c.text],["P/E Ratio","45.0×",c.text],["Rev. Growth","+65.5%",c.green],["Gross Margin","71.1%",c.green]].map(([l,v,col])=>(
                <MetricCard key={l} label={l} value={v} col={col} c={c} />
              ))}
            </div>
          </div>
          <div style={{ background:c.surface, border:`0.5px solid ${c.border}`, borderRadius:8, padding:12 }}>
            <InnerTabs tabs={["General","Valuation","Profitability"]} active={statTab} onChange={setStatTab} c={c} />
            {statRows[statTab].map(([l,v,col])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`0.5px solid ${c.border}` }}>
                <span style={{ fontSize:12, color:c.muted, fontFamily:GS }}>{l}</span>
                <span style={{ fontSize:12, fontWeight:500, color:col, fontFamily:GS }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financials panel */}
      {mainTab === 1 && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              {["bar","sankey"].map(t => (
                <button key={t} onClick={() => setFinChart(t)} style={{
                  fontSize:11, padding:"3px 10px", borderRadius:50,
                  border:`0.5px solid ${finChart===t?c.text:c.border}`,
                  background:finChart===t?c.text:"transparent",
                  color:finChart===t?c.bg:c.muted,
                  cursor:"pointer", fontFamily:GS, transition:"all .15s",
                }}>{t==="bar"?"Bar":"Sankey"}</button>
              ))}
              <span style={{ fontSize:10, color:c.blue, fontFamily:GS, marginLeft:2 }}>↗ tap to discover</span>
            </div>
            <PillGroup items={["Annual","Quarterly"]} active={period} onChange={setPeriod} c={c} small />
          </div>
          <div style={{ background:c.surface, border:`0.5px solid ${c.border}`, borderRadius:8, padding:12, marginBottom:10 }}>
            <p style={{ fontSize:10, color:c.muted, letterSpacing:".08em", textTransform:"uppercase", fontWeight:500, marginBottom:8, fontFamily:GS }}>
              {finChart==="bar" ? "Income Statement · Revenue & Net Income · FY2022–2025" : "Income Flow Diagram · FY2025 Annual"}
            </p>
            {finChart === "bar" ? <BarChart c={c} /> : <SankeyDiagram c={c} />}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {[["Revenue","$215.94B","100% margin","#4488FF"],["Gross Profit","$153.46B","71.1% margin","#A78BFA"],["Net Income","$120.07B","55.6% margin",c.green]].map(([l,v,s,col])=>(
              <MetricCard key={l} label={l} value={v} sub={s} col={col} c={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SlideScreener ──────────────────────────────────────────────────────────────
function SlideScreener({ c }) {
  const [filter, setFilter] = useState("All");
  return (
    <div>
      <SearchMock placeholder="Search dividend stocks by ticker or sector…" c={c} animated />
      <div style={{ marginBottom:12 }}>
        <PillGroup items={["All","Staples","Healthcare","Real Estate","Energy","Communication"]} active={filter} onChange={setFilter} c={c} />
      </div>
      <div style={{ overflowX:"auto", borderRadius:8, border:`0.5px solid ${c.border}` }}>
        <table style={{ borderCollapse:"collapse", width:"100%", minWidth:440 }}>
          <thead>
            <tr>
              {["Stock","Yield %","Ann. DPS","Payout","Safety","Growth"].map((h,i)=>(
                <th key={h} style={{ fontSize:10, color:c.muted, fontWeight:500, letterSpacing:".07em", textTransform:"uppercase", padding:"6px 8px", background:c.surface, borderBottom:`0.5px solid ${c.border}`, textAlign:i===0?"left":"right", fontFamily:GS }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIV.map(s => (
              <tr key={s.t}
                onMouseEnter={e=>e.currentTarget.style.background=c.surface}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{ padding:"7px 8px" }}>
                  <div style={{ fontWeight:500, fontFamily:GS }}>{s.t}</div>
                  <div style={{ fontSize:10, color:c.muted, fontFamily:GS }}>{s.n}</div>
                </td>
                <td style={{ padding:"7px 8px", textAlign:"right", fontWeight:500, color:c.green, fontFamily:GS }}>{s.y}</td>
                <td style={{ padding:"7px 8px", textAlign:"right", fontFamily:GS }}>{s.d}</td>
                <td style={{ padding:"7px 8px", textAlign:"right", color:c.muted, fontFamily:GS }}>{s.p}</td>
                <td style={{ padding:"7px 8px", textAlign:"right" }}><ScoreRing sc={s.sa} c={c} /></td>
                <td style={{ padding:"7px 8px", textAlign:"right" }}><ScoreRing sc={s.gr} c={c} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap", alignItems:"center" }}>
        {["ABBV","JNJ"].map(t=>(
          <span key={t} style={{ background:c.greenDim, border:`0.5px solid ${c.green}`, borderRadius:4, padding:"2px 8px", color:c.green, fontSize:11, fontWeight:500, fontFamily:GS }}>{t} ✓</span>
        ))}
        <span style={{ fontSize:11, color:c.muted, fontFamily:GS }}>selected to compare</span>
        <button style={{ background:c.blue, color:"#fff", border:"none", borderRadius:4, padding:"3px 12px", cursor:"pointer", fontSize:11, fontFamily:GS }}>⚖ Compare (2)</button>
      </div>
    </div>
  );
}

// ── SlidePlanner ───────────────────────────────────────────────────────────────
function SlidePlanner({ c }) {
  const [drip, setDrip] = useState(true);
  // Fixed scale: always use DRIP range so both lines share the same y-axis
  const MN = Math.min(...DRIP_D)*0.97, MX = Math.max(...DRIP_D)*1.02;
  const W=220, H=88;
  const activePts   = calcPts(drip?DRIP_D:NOD_D,   W, H, MN, MX);
  const secondaryPts = calcPts(drip?NOD_D:DRIP_D, W, H, MN, MX);
  const activeCol    = drip ? c.green : c.blue;
  const secondaryCol = drip ? c.blue  : c.green;

  // Inline cursor for dual-line chart
  const [cur, setCur] = useState({ v:false, x:0, dx:0, dy:0, val:0 });
  const activeData = drip ? DRIP_D : NOD_D;
  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const xR = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.max(0, Math.min(14, Math.round(xR*14)));
    const y = H - ((activeData[idx]-MN)/(MX-MN))*H*0.88 - H*0.06;
    setCur({ v:true, x:xR*W, dx:(idx/14)*W, dy:y, val:activeData[idx] });
  }
  const label = cur.v ? `$${Math.round(cur.val)}` : "";
  const tipW  = Math.max(26, label.length * 4.8 + 10);
  const tipX  = cur.dx > W*0.55 ? cur.dx - tipW - 6 : cur.dx + 6;
  const tipY  = Math.max(0, cur.dy - 22);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
      {/* Params */}
      <div style={{ background:c.surface, border:`0.5px solid ${c.border}`, borderRadius:10, padding:14 }}>
        <p style={{ fontSize:12, fontWeight:500, color:c.text, marginBottom:10, fontFamily:GS }}>Parameters</p>
        {[["Based on stock","KO — 3.08% yield applied"],["Initial Investment","$25,000"],["Annual Yield","3.08%"],["Investment Period","15 years"]].map(([l,v])=>(
          <div key={l} style={{ marginBottom:8 }}>
            <div style={{ fontSize:10, color:c.muted, marginBottom:3, fontFamily:GS }}>{l}</div>
            <div style={{ background:c.card, border:`0.5px solid ${c.border}`, borderRadius:5, padding:"7px 10px", fontSize:12, color:c.text, fontFamily:GS }}>{v}</div>
          </div>
        ))}
        <div onClick={() => setDrip(d=>!d)} style={{ display:"flex", alignItems:"center", gap:7, marginTop:6, cursor:"pointer", userSelect:"none" }}>
          <div style={{ width:30, height:17, borderRadius:8, background:drip?c.green:c.border, position:"relative", flexShrink:0, transition:"background .2s" }}>
            <div style={{ position:"absolute", top:2, [drip?"right":"left"]:2, width:13, height:13, borderRadius:"50%", background:"#fff", transition:"all .2s" }} />
          </div>
          <span style={{ fontSize:12, color:c.text, fontWeight:drip?500:400, fontFamily:GS }}>Reinvest dividends (DRIP)</span>
        </div>
      </div>
      {/* Output */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ background:c.greenDim, border:`0.5px solid ${c.green}`, borderRadius:10, padding:12 }}>
          <p style={{ fontSize:10, color:c.green, letterSpacing:".09em", textTransform:"uppercase", fontWeight:500, marginBottom:4, fontFamily:GS }}>Year 15 Annual Income</p>
          <p style={{ fontSize:28, fontWeight:500, color:c.green, lineHeight:1, fontFamily:GS }}>{drip?"$2,344":"$1,323"}</p>
          <p style={{ fontSize:11, color:c.green, opacity:.75, marginTop:3, fontFamily:GS }}>{drip?"$195 / month":"$110 / month"}</p>
        </div>
        <div style={{ background:c.surface, border:`0.5px solid ${c.border}`, borderRadius:10, padding:12, flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <span style={{ fontSize:11, fontWeight:500, color:c.text, fontFamily:GS }}>Annual income projection</span>
            <span style={{ fontSize:10, color:c.green, fontFamily:GS }}>— DRIP</span>
            <span style={{ fontSize:10, color:c.blue, fontFamily:GS }}>-- no DRIP</span>
          </div>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`}
            style={{ cursor:"crosshair", overflow:"visible", display:"block" }}
            onMouseMove={onMove} onMouseLeave={()=>setCur(p=>({...p,v:false}))}>
            <defs>
              <linearGradient id="gPlan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={activeCol} stopOpacity="0.2" />
                <stop offset="95%" stopColor={activeCol} stopOpacity="0"   />
              </linearGradient>
            </defs>
            <path d={`M0,${H} ${activePts} L${W},${H} Z`} fill="url(#gPlan)" />
            <polyline points={activePts} fill="none" stroke={activeCol} strokeWidth="1.0" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={secondaryPts} fill="none" stroke={secondaryCol} strokeWidth="1.0" strokeDasharray="4,2" strokeLinecap="round" opacity="0.6" />
            {cur.v && <>
              <line x1={cur.dx.toFixed(1)} y1="0" x2={cur.dx.toFixed(1)} y2={H} stroke={c.text} strokeWidth="0.8" />
              <g transform={`translate(${tipX.toFixed(1)},${tipY.toFixed(1)})`}>
                <rect width={tipW} height="16" rx="3" fill={c.card} stroke={c.border} strokeWidth="0.5" />
                <text x="6" y="11" fontSize="8" fontWeight="500" fontFamily={GS} fill={activeCol}>{label}</text>
              </g>
              <circle cx={cur.dx.toFixed(1)} cy={cur.dy.toFixed(1)} r="2" fill={activeCol} stroke="#fff" strokeWidth="1" />
            </>}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── SlidePortfolio ─────────────────────────────────────────────────────────────
function SlidePortfolio({ c }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
      <div>
        <div style={{ background:c.surface, border:`0.5px solid ${c.border}`, borderRadius:8, padding:12, marginBottom:10 }}>
          <p style={{ fontSize:10, color:c.muted, letterSpacing:".08em", textTransform:"uppercase", fontWeight:500, marginBottom:10, fontFamily:GS }}>Growth Focus · $50,000</p>
          {PORT.map(h => (
            <div key={h.t} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
              <div style={{ width:8, height:8, borderRadius:2, background:h.col, flexShrink:0 }} />
              <span style={{ fontSize:12, fontWeight:500, color:c.text, flex:1, fontFamily:GS }}>{h.t}</span>
              <div style={{ width:55, height:4, background:c.border, borderRadius:2, overflow:"hidden" }}>
                <div style={{ width:`${h.w}%`, height:"100%", background:h.col }} />
              </div>
              <span style={{ fontSize:11, color:c.muted, width:26, textAlign:"right", fontFamily:GS }}>{h.w}%</span>
            </div>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
          {[["Est. CAGR","14.8%",c.green],["Div. Score","68",c.text],["Avg AI Score","83",c.green],["Sectors","4",c.text]].map(([l,v,col])=>(
            <MetricCard key={l} label={l} value={v} col={col} c={c} />
          ))}
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ background:c.surface, border:`0.5px solid ${c.border}`, borderRadius:8, padding:12 }}>
          <p style={{ fontSize:10, color:c.muted, letterSpacing:".08em", textTransform:"uppercase", fontWeight:500, marginBottom:4, fontFamily:GS }}>What If · Invested Jan 2020</p>
          <p style={{ fontSize:15, fontWeight:500, color:c.green, marginBottom:6, fontFamily:GS }}>$50k → $87k <span style={{ fontSize:12, opacity:.7 }}>+74%</span></p>
          <ChartWithCursor data={WHATIF} col={c.green} W={200} H={68} fill gradId="gWC" fmt={v=>`$${Math.round(v/1000)}k`} c={c} lw={1.0} dr={2} cw={0.7} dw={1.0} />
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:3, fontSize:10, color:c.muted, fontFamily:GS }}><span>2020</span><span>2025</span></div>
        </div>
        <div style={{ background:c.surface, border:`0.5px solid ${c.border}`, borderRadius:8, padding:12 }}>
          <p style={{ fontSize:10, color:c.muted, letterSpacing:".08em", textTransform:"uppercase", fontWeight:500, marginBottom:4, fontFamily:GS }}>Projection · 10 Years</p>
          <p style={{ fontSize:15, fontWeight:500, color:c.blue, marginBottom:6, fontFamily:GS }}>$87k → $345k <span style={{ fontSize:12, opacity:.7 }}>+296%</span></p>
          <ChartWithCursor data={PROJ} col={c.blue} W={200} H={68} fill gradId="gPRC" fmt={v=>`$${Math.round(v/1000)}k`} c={c} lw={1.0} dr={2} cw={0.7} dw={1.0} />
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:3, fontSize:10, color:c.muted, fontFamily:GS }}><span>Today</span><span>Yr 10</span></div>
        </div>
      </div>
    </div>
  );
}

// ── Main Carousel ──────────────────────────────────────────────────────────────
const TABS = ["Discovery","Instrument Analysis","Dividend Screener","Income Planner","Portfolio"];
const SLIDE_COMPONENTS = [SlideDiscovery, SlideAnalysis, SlideScreener, SlidePlanner, SlidePortfolio];

export default function ToolsCarousel({ c: cProp, isDark }) {
  // Extend c with amber (not always in the page's c object)
  const c = { ...cProp, amber: isDark ? "#F59E0B" : "#B45309" };

const [active, setActive]     = useState(0);
const [progress, setProgress] = useState(0);
const hoverRef = useRef(false);
const startRef = useRef(Date.now());
const INT = 5000;

// Single persistent loop — hoverRef never goes stale inside the closure
useEffect(() => {
  let raf;
  const tick = () => {
    if (!hoverRef.current) {
      const elapsed = Date.now() - startRef.current;
      setProgress(Math.min(100, (elapsed / INT) * 100));
      if (elapsed >= INT) {
        startRef.current = Date.now();
        setActive(a => (a + 1) % 5);
      }
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}, []); // empty — runs once, no restart on hover change

function goTo(i) {
  setActive(i);
  startRef.current = Date.now();
  setProgress(0);
}

  const ActiveSlide = SLIDE_COMPONENTS[active];

  return (
    <>
    <style>{`
      @keyframes clSearchScan {
        0%   { transform: translateX(-120%); }
        38%  { transform: translateX(120%);  }
        100% { transform: translateX(120%);  }
      }
      .cl-srch-anim::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg,
          transparent 0%,
          rgba(68,136,255,0.28) 35%,
          rgba(0,230,118,0.22) 55%,
          rgba(68,136,255,0.28) 75%,
          transparent 100%
        );
        border-radius: 7px;
        animation: clSearchScan 7.5s ease-in-out infinite;
        pointer-events: none;
        z-index: 1;
      }
    `}</style>
    <div
      onMouseEnter={() => { hoverRef.current = true; }}
      onMouseLeave={() => { hoverRef.current = false; startRef.current = Date.now(); setProgress(0); }}
      style={{
        border:`1px solid ${c.borderHi || c.border}`,
        borderRadius:14,
        overflow:"hidden",
        boxShadow: isDark ? "0 4px 28px rgba(0,0,0,0.40)" : "0 4px 20px rgba(0,0,0,0.07)",
      }}
    >
      {/* ── Tab row ── */}
      <div style={{
        borderBottom:`0.5px solid ${c.border}`,
        background: isDark ? "linear-gradient(90deg,#111113,#141418)" : "linear-gradient(90deg,#FFFFFF,#F5F5F8)",
        overflowX:"auto", display:"flex",
      }}>
        {TABS.map((t,i) => (
          <button key={t} onClick={() => goTo(i)} style={{
            background:"transparent", border:"none",
            padding:"12px 16px 10px", cursor:"pointer",
            fontSize:12.5, fontWeight:active===i?500:400,
            color:active===i?c.text:c.muted,
            borderBottom:active===i?`2px solid ${c.text}`:"2px solid transparent",
            whiteSpace:"nowrap", fontFamily:GS,
            transition:"color .15s, border-color .15s", flexShrink:0,
          }}>{t}</button>
        ))}
      </div>

      {/* ── Slide content ── */}
      <div style={{ padding:"1.25rem", background:c.card, minHeight:420 }}>
        <ActiveSlide c={c} isDark={isDark} />
      </div>

      {/* ── Dot navigation ── */}
      <div style={{
        display:"flex", justifyContent:"center", gap:5, padding:10,
        borderTop:`0.5px solid ${c.border}`,
        background: isDark ? "#111113" : "#F7F7F5",
      }}>
        {TABS.map((_,i) => (
          <button key={i} onClick={() => goTo(i)} aria-label={`Slide ${i+1}: ${TABS[i]}`} style={{
            border:"none", cursor:"pointer",
            width:active===i?20:7, height:7,
            borderRadius:active===i?4:"50%",
            background:active===i?c.text:c.border,
            transition:"all .22s ease", flexShrink:0, padding:0,
          }} />
        ))}
      </div>

      {/* ── Progress bar (bottom) ── */}
      <div style={{ height:3, background:c.border }}>
        <div style={{ height:"100%", width:`${progress}%`, background:c.blue, transition:"width 0.05s linear" }} />
      </div>
    </div>
    </>
  );
}
