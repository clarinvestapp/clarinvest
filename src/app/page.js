"use client";
import ToolsCarousel from "@/app/components/ToolsCarousel";
import FullReportPopup, { NVDA_SAMPLE_REPORT } from "@/app/components/FullReportPopup";
import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  dark: {
    bg:"#090909",card:"#111113",surface:"#141416",
    border:"#232325",borderHi:"#333336",
    text:"#F0F0F0",muted:"#7A7A80",
    green:"#00E676",greenDim:"rgba(0,230,118,0.10)",
    blue:"#4488FF", blueDim:"rgba(68,136,255,0.12)",
    red:"#FF1800",  redDim:"rgba(255,24,0,0.12)",
  },
  light: {
    bg:"#F7F7F5",card:"#FFFFFF",surface:"#EEEEED",
    border:"#DEDEDD",borderHi:"#BABAB8",
    text:"#0A0A0A",muted:"#606065",
    green:"#008A38",greenDim:"rgba(0,138,56,0.09)",
    blue:"#1E55CC", blueDim:"rgba(30,85,204,0.09)",
    red:"#CC0000",  redDim:"rgba(204,0,0,0.10)",
  },
};

// ─── Stripe Price IDs ─────────────────────────────────────────────────────────
const PRICE_IDS = {
  essential_monthly: "price_1TXpfe2LvKDKlOmwCd2Kn1tM",
  essential_yearly:  "price_1TXpgQ2LvKDKlOmwEmhpx87h",
  pro_monthly:       "price_1TZ4LX2LvKDKlOmwYOQ1bzc6",
  pro_yearly:        "price_1TZ4M22LvKDKlOmwhURhQS9B",
  ultimate_monthly:  "price_1TXph12LvKDKlOmwuRfaaKwJ",
  ultimate_yearly:   "price_1TXpjD2LvKDKlOmwS2LiCkG6",
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const CURR={
  GBP:{sym:"£", em:[9,79],   pr:[19,159],  ul:[29,249]},
  USD:{sym:"$", em:[12,99],  pr:[25,209],  ul:[35,299]},
  EUR:{sym:"€", em:[10,89],  pr:[22,189],  ul:[32,269]},
  CAD:{sym:"C$",em:[16,129], pr:[32,269],  ul:[45,379]},
  AUD:{sym:"A$",em:[18,149], pr:[36,299],  ul:[52,429]},
};
const GEO={GB:"GBP",US:"USD",CA:"CAD",AU:"AUD",DE:"EUR",FR:"EUR",IT:"EUR",ES:"EUR",NL:"EUR",PT:"EUR",BE:"EUR",AT:"EUR",IE:"EUR",FI:"EUR",GR:"EUR"};

const CHART_DATA=[
  {w:"Jan W1",p:495},{w:"Jan W3",p:528},
  {w:"Feb W1",p:552},{w:"Feb W3",p:641},
  {w:"Mar W1",p:791},{w:"Mar W3",p:878},
  {w:"Apr W1",p:762},{w:"Apr W3",p:796},
  {w:"May W1",p:876},{w:"May W3",p:946},
  {w:"Jun W1",p:1042},{w:"Jun W3",p:1208},
];

const FEATS=[
  {icon:"◈",title:"AI Stock Reports",       desc:"Plain-English analysis in seconds. Earnings, valuation, momentum. No jargon, no noise, just the signal you need."},
  {icon:"▲",title:"Value and Growth Signals",desc:"Screening for undervalued compounders, momentum breakouts, dividend consistency, and alpha across every sector."},
  {icon:"▣",title:"Deep Fundamentals",       desc:"P/E, EV/EBITDA, revenue growth, debt, margins, all contextualised by AI against sector peers and historical norms."},
  {icon:"◉",title:"Earnings Intelligence",   desc:"Beat/miss analysis and guidance interpretation. What the numbers actually mean for the stock trajectory ahead."},
  {icon:"◈",title:"Multi-Market Coverage",   desc:"US, European and UK equities in one interface. Filter by market, sector, or signal type with a single tap."},
  {icon:"◇",title:"Risk Flag Alerts",        desc:"AI-surfaced red flags: insider selling, covenant risk, sector headwinds, and concentration concerns surfaced fast."},
];

const CHIPS=[
  {ticker:"NVDA",name:"NVIDIA Corp.",        price:"$875", chg:"+5.4%",score:93,label:"Strong Buy",top:"22%",right:"12%", mul:18, delay:"0s"  },
  {ticker:"AAPL",name:"Apple Inc.",          price:"$184", chg:"+2.1%",score:78,label:"Buy",        top:"62%",right:"12%", mul:12, delay:"1.5s"},
  {ticker:"TSLA",name:"Tesla Inc.",          price:"$171", chg:"-1.2%",score:61,label:"Hold",       top:"26%",left:"12%",  mul:-14,delay:"0.8s"},
  {ticker:"TSM", name:"Taiwan Semiconductor",price:"$138", chg:"+3.1%",score:82,label:"Buy",        top:"65%",left:"12%",  mul:-10,delay:"2.1s"},
];

const TICKERS=["AAPL +2.1%","MSFT +0.8%","NVDA +5.4%","TSLA -1.2%","AMZN +1.9%","GOOGL +0.3%","META +3.1%","TSM +3.1%","ASML.AS +1.8%","AZN.L +2.0%","VOD.L -0.5%","SIE.DE +1.1%","MC.PA +0.9%","BP.L -0.9%","SHEL.L +0.7%","BARC.L -0.3%"];

const FAQ_ITEMS = [
  {
    q: "What is Clarinvest?",
    a: "Clarinvest is an AI-powered investment intelligence platform. It translates raw financial data into sharp, actionable analysis across stocks, indexes, ETFs, and commodities, covering US, UK, and European markets. Think of it as having a world-class analyst available at any time, in plain English.",
  },
  {
    q: "Is this financial advice?",
    a: "No. Clarinvest provides AI-generated analysis for informational purposes only. Nothing on this platform constitutes financial advice, investment advice, or a recommendation to buy, sell, or hold any asset. Always conduct your own due diligence and consult a qualified financial adviser before making investment decisions.",
  },
  {
    q: "What markets and instruments does Clarinvest cover?",
    a: "US stocks and indexes are live now. UK and European markets, ETFs, and commodities are in active development. Essential and Pro plan subscribers will be notified when they launch. Ultimate plan subscribers get early access.",
  },
  {
    q: "What is the difference between an AI Summary and a Full AI Report?",
    a: "A Summary gives you a concise 3-4 sentence assessment with an AI Score, a verdict, and key risk flags, useful for quick screening. A Full Report adds a structured deep-dive across overview, valuation, growth, profitability, risks, and outlook. Full Reports are available on Pro and Ultimate plans.",
  },
  {
    q: "How is the AI Score calculated?",
    a: "The AI Score (0-100) reflects the overall investment quality of an instrument based on current fundamentals: valuation, growth trajectory, profitability, balance sheet strength, and momentum signals. It is not a price prediction. An 80+ score indicates a strong fundamental profile; below 50 signals material concerns.",
  },
  {
    q: "How current is the market data?",
    a: "Market data is sourced from Financial Modelling Prep (FMP) and refreshed daily. AI analyses are cached for 24 hours and shared across users, so the first person to request a ticker generates the analysis and subsequent users receive the same cached result until it expires.",
  },
  {
    q: "Can I cancel my subscription at any time?",
    a: "Yes. Cancel anytime from your Account page. You keep access until the end of your current billing period. No setup fees, no cancellation fees.",
  },
  {
    q: "What payment methods are accepted?",
    a: "All major credit and debit cards via Stripe. USDT and USDC stablecoin payments are also accepted via NOWPayments, with no bank account required.",
  },
];

// ─── Scroll Reveal ─────────────────────────────────────────────────────────────
function useReveal(){
  const ref=useRef(null),[v,setV]=useState(false);
  useEffect(()=>{
    const o=new IntersectionObserver(([e])=>{if(e.isIntersecting){setV(true);o.disconnect();}},{threshold:0.08});
    if(ref.current)o.observe(ref.current);
  
  return()=>o.disconnect();
  },[]);
  return[ref,v];
}
function Reveal({children,delay=0,passStyle={}}){
  const[ref,v]=useReveal();
  return(
    <div ref={ref} style={{opacity:v?1:0,transform:v?"none":"translateY(22px)",transition:`opacity 0.7s ease ${delay}s,transform 0.7s ease ${delay}s`,...passStyle}}>
      {children}
    </div>
  );
}

// ─── Inline SVG flags — no network, works on Windows Chrome/Edge ─────────────
function FlagSVG({ market, height = 16 }) {
  const w = Math.round(height * (19/13));
  const s = { borderRadius:"2px", display:"inline-block", verticalAlign:"middle", flexShrink:0 };
  if (market === "US") return (
    <svg width={w} height={height} viewBox="0 0 7410 3900" xmlns="http://www.w3.org/2000/svg" style={s}>
      <path fill="#b22234" d="M0 0h7410v3900H0z"/>
      <path d="M0 450h7410m0 600H0m0 600h7410m0 600H0m0 600h7410m0 600H0" stroke="#fff" strokeWidth="300"/>
      <path fill="#3c3b6e" d="M0 0h2964v2100H0z"/>
      <g fill="#fff">
        <g id="us-d">
          <g id="us-c">
            <g id="us-e">
              <g id="us-b">
                <path id="us-a" d="M247 90l70.534 217.082-184.66-134.164h228.253L176.466 307.082z"/>
                <use href="#us-a" y="420"/>
                <use href="#us-a" y="840"/>
                <use href="#us-a" y="1260"/>
              </g>
              <use href="#us-a" y="1680"/>
            </g>
            <use href="#us-b" x="247" y="210"/>
          </g>
          <use href="#us-c" x="494"/>
        </g>
        <use href="#us-d" x="988"/>
        <use href="#us-c" x="1976"/>
        <use href="#us-e" x="2470"/>
      </g>
    </svg>
  );
  if (market === "UK") return (
    <svg width={w} height={height} viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg" style={s}>
      <defs>
        <clipPath id="uj-a"><path d="M0 0v30h60V0z"/></clipPath>
        <clipPath id="uj-b"><path d="M30 15h30v15zv15H0zH0V0zV0h30z"/></clipPath>
      </defs>
      <g clipPath="url(#uj-a)">
        <path d="M0 0v30h60V0z" fill="#012169"/>
        <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6"/>
        <path d="M0 0l60 30m0-30L0 30" clipPath="url(#uj-b)" stroke="#C8102E" strokeWidth="4"/>
        <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
        <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
      </g>
    </svg>
  );
  if (market === "EU") return (
    <svg width={w} height={height} viewBox="0 0 810 540" xmlns="http://www.w3.org/2000/svg" style={s}>
      <defs>
        <g id="eu-d">
          <g id="eu-b">
            <path id="eu-a" d="M0 0v1h.5z" transform="rotate(18 3.157 -.5)"/>
            <use href="#eu-a" transform="scale(-1 1)"/>
          </g>
          <g id="eu-c">
            <use href="#eu-b" transform="rotate(72)"/>
            <use href="#eu-b" transform="rotate(144)"/>
          </g>
          <use href="#eu-c" transform="scale(-1 1)"/>
        </g>
      </defs>
      <path fill="#039" d="M0 0h810v540H0z"/>
      <g fill="#fc0" transform="matrix(30 0 0 30 405 270)">
        <use href="#eu-d" y="-6"/>
        <use href="#eu-d" y="6"/>
        <g id="eu-e">
          <use href="#eu-d" x="-6"/>
          <use href="#eu-d" transform="rotate(-144 -2.344 -2.11)"/>
          <use href="#eu-d" transform="rotate(144 -2.11 -2.344)"/>
          <use href="#eu-d" transform="rotate(72 -4.663 -2.076)"/>
          <use href="#eu-d" transform="rotate(72 -5.076 .534)"/>
        </g>
        <use href="#eu-e" transform="scale(-1 1)"/>
      </g>
    </svg>
  );
  return <span style={{fontFamily:"monospace",fontSize:"0.7rem",color:"#888"}}>{market}</span>;
}

// Chart reference line label
const RefLabel=({viewBox,value,color})=>{
  if(!viewBox)return null;
  return(
    <text x={viewBox.x} y={(viewBox.y||0)-8} fill={color} fontSize={9}
      textAnchor="middle" fontFamily="'Google Sans Flex','DM Sans',sans-serif" fontWeight={600}>
      {value}
    </text>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

// ─── Exchange & powered-by data ───────────────────────────────────────────────
const EXCHANGES = [
  { name:"NYSE",       logo:"/logos/nyse.svg"      },
  { name:"NASDAQ",     logo:"/logos/nasdaq.svg"    },
  { name:"S&P 500",    logo:"/logos/sp500.svg"     },
  { name:"Dow Jones",  logo:"/logos/dowjones.svg"  },
  { name:"FTSE 100",   logo:"/logos/ftse100.svg"   },
  { name:"LSE",        logo:"/logos/lse.svg"       },
  { name:"EURONEXT",   logo:"/logos/euronext.svg"  },
  { name:"DAX",        logo:"/logos/dax.svg"       },
  { name:"XETRA",      logo:"/logos/xetra.svg"     },
];

const POWERED_BY = [
  { name:"Anthropic",  logo:"/logos/anthropic.svg"    },
  { name:"Stripe",     logo:"/logos/stripe.svg"       },
  { name:"NOWPayments",logo:"/logos/nowpayments.svg"  },
  { name:"Tether",     logo:"/logos/tether.svg"       },
  { name:"Supabase",   logo:"/logos/supabase.svg"     },
  { name:"Vercel",     logo:"/logos/vercel.svg"       },
  { name:"Financial Modeling Prep", logo:"/logos/fmp.svg" },
  { name:"Next.js",    logo:"/logos/nextjs.svg"       },
];

// ─── Marquee carousel ─────────────────────────────────────────────────────────
// pxPerSec drives both carousels at identical visual speed regardless of track
// length. Duration is computed after first render by measuring scrollWidth,
// so it works correctly no matter how many logos each carousel contains.
function Marquee({ items, pxPerSec = 40, logoH = 30, c, mode, label, sublabel, reverse = false }) {
  const base    = items.length < 8 ? [...items, ...items] : items;
  const doubled = [...base, ...base];
  const trackRef  = useRef(null);
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    if (!trackRef.current) return;
    // scrollWidth covers all doubled items; half of it = one full loop cycle
    const trackW = trackRef.current.scrollWidth / 2;
    setDuration(trackW / pxPerSec);
  }, [pxPerSec, items.length]);

  const animName = "mqpps" + (reverse ? "r" : "f");
  const fromX   = reverse ? "translateX(-50%)" : "translateX(0)";
  const toX     = reverse ? "translateX(0)"    : "translateX(-50%)";

  return (
    <div style={{ padding:"5rem 0", borderTop:`1px solid ${c.border}` }}>
      {/* Section label */}
      {label && (
        <div style={{ textAlign:"center", marginBottom:"2.5rem" }}>
          <p style={{ fontFamily:"'Google Sans Flex','DM Sans',sans-serif", fontSize:"0.65rem", color:c.muted, letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:600, marginBottom:"0.4rem" }}>{label}</p>
          {sublabel && <p style={{ fontFamily:"'Google Sans Flex','DM Sans',sans-serif", fontSize:"0.85rem", color:c.muted }}>{sublabel}</p>}
        </div>
      )}
      {/* Scrolling strip */}
      <div style={{
        overflow:"hidden",
        WebkitMaskImage:"linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        maskImage:"linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
      }}>
        <div
          ref={trackRef}
          style={{
            display:"flex", alignItems:"center", width:"max-content",
            // Animation starts only after duration is measured — no wrong-speed flash
            animation: duration ? `${animName} ${duration}s linear infinite` : "none",
          }}
        >
          <style>{`@keyframes ${animName}{from{transform:${fromX}}to{transform:${toX}}}`}</style>
          {doubled.map((item, i) => (
            <div key={i} style={{ flexShrink:0, padding:"0 3.5rem", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {/*
                Hard height forces every logo to exactly logoH px tall regardless
                of its SVG aspect ratio. Wide logos (Dow Jones) stay wide,
                compact logos stay compact — all share the exact same height.
                maxHeight/maxWidth was the bug: it scaled DOWN but never forced
                the height UP, so wide-aspect logos rendered shorter than others.
              */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                <img
                  src={item.logo}
                  alt={item.name}
                  onError={e => {
                    e.target.style.display = "none";
                    if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                  }}
                  style={{
                    height:`${logoH}px`,
                    width:"auto",
                    display:"block",
                    filter:mode==="dark"
                      ? "brightness(0) invert(1) opacity(0.55)"
                      : "brightness(0) opacity(0.45)",
                  }}
                />
                <span style={{
                  display:"none", alignItems:"center", justifyContent:"center",
                  fontFamily:"'Google Sans Flex','DM Sans',sans-serif",
                  fontSize:"0.72rem", fontWeight:700,
                  color:c.muted, whiteSpace:"nowrap",
                  letterSpacing:"0.04em",
                }}>{item.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Banner strip (shown above nav on landing page) ─────────────────────────
const BCOLS = {
  dark:  { info:{bg:"rgba(68,136,255,0.12)",brd:"rgba(68,136,255,0.35)",txt:"#4488FF"}, promo:{bg:"rgba(0,230,118,0.10)",brd:"rgba(0,230,118,0.35)",txt:"#00E676"}, urgent:{bg:"rgba(255,24,0,0.10)",brd:"rgba(255,24,0,0.35)",txt:"#FF1800"} },
  light: { info:{bg:"rgba(30,85,204,0.08)", brd:"rgba(30,85,204,0.30)", txt:"#1E55CC"}, promo:{bg:"rgba(0,138,56,0.08)", brd:"rgba(0,138,56,0.30)", txt:"#008A38"}, urgent:{bg:"rgba(204,0,0,0.08)", brd:"rgba(204,0,0,0.30)", txt:"#CC0000"} },
};

function BannerStrip({ list, mode, onDismiss, side = "top" }) {
  if (!list || list.length === 0) return null;
  const isTop = side === "top";
  return (
    <div style={{ position:"fixed", [side]:0, left:0, right:0, zIndex:300 }}>
      {list.map(b => {
        const col = (BCOLS[mode]||BCOLS.dark)[b.type] || BCOLS.dark.info;
        return (
          <div key={b.id} style={{ background:col.bg, borderBottom:isTop?"1px solid "+col.brd:undefined, borderTop:!isTop?"1px solid "+col.brd:undefined, padding:"9px 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"0.75rem" }}>
            <p style={{ fontFamily:"'Google Sans Flex','DM Sans',sans-serif", fontSize:"0.82rem", color:col.txt, flex:1, textAlign:"center" }}>{b.text}</p>
            <button onClick={() => onDismiss(b.id)}
              style={{ background:"none", border:"none", cursor:"pointer", color:col.txt, opacity:0.6, fontSize:"0.9rem", flexShrink:0, padding:"0 4px" }}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

export default function Clarinvest(){
  const[mode,          setMode]         =useState("dark");
  const[billing,       setBilling]      =useState("yearly");
  const[cur,           setCur]          =useState("USD");
  const[mouse,         setMouse]        =useState({x:0,y:0});
  const[tab,           setTab]          =useState("overview");
  const[hovPlan,       setHovPlan]      =useState(null);
  const[solid,         setSolid]        =useState(false);
  const[checkoutLoading,setCheckoutLoading]=useState(null);
  const[banners,       setBanners]      =useState([]);
  const[dismissed,     setDismissed]    =useState(new Set());
  const[faqOpen,       setFaqOpen]      =useState(null);
  const[showSample,    setShowSample]   =useState(false);
  const[faqShellOpen,  setFaqShellOpen] =useState(false);

  const c=C[mode], curr=CURR[cur];
  const gs="'Google Sans Flex','DM Sans',sans-serif";
  const ns="'Noto Serif',Georgia,serif"; // headings + price numbers only

  const heroRef=useRef(null),featRef=useRef(null),markRef=useRef(null),priceRef=useRef(null),aboutRef=useRef(null);
  const go=r=>r.current?.scrollIntoView({behavior:"smooth"});

  useEffect(()=>{fetch("https://ipapi.co/json/").then(r=>r.json()).then(d=>{const k=GEO[d.country_code];if(k)setCur(k);}).catch(()=>{});},[]);
  useEffect(()=>{
    fetch("/api/banners?target=all")
      .then(r=>r.json()).then(d=>setBanners(d.banners||[])).catch(()=>{});
  },[]);

  useEffect(()=>{
    let ticking=false;
    const h=e=>{
      if(!ticking){
        requestAnimationFrame(()=>{setMouse({x:e.clientX/window.innerWidth-0.5,y:e.clientY/window.innerHeight-0.5});ticking=false;});
        ticking=true;
      }
    };
    window.addEventListener("mousemove",h,{passive:true});
    return()=>window.removeEventListener("mousemove",h);
  },[]);

  useEffect(()=>{const h=()=>setSolid(window.scrollY>60);window.addEventListener("scroll",h,{passive:true});return()=>window.removeEventListener("scroll",h);},[]);

  // ─── Stripe checkout handler ────────────────────────────────────────────────
  const handleCheckout = async (planName) => {
    const priceId =
      planName === "Ultimate"
        ? (billing === "monthly" ? PRICE_IDS.ultimate_monthly : PRICE_IDS.ultimate_yearly)
      : planName === "Pro"
        ? (billing === "monthly" ? PRICE_IDS.pro_monthly      : PRICE_IDS.pro_yearly)
        : (billing === "monthly" ? PRICE_IDS.essential_monthly: PRICE_IDS.essential_yearly);

    setCheckoutLoading(planName);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No URL returned from checkout API");
        setCheckoutLoading(null);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setCheckoutLoading(null);
    }
  };

  const NAV=[{label:"Features",ref:featRef},{label:"Markets",ref:markRef},{label:"Pricing",ref:priceRef},{label:"About",ref:aboutRef}];

  const ChartTip=({active,payload})=>{
    if(!active||!payload?.length)return null;
    return(
      <div style={{background:c.card,border:`1px solid ${c.borderHi}`,borderRadius:"6px",padding:"9px 13px",fontFamily:gs,fontSize:"0.8rem"}}>
        <div style={{color:c.muted,marginBottom:"3px"}}>{payload[0].payload.w}</div>
        <div style={{color:c.text,fontWeight:600}}>${payload[0].value.toLocaleString()}</div>
      </div>
    );
  };

  const BANNER_H = 44;
  const topBannerList = banners.filter(b=>b.position==="top"&&!dismissed.has(b.id));
  const botBannerList = banners.filter(b=>b.position==="bottom"&&!dismissed.has(b.id));
  const topH = topBannerList.length * BANNER_H;
  const botH = botBannerList.length * BANNER_H;

  return(
    <div style={{fontFamily:gs,background:c.bg,color:c.text,minHeight:"100vh",overflowX:"hidden",transition:"background 0.4s,color 0.4s"}}>
      <BannerStrip list={topBannerList} side="top" mode={mode} onDismiss={id=>setDismissed(p=>new Set([...p,id]))}/>
      <BannerStrip list={botBannerList} side="bottom" mode={mode} onDismiss={id=>setDismissed(p=>new Set([...p,id]))}/>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400&family=Google+Sans+Flex:ital,opsz,wght@0,8..144,300..700;1,8..144,300..700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:rgba(240,240,240,0.15);}

        .nb{background:none;border:none;cursor:pointer;font-family:'Google Sans Flex','DM Sans',sans-serif;font-size:0.82rem;font-weight:500;transition:opacity 0.18s;}
        .nb:hover{opacity:0.4;}

        .cbtn{cursor:pointer;border:none;font-family:'Google Sans Flex','DM Sans',sans-serif;font-weight:600;font-size:0.84rem;letter-spacing:0.03em;transition:all 0.22s;}
        .cbtn:hover{transform:translateY(-2px);}
        .cbtn:active{transform:none;}

        .fcard{transition:transform 0.28s ease,box-shadow 0.28s ease;display:flex;flex-direction:column;}
        .fcard:hover{transform:translateY(-5px);}
        .pcard{transition:transform 0.28s ease;}

        .twrap{overflow:hidden;}
        .tinner{display:flex;gap:2.5rem;animation:tick 34s linear infinite;white-space:nowrap;}
        @keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}

        .chip{animation:floaty 6s ease-in-out infinite;}
        @keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-11px)}}

        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(7px)}}

        .silver{
          background:linear-gradient(90deg,#686868 0%,#aaaaaa 16%,#e2e2e2 30%,#ffffff 45%,#e8e8e8 55%,#b0b0b0 70%,#727272 85%,#686868 100%);
          background-size:200% 100%;
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          animation:silverSlide 3s linear infinite;
        }
        @keyframes silverSlide{from{background-position:200% center}to{background-position:0% center}}

        @keyframes orbA{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(35px,-28px) scale(1.06)}66%{transform:translate(-22px,25px) scale(0.94)}}
        @keyframes orbB{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-28px,22px) scale(0.92)}66%{transform:translate(30px,-20px) scale(1.08)}}

        .atab{cursor:pointer;border:none;background:none;font-family:'Google Sans Flex','DM Sans',sans-serif;font-weight:600;font-size:0.76rem;letter-spacing:0.02em;transition:all 0.18s;padding:5px 2px;}

        .flag-emoji{font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Android Emoji',emoji,sans-serif !important;font-style:normal;}

        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:#303032;border-radius:2px;}

        .nav-links{display:flex;gap:2rem;overflow-x:auto;white-space:nowrap;-ms-overflow-style:none;scrollbar-width:none;}
        .nav-links::-webkit-scrollbar{display:none;}

        @media(min-width:700px){.feat-reveal{display:flex;}.fcard{flex:1;}}
        @media(max-width:700px){
          .chip{display:none !important;}
          .ag{grid-template-columns:1fr !important;}
          .hero-trust{flex-wrap:wrap !important;justify-content:center !important;gap:0.7rem !important;}
        }
        @media(max-width:900px){.chip:nth-child(even){display:none;}}
      `}</style>

      {/* == NAV ============================================================== */}
      <div style={{height:topH}}/>
      <div style={{position:"sticky",top:topH,zIndex:200}}>
        <nav style={{
          position:"relative",height:"62px",
          backdropFilter:"blur(12px)",
          background:solid
            ?mode==="dark"?"rgba(9,9,9,0.97)":"rgba(247,247,245,0.97)"
            :mode==="dark"?"rgba(9,9,9,0.60)":"rgba(247,247,245,0.60)",
          borderBottom:`1px solid ${solid?c.border:"transparent"}`,
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"0 2.5rem",gap:"1rem",
          transition:"background 0.35s,border-color 0.35s",
        }}>
        <button onClick={()=>go(heroRef)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:"0.65rem",flexShrink:0}}>
          <svg width="22" height="22" viewBox="0 0 200 200">
            <rect x="8"   y="8"   width="84" height="84" rx="10" fill={c.text}/>
            <rect x="108" y="8"   width="84" height="84" rx="10" fill={c.text} opacity="0.22"/>
            <rect x="8"   y="108" width="84" height="84" rx="10" fill={c.text} opacity="0.22"/>
            <rect x="108" y="108" width="84" height="84" rx="10" fill={c.text}/>
          </svg>
          <span style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:"1.1rem",fontWeight:600,letterSpacing:"0.03em",textTransform:"uppercase",color:c.text}}>
            Clarinvest
          </span>
        </button>

        <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",display:"flex",gap:"2rem",alignItems:"center"}}>
          {NAV.map(n=>(
            <button key={n.label} className="nb" style={{color:c.muted}} onClick={()=>go(n.ref)}>{n.label}</button>
          ))}
        </div>

        <div style={{display:"flex",gap:"0.7rem",alignItems:"center",flexShrink:0}}>
          <button onClick={()=>setMode(m=>m==="dark"?"light":"dark")}
            style={{background:c.surface,border:`1px solid ${c.border}`,borderRadius:"50px",padding:"5px 13px",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px",color:c.muted,fontSize:"0.78rem",fontFamily:gs,transition:"background 0.3s"}}>
            <span>{mode==="dark"?"☀":"☾"}</span>
            <span>{mode==="dark"?"Light":"Dark"}</span>
          </button>
          <button className="cbtn" onClick={()=>{window.location.href="/login";}}
            style={{background:"transparent",border:`1px solid ${c.borderHi}`,color:c.text,padding:"8px 20px",borderRadius:"4px"}}>
            Sign in
          </button>
          <button className="cbtn" onClick={()=>go(priceRef)} style={{background:c.text,color:c.bg,padding:"8px 20px",borderRadius:"4px"}}>
            Get started
          </button>
        </div>
      </nav>
      </div>

      {/* == HERO ============================================================= */}
      <section ref={heroRef} style={{minHeight:"100vh",paddingTop:"0",position:"relative",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
          <div style={{position:"absolute",inset:0,
            backgroundImage:`radial-gradient(${c.borderHi} 1px,transparent 1px)`,
            backgroundSize:"28px 28px",opacity:mode==="dark"?0.5:0.4,
            maskImage:"radial-gradient(ellipse 80% 70% at 50% 50%,black 20%,transparent 80%)"
          }}/>
          <div style={{position:"absolute",top:"0%",left:"-10%",width:"65%",height:"75%",borderRadius:"50%",
            background:`radial-gradient(ellipse at center,${mode==="dark"?"rgba(50,50,55,0.55)":"rgba(180,180,178,0.40)"} 0%,transparent 70%)`,
            willChange:"transform",animation:"orbA 18s ease-in-out infinite"}}/>
          <div style={{position:"absolute",bottom:"-10%",right:"-8%",width:"55%",height:"65%",borderRadius:"50%",
            background:`radial-gradient(ellipse at center,${mode==="dark"?"rgba(38,38,42,0.60)":"rgba(190,190,188,0.45)"} 0%,transparent 70%)`,
            willChange:"transform",animation:"orbB 22s ease-in-out infinite"}}/>
        </div>

        {CHIPS.map((chip,i)=>{
          const pos=chip.chg.startsWith("+");
          const scoreColor=chip.score>=80?c.green:chip.score>=65?c.text:c.red;
          return(
            <div key={i} className="chip" style={{
              position:"absolute",top:chip.top,
              ...(chip.left?{left:chip.left}:{right:chip.right}),
              animationDelay:chip.delay,
              transform:`translate(${mouse.x*chip.mul}px,${mouse.y*(chip.mul*0.5)}px)`,
              transition:"transform 0.5s ease",zIndex:5,
            }}>
              <div style={{background:mode==="dark"?"rgba(14,14,16,0.92)":"rgba(255,255,255,0.92)",
                backdropFilter:"blur(10px)",border:`1px solid ${c.borderHi}`,borderRadius:"12px",
                padding:"14px 16px",width:"230px",
                boxShadow:mode==="dark"?"0 10px 40px rgba(0,0,0,0.6)":"0 8px 28px rgba(0,0,0,0.10)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"4px"}}>
                  <span style={{fontFamily:gs,fontSize:"1rem",fontWeight:700,color:c.text}}>{chip.ticker}</span>
                  <span style={{fontFamily:gs,fontSize:"0.9rem",fontWeight:700,color:c.text}}>{chip.price}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                  <span style={{fontFamily:gs,fontSize:"0.68rem",color:c.muted,flex:1,marginRight:"6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{chip.name}</span>
                  <span style={{fontFamily:gs,fontSize:"0.72rem",fontWeight:700,color:pos?c.green:c.red,flexShrink:0}}>{chip.chg}</span>
                </div>
                <div style={{background:mode==="dark"?"#1A1A1C":"#F0F0EE",borderRadius:"5px",padding:"5px 10px",border:`1px solid ${c.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:"8px"}}>
                  <span style={{fontFamily:gs,color:c.muted,fontSize:"0.59rem",letterSpacing:"0.08em",fontWeight:600,textTransform:"uppercase",flexShrink:0}}>AI Score</span>
                  <span style={{fontFamily:gs,color:scoreColor,fontSize:"0.72rem",fontWeight:700,flexShrink:0}}>{chip.score} · {chip.label}</span>
                </div>
              </div>
            </div>
          );
        })}

        <div style={{position:"relative",zIndex:10,textAlign:"center",maxWidth:"720px",padding:"0 1.5rem 6rem"}}>
          <div style={{animation:"fadeUp 0.7s ease 0.1s both"}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",border:`1px solid ${c.borderHi}`,borderRadius:"50px",padding:"5px 18px",
              background:mode==="dark"?"rgba(0,230,118,0.07)":"rgba(0,138,56,0.07)",marginBottom:"2rem"}}>
              <span style={{width:"6px",height:"6px",borderRadius:"50%",background:c.green,display:"inline-block",boxShadow:`0 0 8px ${c.green}`}}/>
              <span style={{fontFamily:gs,color:c.green,fontSize:"0.68rem",fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase"}}>
                AI-Powered Stock Intelligence
              </span>
            </div>
          </div>

          <h1 style={{fontFamily:ns,fontSize:"clamp(2.8rem,6.5vw,5rem)",fontWeight:700,lineHeight:1.1,letterSpacing:"-0.02em",marginBottom:"1.5rem",animation:"fadeUp 0.8s ease 0.18s both"}}>
            Invest with<br/><span className="silver">Absolute Clarity</span>
          </h1>

          <p style={{fontFamily:gs,color:c.muted,fontSize:"1.05rem",lineHeight:1.78,maxWidth:"510px",margin:"0 auto 2.5rem",animation:"fadeUp 0.8s ease 0.28s both"}}>
            Clarinvest turns raw financial data into sharp AI-generated analysis. From quick stock breakdowns to deep value, growth, and alpha signals across US, EU and UK markets.
          </p>

          <div style={{display:"flex",gap:"1rem",justifyContent:"center",flexWrap:"wrap",animation:"fadeUp 0.8s ease 0.38s both"}}>
            <button className="cbtn" onClick={()=>go(priceRef)} style={{background:c.text,color:c.bg,padding:"14px 38px",borderRadius:"4px"}}>View plans →</button>
            <button className="cbtn" onClick={()=>setShowSample(true)} style={{background:"transparent",border:`1px solid ${c.borderHi}`,color:c.text,padding:"14px 38px",borderRadius:"4px"}}>See a sample report</button>
          </div>

          <div className="hero-trust" style={{marginTop:"2.5rem",display:"flex",gap:"2rem",justifyContent:"center",animation:"fadeUp 0.8s ease 0.46s both"}}>
            {["US, EU and UK markets","Real-time data","Cancel anytime"].map((t,i)=>(
              <span key={i} style={{fontFamily:gs,color:c.muted,fontSize:"0.68rem",letterSpacing:"0.09em",textTransform:"uppercase",display:"flex",alignItems:"center",gap:"5px"}}>
                <span style={{color:c.green,fontSize:"0.52rem"}}>◆</span>{t}
              </span>
            ))}
          </div>
        </div>

        <div style={{position:"absolute",bottom:"2rem",left:"50%",textAlign:"center",color:c.muted,fontSize:"0.66rem",letterSpacing:"0.12em",textTransform:"uppercase",animation:"bounce 2.2s ease-in-out infinite",fontFamily:gs}}>
          <div>Scroll</div><div style={{marginTop:"4px"}}>↓</div>
        </div>
      </section>

      {/* == TICKER =========================================================== */}
      <div className="twrap" style={{borderTop:`1px solid ${c.border}`,borderBottom:`1px solid ${c.border}`,background:c.surface,padding:"11px 0"}}>
        <div className="tinner">
          {[...TICKERS,...TICKERS].map((t,i)=>(
            <span key={i} style={{fontFamily:gs,fontSize:"0.71rem",fontWeight:600,letterSpacing:"0.07em",color:t.includes("-")?c.red:c.green}}>{t}</span>
          ))}
        </div>
      </div>

      {/* == FEATURES ========================================================= */}
      <section ref={featRef} style={{padding:"8rem 2rem",maxWidth:"1100px",margin:"0 auto"}}>
        <Reveal>
          <div style={{textAlign:"center",marginBottom:"4rem"}}>
            <p style={{fontFamily:gs,color:c.muted,fontSize:"0.68rem",letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:"1rem",fontWeight:600}}>What Clarinvest Does</p>
            <h2 style={{fontFamily:ns,fontSize:"clamp(1.9rem,4vw,3rem)",fontWeight:700,lineHeight:1.2}}>
              Every layer of analysis,<br/><em>made intelligible</em>
            </h2>
          </div>
        </Reveal>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:"1.25rem"}}>
          {FEATS.map((f,i)=>(
            <Reveal key={i} delay={i*0.07} passStyle={{display:"flex"}}>
              <div className="fcard" style={{
                background:mode==="dark"?"linear-gradient(150deg,#1A1A1E 0%,#0D0D10 100%)":"linear-gradient(150deg,#FFFFFF 0%,#E6E6F0 100%)",
                border:`1px solid ${c.border}`,borderRadius:"14px",padding:"2.4rem 2rem",
                boxShadow:mode==="dark"?"0 4px 28px rgba(0,0,0,0.4)":"0 4px 20px rgba(0,0,0,0.07)",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.85rem"}}>
                  <span style={{fontSize:"1rem",color:c.muted,flexShrink:0}}>{f.icon}</span>
                  <h3 style={{fontFamily:gs,fontSize:"1.05rem",fontWeight:700,lineHeight:1.25,color:c.text}}>{f.title}</h3>
                </div>
                <p style={{fontFamily:gs,color:c.muted,fontSize:"0.87rem",lineHeight:1.72,flex:1}}>{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

{/* ── Platform Preview ─────────────────────── */}
<section style={{ padding:"80px 0", maxWidth:1100, margin:"0 auto", padding:"80px 40px" }}>
  <p style={{ fontFamily:"'Google Sans Flex','DM Sans',sans-serif", fontSize:"0.68rem", letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:500, color:c.muted, marginBottom:"1rem", textAlign:"center" }}>
    Platform preview
  </p>
  <h2 style={{ fontFamily:"'Noto Serif',Georgia,serif", fontSize:"clamp(2rem,4vw,2.8rem)", fontWeight:700, lineHeight:1.2, textAlign:"center", marginBottom:"0.8rem", color:c.text }}>
    The smart way to invest
  </h2>
  <p style={{ fontFamily:"'Google Sans Flex','DM Sans',sans-serif", fontSize:"1rem", color:c.muted, textAlign:"center", marginBottom:"2.5rem", lineHeight:1.7 }}>
    Explore Discovery, Dividends, and Portfolio. All controls are interactive (data is illustrative).
  </p>
  <ToolsCarousel c={c} isDark={mode === "dark"} />
  <p style={{ fontFamily:"'Google Sans Flex','DM Sans',sans-serif", fontSize:"0.75rem", color:c.muted, textAlign:"center", marginTop:"1.25rem" }}>
    For informational purposes only. Not financial advice.
  </p>
</section>

      {/* == MARKETS ========================================================== */}
      <section ref={markRef} style={{
        padding:"7rem 2rem",
        background:mode==="dark"?"linear-gradient(180deg,#111113 0%,#0F0F11 100%)":"linear-gradient(180deg,#EEEEEC 0%,#E8E8E6 100%)",
        borderTop:`1px solid ${c.border}`,borderBottom:`1px solid ${c.border}`}}>
        <div style={{maxWidth:"900px",margin:"0 auto"}}>
          <Reveal>
            <div style={{textAlign:"center",marginBottom:"3.5rem"}}>
              <p style={{fontFamily:gs,color:c.muted,fontSize:"0.68rem",letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:"1rem",fontWeight:600}}>Markets</p>
              <h2 style={{fontFamily:ns,fontSize:"clamp(1.9rem,4vw,3rem)",fontWeight:700}}>Three major markets, one platform</h2>
            </div>
          </Reveal>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:"1.25rem"}}>
            {[
              {code:"US",name:"United States",sub:"NYSE · NASDAQ · S&P 500",detail:"3,500+ stocks · Live",       live:true },
              {code:"EU",name:"Europe",        sub:"DAX · CAC 40 · FTSE MIB", detail:"Coming soon",              live:false},
              {code:"UK",name:"United Kingdom",sub:"LSE · AIM · FTSE 100",    detail:"Coming soon",              live:false},
            ].map((m,i)=>(
              <Reveal key={i} delay={i*0.1}>
                <div style={{
                  background:mode==="dark"?"linear-gradient(150deg,#161618 0%,#111113 100%)":"linear-gradient(150deg,#FFFFFF 0%,#EBEBF0 100%)",
                  border:`1px solid ${m.live?c.border:c.borderHi}`,borderRadius:"14px",padding:"2.2rem",textAlign:"center",
                  boxShadow:mode==="dark"?"0 2px 20px rgba(0,0,0,0.3)":"0 2px 16px rgba(0,0,0,0.05)",
                  opacity:m.live?1:0.65,
                  position:"relative",overflow:"hidden",
                }}>
                  {!m.live&&(
                    <div style={{position:"absolute",top:"12px",right:"12px",background:mode==="dark"?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.06)",borderRadius:"50px",padding:"2px 10px"}}>
                      <span style={{fontFamily:gs,fontSize:"0.58rem",color:c.muted,fontWeight:600,letterSpacing:"0.06em"}}>SOON</span>
                    </div>
                  )}
                  <div style={{display:"flex",justifyContent:"center",marginBottom:"1rem"}}>
                    <FlagSVG market={m.code} height={32}/>
                  </div>
                  <div style={{fontFamily:gs,fontSize:"1.1rem",fontWeight:700,marginBottom:"0.4rem",color:c.text}}>{m.name}</div>
                  <div style={{fontFamily:gs,color:c.muted,fontSize:"0.81rem",marginBottom:"0.5rem"}}>{m.sub}</div>
                  <div style={{fontFamily:gs,color:m.live?c.blue:c.muted,fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.04em"}}>{m.detail}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* == EXCHANGES CAROUSEL ================================================ */}
      <Marquee
        items={EXCHANGES}
        pxPerSec={20}
        logoH={30}
        reverse={true}
        c={c}
        mode={mode}
        label="Instruments available on"
        sublabel="Major US, European and UK exchanges — more coming soon"
      />

      {/* == PRICING ========================================================== */}
      <section ref={priceRef} style={{padding:"8rem 2rem",maxWidth:"1100px",margin:"0 auto"}}>
        <Reveal>
          <div style={{textAlign:"center",marginBottom:"3.5rem"}}>
            <p style={{fontFamily:gs,color:c.muted,fontSize:"0.68rem",letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:"1rem",fontWeight:600}}>Pricing</p>
            <h2 style={{fontFamily:ns,fontSize:"clamp(1.9rem,4vw,3rem)",fontWeight:700,marginBottom:"0.9rem"}}>Simple, transparent pricing</h2>
            <p style={{fontFamily:gs,color:c.muted,maxWidth:"400px",margin:"0 auto 0.5rem",lineHeight:1.72,fontSize:"0.94rem"}}>
              No hidden fees. No lock-in. Prices shown in your local currency.
            </p>
            <p style={{fontFamily:gs,color:c.muted,fontSize:"0.77rem",marginBottom:"2rem"}}>
              Detected:&nbsp;<span style={{color:c.text,fontWeight:600}}>{cur}</span>&nbsp;·&nbsp;
              {Object.keys(CURR).filter(k=>k!==cur).map((k,i,a)=>(
                <span key={k}>
                  <button onClick={()=>setCur(k)} style={{background:"none",border:"none",cursor:"pointer",color:c.muted,fontSize:"0.77rem",fontFamily:gs,textDecoration:"underline",padding:0}}>{k}</button>
                  {i<a.length-1?" · ":""}
                </span>
              ))}
            </p>
            <div style={{display:"inline-flex",background:c.surface,border:`1px solid ${c.border}`,borderRadius:"6px",padding:"4px"}}>
              {["monthly","yearly"].map(b=>(
                <button key={b} onClick={()=>setBilling(b)} style={{
                  background:billing===b?c.text:"transparent",color:billing===b?c.bg:c.muted,
                  border:"none",cursor:"pointer",padding:"8px 22px",borderRadius:"4px",
                  fontFamily:gs,fontSize:"0.8rem",fontWeight:600,letterSpacing:"0.03em",
                  textTransform:"capitalize",transition:"all 0.22s",
                  display:"flex",alignItems:"center",gap:"0.5rem",
                }}>
                  {b}
                  {b==="yearly"&&(
                    <span style={{
                      background:mode==="dark"?"#1A1A1C":"#FFFFFF",
                      border:`1px solid ${c.borderHi}`,
                      color:c.green,fontSize:"0.59rem",fontWeight:800,
                      padding:"2px 7px",borderRadius:"3px",letterSpacing:"0.02em",
                    }}>
                      −28%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"1.25rem"}}>
          {[
            {name:"Essential", tag:"For curious investors",           badge:null,           hi:false, monthly:curr.em[0], yearly:curr.em[1],
             plusLabel: null,
             feats:["20 AI summaries per month","US stocks (EU and UK coming soon)","Discovery screener","Price charts","Key financial ratios","Watchlist","Monthly market digest"]},
            {name:"Pro",       tag:"For serious investors",           badge:"Most Popular",  hi:true,  monthly:curr.pr[0], yearly:curr.pr[1],
             plusLabel: "Everything in Essential, plus:",
             feats:["Unlimited AI summaries","20 full AI reports per month","Indexes","Virtual Portfolio (up to 5 portfolios)","What-if & growth projection charts","Sector diversification analysis","Full statistics & financial statements","Weekly market digest"]},
            {name:"Ultimate",  tag:"For the most demanding investors",badge:"Full Access",   hi:false, monthly:curr.ul[0], yearly:curr.ul[1],
             plusLabel: "Everything in Pro, plus:",
             feats:["Unlimited AI full reports","ETFs","Full financial statements","Balance Sheet and Cash Flow","Sankey flow diagrams","Dividend intelligence and forecasting","Advanced analytics","Priority data refresh","Early access to new features"]},
          ].map((plan,i)=>{
            const price=billing==="monthly"?plan.monthly:plan.yearly;
            const isLoading=checkoutLoading===plan.name;
            const isHi=plan.hi;
            const isUlt=plan.name==="Ultimate";
            return(
              <Reveal key={i} delay={i*0.1}>
                <div className="pcard"
                  onMouseEnter={()=>setHovPlan(i)}
                  onMouseLeave={()=>setHovPlan(null)}
                  style={{
                    background:isHi
                      ?mode==="dark"?"linear-gradient(150deg,#1A1A1E 0%,#111115 100%)":"linear-gradient(150deg,#FFFFFF 0%,#F5F5F8 100%)"
                      :isUlt
                        ?mode==="dark"?"linear-gradient(150deg,#161618 0%,#111113 100%)":"linear-gradient(150deg,#F8F8F6 0%,#F0F0EE 100%)"
                        :mode==="dark"?"linear-gradient(150deg,#131315 0%,#0E0E10 100%)":"linear-gradient(150deg,#F5F5F3 0%,#EEEEED 100%)",
                    border:isHi?`1px solid ${c.text}`:isUlt?`1px solid ${c.borderHi}`:`1px solid ${c.border}`,
                    borderRadius:"14px",padding:"2.5rem 2rem",position:"relative",
                    boxShadow:isHi
                      ?mode==="dark"?`0 0 0 1px ${c.text},0 16px 48px rgba(0,0,0,0.4)`:`0 0 0 1px ${c.text},0 16px 40px rgba(0,0,0,0.09)`
                      :isUlt
                        ?mode==="dark"?"0 4px 28px rgba(0,0,0,0.3)":"0 4px 20px rgba(0,0,0,0.06)"
                        :"none",
                    transform:hovPlan===i?"translateY(-6px)":"translateY(0)",
                  }}>

                  {plan.badge&&(
                    <div style={{position:"absolute",top:"-13px",left:"50%",transform:"translateX(-50%)",
                      background:isHi?c.text:c.muted,color:isHi?c.bg:mode==="dark"?"#090909":"#fff",
                      fontFamily:gs,fontSize:"0.59rem",fontWeight:700,
                      letterSpacing:"0.12em",textTransform:"uppercase",padding:"4px 16px",borderRadius:"50px"}}>
                      {plan.badge}
                    </div>
                  )}

                  <p style={{fontFamily:gs,color:c.green,fontSize:"0.67rem",letterSpacing:"0.14em",textTransform:"uppercase",fontWeight:700,marginBottom:"0.3rem"}}>{plan.name}</p>
                  <p style={{fontFamily:gs,color:c.muted,fontSize:"0.83rem",marginBottom:"1.5rem"}}>{plan.tag}</p>

                  <div style={{display:"flex",alignItems:"flex-end",gap:"0.25rem",marginBottom:billing==="yearly"?"0.3rem":"1.8rem"}}>
                    <span style={{fontFamily:ns,fontSize:"3rem",fontWeight:700,lineHeight:1,color:c.text}}>{curr.sym}{price}</span>
                    <span style={{fontFamily:gs,color:c.muted,fontSize:"0.83rem",paddingBottom:"0.45rem"}}>{billing==="monthly"?"/month":"/year"}</span>
                  </div>

                  {billing==="yearly"&&(
                    <p style={{fontFamily:gs,color:isHi?c.green:c.muted,fontSize:"0.77rem",marginBottom:"1.7rem",fontWeight:600}}>
                      {curr.sym}{(price/12).toFixed(2)}/month · 28% saved
                    </p>
                  )}

                  <button
                    className="cbtn"
                    onClick={()=>handleCheckout(plan.name)}
                    disabled={isLoading}
                    style={{
                      width:"100%",padding:"13px",borderRadius:"5px",marginBottom:"2rem",
                      background:isHi?c.text:isUlt?c.surface:"transparent",
                      color:isHi?c.bg:c.text,
                      border:isHi?"none":`1px solid ${c.borderHi}`,
                      fontSize:"0.84rem",
                      opacity:isLoading?0.7:1,
                      cursor:isLoading?"not-allowed":"pointer",
                    }}>
                    {isLoading ? "Redirecting..." : `Start ${plan.name}`}
                  </button>

                  {plan.plusLabel&&(
                    <div style={{marginBottom:"0.85rem"}}>
                      <p style={{fontFamily:gs,fontSize:"0.74rem",color:c.muted,fontStyle:"italic",marginBottom:"0.6rem"}}>{plan.plusLabel}</p>
                      <div style={{height:"1px",background:c.border}}/>
                    </div>
                  )}

                  {plan.feats.map((f,j)=>(
                    <div key={j} style={{display:"flex",gap:"0.7rem",alignItems:"flex-start",marginBottom:"0.85rem"}}>
                      <span style={{fontFamily:gs,color:c.green,fontSize:"0.75rem",marginTop:"0.12rem",flexShrink:0,fontWeight:700}}>✓</span>
                      <span style={{fontFamily:gs,color:c.muted,fontSize:"0.86rem",lineHeight:1.5}}>{f}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.15}>
          <div style={{marginTop:"2.5rem",textAlign:"center"}}>
            <div style={{display:"flex",justifyContent:"center",gap:"2rem",flexWrap:"wrap",marginBottom:"1.2rem"}}>
              {["Cancel anytime","No setup fees","Secure via Stripe"].map((t,i)=>(
                <span key={i} style={{fontFamily:gs,color:c.muted,fontSize:"0.77rem",display:"flex",alignItems:"center",gap:"5px"}}>
                  <span style={{color:c.green,fontWeight:700}}>✓</span>{t}
                </span>
              ))}
            </div>
            <div style={{display:"inline-flex",alignItems:"center",gap:"0.7rem",
              background:mode==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",
              border:`1px solid ${c.borderHi}`,borderRadius:"7px",padding:"10px 18px"}}>
              <span style={{fontSize:"1rem"}}>💎</span>
              <span style={{fontFamily:gs,color:c.muted,fontSize:"0.77rem",lineHeight:1.5}}>
                Also accepts <strong style={{fontFamily:gs,color:c.text,fontWeight:700}}>USDT</strong> and <strong style={{fontFamily:gs,color:c.text,fontWeight:700}}>USDC</strong> stablecoin payments via NOWPayments. No bank required.
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* == POWERED BY CAROUSEL ============================================== */}
      <Marquee
        items={POWERED_BY}
        pxPerSec={20}
        logoH={24}
        c={c}
        mode={mode}
        label="Built with"
        sublabel="World-class infrastructure powering every analysis"
      />

      {/* == ABOUT ============================================================ */}
      <section ref={aboutRef} style={{
        padding:"7rem 2rem",
        background:mode==="dark"?"linear-gradient(180deg,#111113 0%,#0F0F11 100%)":"linear-gradient(180deg,#EEEEED 0%,#E8E8E6 100%)",
        borderTop:`1px solid ${c.border}`}}>
        <div style={{maxWidth:"660px",margin:"0 auto",textAlign:"center"}}>
          <Reveal>
            <p style={{fontFamily:gs,color:c.muted,fontSize:"0.68rem",letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:"1rem",fontWeight:600}}>About</p>
            <h2 style={{fontFamily:ns,fontSize:"clamp(1.9rem,4vw,3rem)",fontWeight:700,marginBottom:"1.5rem"}}>Built for the modern investor</h2>
            <p style={{fontFamily:gs,color:c.muted,fontSize:"1rem",lineHeight:1.82,marginBottom:"1.5rem"}}>
              Clarinvest was built on a single belief: that institutional-quality stock analysis should be accessible to every investor, not just hedge funds with Bloomberg terminals.
            </p>
            <p style={{fontFamily:gs,color:c.muted,fontSize:"1rem",lineHeight:1.82}}>
              By combining real-time financial data with state-of-the-art AI, we translate complex numbers into clear, actionable insights across US, UK and European markets. Invest with confidence, not guesswork.
            </p>
          </Reveal>
        </div>
      </section>
      
{/* == FAQ ============================================================ */}
      <section style={{ padding:"7rem 2rem" }}>
        <div style={{ maxWidth:"1100px", margin:"0 auto" }}>
          <Reveal>
            <div style={{ textAlign:"center", marginBottom:"3.5rem" }}>
              <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.68rem", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:"1rem", fontWeight:600 }}>FAQ</p>
              <h2 style={{ fontFamily:ns, fontSize:"clamp(1.9rem,4vw,3rem)", fontWeight:700, marginBottom:"0.9rem" }}>Common questions</h2>
              <p style={{ fontFamily:gs, color:c.muted, maxWidth:"420px", margin:"0 auto", lineHeight:1.72, fontSize:"0.94rem" }}>
                Everything you need to know before getting started.
              </p>
            </div>
          </Reveal>

          <div style={{ maxWidth:"720px", margin:"0 auto" }}>
            <div style={{
              border:`1px solid ${c.borderHi}`,
              borderRadius:"14px",
              overflow:"hidden",
              background:mode==="dark"?"linear-gradient(150deg,#1A1A1E 0%,#0D0D10 100%)":"linear-gradient(150deg,#FFFFFF 0%,#F0F0EE 100%)",
              boxShadow:mode==="dark"?"0 4px 28px rgba(0,0,0,0.4)":"0 4px 20px rgba(0,0,0,0.07)",
            }}>
              {/* Outer shell toggle */}
              <button
                onClick={() => setFaqShellOpen(o => !o)}
                style={{
                  width:"100%", background:"transparent", border:"none",
                  padding:"1.4rem 1.75rem", cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem",
                  textAlign:"left",
                  borderBottom: faqShellOpen ? `1px solid ${c.border}` : "none",
                  transition:"border-color 0.22s",
                }}>
                <span style={{ fontFamily:gs, fontSize:"0.6rem", color:c.green, letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:700, flex:1, textAlign:"center" }}>Questions and answers</span>
                <span style={{
                  flexShrink:0, width:24, height:24, borderRadius:"50%",
                  border:`1px solid ${c.borderHi}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontFamily:gs, fontSize:"1rem", color:c.muted, lineHeight:1,
                  transition:"transform 0.22s ease",
                  transform: faqShellOpen ? "rotate(45deg)" : "none",
                }}>
                  +
                </span>
              </button>

              {/* Inner Q&A list */}
              {faqShellOpen && (
                <div style={{ padding:"0 1.75rem" }}>
                  {[
                    FAQ_ITEMS[0],
                    FAQ_ITEMS[1],
                    FAQ_ITEMS[2],
                    {
                      q: "What data does the AI analyze to produce a full report?",
                      a: null,
                      isMetrics: true,
                    },
                    ...FAQ_ITEMS.slice(3),
                  ].map((item, i, arr) => (
                    <div key={i} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${c.border}` : "none" }}>
                      <button
                        onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                        style={{
                          width:"100%", background:"transparent", border:"none",
                          padding:"1.1rem 0", cursor:"pointer",
                          display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem",
                          textAlign:"left",
                        }}>
                        <span style={{ fontFamily:gs, fontSize:"0.95rem", fontWeight:500, color:c.text, lineHeight:1.5 }}>
                          {item.q}
                        </span>
                        <span style={{
                          flexShrink:0, width:20, height:20, borderRadius:"50%",
                          border:`1px solid ${c.border}`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontFamily:gs, fontSize:"0.9rem", color:c.muted, lineHeight:1,
                          transition:"transform 0.22s ease",
                          transform: faqOpen === i ? "rotate(45deg)" : "none",
                        }}>
                          +
                        </span>
                      </button>

                      {faqOpen === i && (
                        <div style={{ paddingBottom:"1.1rem" }}>
                          {item.isMetrics ? (
                            <div>
                              <p style={{ fontFamily:gs, fontSize:"0.88rem", color:c.muted, lineHeight:1.72, marginBottom:"1.25rem" }}>
                                Each full report is built from the actual financial data Clarinvest pulls for that instrument type. Here is precisely what the AI analyzes for each.
                              </p>
                              {[
                                {
                                  type:"Stocks",
                                  icon:"◈",
                                  color:c.blue,
                                  groups:[
                                    { label:"General", items:["Market capitalization","Enterprise value","Beta","EPS","Average volume","P/E ratio","Dividend yield"] },
                                    { label:"Valuation", items:["P/E ratio","P/S ratio","P/B ratio","Price to free cash flow","Price to operating cash flow","PEG ratio","EV/EBITDA multiple"] },
                                    { label:"Profitability", items:["Gross margin","Net margin","Operating margin","Return on equity (ROE)","Return on assets (ROA)","Return on invested capital (ROIC)"] },
                                    { label:"Liquidity", items:["Current ratio","Quick ratio","Cash ratio"] },
                                    { label:"Leverage", items:["Debt ratio","Debt to equity","Equity multiplier","LT debt to capitalization","Interest coverage","Cash flow to debt"] },
                                    { label:"Per Share", items:["Revenue per share","Net income per share","Operating CF per share","Free cash flow per share","Cash per share","Book value per share"] },
                                    { label:"Cash Flow Ratios", items:["Operating CF to sales","FCF to operating CF","Cash flow coverage","Short-term coverage","Capex coverage","Payout ratio"] },
                                    { label:"Growth", items:["Revenue growth YoY","EPS growth YoY","DPS growth YoY","Gross profit growth","EBIT growth","Operating income growth","Net income growth"] },
                                    { label:"Income Statement", items:["Revenue","Cost of revenue","Gross profit","Operating expenses","Operating income","Net income","EPS (basic and diluted)"] },
                                    { label:"Balance Sheet", items:["Total assets","Current and non-current assets","Total liabilities","Current and non-current liabilities","Total equity"] },
                                    { label:"Cash Flow Statement", items:["Operating, investing, and financing activities","Capital expenditure","Free cash flow","Change in cash"] },
                                  ]
                                },
                                {
                                  type:"ETFs",
                                  icon:"▣",
                                  color:c.green,
                                  groups:[
                                    { label:"Fund Overview", items:["Fund name and AUM","Expense ratio","NAV and daily change","Number of holdings","Index tracked","Fund category and inception"] },
                                    { label:"Performance", items:["YTD, 1Y, 3Y, 5Y, 10Y returns","Sharpe ratio (3Y)","Beta vs. market","Maximum drawdown","Standard deviation","Tracking error"] },
                                    { label:"Holdings and Allocation", items:["Top 10 holdings with weights","Sector allocation breakdown","Country allocation breakdown"] },
                                    { label:"Dividends", items:["Dividend yield","Annual DPS","Distribution frequency","Ex-dividend and payment dates"] },
                                  ]
                                },
                                {
                                  type:"Indexes",
                                  icon:"▲",
                                  color:c.muted,
                                  groups:[
                                    { label:"Index Overview", items:["Full name and provider","Exchange and currency","Number of constituents","Weighting methodology","Rebalancing frequency"] },
                                    { label:"Valuation and Performance", items:["P/E ratio (trailing and forward)","P/B ratio","Index EPS","Dividend yield","YTD, 1Y, 3Y, 5Y, 10Y returns"] },
                                    { label:"Composition", items:["Top 10 constituents with weights","Sector weights across all constituents"] },
                                  ]
                                },
                                {
                                  type:"Commodities",
                                  icon:"◇",
                                  color:c.muted,
                                  groups:[
                                    { label:"Market Data", items:["Spot price and daily change","52-week high and low","Average 30-day volume","YTD, 1Y, 3Y, 5Y, 10Y performance","30-day volatility","Maximum drawdown"] },
                                    { label:"Technicals", items:["RSI (14)","50-day and 200-day moving averages","MACD and signal line","Bollinger Bands (upper and lower)","Average True Range (ATR 14)"] },
                                    { label:"Supply, Demand and Macro", items:["USD index correlation","Inflation correlation","Real yield correlation","Central bank demand","Mine and recycled supply","Demand split by use (jewelry, investment, industrial)"] },
                                  ]
                                },
                              ].map((inst, ii) => (
                                <div key={ii} style={{ marginBottom:"1.25rem" }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.75rem" }}>
                                    <span style={{ fontFamily:gs, fontSize:"0.72rem", fontWeight:700, color:c.text, letterSpacing:"0.05em", textTransform:"uppercase" }}>{inst.type}</span>
                                    <div style={{ flex:1, height:"1px", background:c.border }}/>
                                  </div>
                                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"0.5rem" }}>
                                    {inst.groups.map((grp, gi) => (
                                      <div key={gi} style={{
                                        background:c.surface,
                                        border:`1px solid ${c.border}`,
                                        borderRadius:"8px",
                                        padding:"0.75rem 0.85rem",
                                      }}>
                                        <p style={{ fontFamily:gs, fontSize:"0.59rem", color:c.text, letterSpacing:"0.12em", textTransform:"uppercase", fontWeight:700, marginBottom:"0.5rem" }}>{grp.label}</p>
                                        {grp.items.map((itm, k) => (
                                          <div key={k} style={{ display:"flex", alignItems:"flex-start", gap:"0.4rem", marginBottom:"0.3rem" }}>
                                            <span style={{ color:c.muted, fontSize:"0.55rem", marginTop:"0.25rem", flexShrink:0 }}>◆</span>
                                            <span style={{ fontFamily:gs, fontSize:"0.77rem", color:c.muted, lineHeight:1.5 }}>{itm}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontFamily:gs, fontSize:"0.9rem", lineHeight:1.75, color:c.muted }}>
                              {item.a}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted, textAlign:"center", marginTop:"2rem", lineHeight:1.7 }}>
            Still have questions? Email us at{" "}
            <a href="mailto:support@clarinvest.app" style={{ color:c.text, textDecoration:"none", borderBottom:`1px solid ${c.border}` }}>
              support@clarinvest.app
            </a>
          </p>
        </div>
      </section>

      {/* == FOOTER =========================================================== */}
      <footer style={{borderTop:`1px solid ${c.border}`,padding:"2.5rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem",background:c.bg}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.6rem"}}>
          <svg width="18" height="18" viewBox="0 0 200 200">
            <rect x="8"   y="8"   width="84" height="84" rx="10" fill={c.text}/>
            <rect x="108" y="8"   width="84" height="84" rx="10" fill={c.text} opacity="0.22"/>
            <rect x="8"   y="108" width="84" height="84" rx="10" fill={c.text} opacity="0.22"/>
            <rect x="108" y="108" width="84" height="84" rx="10" fill={c.text}/>
          </svg>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:"0.9rem",fontWeight:600,letterSpacing:"0.03em",textTransform:"uppercase",color:c.text}}>Clarinvest</span>
        </div>
        <p style={{fontFamily:gs,color:c.muted,fontSize:"0.73rem"}}>© 2026 Clarinvest · For informational purposes only · Not financial advice</p>
        <div style={{display:"flex",gap:"1.5rem"}}>
          {[{label:"Privacy",href:"/privacy"},{label:"Terms",href:"/terms"},{label:"Contact",href:"mailto:support@clarinvest.app"}].map(l=>(
            <a key={l.label} href={l.href} style={{background:"none",border:"none",cursor:"pointer",fontFamily:gs,color:c.muted,fontSize:"0.73rem",textDecoration:"none"}}>{l.label}</a>
          ))}
        </div>
      </footer>
    <div style={{height:botH}}/>

      {showSample&&(
        <FullReportPopup
          report={NVDA_SAMPLE_REPORT}
          ticker="NVDA"
          name="NVIDIA Corp"
          onClose={()=>setShowSample(false)}
          c={c}
          mode={mode}
        />
      )}
  </div>
  );
}