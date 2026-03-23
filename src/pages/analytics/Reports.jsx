import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, BarChart2, ShoppingBag, Users, Package,
  Clock, ChevronDown, RefreshCw, Download, ArrowUpRight,
  ArrowDownRight, Minus, Coffee, AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../store/auth";
import { getBranches } from "../../api/branches";
import {
  getBranchSales, getBranchTimeseries, getBranchTellers,
  getBranchAddonSales, getBranchStock, getOrgComparison,
} from "../../api/reports";
import { getBranchShifts } from "../../api/shifts";

// ─────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────
const COLORS = ["#1a56db","#059669","#7C3AED","#D97706","#DC2626","#0891B2","#65A30D","#DB2777"];
const PAYMENT_COLORS = { cash:"#059669", card:"#7C3AED", digital_wallet:"#0891B2", mixed:"#D97706" };

const PRESETS = [
  { label:"Today",       days:0,   from:()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; }, to:()=>new Date() },
  { label:"Yesterday",   days:1,   from:()=>{ const d=new Date(); d.setDate(d.getDate()-1); d.setHours(0,0,0,0); return d; }, to:()=>{ const d=new Date(); d.setDate(d.getDate()-1); d.setHours(23,59,59,999); return d; } },
  { label:"Last 7 days", days:7,   from:()=>{ const d=new Date(); d.setDate(d.getDate()-6); d.setHours(0,0,0,0); return d; }, to:()=>new Date() },
  { label:"This month",  days:30,  from:()=>{ const d=new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; }, to:()=>new Date() },
  { label:"Last 30 days",days:30,  from:()=>{ const d=new Date(); d.setDate(d.getDate()-29); d.setHours(0,0,0,0); return d; }, to:()=>new Date() },
  { label:"Last month",  days:31,  from:()=>{ const d=new Date(); d.setDate(1); d.setDate(0); const s=new Date(d); s.setDate(1); s.setHours(0,0,0,0); return s; }, to:()=>{ const d=new Date(); d.setDate(1); d.setDate(0); d.setHours(23,59,59,999); return d; } },
  { label:"Custom",      days:-1,  from:null, to:null },
];

