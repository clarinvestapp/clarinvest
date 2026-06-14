"use client";
import { useState } from "react";

// ── Inline SVGs ────────────────────────────────────────────────────────────────
const USDTIcon = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 165 165" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="165" height="165" rx="82.5" fill="#009393"/>
    <path d="M54.6366 84.7375C57.3593 87.7551 68.4638 90.0184 81.7556 90.0187C95.0473 90.0184 106.152 87.7551 108.868 84.7375C106.568 82.1761 98.2286 80.16 87.6395 79.6084V85.9928C85.7422 86.0879 83.7694 86.1387 81.7524 86.1387C79.7354 86.1387 77.7626 86.0943 75.8653 85.9928V79.6084C65.2825 80.16 56.9435 82.1761 54.6366 84.7375Z" fill="white"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M117.391 48.0668L135.525 79.3865V79.3929C136.464 81.0159 136.187 83.0637 134.844 84.3825L84.924 133.397C83.3041 134.989 80.701 134.989 79.0874 133.397L29.2301 84.4459C27.8623 83.0954 27.6039 80.9906 28.6124 79.3548L47.9943 47.9654C48.7507 46.7481 50.0933 46 51.5367 46H113.792C115.28 46 116.647 46.7862 117.391 48.0668ZM87.6458 68.7733V74.8661H87.6395C100.094 75.5191 109.442 78.1946 109.511 81.4027V88.085C109.442 91.2931 100.094 93.9622 87.6395 94.6153V109.571H75.8653V94.6153C63.4105 93.9622 54.0693 91.2931 54 88.085V81.4027C54.0693 78.1946 63.4105 75.5191 75.8653 74.8661V68.7733H58.1348V59.9861H105.376V68.7733H87.6458Z" fill="white"/>
  </svg>
);

const USDCIcon = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M48 95C73.9574 95 95 73.9574 95 48C95 22.0426 73.9574 1 48 1C22.0426 1 1 22.0426 1 48C1 73.9574 22.0426 95 48 95Z" fill="#0B53BF"/>
    <path d="M56.4609 13.7778V19.8291C68.5341 23.4716 77.3759 34.6928 77.3759 47.9997C77.3759 61.3066 68.5341 72.5278 56.4609 76.1703V82.2216C71.8534 78.4616 83.2509 64.5672 83.2509 47.9997C83.2509 31.4322 71.8534 17.5378 56.4609 13.7778Z" fill="white"/>
    <path d="M18.625 47.9997C18.625 34.6928 27.4669 23.4716 39.54 19.8291V13.7778C24.1475 17.5378 12.75 31.4322 12.75 47.9997C12.75 64.5672 24.1475 78.4616 39.54 82.2216V76.1703C27.4669 72.5572 18.625 61.3066 18.625 47.9997Z" fill="white"/>
    <path d="M60.6319 54.5506C60.6319 42.5362 41.8025 47.4713 41.8025 40.8325C41.8025 38.4531 43.7119 36.9256 47.3544 36.9256C51.7019 36.9256 53.2 39.0406 53.67 41.89H59.6625C59.1279 36.5426 56.0588 33.1662 50.9382 32.1604V27.4375H45.0632V31.9918C39.4534 32.7062 35.9275 35.973 35.9275 40.8325C35.9275 52.9056 54.7863 48.3819 54.7863 54.9031C54.7863 57.3706 52.4069 59.0156 48.3825 59.0156C43.1244 59.0156 41.3913 56.695 40.745 53.4931H34.8994C35.2781 59.3502 38.8897 63.0159 45.0632 63.9307V68.5625H50.9382V63.9923C56.9633 63.2139 60.6319 59.7089 60.6319 54.5506Z" fill="white"/>
  </svg>
);

const CURRENCIES = [
  { id: "usdttrc20", label: "USDT", network: "Tron (TRC-20)", icon: USDTIcon },
  { id: "usdcsol",   label: "USDC", network: "Solana",        icon: USDCIcon },
];

const gs = "'Google Sans Flex','DM Sans',sans-serif";
const ns = "'Noto Serif',Georgia,serif";

