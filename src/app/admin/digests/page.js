"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";

const C = {
  dark:  { bg:"#090909", card:"#111113", surface:"#141416", border:"#232325", borderHi:"#333336", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676", greenDim:"rgba(0,230,118,0.10)", blue:"#4488FF", blueDim:"rgba(68,136,255,0.12)", red:"#FF1800", amber:"#F59E0B" },
  light: { bg:"#F7F7F5", card:"#FFFFFF",  surface:"#EEEEED", border:"#DEDEDD",  borderHi:"#BABAB8", text:"#0A0A0A", muted:"#606065", green:"#008A38", greenDim:"rgba(0,138,56,0.09)",  blue:"#1E55CC", blueDim:"rgba(30,85,204,0.09)",  red:"#CC0000", amber:"#B45309" },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";

export default function DigestsPage() {
  const { mode } = useTheme();
  const c = C[mode];
  const supabase = createClient();

  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("digest_log")
      .select("*")
      .order("sent_at", { ascending: false });
    if (err) {
      setError(err.message);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Summary stats
  const totalSends    = logs.length;
  const weeklySends   = logs.filter(l => l.type === "weekly").length;
  const monthlySends  = logs.filter(l => l.type === "monthly").length;
  const totalReached  = logs.reduce((s, l) => s + (l.subscriber_count || 0), 0);

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })
      + " · " + d.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" }) + " UTC";
  };

  const TypeBadge = ({ type }) => {
    const isWeekly = type === "weekly";
    return (
      <span style={{
        fontFamily: gs, fontSize: "0.62rem", fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
        padding: "3px 9px", borderRadius: "4px",
        color:       isWeekly ? c.blue  : c.green,
        background:  isWeekly ? c.blueDim : c.greenDim,
        border:      `1px solid ${isWeekly ? c.blue + "50" : c.green + "50"}`,
        whiteSpace: "nowrap",
      }}>
        {isWeekly ? "Weekly" : "Monthly"}
      </span>
    );
  };

  return (
    <div style={{ padding: "2.5rem 3rem", maxWidth: "1100px", fontFamily: gs, color: c.text }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: "0.62rem", color: c.muted, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.3rem" }}>Admin</p>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: c.text, marginBottom: "0.3rem" }}>Digest Log</h1>
          <p style={{ fontSize: "0.84rem", color: c.muted }}>Last {logs.length} digest sends. Capped at 20 entries.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: "7px", padding: "9px 20px", fontFamily: gs, fontSize: "0.82rem", fontWeight: 600, color: loading ? c.muted : c.text, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.18s", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ display: "inline-block", animation: loading ? "spin 0.8s linear infinite" : "none" }}>↻</span>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Sends",       value: totalSends,   col: c.text  },
          { label: "Weekly Sends",      value: weeklySends,  col: c.blue  },
          { label: "Monthly Sends",     value: monthlySends, col: c.green },
          { label: "Total Subscribers Reached", value: totalReached, col: c.text },
        ].map(s => (
          <div key={s.label} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: "10px", padding: "1.1rem 1.25rem" }}>
            <p style={{ fontSize: "0.6rem", color: c.muted, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.4rem" }}>{s.label}</p>
            <p style={{ fontSize: "1.6rem", fontWeight: 700, color: s.col, lineHeight: 1 }}>{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ background: "rgba(255,24,0,0.08)", border: "1px solid rgba(255,24,0,0.25)", borderRadius: "8px", padding: "12px 16px", marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.84rem", color: c.red }}>Failed to load digest log: {error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: "12px", overflow: "hidden" }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ padding: "14px 20px", borderBottom: `1px solid ${c.border}`, display: "flex", gap: "1.5rem", alignItems: "center" }}>
              <div style={{ width: 64, height: 22, borderRadius: 4, background: c.surface, animation: "pulse 1.4s ease infinite" }}/>
              <div style={{ flex: 1, height: 16, borderRadius: 4, background: c.surface, animation: "pulse 1.4s ease infinite" }}/>
              <div style={{ width: 48, height: 16, borderRadius: 4, background: c.surface, animation: "pulse 1.4s ease infinite" }}/>
              <div style={{ width: 160, height: 14, borderRadius: 4, background: c.surface, animation: "pulse 1.4s ease infinite" }}/>
            </div>
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && logs.length === 0 && (
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: "12px", padding: "4rem 2rem", textAlign: "center" }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: c.text, marginBottom: "0.5rem" }}>No digests sent yet</p>
          <p style={{ fontSize: "0.84rem", color: c.muted, lineHeight: 1.65, maxWidth: "340px", margin: "0 auto" }}>
            Digest sends appear here once the weekly or monthly cron fires, or when the API route is triggered manually.
          </p>
        </div>
      )}

      {/* Log table */}
      {!loading && logs.length > 0 && (
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: "12px", overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 100px 200px", gap: "0", padding: "10px 20px", background: c.surface, borderBottom: `1px solid ${c.border}` }}>
            {["Type", "Subject", "Subscribers", "Sent at"].map(h => (
              <span key={h} style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: c.muted }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {logs.map((log, i) => (
            <div key={log.id} style={{
              display: "grid", gridTemplateColumns: "90px 1fr 100px 200px",
              gap: "0", padding: "13px 20px",
              borderBottom: i < logs.length - 1 ? `1px solid ${c.border}` : "none",
              alignItems: "center",
              transition: "background 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = c.surface}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div><TypeBadge type={log.type}/></div>
              <p style={{ fontSize: "0.84rem", color: c.text, fontWeight: 500, paddingRight: "1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {log.subject || "—"}
              </p>
              <p style={{ fontSize: "0.84rem", fontWeight: 700, color: log.subscriber_count > 0 ? c.text : c.muted }}>
                {log.subscriber_count?.toLocaleString() ?? "—"}
              </p>
              <p style={{ fontSize: "0.78rem", color: c.muted }}>{formatDate(log.sent_at)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Note */}
      {!loading && logs.length > 0 && (
        <p style={{ fontSize: "0.72rem", color: c.muted, marginTop: "1rem", textAlign: "center" }}>
          Showing the last {logs.length} entries. Older entries are automatically pruned.
        </p>
      )}

    </div>
  );
}