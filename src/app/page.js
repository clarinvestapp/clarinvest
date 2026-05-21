"use client";
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
  {ticker:"NVDA",name:"NVIDIA Corp.",        price:"$875", chg:"+5.4%",score:93,label:"Strong Buy",top:"22%",right:"7%", mul:18, delay:"0s"  },
  {ticker:"AAPL",name:"Apple Inc.",          price:"$184", chg:"+2.1%",score:78,label:"Buy",        top:"62%",right:"4%", mul:12, delay:"1.5s"},
  {ticker:"TSLA",name:"Tesla Inc.",          price:"$171", chg:"-1.2%",score:61,label:"Hold",       top:"26%",left:"4%",  mul:-14,delay:"0.8s"},
  {ticker:"TSM", name:"Taiwan Semiconductor",price:"$138", chg:"+3.1%",score:82,label:"Buy",        top:"65%",left:"5%",  mul:-10,delay:"2.1s"},
];

const TICKERS=["AAPL +2.1%","MSFT +0.8%","NVDA +5.4%","TSLA -1.2%","AMZN +1.9%","GOOGL +0.3%","META +3.1%","TSM +3.1%","ASML.AS +1.8%","AZN.L +2.0%","VOD.L -0.5%","SIE.DE +1.1%","MC.PA +0.9%","BP.L -0.9%","SHEL.L +0.7%","BARC.L -0.3%"];

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
export default function Clarinvest(){
  const[mode,          setMode]         =useState("dark");
  const[billing,       setBilling]      =useState("yearly");
  const[cur,           setCur]          =useState("GBP");
  const[mouse,         setMouse]        =useState({x:0,y:0});
  const[tab,           setTab]          =useState("overview");
  const[hovPlan,       setHovPlan]      =useState(null);
  const[solid,         setSolid]        =useState(false);
  const[checkoutLoading,setCheckoutLoading]=useState(null); // tracks which plan is loading

  const c=C[mode], curr=CURR[cur];
  const gs="'Google Sans Flex','DM Sans',sans-serif";
  const ns="'Noto Serif',Georgia,serif"; // headings + price numbers only

  const heroRef=useRef(null),featRef=useRef(null),markRef=useRef(null),priceRef=useRef(null),aboutRef=useRef(null);
  const go=r=>r.current?.scrollIntoView({behavior:"smooth"});

  useEffect(()=>{fetch("https://ipapi.co/json/").then(r=>r.json()).then(d=>{const k=GEO[d.country_code];if(k)setCur(k);}).catch(()=>{});},[]);

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

  return(
    <div style={{fontFamily:gs,background:c.bg,color:c.text,minHeight:"100vh",overflowX:"hidden",transition:"background 0.4s,color 0.4s"}}>
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

      {/* ══ NAV ══════════════════════════════════════════════════════════════ */}
      <nav style={{
        position:"fixed",top:0,left:0,right:0,zIndex:200,height:"62px",
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

        <div className="nav-links" style={{flex:1,justifyContent:"center"}}>
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
          <button className="cbtn" onClick={()=>go(priceRef)} style={{background:c.text,color:c.bg,padding:"8px 20px",borderRadius:"4px"}}>
            Get started
          </button>
        </div>
      </nav>

      {/* ══ HERO ═════════════════════════════════════════════════════════════ */}
      <section ref={heroRef} style={{minHeight:"100vh",paddingTop:"62px",position:"relative",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
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
            <button className="cbtn" style={{background:"transparent",border:`1px solid ${c.borderHi}`,color:c.text,padding:"14px 38px",borderRadius:"4px"}}>See a sample report</button>
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

      {/* ══ TICKER ═══════════════════════════════════════════════════════════ */}
      <div className="twrap" style={{borderTop:`1px solid ${c.border}`,borderBottom:`1px solid ${c.border}`,background:c.surface,padding:"11px 0"}}>
        <div className="tinner">
          {[...TICKERS,...TICKERS].map((t,i)=>(
            <span key={i} style={{fontFamily:gs,fontSize:"0.71rem",fontWeight:600,letterSpacing:"0.07em",color:t.includes("-")?c.red:c.green}}>{t}</span>
          ))}
        </div>
      </div>

      {/* ══ FEATURES ═════════════════════════════════════════════════════════ */}
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

      {/* ══ SAMPLE ANALYSIS ══════════════════════════════════════════════════ */}
      <section style={{padding:"0 2rem 8rem",maxWidth:"1100px",margin:"0 auto"}}>
        <Reveal>
          <div style={{textAlign:"center",marginBottom:"3rem"}}>
            <p style={{fontFamily:gs,color:c.muted,fontSize:"0.68rem",letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:"1rem",fontWeight:600}}>Live Example</p>
            <h2 style={{fontFamily:ns,fontSize:"clamp(1.9rem,4vw,3rem)",fontWeight:700,lineHeight:1.2,marginBottom:"0.7rem"}}>The smart way to invest</h2>
            <p style={{fontFamily:gs,color:c.muted,fontSize:"0.95rem"}}>NVIDIA Corp. (NVDA) — 6-month AI analysis sample</p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div style={{border:`1px solid ${c.borderHi}`,borderRadius:"16px",overflow:"hidden",background:c.card,
            boxShadow:mode==="dark"?"0 0 60px rgba(0,0,0,0.5)":"0 12px 50px rgba(0,0,0,0.07)"}}>

            <div style={{padding:"1.4rem 2rem",borderBottom:`1px solid ${c.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem",
              background:mode==="dark"?"linear-gradient(90deg,#111113,#141418)":"linear-gradient(90deg,#FFFFFF,#F5F5F8)"}}>
              <div style={{display:"flex",alignItems:"center",gap:"2rem",flexWrap:"wrap"}}>
                <div>
                  <div style={{fontFamily:gs,fontSize:"1.6rem",fontWeight:700,color:c.text}}>NVDA</div>
                  <div style={{fontFamily:gs,color:c.muted,fontSize:"0.78rem",marginTop:"2px"}}>NVIDIA Corporation · NASDAQ</div>
                </div>
                <div>
                  <div style={{fontFamily:gs,fontSize:"1.55rem",fontWeight:700,color:c.text}}>$1,208.00</div>
                  <div style={{fontFamily:gs,color:c.green,fontSize:"0.83rem",fontWeight:700}}>+$144.00 (+13.5%) · 6-month</div>
                </div>
              </div>
              <div style={{display:"flex",gap:"0.55rem",flexWrap:"wrap"}}>
                {[
                  {label:"AI Score",value:"93",        bg:c.greenDim,  bd:`${c.green}40`,vc:c.green},
                  {label:"Verdict", value:"Strong Buy", bg:c.greenDim,  bd:`${c.green}35`,vc:c.green},
                  {label:"Sector",  value:"Technology", bg:c.surface,   bd:c.border,      vc:c.muted},
                ].map((b,i)=>(
                  <div key={i} style={{background:b.bg,border:`1px solid ${b.bd}`,borderRadius:"6px",padding:"7px 13px"}}>
                    <div style={{fontFamily:gs,color:c.muted,fontSize:"0.59rem",letterSpacing:"0.1em",textTransform:"uppercase"}}>{b.label}</div>
                    <div style={{fontFamily:gs,color:b.vc,fontSize:"0.83rem",fontWeight:700,marginTop:"2px"}}>{b.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ag" style={{display:"grid",gridTemplateColumns:"1fr 360px",alignItems:"start"}}>
              <div style={{padding:"1.6rem 1.4rem 1.4rem",borderRight:`1px solid ${c.border}`}}>
                <div style={{fontFamily:gs,fontSize:"0.66rem",color:c.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"1.2rem",fontWeight:500}}>
                  Price History — January to June 2024
                </div>
                <ResponsiveContainer width="100%" height={270}>
                  <AreaChart data={CHART_DATA} margin={{top:42,right:28,bottom:4,left:4}}>
                    <defs>
                      <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={c.blue} stopOpacity={0.28}/>
                        <stop offset="95%" stopColor={c.blue} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false}/>
                    <XAxis dataKey="w" tick={{fill:c.muted,fontSize:9,fontFamily:"'Google Sans Flex',sans-serif"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:c.muted,fontSize:9,fontFamily:"'Google Sans Flex',sans-serif"}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} domain={["auto","auto"]}/>
                    <Tooltip content={<ChartTip/>}/>
                    <ReferenceLine x="Feb W3" stroke={c.green} strokeDasharray="4 3" label={<RefLabel value="Earnings ↑" color={c.green}/>}/>
                    <ReferenceLine x="May W1" stroke={c.blue}  strokeDasharray="4 3" label={<RefLabel value="AI Rally"   color={c.blue}/>}/>
                    <Area type="monotone" dataKey="p" stroke={c.blue} strokeWidth={2.5} fill="url(#blueGrad)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{padding:"1.5rem"}}>
                <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.4rem",borderBottom:`1px solid ${c.border}`,paddingBottom:0}}>
                  {["overview","valuation","risk"].map(t=>(
                    <button key={t} className="atab" onClick={()=>setTab(t)}
                      style={{color:tab===t?c.text:c.muted,borderBottom:tab===t?`2px solid ${c.text}`:"2px solid transparent",paddingBottom:"8px",paddingRight:"4px",marginBottom:"-1px"}}>
                      {t[0].toUpperCase()+t.slice(1)}
                    </button>
                  ))}
                </div>

                {tab==="overview"&&(
                  <div style={{display:"flex",flexDirection:"column",gap:"0.85rem"}}>
                    <div style={{background:mode==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",borderRadius:"8px",padding:"13px",borderLeft:`2.5px solid ${c.borderHi}`}}>
                      <div style={{fontFamily:gs,color:c.muted,fontSize:"0.6rem",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"6px",fontWeight:700}}>AI Summary</div>
                      <p style={{fontFamily:gs,color:c.text,fontSize:"0.81rem",lineHeight:1.68}}>NVIDIA's dominance in AI accelerators is structural, not cyclical. CUDA lock-in and data centre demand confirmed by Feb earnings. Momentum likely continues through H2.</p>
                    </div>
                    {[
                      {label:"Revenue Growth (YoY)",value:"+122%", flag:"positive"},
                      {label:"Gross Margin",         value:"78.4%", flag:"positive"},
                      {label:"P/E Ratio",            value:"68×",   flag:"neutral"},
                      {label:"Insider Activity",     value:"Neutral",flag:"neutral"},
                    ].map((row,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${c.border}`}}>
                        <span style={{fontFamily:gs,color:c.text,fontSize:"0.81rem"}}>{row.label}</span>
                        <span style={{fontFamily:gs,fontWeight:700,fontSize:"0.84rem",color:row.flag==="positive"?c.green:row.flag==="negative"?c.red:c.text}}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {tab==="valuation"&&(
                  <div style={{display:"flex",flexDirection:"column",gap:"0.85rem"}}>
                    <div style={{background:mode==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",borderRadius:"8px",padding:"13px",borderLeft:`2.5px solid ${c.borderHi}`}}>
                      <div style={{fontFamily:gs,color:c.muted,fontSize:"0.6rem",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"6px",fontWeight:700}}>Valuation Note</div>
                      <p style={{fontFamily:gs,color:c.text,fontSize:"0.81rem",lineHeight:1.68}}>Premium to peers, but a PEG of 0.9 signals growth is not fully priced in. The AI infrastructure cycle justifies the multiple for patient investors.</p>
                    </div>
                    {[
                      {label:"EV/EBITDA",        value:"42×",   flag:"negative"},
                      {label:"Price/Sales",       value:"28×",   flag:"negative"},
                      {label:"PEG Ratio",         value:"0.9",   flag:"positive"},
                      {label:"vs Sector Avg P/E", value:"+185%", flag:"neutral"},
                    ].map((row,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${c.border}`}}>
                        <span style={{fontFamily:gs,color:c.text,fontSize:"0.81rem"}}>{row.label}</span>
                        <span style={{fontFamily:gs,fontWeight:700,fontSize:"0.84rem",color:row.flag==="positive"?c.green:row.flag==="negative"?c.red:c.text}}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {tab==="risk"&&(
                  <div style={{display:"flex",flexDirection:"column",gap:"0.7rem"}}>
                    {[
                      {flag:"⚠",label:"China export restrictions",       level:"High",  col:c.red  },
                      {flag:"⚠",label:"Customer concentration risk",     level:"Medium",col:c.text },
                      {flag:"◈",label:"AMD MI300X competitive pressure", level:"Low",   col:c.green},
                      {flag:"⚠",label:"Supply chain TSMC dependency",    level:"Medium",col:c.text },
                    ].map((r,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:"0.7rem",padding:"10px 12px",
                        background:mode==="dark"?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",
                        borderRadius:"8px",border:`1px solid ${c.border}`}}>
                        <span style={{color:r.col,fontSize:"0.85rem"}}>{r.flag}</span>
                        <span style={{fontFamily:gs,color:r.col,fontSize:"0.8rem",flex:1}}>{r.label}</span>
                        <span style={{fontFamily:gs,color:r.col,fontSize:"0.66rem",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase"}}>{r.level}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ MARKETS ══════════════════════════════════════════════════════════ */}
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
              {flag:"🇺🇸",name:"United States",sub:"NYSE · NASDAQ · S&P 500",detail:"3,500+ stocks covered"},
              {flag:"🇬🇧",name:"United Kingdom",sub:"LSE · AIM · FTSE 100",   detail:"800+ stocks covered"},
              {flag:"🇪🇺",name:"Europe",         sub:"DAX · CAC 40 · FTSE MIB",detail:"1,200+ stocks covered"},
            ].map((m,i)=>(
              <Reveal key={i} delay={i*0.1}>
                <div style={{
                  background:mode==="dark"?"linear-gradient(150deg,#161618 0%,#111113 100%)":"linear-gradient(150deg,#FFFFFF 0%,#EBEBF0 100%)",
                  border:`1px solid ${c.border}`,borderRadius:"14px",padding:"2.2rem",textAlign:"center",
                  boxShadow:mode==="dark"?"0 2px 20px rgba(0,0,0,0.3)":"0 2px 16px rgba(0,0,0,0.05)"}}>
                  <div className="flag-emoji" style={{fontSize:"2.2rem",marginBottom:"1rem",lineHeight:1.3}}>{m.flag}</div>
                  <div style={{fontFamily:gs,fontSize:"1.1rem",fontWeight:700,marginBottom:"0.4rem",color:c.text}}>{m.name}</div>
                  <div style={{fontFamily:gs,color:c.muted,fontSize:"0.81rem",marginBottom:"0.5rem"}}>{m.sub}</div>
                  <div style={{fontFamily:gs,color:c.blue,fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.04em"}}>{m.detail}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ══════════════════════════════════════════════════════════ */}
      <section ref={priceRef} style={{padding:"8rem 2rem",maxWidth:"1100px",margin:"0 auto"}}>
        <Reveal>
          <div style={{textAlign:"center",marginBottom:"3.5rem"}}>
            <p style={{fontFamily:gs,color:c.muted,fontSize:"0.68rem",letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:"1rem",fontWeight:600}}>Pricing</p>
            <h2 style={{fontFamily:gs,fontSize:"clamp(1.9rem,4vw,3rem)",fontWeight:700,marginBottom:"0.9rem"}}>Simple, transparent pricing</h2>
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
             feats:["5 AI summaries per month","Basic AI summary per stock","Stocks — US, EU and UK","Commodities","Key financial ratios","Watchlist","Monthly market digest"]},
            {name:"Pro",       tag:"For serious investors",           badge:"Most Popular",  hi:true,  monthly:curr.pr[0], yearly:curr.pr[1],
             plusLabel: "Everything in Essential, plus:",
             feats:["Unlimited AI summaries","15 AI full reports per month","Indexes","Valuation, liquidity and leverage stats","Per Share and growth metrics","Income Statement","Virtual Portfolio","Weekly market digest"]},
            {name:"Ultimate",  tag:"For the most demanding investors",badge:"Full Access",   hi:false, monthly:curr.ul[0], yearly:curr.ul[1],
             plusLabel: "Everything in Pro, plus:",
             feats:["Unlimited AI full reports","ETFs","Full financial statements","Balance Sheet and Cash Flow","Sankey flow diagrams","Advanced analytics","Priority data refresh","Early access to new features"]},
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

                  {/* All tier names green */}
                  <p style={{fontFamily:gs,color:c.green,fontSize:"0.67rem",letterSpacing:"0.14em",textTransform:"uppercase",fontWeight:700,marginBottom:"0.3rem"}}>{plan.name}</p>
                  <p style={{fontFamily:gs,color:c.muted,fontSize:"0.83rem",marginBottom:"1.5rem"}}>{plan.tag}</p>

                  {/* Price in Noto Serif */}
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

                  {/* "Everything in X plus:" label */}
                  {plan.plusLabel&&(
                    <div style={{marginBottom:"0.85rem"}}>
                      <p style={{fontFamily:gs,fontSize:"0.74rem",color:c.muted,fontStyle:"italic",marginBottom:"0.6rem"}}>{plan.plusLabel}</p>
                      <div style={{height:"1px",background:c.border}}/>
                    </div>
                  )}

                  {/* All ✓ green for every tier */}
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
                Also accepts <strong style={{fontFamily:gs,color:c.text,fontWeight:700}}>USDC</strong> (USD Coin) via Stripe. Pay in stablecoin, no bank required.
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ ABOUT ════════════════════════════════════════════════════════════ */}
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

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
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
          {["Privacy","Terms","Contact"].map(l=>(
            <button key={l} style={{background:"none",border:"none",cursor:"pointer",fontFamily:gs,color:c.muted,fontSize:"0.73rem"}}>{l}</button>
          ))}
        </div>
      </footer>
    </div>
  );
}