const TABS = [
  { id:"overview",   label:"Overview",   icon:TrendingUp  },
  { id:"revenue",    label:"Revenue",    icon:BarChart2   },
  { id:"items",      label:"Items",      icon:ShoppingBag },
  { id:"tellers",    label:"Tellers",    icon:Users       },
  { id:"shifts",     label:"Shifts",     icon:Clock       },
  { id:"inventory",  label:"Inventory",  icon:Package     },
];

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────
const egp = (n=0) => `EGP ${(n/100).toLocaleString("en",{minimumFractionDigits:0,maximumFractionDigits:0})}`;
const egpFull = (n=0) => `EGP ${(n/100).toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const pct = (n,t) => t===0 ? "0%" : `${((n/t)*100).toFixed(1)}%`;
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}) : "—";
const fmtDateTime = iso => iso ? new Date(iso).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "—";

function delta(curr, prev) {
  if (!prev || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function DeltaBadge({ value }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full
      ${up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
      {up ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
//  DATE RANGE PICKER
// ─────────────────────────────────────────────────────────────
function DateRangePicker({ from, to, onApply }) {
  const [open,        setOpen]        = useState(false);
  const [preset,      setPreset]      = useState(2); // Last 7 days
  const [customFrom,  setCustomFrom]  = useState("");
  const [customTo,    setCustomTo]    = useState("");
  const current = PRESETS[preset];

  return (
    <div style={{ position:"relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:"flex", alignItems:"center", gap:6,
          padding:"8px 14px", borderRadius:9,
          border:"1.5px solid #E5E7EB", background:"#fff",
          fontSize:13, fontWeight:600, color:"#374151", cursor:"pointer",
        }}
      >
        <Clock size={13} color="#6B7280"/>
        {current.label === "Custom"
          ? (from && to ? `${fmtDate(from)} – ${fmtDate(to)}` : "Custom range")
          : current.label}
        <ChevronDown size={13} color="#9CA3AF"/>
      </button>
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:100,
          background:"#fff", border:"1px solid #E5E7EB", borderRadius:12,
          boxShadow:"0 8px 24px rgba(0,0,0,0.12)", padding:16, minWidth:240,
        }}>
          <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:12 }}>
            {PRESETS.map((p,i) => (
              <button key={p.label} onClick={() => {
                setPreset(i);
                if (p.from) { onApply(p.from(), p.to()); setOpen(false); }
              }} style={{
                padding:"7px 12px", borderRadius:8, border:"none",
                background: preset===i ? "#EFF6FF" : "transparent",
                color: preset===i ? "#1a56db" : "#374151",
                fontSize:13, fontWeight: preset===i ? 700 : 500,
                cursor:"pointer", textAlign:"left",
              }}>{p.label}</button>
            ))}
          </div>
          {preset === PRESETS.length - 1 && (
            <div style={{ borderTop:"1px solid #F0F0F0", paddingTop:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:"#6B7280", display:"block", marginBottom:4 }}>FROM</label>
                  <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}
                    style={{ width:"100%", padding:"7px 9px", border:"1.5px solid #E5E7EB", borderRadius:8, fontSize:12 }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:"#6B7280", display:"block", marginBottom:4 }}>TO</label>
                  <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)}
                    style={{ width:"100%", padding:"7px 9px", border:"1.5px solid #E5E7EB", borderRadius:8, fontSize:12 }}/>
                </div>
              </div>
              <button
                disabled={!customFrom || !customTo}
                onClick={() => { onApply(new Date(customFrom), new Date(customTo+"T23:59:59")); setOpen(false); }}
                style={{ width:"100%", padding:"8px 0", borderRadius:8, border:"none",
                  background:"#1a56db", color:"#fff", fontSize:13, fontWeight:600,
                  cursor: (!customFrom||!customTo) ? "not-allowed" : "pointer",
                  opacity: (!customFrom||!customTo) ? 0.5 : 1 }}
              >Apply</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  STAT CARD
// ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent="#1a56db", loading, delta: d }) {
  return (
    <div style={{
      background:"#fff", borderRadius:14, padding:"16px 20px",
      border:"1px solid #EEEEEE", boxShadow:"0 1px 6px rgba(0,0,0,0.04)",
    }}>
      <p style={{ fontSize:11, fontWeight:600, color:"#9CA3AF", margin:"0 0 8px", letterSpacing:0.4, textTransform:"uppercase" }}>{label}</p>
      {loading ? (
        <div style={{ height:24, width:80, background:"#F0F0F0", borderRadius:6, animation:"pulse 1.5s infinite" }}/>
      ) : (
        <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
          <p style={{ fontSize:22, fontWeight:800, color:accent, margin:0, fontVariantNumeric:"tabular-nums" }}>{value}</p>
          {d !== undefined && <DeltaBadge value={d}/>}
        </div>
      )}
      {sub && <p style={{ fontSize:11, color:"#9CA3AF", margin:"5px 0 0" }}>{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SECTION CARD wrapper
// ─────────────────────────────────────────────────────────────
function Section({ title, action, children }) {
  return (
    <div style={{ background:"#fff", borderRadius:14, border:"1px solid #EEEEEE", boxShadow:"0 1px 6px rgba(0,0,0,0.04)", overflow:"hidden" }}>
      {(title || action) && (
        <div style={{ padding:"14px 20px", borderBottom:"1px solid #F5F5F5", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          {title && <p style={{ fontWeight:700, fontSize:14, margin:0, color:"#111827" }}>{title}</p>}
          {action}
        </div>
      )}
      <div style={{ padding:20 }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TOOLTIP
// ─────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:10, padding:"10px 14px", boxShadow:"0 4px 12px rgba(0,0,0,0.1)", fontSize:12 }}>
      <p style={{ fontWeight:700, color:"#111827", margin:"0 0 6px" }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ margin:"2px 0", color:p.color || "#374151" }}>
          {p.name}: <strong>{formatter ? formatter(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  TAB: OVERVIEW
// ─────────────────────────────────────────────────────────────
function OverviewTab({ branchId, orgId, from, to, allBranches }) {
  const params = { from:from?.toISOString(), to:to?.toISOString() };

  const { data:sales, isLoading:salesLoading } = useQuery({
    queryKey:["analytics-sales", branchId, from, to],
    queryFn:() => branchId === "all"
      ? getOrgComparison(orgId, params).then(r=>r.data)
      : getBranchSales(branchId, params).then(r=>r.data),
    enabled: !!(branchId && (branchId==="all" ? orgId : branchId)),
  });

  // When "all" — aggregate from comparison
  const isAll = branchId === "all";
  const totals = useMemo(() => {
    if (!sales) return null;
    if (isAll) {
      const branches = sales.branches || [];
      return {
        total_orders:   branches.reduce((s,b)=>s+b.total_orders,0),
        voided_orders:  branches.reduce((s,b)=>s+b.voided_orders,0),
        total_revenue:  branches.reduce((s,b)=>s+b.total_revenue,0),
        cash_revenue:   branches.reduce((s,b)=>s+b.cash_revenue,0),
        card_revenue:   branches.reduce((s,b)=>s+b.card_revenue,0),
        total_discount: 0,
        total_tax:      0,
      };
    }
    return sales;
  }, [sales, isAll]);

  const avgOrder   = totals?.total_orders ? Math.round(totals.total_revenue / totals.total_orders) : 0;
  const voidRate   = totals ? pct(totals.voided_orders, totals.total_orders + totals.voided_orders) : "0%";
  const paymentPie = totals ? [
    { name:"Cash",   value:totals.cash_revenue,   color:PAYMENT_COLORS.cash   },
    { name:"Card",   value:totals.card_revenue,   color:PAYMENT_COLORS.card   },
    { name:"Wallet", value:totals.digital_wallet_revenue||0, color:PAYMENT_COLORS.digital_wallet },
    { name:"Mixed",  value:totals.mixed_revenue||0, color:PAYMENT_COLORS.mixed },
  ].filter(p=>p.value>0) : [];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 }}>
        <StatCard label="Total Revenue"   value={egp(totals?.total_revenue)}   loading={salesLoading} accent="#1a56db"/>
        <StatCard label="Orders"          value={totals?.total_orders ?? "—"}  loading={salesLoading} accent="#059669"/>
        <StatCard label="Avg Order Value" value={egp(avgOrder)}                loading={salesLoading} accent="#7C3AED"/>
        <StatCard label="Void Rate"       value={voidRate}                     loading={salesLoading} accent="#DC2626"
          sub={`${totals?.voided_orders ?? 0} voided`}/>
        {totals?.total_discount > 0 && (
          <StatCard label="Discounts" value={egp(totals.total_discount)} loading={salesLoading} accent="#D97706"/>
        )}
        {totals?.total_tax > 0 && (
          <StatCard label="Tax Collected" value={egp(totals.total_tax)} loading={salesLoading} accent="#6B7280"/>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Payment mix */}
        <Section title="Payment Mix">
          {paymentPie.length === 0 ? (
            <p style={{ textAlign:"center", color:"#9CA3AF", fontSize:13, padding:"20px 0" }}>No data</p>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:24 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={paymentPie} cx={75} cy={75} innerRadius={45} outerRadius={70}
                    dataKey="value" paddingAngle={2}>
                    {paymentPie.map((p,i) => <Cell key={i} fill={p.color}/>)}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={egp}/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
                {paymentPie.map(p => (
                  <div key={p.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:p.color }}/>
                      <span style={{ fontSize:13, color:"#374151" }}>{p.name}</span>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:13, fontWeight:700 }}>{egp(p.value)}</div>
                      <div style={{ fontSize:11, color:"#9CA3AF" }}>{pct(p.value, totals?.total_revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Top 5 items */}
        <Section title="Top Items">
          {!sales?.top_items?.length ? (
            <p style={{ textAlign:"center", color:"#9CA3AF", fontSize:13, padding:"20px 0" }}>No data</p>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {(sales.top_items || []).slice(0,5).map((item,i) => (
                <div key={item.menu_item_id} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:11, fontWeight:800, color:"#9CA3AF", width:16, textAlign:"right" }}>{i+1}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:"#111827" }}>{item.item_name}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:"#1a56db" }}>{egp(item.revenue)}</span>
                    </div>
                    <div style={{ height:5, background:"#F0F0F0", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", background:COLORS[i%COLORS.length], borderRadius:3,
                        width:pct(item.revenue, sales.top_items[0]?.revenue) }}/>
                    </div>
                  </div>
                  <span style={{ fontSize:11, color:"#9CA3AF", width:32, textAlign:"right" }}>×{item.quantity_sold}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Cross-branch comparison (always show if org level or all) */}
      {isAll && sales?.branches && (
        <Section title="Branch Comparison">
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#F9FAFB" }}>
                  {["Branch","Orders","Revenue","Avg Order","Void Rate","Cash","Card"].map(h => (
                    <th key={h} style={{ padding:"9px 14px", textAlign:"left", fontSize:11, fontWeight:700,
                      color:"#6B7280", letterSpacing:0.4, textTransform:"uppercase",
                      borderBottom:"1px solid #F0F0F0", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.branches.map((b,i) => (
                  <tr key={b.branch_id} style={{ background:i%2===0?"#fff":"#FAFAFA" }}>
                    <td style={{ padding:"10px 14px", fontWeight:600 }}>{b.branch_name}</td>
                    <td style={{ padding:"10px 14px" }}>{b.total_orders}</td>
                    <td style={{ padding:"10px 14px", fontWeight:700, color:"#1a56db" }}>{egp(b.total_revenue)}</td>
                    <td style={{ padding:"10px 14px" }}>{egp(b.avg_order_value)}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ color: parseFloat(b.void_rate_pct)>5 ? "#DC2626" : "#6B7280" }}>
                        {b.void_rate_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ padding:"10px 14px" }}>{egp(b.cash_revenue)}</td>
                    <td style={{ padding:"10px 14px" }}>{egp(b.card_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB: REVENUE
// ─────────────────────────────────────────────────────────────
function RevenueTab({ branchId, from, to }) {
  const [granularity, setGranularity] = useState("daily");
  const params = { from:from?.toISOString(), to:to?.toISOString(), granularity };
  const enabled = !!(branchId && branchId !== "all");

  const { data:ts=[], isLoading } = useQuery({
    queryKey:["analytics-ts", branchId, from, to, granularity],
    queryFn:() => getBranchTimeseries(branchId, params).then(r=>r.data),
    enabled,
  });

  const chartData = ts.map(p => ({
    ...p,
    revenueEGP: p.revenue / 100,
    label: granularity === "hourly"
      ? new Date(p.period).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})
      : granularity === "monthly"
        ? new Date(p.period).toLocaleDateString("en-GB",{month:"short",year:"2-digit"})
        : new Date(p.period).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}),
  }));

  const totalRevenue = ts.reduce((s,p)=>s+p.revenue,0);
  const totalOrders  = ts.reduce((s,p)=>s+p.orders,0);
  const peakPeriod   = ts.reduce((max,p) => p.revenue > (max?.revenue||0) ? p : max, null);

  // Hourly heatmap (only meaningful for multi-day daily+ data)
  const heatmapData = useMemo(() => {
    if (granularity !== "hourly" || !ts.length) return null;
    const grid = {};
    ts.forEach(p => {
      const d = new Date(p.period);
      const day  = d.toLocaleDateString("en-GB",{weekday:"short"});
      const hour = d.getHours();
      if (!grid[day]) grid[day] = {};
      grid[day][hour] = (grid[day][hour]||0) + p.revenue;
    });
    return grid;
  }, [ts, granularity]);

  if (!enabled) return (
    <div style={{ textAlign:"center", padding:60, color:"#9CA3AF", fontSize:14 }}>
      Select a specific branch to view revenue trends
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* KPI + granularity */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", gap:12 }}>
          <StatCard label="Total Revenue" value={egp(totalRevenue)} accent="#1a56db"/>
          <StatCard label="Total Orders"  value={totalOrders}       accent="#059669"/>
          {peakPeriod && (
            <StatCard label="Peak Period" value={
              granularity==="hourly"
                ? new Date(peakPeriod.period).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})
                : fmtDate(peakPeriod.period)
            } sub={egp(peakPeriod.revenue)} accent="#7C3AED"/>
          )}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {["hourly","daily","monthly"].map(g => (
            <button key={g} onClick={()=>setGranularity(g)} style={{
              padding:"7px 14px", borderRadius:8, border:"1.5px solid",
              borderColor: granularity===g ? "#1a56db" : "#E5E7EB",
              background:  granularity===g ? "#EFF6FF" : "#fff",
              color:       granularity===g ? "#1a56db" : "#374151",
              fontSize:12, fontWeight:600, cursor:"pointer",
              textTransform:"capitalize",
            }}>{g}</button>
          ))}
        </div>
      </div>

      {/* Revenue area chart */}
      <Section title="Revenue Over Time">
        {isLoading ? (
          <div style={{ height:260, background:"#F9FAFB", borderRadius:8, animation:"pulse 1.5s infinite" }}/>
        ) : chartData.length === 0 ? (
          <p style={{ textAlign:"center", color:"#9CA3AF", padding:"40px 0" }}>No data for this period</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{top:8,right:8,bottom:0,left:8}}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1a56db" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#1a56db" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0"/>
              <XAxis dataKey="label" tick={{fontSize:11,fill:"#9CA3AF"}} tickLine={false}/>
              <YAxis tickFormatter={v=>`${v}`} tick={{fontSize:11,fill:"#9CA3AF"}} tickLine={false} axisLine={false}/>
              <Tooltip content={<ChartTooltip formatter={v=>`EGP ${v.toLocaleString()}`}/>}/>
              <Area type="monotone" dataKey="revenueEGP" name="Revenue (EGP)"
                stroke="#1a56db" strokeWidth={2} fill="url(#revGrad)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* Orders bar chart */}
      <Section title="Orders Over Time">
        {!isLoading && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{top:4,right:8,bottom:0,left:8}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false}/>
              <XAxis dataKey="label" tick={{fontSize:11,fill:"#9CA3AF"}} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:"#9CA3AF"}} tickLine={false} axisLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="orders" name="Orders" fill="#059669" radius={[4,4,0,0]} maxBarSize={40}/>
              <Bar dataKey="voided" name="Voided" fill="#FCA5A5" radius={[4,4,0,0]} maxBarSize={40}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* Breakdown table */}
      <Section title="Period Breakdown">
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:"#F9FAFB" }}>
                {["Period","Orders","Revenue","Avg Order","Voided","Discounts","Tax"].map(h=>(
                  <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontSize:11, fontWeight:700,
                    color:"#6B7280", letterSpacing:0.4, textTransform:"uppercase",
                    borderBottom:"1px solid #F0F0F0", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...chartData].reverse().map((p,i) => (
                <tr key={i} style={{ background:i%2===0?"#fff":"#FAFAFA" }}>
                  <td style={{ padding:"9px 12px", fontWeight:600 }}>{p.label}</td>
                  <td style={{ padding:"9px 12px" }}>{p.orders}</td>
                  <td style={{ padding:"9px 12px", fontWeight:700, color:"#1a56db" }}>EGP {p.revenueEGP.toLocaleString()}</td>
                  <td style={{ padding:"9px 12px" }}>{p.orders>0 ? egp(p.revenue/p.orders) : "—"}</td>
                  <td style={{ padding:"9px 12px", color:p.voided>0?"#DC2626":"#9CA3AF" }}>{p.voided||0}</td>
                  <td style={{ padding:"9px 12px" }}>{egp(p.discount||0)}</td>
                  <td style={{ padding:"9px 12px" }}>{egp(p.tax||0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB: ITEMS
// ─────────────────────────────────────────────────────────────
function ItemsTab({ branchId, from, to }) {
  const [expandedCat, setExpandedCat] = useState(null);
  const params = { from:from?.toISOString(), to:to?.toISOString() };
  const enabled = !!(branchId && branchId !== "all");

  const { data:sales }  = useQuery({ queryKey:["analytics-sales",branchId,from,to], queryFn:()=>getBranchSales(branchId,params).then(r=>r.data), enabled });
  const { data:addons=[] } = useQuery({ queryKey:["analytics-addons",branchId,from,to], queryFn:()=>getBranchAddonSales(branchId,params).then(r=>r.data), enabled });

  if (!enabled) return <div style={{ textAlign:"center", padding:60, color:"#9CA3AF" }}>Select a specific branch</div>;

  const categories = sales?.by_category || [];
  const maxCatRev  = Math.max(...categories.map(c=>c.revenue), 1);

  const addonsByType = { coffee_type:[], milk_type:[], extra:[] };
  addons.forEach(a => { (addonsByType[a.addon_type] || addonsByType.extra).push(a); });
  const TYPE_LABELS = { coffee_type:"Coffee Types", milk_type:"Milk Types", extra:"Extras" };
  const TYPE_COLORS = { coffee_type:"#D97706", milk_type:"#0891B2", extra:"#7C3AED" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Categories */}
      <Section title="Sales by Category">
        {categories.length === 0 ? (
          <p style={{ textAlign:"center", color:"#9CA3AF", padding:"20px 0" }}>No data</p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {categories.map((cat,i) => (
              <div key={cat.category_id||"uncategorized"}>
                <div
                  onClick={()=>setExpandedCat(expandedCat===cat.category_id ? null : cat.category_id)}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                    background: expandedCat===cat.category_id ? "#EFF6FF" : "#F9FAFB",
                    borderRadius:10, cursor:"pointer" }}
                >
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:14, fontWeight:700 }}>{cat.category_name||"Uncategorized"}</span>
                      <div style={{ display:"flex", gap:16 }}>
                        <span style={{ fontSize:13, color:"#6B7280" }}>×{cat.quantity_sold}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:"#1a56db" }}>{egp(cat.revenue)}</span>
                        <span style={{ fontSize:12, color:"#9CA3AF" }}>{pct(cat.revenue, sales?.total_revenue)}</span>
                      </div>
                    </div>
                    <div style={{ height:6, background:"#E5E7EB", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", background:COLORS[i%COLORS.length], borderRadius:3,
                        width:pct(cat.revenue, maxCatRev) }}/>
                    </div>
                  </div>
                  <ChevronDown size={14} color="#9CA3AF"
                    style={{ transform: expandedCat===cat.category_id ? "rotate(180deg)":"none", transition:"transform 0.2s" }}/>
                </div>
                {expandedCat === cat.category_id && (
                  <div style={{ marginTop:4, marginLeft:16, display:"flex", flexDirection:"column", gap:2 }}>
                    {cat.items.map(item => (
                      <div key={item.menu_item_id} style={{ display:"flex", justifyContent:"space-between",
                        padding:"7px 14px", background:"#fff", borderRadius:8, border:"1px solid #F0F0F0" }}>
                        <span style={{ fontSize:13, color:"#374151" }}>{item.item_name}</span>
                        <div style={{ display:"flex", gap:16 }}>
                          <span style={{ fontSize:12, color:"#9CA3AF" }}>×{item.quantity_sold}</span>
                          <span style={{ fontSize:13, fontWeight:600 }}>{egp(item.revenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Addon sales */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
        {Object.entries(addonsByType).filter(([,items])=>items.length>0).map(([type,items])=>(
          <Section key={type} title={TYPE_LABELS[type]}>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {items.slice(0,8).map((a,i)=>(
                <div key={a.addon_item_id} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:11, fontWeight:800, color:"#9CA3AF", width:16, textAlign:"right" }}>{i+1}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:12, fontWeight:600 }}>{a.addon_name}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:TYPE_COLORS[type] }}>{egp(a.revenue)}</span>
                    </div>
                    <span style={{ fontSize:11, color:"#9CA3AF" }}>×{a.quantity_sold}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB: TELLERS
// ─────────────────────────────────────────────────────────────
function TellersTab({ branchId, from, to }) {
  const params = { from:from?.toISOString(), to:to?.toISOString() };
  const enabled = !!(branchId && branchId !== "all");
  const { data:tellers=[], isLoading } = useQuery({
    queryKey:["analytics-tellers",branchId,from,to],
    queryFn:()=>getBranchTellers(branchId,params).then(r=>r.data),
    enabled,
  });

  if (!enabled) return <div style={{ textAlign:"center", padding:60, color:"#9CA3AF" }}>Select a specific branch</div>;

  const maxRev = Math.max(...tellers.map(t=>t.revenue),1);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Bar chart */}
      {tellers.length > 0 && (
        <Section title="Revenue by Teller">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tellers} layout="vertical" margin={{top:4,right:60,bottom:0,left:80}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false}/>
              <XAxis type="number" tickFormatter={v=>`EGP ${(v/100).toLocaleString()}`} tick={{fontSize:10,fill:"#9CA3AF"}} tickLine={false} axisLine={false}/>
              <YAxis type="category" dataKey="teller_name" tick={{fontSize:12,fill:"#374151"}} tickLine={false} axisLine={false}/>
              <Tooltip content={<ChartTooltip formatter={egp}/>}/>
              <Bar dataKey="revenue" name="Revenue" fill="#1a56db" radius={[0,4,4,0]} maxBarSize={28}/>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* Teller cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
        {isLoading ? (
          Array.from({length:3}).map((_,i)=>(
            <div key={i} style={{ height:140, background:"#F0F0F0", borderRadius:14, animation:"pulse 1.5s infinite" }}/>
          ))
        ) : tellers.length === 0 ? (
          <p style={{ color:"#9CA3AF", fontSize:13 }}>No teller data for this period</p>
        ) : tellers.map((t,i)=>(
          <div key={t.teller_id} style={{ background:"#fff", borderRadius:14, padding:"16px 20px",
            border:"1px solid #EEEEEE", boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <div style={{ width:38, height:38, borderRadius:"50%", flexShrink:0,
                background:`linear-gradient(135deg,${COLORS[i%COLORS.length]}cc,${COLORS[i%COLORS.length]})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                color:"#fff", fontSize:15, fontWeight:800 }}>
                {t.teller_name[0]?.toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight:700, fontSize:14, margin:0 }}>{t.teller_name}</p>
                <p style={{ fontSize:11, color:"#9CA3AF", margin:0 }}>{t.shifts} shift{t.shifts!==1?"s":""}</p>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px" }}>
              {[
                ["Revenue",   egp(t.revenue),          "#1a56db"],
                ["Orders",    t.orders,                 "#059669"],
                ["Avg Order", egp(t.avg_order_value),   "#7C3AED"],
                ["Voided",    t.voided,                 t.voided>0?"#DC2626":"#9CA3AF"],
              ].map(([label,val,color])=>(
                <div key={label}>
                  <p style={{ fontSize:10, color:"#9CA3AF", margin:"0 0 2px", fontWeight:600, textTransform:"uppercase", letterSpacing:0.4 }}>{label}</p>
                  <p style={{ fontSize:14, fontWeight:800, color, margin:0 }}>{val}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop:12, height:5, background:"#F0F0F0", borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", background:COLORS[i%COLORS.length], borderRadius:3,
                width:pct(t.revenue, maxRev) }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB: SHIFTS
// ─────────────────────────────────────────────────────────────
function ShiftsTab({ branchId, from, to }) {
  const [filter, setFilter] = useState("all");
  const enabled = !!(branchId && branchId !== "all");
  const { data:shifts=[], isLoading } = useQuery({
    queryKey:["analytics-shifts",branchId],
    queryFn:()=>getBranchShifts(branchId).then(r=>r.data),
    enabled,
  });

  if (!enabled) return <div style={{ textAlign:"center", padding:60, color:"#9CA3AF" }}>Select a specific branch</div>;

  const filtered = shifts.filter(s => filter==="all" || s.status===filter);

  const discrepancyData = shifts
    .filter(s=>s.cash_discrepancy!=null)
    .slice(0,20)
    .map(s=>({
      label: new Date(s.opened_at||s.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}),
      discrepancy: (s.cash_discrepancy||0)/100,
      teller: s.teller_name,
    }));

  const STATUS_C = { open:"#059669", closed:"#1a56db", force_closed:"#EA580C" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Discrepancy trend */}
      {discrepancyData.length > 1 && (
        <Section title="Cash Discrepancy Trend">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={discrepancyData} margin={{top:4,right:8,bottom:0,left:8}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false}/>
              <XAxis dataKey="label" tick={{fontSize:11,fill:"#9CA3AF"}} tickLine={false}/>
              <YAxis tickFormatter={v=>`EGP ${v}`} tick={{fontSize:11,fill:"#9CA3AF"}} tickLine={false} axisLine={false}/>
              <Tooltip content={<ChartTooltip formatter={v=>`EGP ${v}`}/>}/>
              <Bar dataKey="discrepancy" name="Discrepancy (EGP)" radius={[4,4,0,0]} maxBarSize={32}
                fill="#1a56db">
                {discrepancyData.map((d,i)=>(
                  <Cell key={i} fill={d.discrepancy===0?"#059669":d.discrepancy>0?"#D97706":"#DC2626"}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* Filter + table */}
      <Section title="Shift History" action={
        <div style={{ display:"flex", gap:6 }}>
          {["all","open","closed","force_closed"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{
              padding:"5px 12px", borderRadius:20, border:"1.5px solid",
              borderColor: filter===f ? "#1a56db" : "#E5E7EB",
              background:  filter===f ? "#EFF6FF" : "#fff",
              color:       filter===f ? "#1a56db" : "#374151",
              fontSize:11, fontWeight:600, cursor:"pointer",
              textTransform:"capitalize",
            }}>{f.replace("_"," ")}</button>
          ))}
        </div>
      }>
        {isLoading ? (
          <div style={{ textAlign:"center", padding:40, color:"#9CA3AF" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:40, color:"#9CA3AF" }}>No shifts match this filter</div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#F9FAFB" }}>
                  {["Date","Teller","Duration","Opening Cash","Discrepancy","Status"].map(h=>(
                    <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontSize:11, fontWeight:700,
                      color:"#6B7280", letterSpacing:0.4, textTransform:"uppercase",
                      borderBottom:"1px solid #F0F0F0", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s,i)=>{
                  const disc = s.cash_discrepancy;
                  const opened = s.opened_at || s.created_at;
                  const ms = new Date(s.closed_at||Date.now()) - new Date(opened);
                  const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000);
                  return (
                    <tr key={s.id} style={{ background:i%2===0?"#fff":"#FAFAFA" }}>
                      <td style={{ padding:"10px 12px", fontWeight:600 }}>{fmtDate(opened)}</td>
                      <td style={{ padding:"10px 12px" }}>{s.teller_name}</td>
                      <td style={{ padding:"10px 12px", color:"#6B7280" }}>{h>0?`${h}h ${m}m`:`${m}m`}</td>
                      <td style={{ padding:"10px 12px" }}>{egp(s.opening_cash||0)}</td>
                      <td style={{ padding:"10px 12px" }}>
                        {disc == null ? <span style={{ color:"#9CA3AF" }}>—</span> : (
                          <span style={{ fontWeight:700, color:disc===0?"#059669":disc>0?"#D97706":"#DC2626" }}>
                            {disc===0?"✓ Exact":`${disc>0?"+":""}${egp(Math.abs(disc))}`}
                          </span>
                        )}
                      </td>
                      <td style={{ padding:"10px 12px" }}>
                        <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20,
                          background:STATUS_C[s.status]+"20", color:STATUS_C[s.status] }}>
                          {s.status.replace("_"," ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB: INVENTORY
// ─────────────────────────────────────────────────────────────
function InventoryTab({ branchId, from, to }) {
  const enabled = !!(branchId && branchId !== "all");
  const params  = { from:from?.toISOString(), to:to?.toISOString() };

  const { data:stock }     = useQuery({ queryKey:["analytics-stock",branchId],       queryFn:()=>getBranchStock(branchId).then(r=>r.data), enabled });
  const { data:deductions=[] } = useQuery({ queryKey:["analytics-deductions-agg",branchId,from,to],
    queryFn: async () => {
      // Aggregate deductions from all shifts in range — fetch shifts then deductions
      // For simplicity, use branch_stock report which has current levels
      return [];
    }, enabled });

  if (!enabled) return <div style={{ textAlign:"center", padding:60, color:"#9CA3AF" }}>Select a specific branch</div>;

  const items = stock?.items || [];
  const lowStock = items.filter(i=>i.below_reorder);
  const okStock  = items.filter(i=>!i.below_reorder);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div style={{ background:"#FFF7ED", border:"1px solid #FED7AA", borderRadius:14, padding:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <AlertTriangle size={16} color="#D97706"/>
            <p style={{ fontWeight:700, fontSize:14, color:"#92400E", margin:0 }}>
              {lowStock.length} item{lowStock.length!==1?"s":""} below reorder threshold
            </p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:8 }}>
            {lowStock.map(item=>(
              <div key={item.inventory_item_id} style={{ background:"#fff", borderRadius:10,
                padding:"10px 14px", border:"1px solid #FED7AA" }}>
                <p style={{ fontWeight:700, fontSize:13, margin:"0 0 3px", color:"#92400E" }}>{item.item_name}</p>
                <p style={{ fontSize:12, color:"#D97706", margin:0, fontVariantNumeric:"tabular-nums" }}>
                  {item.current_stock} {item.unit} <span style={{ color:"#9CA3AF" }}>/ {item.reorder_threshold} min</span>
                </p>
                {item.current_stock === 0 && (
                  <span style={{ fontSize:10, fontWeight:800, color:"#DC2626", background:"#FEE2E2",
                    padding:"2px 7px", borderRadius:20, display:"inline-block", marginTop:4 }}>OUT OF STOCK</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All stock levels */}
      <Section title="Stock Levels"
        action={<span style={{ fontSize:12, color:"#9CA3AF" }}>{items.length} items</span>}>
        {items.length === 0 ? (
          <p style={{ textAlign:"center", color:"#9CA3AF", padding:"20px 0" }}>No inventory items</p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[...lowStock,...okStock].map(item => {
              const pctFull = Math.min((item.current_stock / Math.max(item.reorder_threshold * 2, 1)) * 100, 100);
              const isCrit  = item.current_stock === 0;
              const isLow   = item.below_reorder;
              return (
                <div key={item.inventory_item_id} style={{ display:"flex", alignItems:"center", gap:14,
                  padding:"10px 14px", background:isLow?"#FFF7ED":"#F9FAFB", borderRadius:10,
                  border:`1px solid ${isLow?"#FED7AA":"#F0F0F0"}` }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:isCrit?"#DC2626":isLow?"#92400E":"#111827" }}>
                        {item.item_name}
                      </span>
                      <span style={{ fontSize:13, fontWeight:700, fontVariantNumeric:"tabular-nums",
                        color:isCrit?"#DC2626":isLow?"#D97706":"#374151" }}>
                        {item.current_stock} {item.unit}
                      </span>
                    </div>
                    <div style={{ height:6, background:"#E5E7EB", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:3,
                        background:isCrit?"#DC2626":isLow?"#F59E0B":"#059669",
                        width:`${Math.max(pctFull,2)}%`, transition:"width 0.3s" }}/>
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <p style={{ fontSize:10, color:"#9CA3AF", margin:"0 0 2px", fontWeight:600, textTransform:"uppercase" }}>Reorder at</p>
                    <p style={{ fontSize:12, fontWeight:600, margin:0 }}>{item.reorder_threshold} {item.unit}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ROOT COMPONENT
// ─────────────────────────────────────────────────────────────
export default function Analytics() {
  const { user }   = useAuth();
  const orgId      = user?.org_id;  
  const isSA       = user?.role === "super_admin";

  // Date range — default last 7 days
  const [from, setFrom] = useState(() => { const d=new Date(); d.setDate(d.getDate()-6); d.setHours(0,0,0,0); return d; });
  const [to,   setTo]   = useState(() => new Date());

  const [tab,      setTab]      = useState("overview");
  const [branchId, setBranchId] = useState(null);

  const { data:branches=[] } = useQuery({
    queryKey:["branches", orgId],
    queryFn:()=>getBranches(orgId).then(r=>r.data),
    enabled:!!orgId,
  });

  // Set default branch on load
  React.useEffect(()=>{
    if (branches.length && !branchId) setBranchId(branches.length > 1 ? "all" : branches[0]?.id);
  },[branches]);

  const activeBranch = branchId === "all" ? null : branches.find(b=>b.id===branchId);

  return (
    <div style={{ padding:"20px 24px", maxWidth:1200, margin:"0 auto" }}>

      {/* Page header */}
      <div style={{ marginBottom:20, display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#111827", margin:0 }}>Analytics</h1>
          <p style={{ fontSize:13, color:"#6B7280", margin:"4px 0 0" }}>
            {activeBranch ? activeBranch.name : "All Branches"} ·{" "}
            {from && to ? `${fmtDate(from)} – ${fmtDate(to)}` : "All time"}
          </p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {/* Branch selector */}
          <select
            value={branchId||""}
            onChange={e=>setBranchId(e.target.value)}
            style={{ padding:"8px 12px", border:"1.5px solid #E5E7EB", borderRadius:9,
              fontSize:13, color:"#111827", background:"#fff", cursor:"pointer", outline:"none" }}
          >
            {branches.length > 1 && <option value="all">All Branches</option>}
            {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <DateRangePicker from={from} to={to} onApply={(f,t)=>{ setFrom(f); setTo(t); }}/>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, borderBottom:"2px solid #F0F0F0", marginBottom:24, overflowX:"auto" }}>
        {TABS.map(t=>{
          const Icon = t.icon;
          const active = tab===t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              display:"flex", alignItems:"center", gap:6,
              padding:"10px 16px", border:"none", background:"none",
              borderBottom: active ? "2px solid #1a56db" : "2px solid transparent",
              marginBottom:-2,
              color: active ? "#1a56db" : "#6B7280",
              fontSize:13, fontWeight: active ? 700 : 500,
              cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s",
            }}>
              <Icon size={13}/>{t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "overview"   && <OverviewTab   branchId={branchId} orgId={orgId} from={from} to={to} allBranches={branches}/>}
      {tab === "revenue"    && <RevenueTab    branchId={branchId} from={from} to={to}/>}
      {tab === "items"      && <ItemsTab      branchId={branchId} from={from} to={to}/>}
      {tab === "tellers"    && <TellersTab    branchId={branchId} from={from} to={to}/>}
      {tab === "shifts"     && <ShiftsTab     branchId={branchId} from={from} to={to}/>}
      {tab === "inventory"  && <InventoryTab  branchId={branchId} from={from} to={to}/>}
    </div>
  );
}
