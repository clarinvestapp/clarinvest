"use client";
import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("clarinvest_cookie_ok");
      if (!dismissed) setVisible(true);
    } catch {}
  }, []);

  const dismiss = () => {
    try { localStorage.setItem("clarinvest_cookie_ok", "1"); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        .ck-banner {
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 9999;
          width: 416px;
          max-width: calc(100vw - 48px);
          background: #111113;
          border: 1px solid #333336;
          border-radius: 14px;
          padding: 14px 20px 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.55);
          font-family: 'Google Sans Flex', 'DM Sans', Arial, sans-serif;
          animation: ck-in 0.28s ease both;
        }
        @media (prefers-color-scheme: light) {
          .ck-banner {
            background: #FFFFFF;
            border-color: #BABAB8;
            box-shadow: 0 8px 24px rgba(0,0,0,0.10);
          }
          .ck-title { color: #0A0A0A !important; }
          .ck-body  { color: #606065 !important; }
          .ck-body a { color: #606065 !important; }
          .ck-btn-ok {
            background: #0A0A0A !important;
            color: #FFFFFF !important;
          }
        }
        @keyframes ck-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ck-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }
        .ck-icon {
          width: 28px; height: 28px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.06);
          border-radius: 8px;
          font-size: 14px;
          line-height: 1;
        }
        .ck-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: #F0F0F0;
          flex: 1;
          padding-top: 0;
          display: flex;
          align-items: center;
        }
        .ck-close {
          background: none; border: none; cursor: pointer;
          color: #7A7A80; font-size: 1rem; line-height: 1;
          padding: 2px; flex-shrink: 0; margin-top: 2px;
          transition: opacity 0.18s;
        }
        .ck-close:hover { opacity: 0.5; }
        .ck-body {
          font-size: 0.68rem;
          line-height: 1.62;
          color: #7A7A80;
          margin-bottom: 14px;
        }
        .ck-body a {
          color: #7A7A80;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .ck-body a:hover { opacity: 0.7; }
        .ck-btn-ok {
          width: 100%;
          padding: 9px;
          border-radius: 5px;
          border: none;
          cursor: pointer;
          background: #F0F0F0;
          color: #090909;
          font-family: 'Google Sans Flex', 'DM Sans', Arial, sans-serif;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          transition: opacity 0.18s;
        }
        .ck-btn-ok:hover { opacity: 0.85; }
      `}</style>

      <div className="ck-banner" role="dialog" aria-label="Cookie notice">
        <div className="ck-top">
          <div className="ck-icon">🍪</div>
          <span className="ck-title">Cookies</span>
          <button className="ck-close" onClick={dismiss} aria-label="Dismiss">✕</button>
        </div>
        <p className="ck-body">
          Clarinvest uses essential cookies only: session management and your
          display preferences. No tracking, no advertising, no data sold to
          third parties. See our{" "}
          <a href="/privacy">Privacy Policy</a> and{" "}
          <a href="/terms">Terms of Service</a> for full details.
        </p>
        <button className="ck-btn-ok" onClick={dismiss}>
          Got it
        </button>
      </div>
    </>
  );
}