const NetworkBadgeSolana = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius:"50%", display:"block" }}>
    <defs>
      <linearGradient id="nb-sol1" x1="360.9" y1="351.5" x2="141.2" y2="-69.3" gradientTransform="matrix(1 0 0 -1 0 314)" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/>
      </linearGradient>
      <linearGradient id="nb-sol2" x1="264.8" y1="401.6" x2="45.16" y2="-19.15" gradientTransform="matrix(1 0 0 -1 0 314)" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/>
      </linearGradient>
      <linearGradient id="nb-sol3" x1="312.55" y1="376.69" x2="92.88" y2="-44.06" gradientTransform="matrix(1 0 0 -1 0 314)" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/>
      </linearGradient>
    </defs>
    <circle cx="128" cy="128" r="128" fill="black"/>
    <g transform="translate(128,128) scale(0.35) translate(-198.85,-156)">
      <path fill="url(#nb-sol2)" d="M64.6,3.8C67.1,1.4,70.4,0,73.8,0h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,3.8z"/>
      <path fill="url(#nb-sol3)" d="M333.1,120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l62.7,62.7c2.4,2.4,5.7,3.8,9.2,3.8h317.4c5.8,0,8.7-7,4.6-11.1L333.1,120.1z"/>
      <path fill="url(#nb-sol1)" d="M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,237.9z"/>
    </g>
  </svg>
);

const NetworkBadgeTron = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="39 39 522 522" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius:"50%", display:"block" }}>
    <circle fill="#FF060A" cx="300" cy="300" r="261"/>
    <path fill="#FFFFFF" d="M446.6,254.7c-14.4-12.8-34.4-32.3-50.6-46.1l-1-.6c-1.6-1.2-3.4-2.2-5.3-2.9h0c-39.2-7-221.6-39.7-225.1-39.3-1,.1-2,.5-2.8,1l-.9.7c-1.1,1.1-2,2.4-2.5,3.9l-.2.6v3.8c20.5,54.8,101.6,234.2,117.6,276.4,1,2.9,2.8,8.3,6.2,8.6h.8c1.8,0,9.6-9.9,9.6-9.9,0,0,139.3-161.8,153.4-179,1.8-2.1,3.4-4.4,4.8-6.8.4-1.9.2-3.8-.5-5.6s-2-3.5-3.5-4.8h0ZM328,273.6l59.4-47.2,34.9,30.8-94.3,16.4ZM304.9,270.5l-102.3-80.4,165.6,29.3-63.3,51.1ZM314.1,291.5l104.7-16.2-119.7,138.3,15-122.1ZM188.7,198.2l107.7,87.5-15.6,128-92.1-215.5Z"/>
  </svg>
);

function CompositeIcon({ mainIcon: MainIcon, network, size = 36 }) {
  const badgeSize = Math.round(size * 0.45);
  const offset = Math.round(size * 0.04);
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <MainIcon size={size} />
      <div style={{
        position:"absolute", bottom:offset, right:offset,
        borderRadius:"50%",
        lineHeight:0,
      }}>
        {network === "Solana"
          ? <NetworkBadgeSolana size={badgeSize} />
          : <NetworkBadgeTron size={badgeSize} />
        }
      </div>
    </div>
  );
}

export default function CryptoPaymentModal({ plan, amount, currency, currencySymbol, billing, c, mode, onClose }) {
  const [step,       setStep]       = useState("choose");   // choose | details | sent
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [payData,    setPayData]    = useState(null);
  const [copied,     setCopied]     = useState(false);
  const [error,      setError]      = useState(null);

  const priceKey = `${plan.toLowerCase()}_${billing}`;

  const handleCurrencySelect = async (currId) => {
    setSelected(currId);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/nowpayments-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId:    priceKey,
          planLabel:  `${plan} Plan`,
          amount,
          currency,
          payCurrency: currId,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      setPayData(data);
      setStep("details");
    } catch (e) {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const copyAddress = () => {
    if (!payData?.pay_address) return;
    navigator.clipboard.writeText(payData.pay_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedCurr = CURRENCIES.find(c => c.id === selected);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"1.5rem",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div style={{
        width:"100%", maxWidth:"440px",
        background:mode==="dark"?"linear-gradient(160deg,#161618 0%,#111113 100%)":"linear-gradient(160deg,#FFFFFF 0%,#F5F5F3 100%)",
        border:`1px solid ${c.borderHi}`,
        borderRadius:"16px",
        boxShadow:mode==="dark"?"0 24px 64px rgba(0,0,0,0.7)":"0 24px 48px rgba(0,0,0,0.12)",
        overflow:"hidden",
      }}>

        {/* Header */}
        <div style={{
          padding:"1.5rem 1.75rem 1.25rem",
          borderBottom:`1px solid ${c.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div>
            <p style={{ fontFamily:gs, fontSize:"0.6rem", color:c.green, letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:700, marginBottom:"0.25rem" }}>
              Stablecoin payment
            </p>
            <h3 style={{ fontFamily:gs, fontSize:"1.25rem", fontWeight:700, color:c.text, lineHeight:1.2 }}>
              {plan} Plan · <span style={{ fontFamily:ns }}>{currencySymbol}{amount}</span><span style={{ fontFamily:gs, fontSize:"0.8rem", color:c.muted, fontWeight:400 }}>/{billing === "monthly" ? "mo" : "yr"}</span>
            </h3>
          </div>
          <button onClick={onClose} style={{
            background:"none", border:`1px solid ${c.border}`, borderRadius:"50%",
            width:32, height:32, cursor:"pointer", color:c.muted,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"0.9rem", fontFamily:gs, flexShrink:0,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding:"1.75rem" }}>

          {/* STEP: choose */}
          {step === "choose" && (
            <div>
              <p style={{ fontFamily:gs, fontSize:"0.85rem", color:c.muted, lineHeight:1.7, marginBottom:"1.5rem" }}>
                Choose your preferred stablecoin. USDT runs on the Tron network (TRC-20), USDC on Solana. Both offer near-zero fees and fast confirmation.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
                {CURRENCIES.map(curr => (
                  <button key={curr.id} onClick={() => handleCurrencySelect(curr.id)}
                    disabled={loading}
                    style={{
                      display:"flex", alignItems:"center", gap:"1rem",
                      background:mode==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",
                      border:`1px solid ${c.borderHi}`,
                      borderRadius:"10px", padding:"1rem 1.25rem",
                      cursor:loading?"not-allowed":"pointer",
                      transition:"all 0.22s",
                      opacity: loading && selected === curr.id ? 0.6 : 1,
                      textAlign:"left", width:"100%",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = c.green; e.currentTarget.style.background = mode==="dark"?"rgba(0,230,118,0.05)":"rgba(0,138,56,0.04)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = c.borderHi; e.currentTarget.style.background = mode==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)"; }}
                  >
                    <CompositeIcon mainIcon={curr.icon} network={curr.network} size={36} />
                    <div style={{ flex:1 }}>
                      <p style={{ fontFamily:gs, fontSize:"0.95rem", fontWeight:700, color:c.text, marginBottom:"0.15rem" }}>{curr.label}</p>
                      <p style={{ fontFamily:gs, fontSize:"0.75rem", color:c.muted }}>via {curr.network}</p>
                    </div>
                    {loading && selected === curr.id
                      ? <span style={{ fontFamily:gs, fontSize:"0.72rem", color:c.muted }}>Loading...</span>
                      : <span style={{ color:c.muted, fontSize:"0.8rem" }}>→</span>
                    }
                  </button>
                ))}
              </div>
              {error && (
                <div style={{ marginTop:"1rem", padding:"10px 14px", background:mode==="dark"?"rgba(255,24,0,0.08)":"rgba(204,0,0,0.06)", border:`1px solid ${mode==="dark"?"rgba(255,24,0,0.25)":"rgba(204,0,0,0.20)"}`, borderRadius:"6px" }}>
                  <p style={{ fontFamily:gs, fontSize:"0.82rem", color:mode==="dark"?"#FF1800":"#CC0000" }}>{error}</p>
                </div>
              )}
              <p style={{ fontFamily:gs, fontSize:"0.7rem", color:c.muted, textAlign:"center", marginTop:"1.25rem", lineHeight:1.6 }}>
                Powered by NOWPayments · For informational purposes only. Not financial advice.
              </p>
            </div>
          )}

          {/* STEP: details */}
          {step === "details" && payData && (
            <div>
              {/* Coin + amount */}
              <div style={{
                display:"flex", alignItems:"center", gap:"0.85rem",
                background:mode==="dark"?"rgba(0,230,118,0.06)":"rgba(0,138,56,0.05)",
                border:`1px solid ${mode==="dark"?"rgba(0,230,118,0.2)":"rgba(0,138,56,0.15)"}`,
                borderRadius:"10px", padding:"1rem 1.25rem", marginBottom:"1.25rem",
              }}>
                {selectedCurr && <CompositeIcon mainIcon={selectedCurr.icon} network={selectedCurr.network} size={40} />}
                <div>
                  <p style={{ fontFamily:gs, fontSize:"0.7rem", color:c.muted, marginBottom:"0.2rem" }}>Send exactly</p>
                  <p style={{ fontFamily:gs, fontSize:"1.4rem", fontWeight:700, color:c.green, lineHeight:1 }}>
                    {payData.pay_amount} <span style={{ fontSize:"0.9rem" }}>{selectedCurr?.label}</span>
                  </p>
                  <p style={{ fontFamily:gs, fontSize:"0.72rem", color:c.muted, marginTop:"0.2rem" }}>
                    {currencySymbol}{amount} {currency} equivalent
                  </p>
                </div>
              </div>

              {/* Address */}
              <div style={{ marginBottom:"1.25rem" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.5rem" }}>
                  <p style={{ fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.12em", textTransform:"uppercase", fontWeight:700 }}>
                    To address
                  </p>
                  <span style={{ fontFamily:gs, fontSize:"0.65rem", color:c.muted, fontWeight:600 }}>{selectedCurr?.network}</span>
                </div>
                <div style={{
                  display:"flex", alignItems:"center", gap:"0.5rem",
                  background:mode==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",
                  border:`1px solid ${c.border}`, borderRadius:"8px", padding:"0.75rem 1rem",
                }}>
                  <p style={{
                    fontFamily:"'Courier New',monospace", fontSize:"0.72rem",
                    color:c.text, flex:1, wordBreak:"break-all", lineHeight:1.5,
                  }}>{payData.pay_address}</p>
                  <button onClick={copyAddress} style={{
                    flexShrink:0, background:copied?c.green:c.surface,
                    border:`1px solid ${copied?c.green:c.border}`,
                    borderRadius:"5px", padding:"5px 10px",
                    fontFamily:gs, fontSize:"0.65rem", fontWeight:700,
                    color:copied?(mode==="dark"?"#090909":"#fff"):c.muted,
                    cursor:"pointer", transition:"all 0.22s", whiteSpace:"nowrap",
                  }}>
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Warning */}
              <div style={{
                background:mode==="dark"?"rgba(245,158,11,0.08)":"rgba(180,83,9,0.06)",
                border:`1px solid ${mode==="dark"?"rgba(245,158,11,0.25)":"rgba(180,83,9,0.20)"}`,
                borderRadius:"8px", padding:"0.85rem 1rem", marginBottom:"1.25rem",
              }}>
                <p style={{ fontFamily:gs, fontSize:"0.78rem", color:mode==="dark"?"#F59E0B":"#B45309", lineHeight:1.65 }}>
                  Send the exact amount shown above to the address above, using the <strong>{selectedCurr?.network}</strong> network. Sending via the wrong network, a different amount, or to the wrong address may result in permanent loss of funds. The address is valid for 20 minutes.
                </p>
              </div>

              {/* CTA */}
              <button onClick={() => setStep("sent")} style={{
                width:"100%", padding:"13px",
                background:c.text, color:c.bg,
                border:"none", borderRadius:"5px",
                fontFamily:gs, fontSize:"0.84rem", fontWeight:700,
                cursor:"pointer", letterSpacing:"0.03em",
                marginBottom:"0.75rem",
              }}>
                I have sent the payment
              </button>
              <button onClick={() => { setStep("choose"); setSelected(null); setPayData(null); }} style={{
                width:"100%", padding:"10px",
                background:"transparent", color:c.muted,
                border:`1px solid ${c.border}`, borderRadius:"5px",
                fontFamily:gs, fontSize:"0.78rem", cursor:"pointer",
              }}>
                Choose a different currency
              </button>
            </div>
          )}

          {/* STEP: sent */}
          {step === "sent" && (
            <div style={{ textAlign:"center", padding:"0.5rem 0" }}>
              <div style={{
                width:56, height:56, borderRadius:"50%",
                background:mode==="dark"?"rgba(0,230,118,0.12)":"rgba(0,138,56,0.10)",
                border:`1px solid ${mode==="dark"?"rgba(0,230,118,0.3)":"rgba(0,138,56,0.25)"}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                margin:"0 auto 1.25rem", fontSize:"1.5rem",
              }}>✓</div>
              <h3 style={{ fontFamily:gs, fontSize:"1.2rem", fontWeight:700, color:c.text, marginBottom:"0.75rem" }}>
                Payment submitted
              </h3>
              <p style={{ fontFamily:gs, fontSize:"0.87rem", color:c.muted, lineHeight:1.75, marginBottom:"1.5rem" }}>
                Your plan will activate within a few minutes once the {selectedCurr?.network} network confirms the transaction. You will receive a confirmation email shortly after.
              </p>
              <div style={{
                background:mode==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",
                border:`1px solid ${c.border}`, borderRadius:"8px",
                padding:"0.85rem 1rem", marginBottom:"1.5rem",
              }}>
                <p style={{ fontFamily:gs, fontSize:"0.75rem", color:c.muted, lineHeight:1.65 }}>
                  If your plan does not activate within 30 minutes, contact us at <a href="mailto:support@clarinvest.app" style={{ color:c.text, textDecoration:"none", borderBottom:`1px solid ${c.border}` }}>support@clarinvest.app</a> with your payment transaction ID.
                </p>
              </div>
              <button onClick={onClose} style={{
                width:"100%", padding:"13px",
                background:c.text, color:c.bg,
                border:"none", borderRadius:"5px",
                fontFamily:gs, fontSize:"0.84rem", fontWeight:700,
                cursor:"pointer", letterSpacing:"0.03em",
              }}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}