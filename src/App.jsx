import { useState, useEffect, useMemo, useRef } from "react";

// ============================================================
// FERIADOS
// ============================================================
const HOLIDAYS_AR_2026 = [
  {date:"2026-01-01",name:"Año Nuevo"},{date:"2026-02-16",name:"Carnaval"},{date:"2026-02-17",name:"Carnaval"},
  {date:"2026-03-23",name:"Fines turísticos"},{date:"2026-03-24",name:"Día de la Memoria"},
  {date:"2026-04-02",name:"Malvinas"},{date:"2026-04-03",name:"Viernes Santo"},
  {date:"2026-05-01",name:"Día del Trabajador"},{date:"2026-05-25",name:"Revolución de Mayo"},
  {date:"2026-06-15",name:"Güemes"},{date:"2026-07-09",name:"Independencia"},{date:"2026-07-10",name:"Fines turísticos"},
  {date:"2026-08-17",name:"San Martín"},{date:"2026-10-12",name:"Diversidad Cultural"},
  {date:"2026-11-06",name:"Día del Bancario"},{date:"2026-11-23",name:"Soberanía Nacional"},
  {date:"2026-12-07",name:"Fines turísticos"},{date:"2026-12-08",name:"Inmaculada Concepción"},
  {date:"2026-12-24",name:"Nochebuena"},{date:"2026-12-25",name:"Navidad"},{date:"2026-12-31",name:"Sin trading"},
];
const HOLIDAYS_US_2026 = [
  {date:"2026-01-01",name:"New Year's Day"},{date:"2026-01-19",name:"MLK Jr. Day"},
  {date:"2026-02-16",name:"Presidents' Day"},{date:"2026-04-03",name:"Good Friday"},
  {date:"2026-05-25",name:"Memorial Day"},{date:"2026-06-19",name:"Juneteenth"},
  {date:"2026-07-03",name:"Independence Day (observed)"},{date:"2026-09-07",name:"Labor Day"},
  {date:"2026-11-26",name:"Thanksgiving Day"},{date:"2026-12-25",name:"Christmas Day"},
];
const EARLY_CLOSE_US_2026 = [
  {date:"2026-11-27",name:"Day after Thanksgiving (early close 1pm)"},
  {date:"2026-12-24",name:"Christmas Eve (early close 1pm)"},
];
const AR_HOLIDAY_MAP = new Map(HOLIDAYS_AR_2026.map(h=>[h.date,h.name]));
const US_HOLIDAY_MAP = new Map(HOLIDAYS_US_2026.map(h=>[h.date,h.name]));
const US_EARLY_MAP = new Map(EARLY_CLOSE_US_2026.map(h=>[h.date,h.name]));

function isBusinessDay(ds){const d=new Date(ds+"T12:00:00");const day=d.getDay();if(day===0||day===6)return false;return !AR_HOLIDAY_MAP.has(ds);}
function isUSHoliday(ds){return US_HOLIDAY_MAP.has(ds);}
function getNextBusinessDay(ds){let d=new Date(ds+"T12:00:00");do{d.setDate(d.getDate()+1);}while(!isBusinessDay(fmtD(d)));return fmtD(d);}
function fmtD(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function fmtDD(ds){if(!ds)return"";const[y,m,d]=ds.split("-");return d+"/"+m+"/"+y;}
function isAfterMarketHours(){
  // Argentina is UTC-3. Market closes at 17:00 AR time.
  const now=new Date();const utcH=now.getUTCHours();const arH=((utcH-3)+24)%24;
  return arH>=17;
}
function getUpcomingUS(ds,n=7){
  const base=new Date(ds+"T12:00:00"),r=[];
  for(const h of[...HOLIDAYS_US_2026,...EARLY_CLOSE_US_2026]){const dd=Math.ceil((new Date(h.date+"T12:00:00")-base)/864e5);if(dd>0&&dd<=n)r.push({...h,daysAway:dd});}
  return r.sort((a,b)=>a.daysAway-b.daysAway);
}

// Format integer with dots as thousands
function fmtNum(n){
  if(n===null||n===undefined||n==="")return"";
  const num=typeof n==="number"?n:parseInt(String(n).replace(/\./g,""),10);
  if(isNaN(num))return"";
  const neg=num<0;
  const abs=Math.abs(num);
  const s=String(abs).replace(/\B(?=(\d{3})+(?!\d))/g,".");
  return neg?"-"+s:s;
}
function parseNumStr(s){return parseInt(String(s).replace(/\./g,"").replace(/[^0-9-]/g,""),10)||0;}
function fmtMoney(n){
  if(n===null||n===undefined)return"\u2014";
  const neg=n<0;
  const abs=Math.abs(n);
  const parts=abs.toFixed(2).split(".");
  const intPart=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,".");
  const formatted=intPart+","+parts[1];
  return(neg?"-":"+")+"$"+formatted;
}

// ============================================================
// INITIAL INSTRUMENTS
// ============================================================
const INIT_INST = {
  Bonares:[
    {ticker:"AL29",currency:"ARS"},{ticker:"AL29D",currency:"MEP"},{ticker:"AL29C",currency:"CCL"},
    {ticker:"AL30",currency:"ARS"},{ticker:"AL30D",currency:"MEP"},{ticker:"AL30C",currency:"CCL"},
    {ticker:"AL35",currency:"ARS"},{ticker:"AL35D",currency:"MEP"},{ticker:"AL35C",currency:"CCL"},
    {ticker:"AL41",currency:"ARS"},{ticker:"AL41D",currency:"MEP"},{ticker:"AL41C",currency:"CCL"},
  ],
  Globales:[
    {ticker:"GD29",currency:"ARS"},{ticker:"GD29D",currency:"MEP"},{ticker:"GD29C",currency:"CCL"},
    {ticker:"GD30",currency:"ARS"},{ticker:"GD30D",currency:"MEP"},{ticker:"GD30C",currency:"CCL"},
    {ticker:"GD35",currency:"ARS"},{ticker:"GD35D",currency:"MEP"},{ticker:"GD35C",currency:"CCL"},
    {ticker:"GD38",currency:"ARS"},{ticker:"GD38D",currency:"MEP"},{ticker:"GD38C",currency:"CCL"},
    {ticker:"GD41",currency:"ARS"},{ticker:"GD41D",currency:"MEP"},{ticker:"GD41C",currency:"CCL"},
    {ticker:"GD46",currency:"ARS"},{ticker:"GD46D",currency:"MEP"},{ticker:"GD46C",currency:"CCL"},
  ],
  Bopreales:[{ticker:"BPJ25",currency:"MEP"},{ticker:"BPY26",currency:"MEP"},{ticker:"BPD27",currency:"MEP"},{ticker:"BPOA7",currency:"MEP"},{ticker:"BPOB7",currency:"MEP"},{ticker:"BPOC7",currency:"MEP"}],
  Acciones:[{ticker:"GGAL",currency:"ARS"},{ticker:"YPF",currency:"ARS"},{ticker:"PAMP",currency:"ARS"},{ticker:"BBAR",currency:"ARS"},{ticker:"BMA",currency:"ARS"},{ticker:"TXAR",currency:"ARS"},{ticker:"ALUA",currency:"ARS"},{ticker:"CRES",currency:"ARS"},{ticker:"TECO2",currency:"ARS"},{ticker:"EDN",currency:"ARS"},{ticker:"SUPV",currency:"ARS"},{ticker:"MIRG",currency:"ARS"},{ticker:"COME",currency:"ARS"},{ticker:"TRAN",currency:"ARS"},{ticker:"CEPU",currency:"ARS"},{ticker:"LOMA",currency:"ARS"}],
  Provinciales:[{ticker:"PBA25",currency:"ARS"},{ticker:"CABA2028",currency:"ARS"},{ticker:"CO26",currency:"ARS"},{ticker:"CO26D",currency:"MEP"},{ticker:"CUAP",currency:"ARS"},{ticker:"SF27",currency:"ARS"},{ticker:"SF27D",currency:"MEP"}],
  Monedas:[{ticker:"MEP",currency:"USD"},{ticker:"CCL",currency:"USD"},{ticker:"CANJE",currency:"USD"}],
};

const INIT_TASAS = [
  {date:"2026-01-02",rate:36.48},{date:"2026-01-05",rate:32.89},{date:"2026-01-06",rate:55.86},
  {date:"2026-01-07",rate:38.15},{date:"2026-01-08",rate:31.32},{date:"2026-01-09",rate:29.43},
  {date:"2026-01-12",rate:42.44},{date:"2026-01-13",rate:45.68},{date:"2026-01-14",rate:33.76},
  {date:"2026-01-15",rate:35.49},{date:"2026-01-16",rate:34.73},{date:"2026-01-19",rate:30.82},
  {date:"2026-01-20",rate:30.57},{date:"2026-01-21",rate:35.91},{date:"2026-01-22",rate:31.63},
  {date:"2026-01-23",rate:23.63},{date:"2026-01-26",rate:19.45},{date:"2026-01-27",rate:20.46},
  {date:"2026-01-28",rate:20.26},{date:"2026-01-29",rate:25.75},{date:"2026-01-30",rate:24.98},
  {date:"2026-02-02",rate:41.26},{date:"2026-02-03",rate:33.69},{date:"2026-02-04",rate:27.95},
  {date:"2026-02-05",rate:24.29},{date:"2026-02-06",rate:23.83},{date:"2026-02-09",rate:23.58},
  {date:"2026-02-10",rate:21.95},{date:"2026-02-11",rate:21.89},{date:"2026-02-12",rate:25.16},
  {date:"2026-02-13",rate:33.12},{date:"2026-02-18",rate:33.82},{date:"2026-02-19",rate:40.94},
  {date:"2026-02-20",rate:41.03},{date:"2026-02-23",rate:34.95},{date:"2026-02-24",rate:26.12},
  {date:"2026-02-25",rate:16.01},{date:"2026-02-26",rate:19.77},
];

function loadS(k,f){try{const r=localStorage.getItem(k);return r?JSON.parse(r):f;}catch{return f;}}
function saveS(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){console.warn(e);}}

// ============================================================
// CSV / Excel export helpers
// ============================================================
function downloadCSV(ops,dateLabel){
  const header="Ticker;Tipo;Plazo;Moneda;VN;PX;Monto\n";
  const rows=ops.map(o=>[o.ticker,o.type,"T+"+o.plazo,o.currency||"",o.vn,Number(o.px).toFixed(2).replace(".",","),Number(o.monto).toFixed(2).replace(".",",")].join(";")).join("\n");
  const bom="\uFEFF";// UTF-8 BOM for Excel
  const blob=new Blob([bom+header+rows],{type:"text/csv;charset=utf-8;"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`operaciones_${dateLabel}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadAuditCSV(ops,fromDate,toDate){
  const header="Fecha Concertación;Fecha Liquidación;Ticker;Tipo;Moneda;VN;PX;Monto\n";
  const sorted=[...ops].sort((a,b)=>a.date.localeCompare(b.date));
  const rows=sorted.map(o=>{
    const fConc=fmtDD(o.date);
    const fLiq=o.plazo==="0"?fmtDD(o.date):fmtDD(getNextBusinessDay(o.date));
    return[fConc,fLiq,o.ticker,o.type,o.currency||"",o.vn,Number(o.px).toFixed(2).replace(".",","),Number(o.monto).toFixed(2).replace(".",",")].join(";");
  }).join("\n");
  const bom="\uFEFF";
  const blob=new Blob([bom+header+rows],{type:"text/csv;charset=utf-8;"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`auditoria_${fromDate}_${toDate}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ============================================================
// APP
// ============================================================
export default function App(){
  const[tab,setTab]=useState("dashboard");
  const[instruments,setInstruments]=useState(()=>loadS("i1",INIT_INST));
  const[operations,setOperations]=useState(()=>loadS("o1",[]));
  const[fxOps,setFxOps]=useState(()=>loadS("fx1",[]));
  const[tasas,setTasas]=useState(()=>loadS("tasas1",INIT_TASAS));
  const[bonosVencidos,setBonosVencidos]=useState(()=>loadS("bv1",[]));
  useEffect(()=>{saveS("i1",instruments);},[instruments]);
  useEffect(()=>{saveS("o1",operations);},[operations]);
  useEffect(()=>{saveS("fx1",fxOps);},[fxOps]);
  useEffect(()=>{saveS("tasas1",tasas);},[tasas]);
  useEffect(()=>{saveS("bv1",bonosVencidos);},[bonosVencidos]);
  const allTickers=useMemo(()=>{const l=[];Object.entries(instruments).forEach(([f,its])=>{if(f==="Monedas")return;its.forEach(i=>l.push({...i,family:f}));});return l;},[instruments]);

  const tabs=[
    {id:"dashboard",label:"Dashboard",icon:"\u{1F4CA}"},
    {id:"blotter",label:"Blotter",icon:"\u{1F4CB}"},
    {id:"auditoria",label:"Auditoría",icon:"\u{1F50D}"},
    {id:"instrumentos",label:"Base de Instrumentos",icon:"\u{1F5C4}\uFE0F"},
    {id:"posicion",label:"Posición & PNL",icon:"\u{1F4B0}"},
    {id:"mercado",label:"Mercado",icon:"\u{1F4E1}"},
    {id:"tasas",label:"Tasas",icon:"\u{1F4C8}"},
    {id:"precios",label:"Precios",icon:"\u{1F4B0}"},
    {id:"bonosvencidos",label:"Bonos Vencidos",icon:"\u{1F4C5}"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"#0a0e17",color:"#e2e8f0",fontFamily:"'JetBrains Mono','SF Mono','Fira Code',monospace"}}>
      <header style={{background:"linear-gradient(135deg,#0f1724,#1a1f35)",borderBottom:"1px solid rgba(99,179,237,0.15)",padding:"16px 32px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:36,height:36,borderRadius:8,background:"linear-gradient(135deg,#3182ce,#63b3ed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"#0a0e17"}}>F</div>
          <div><div style={{fontSize:16,fontWeight:700,color:"#f7fafc"}}>FinOps Registry</div><div style={{fontSize:10,color:"#718096",letterSpacing:"1.5px",textTransform:"uppercase"}}>Registro de Operaciones & PNL</div></div>
        </div>
        <div style={{fontSize:12,color:"#718096"}}>BYMA 2026</div>
      </header>
      <nav style={{display:"flex",background:"#0d1220",borderBottom:"1px solid rgba(99,179,237,0.1)",padding:"0 24px",overflowX:"auto"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"14px 24px",background:"none",border:"none",borderBottom:tab===t.id?"2px solid #63b3ed":"2px solid transparent",color:tab===t.id?"#f7fafc":"#718096",fontSize:13,fontWeight:tab===t.id?600:400,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}>
            <span style={{fontSize:14}}>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>
      <main style={{padding:"24px 32px",maxWidth:1500,margin:"0 auto"}}>
        {tab==="dashboard"&&<Dashboard operations={operations} fxOps={fxOps}/>}
        {tab==="blotter"&&<Blotter operations={operations} setOperations={setOperations} fxOps={fxOps} setFxOps={setFxOps} allTickers={allTickers}/>}
        {tab==="auditoria"&&<Auditoria operations={operations} fxOps={fxOps}/>}
        {tab==="instrumentos"&&<BaseInstrumentos instruments={instruments} setInstruments={setInstruments}/>}
        {tab==="posicion"&&<PosicionPNL operations={operations} fxOps={fxOps} tasas={tasas} bonosVencidos={bonosVencidos}/>}
        {tab==="mercado"&&<Mercado/>}
        {tab==="tasas"&&<TasasFondeo tasas={tasas} setTasas={setTasas}/>}
        {tab==="precios"&&<PreciosManuales manualPrices={manualPrices} setManualPrices={setManualPrices}/>}
        {tab==="bonosvencidos"&&<BonosVencidos bonosVencidos={bonosVencidos} setBonosVencidos={setBonosVencidos}/>}
      </main>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({operations,fxOps}){
  const today=fmtD(new Date());
  const selDate=isBusinessDay(today)?today:getNextBusinessDay(today);
  const nextBD=getNextBusinessDay(selDate);

  const compute=(ops,fxList)=>{
    const cash={ARS:0,MEP:0,CCL:0};
    const bonds={};
    for(const op of ops){
      const cur=op.currency||"ARS";
      if(cash[cur]!==undefined) cash[cur]+=op.monto;
      const vnDelta=op.type==="COMPRA"?op.vn:-op.vn;
      bonds[op.ticker]=(bonds[op.ticker]||0)+vnDelta;
    }
    // FX impact on cash
    for(const fx of fxList){
      if(fx.ars) cash.ARS+=fx.ars;
      if(fx.usd_mep) cash.MEP+=fx.usd_mep;
      if(fx.usd_cable) cash.CCL+=fx.usd_cable;
    }
    return{cash,bonds};
  };

  // T+0: ops dated today with plazo 0
  const opsT0=operations.filter(o=>o.date===selDate&&o.plazo==="0");
  const fxT0=(fxOps||[]).filter(o=>o.date===selDate&&o.plazo==="0");
  // T+1: ops dated today with plazo 1
  const opsT1=operations.filter(o=>o.date===selDate&&o.plazo==="1");
  const fxT1=(fxOps||[]).filter(o=>o.date===selDate&&o.plazo==="1");
  // Maturity: T+0 + T+1 combined (all of today's ops, both plazos)
  const opsMaturity=operations.filter(o=>o.date===selDate);
  const fxMaturity=(fxOps||[]).filter(o=>o.date===selDate);

  const maturity=compute(opsMaturity,fxMaturity);
  const t0data=compute(opsT0,fxT0);
  const t1data=compute(opsT1,fxT1);

  const usH=US_HOLIDAY_MAP.get(selDate);
  const usE=US_EARLY_MAP.get(selDate);
  const upcoming=getUpcomingUS(selDate,7);

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,flexWrap:"wrap"}}>
        <div style={{fontSize:14,fontWeight:600,color:"#f7fafc"}}>Dashboard — {fmtDD(selDate)}</div>
        {usH&&<Badge color="red" text={"\u{1F1FA}\u{1F1F8} EEUU Holiday: "+usH}/>}
        {usE&&<Badge color="orange" text={"\u{1F1FA}\u{1F1F8} "+usE}/>}
      </div>
      {upcoming.length>0&&(
        <div style={{marginBottom:20,padding:"10px 16px",background:"rgba(245,101,101,0.06)",borderRadius:8,border:"1px solid rgba(245,101,101,0.2)",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:13,color:"#fc8181",fontWeight:700}}>{"\u26A0"} EEUU próximo:</span>
          {upcoming.map(h=><span key={h.date} style={{fontSize:12,color:"#feb2b2",background:"rgba(245,101,101,0.1)",padding:"3px 10px",borderRadius:5,border:"1px solid rgba(245,101,101,0.2)"}}>{"\u{1F1FA}\u{1F1F8}"} {h.name} — {fmtDD(h.date)} ({h.daysAway===1?"mañana":"en "+h.daysAway+" días"})</span>)}
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20}}>
        <ConsolidatedPanel title="Posición a Maturity" subtitle={"Neto del día — "+fmtDD(selDate)} data={maturity} accent="#a78bfa"/>
        <ConsolidatedPanel title="Liquidación T+0" subtitle={fmtDD(selDate)} data={t0data} accent="#63b3ed"/>
        <ConsolidatedPanel title="Liquidación T+1" subtitle={fmtDD(nextBD)} data={t1data} accent="#ed8936"/>
      </div>
    </div>
  );
}

function ConsolidatedPanel({title,subtitle,data,accent}){
  const{cash,bonds}=data;
  const bondEntries=Object.entries(bonds).filter(([,v])=>v!==0).sort((a,b)=>a[0].localeCompare(b[0]));
  return(
    <div style={{background:"#111827",borderRadius:12,border:"1px solid rgba(99,179,237,0.1)",overflow:"hidden"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(99,179,237,0.1)",background:"rgba(0,0,0,0.2)"}}>
        <div style={{fontSize:14,fontWeight:700,color:accent}}>{title}</div>
        <div style={{fontSize:11,color:"#718096",marginTop:2}}>{subtitle}</div>
      </div>
      <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(99,179,237,0.06)"}}>
        <div style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"1.2px",color:"#718096",marginBottom:10}}>Posición Cash</div>
        {[["ARS","#63b3ed"],["MEP","#68d391"],["CCL","#ed8936"]].map(([cur,col])=>(
          <div key={cur} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(99,179,237,0.04)"}}>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:4,fontWeight:700,background:cur==="ARS"?"rgba(99,179,237,0.12)":cur==="MEP"?"rgba(72,187,120,0.12)":"rgba(237,137,54,0.12)",color:col}}>{cur}</span>
            <div style={{fontSize:14,fontWeight:600,fontVariantNumeric:"tabular-nums",color:cash[cur]===0?"#4a5568":cash[cur]>0?"#68d391":"#fc8181"}}>
              {cash[cur]===0?"$0,00":fmtMoney(cash[cur])}
            </div>
          </div>
        ))}
      </div>
      <div style={{padding:"16px 20px",minHeight:60}}>
        <div style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"1.2px",color:"#718096",marginBottom:10}}>Posición Títulos (VN)</div>
        {bondEntries.length===0?(
          <div style={{fontSize:12,color:"#4a5568",padding:"8px 0"}}>Sin movimientos</div>
        ):bondEntries.map(([ticker,vnVal])=>(
          <div key={ticker} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid rgba(99,179,237,0.04)"}}>
            <span style={{fontSize:12,fontWeight:600,color:"#f7fafc"}}>{ticker}</span>
            <span style={{fontSize:13,fontWeight:600,fontVariantNumeric:"tabular-nums",color:vnVal>0?"#68d391":"#fc8181"}}>
              {vnVal>0?"+":""}{fmtNum(vnVal)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Badge({color,text}){
  const colors={red:{bg:"rgba(245,101,101,0.12)",border:"rgba(245,101,101,0.3)",text:"#fc8181"},orange:{bg:"rgba(237,137,54,0.12)",border:"rgba(237,137,54,0.3)",text:"#ed8936"}};
  const c=colors[color]||{bg:"rgba(99,179,237,0.12)",border:"rgba(99,179,237,0.3)",text:"#63b3ed"};
  return <div style={{fontSize:12,padding:"6px 12px",borderRadius:6,background:c.bg,color:c.text,border:"1px solid "+c.border,fontWeight:500,whiteSpace:"nowrap"}}>{text}</div>;
}

// ============================================================
// BLOTTER — Wrapper with Títulos / FX sub-tabs
// ============================================================
function Blotter({operations,setOperations,fxOps,setFxOps,allTickers}){
  const[subTab,setSubTab]=useState("titulos");
  const btnStyle=(active)=>({padding:"8px 20px",borderRadius:6,border:active?"1px solid #3182ce":"1px solid rgba(99,179,237,0.15)",background:active?"rgba(49,130,206,0.15)":"transparent",color:active?"#63b3ed":"#a0aec0",fontWeight:active?600:400,fontSize:12,cursor:"pointer",fontFamily:"inherit"});
  return(
    <div>
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        <button onClick={()=>setSubTab("titulos")} style={btnStyle(subTab==="titulos")}>Títulos</button>
        <button onClick={()=>setSubTab("fx")} style={btnStyle(subTab==="fx")}>FX (MEP / Cable / Canje)</button>
      </div>
      {subTab==="titulos"&&<RegistroOps operations={operations} setOperations={setOperations} allTickers={allTickers}/>}
      {subTab==="fx"&&<RegistroFX fxOps={fxOps} setFxOps={setFxOps}/>}
    </div>
  );
}

// ============================================================
// REGISTRO FX — MEP, Cable (CCL), Canje
// ============================================================
function RegistroFX({fxOps,setFxOps}){
  const today=fmtD(new Date());
  const[selDate,setSelDate]=useState(()=>isBusinessDay(today)?today:getNextBusinessDay(today));
  const[fxType,setFxType]=useState("MEP");// MEP | CCL | CANJE
  const[tipo,setTipo]=useState("COMPRA");
  const[plazo,setPlazo]=useState("0");
  const[vnRaw,setVnRaw]=useState("");
  const[pxRaw,setPxRaw]=useState("");

  const isToday=selDate===today;
  const filtered=useMemo(()=>fxOps.filter(o=>o.date===selDate),[fxOps,selDate]);

  const pxNum=useMemo(()=>{
    if(!pxRaw)return 0;
    const clean=pxRaw.replace(/\./g,"").replace(",",".");
    return parseFloat(clean)||0;
  },[pxRaw]);

  const vnNum=vnRaw?parseInt(vnRaw,10):0;

  // Calculate montos
  const montos=useMemo(()=>{
    if(!vnRaw||!pxRaw||vnNum<=0||pxNum<=0)return null;
    if(fxType==="MEP"){
      // VN=USD, PX=tipo cambio, Monto ARS = VN*PX
      const ars=vnNum*pxNum;
      return tipo==="COMPRA"
        ?{usd_mep:vnNum,ars:-ars}
        :{usd_mep:-vnNum,ars:ars};
    }
    if(fxType==="CCL"){
      const ars=vnNum*pxNum;
      return tipo==="COMPRA"
        ?{usd_cable:vnNum,ars:-ars}
        :{usd_cable:-vnNum,ars:ars};
    }
    if(fxType==="CANJE"){
      // VN=cables, PX=%, Compra: +cables -MEP(VN*(1+PX/100))
      const mepAmount=vnNum*(1+pxNum/100);
      return tipo==="COMPRA"
        ?{usd_cable:vnNum,usd_mep:-mepAmount}
        :{usd_cable:-vnNum,usd_mep:mepAmount};
    }
    return null;
  },[vnRaw,pxRaw,vnNum,pxNum,fxType,tipo]);

  const handleVnChange=(e)=>setVnRaw(e.target.value.replace(/[^0-9]/g,""));
  const handlePxChange=(e)=>{
    let v=e.target.value.replace(/[^0-9,]/g,"");
    const parts=v.split(",");
    if(parts.length>2)v=parts[0]+","+parts.slice(1).join("");
    if(parts.length===2&&parts[1].length>2)v=parts[0]+","+parts[1].slice(0,2);
    const intPart=parts[0].replace(/^0+(?=\d)/,"");
    const formatted=intPart.replace(/\B(?=(\d{3})+(?!\d))/g,".");
    setPxRaw(parts.length===2?formatted+","+parts[1]:formatted);
  };

  const trySubmit=()=>{
    if(!vnRaw||!pxRaw||vnNum<=0||pxNum<=0||!montos)return;
    const op={id:Date.now().toString(),date:selDate,fxType,tipo,plazo,vn:vnNum,px:pxNum,...montos};
    if(!isToday){
      if(!window.confirm(`Registrar FX en ${fmtDD(selDate)}?`))return;
    }
    setFxOps(p=>[...p,op]);
    setVnRaw("");setPxRaw("");
  };

  const removeOp=(id)=>{
    if(!isToday&&!window.confirm("Eliminar operación FX de otra fecha?"))return;
    setFxOps(p=>p.filter(o=>o.id!==id));
  };

  const vnDisplay=vnRaw?fmtNum(parseInt(vnRaw,10)):"";
  const iS={padding:"8px 10px",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:"#f7fafc",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"};

  return(
    <div>
      {/* Date row */}
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <label style={{fontSize:12,color:"#a0aec0",textTransform:"uppercase",letterSpacing:"1px"}}>Fecha</label>
          <div style={{borderRadius:10,border:isToday?"2px solid #48bb78":"2px solid #fc8181",padding:1}}>
            <DatePicker value={selDate} onChange={setSelDate}/>
          </div>
        </div>
      </div>

      {/* FX Type selector */}
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {["MEP","CCL","CANJE"].map(t=>(
          <button key={t} onClick={()=>setFxType(t)} style={{padding:"8px 20px",borderRadius:6,border:fxType===t?"1px solid #3182ce":"1px solid rgba(99,179,237,0.15)",background:fxType===t?"rgba(49,130,206,0.15)":"transparent",color:fxType===t?"#63b3ed":"#a0aec0",fontWeight:fxType===t?600:400,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{t==="CCL"?"Cable":t}</button>
        ))}
      </div>

      {/* Operations table */}
      <div style={{background:"#111827",borderRadius:12,border:"1px solid rgba(99,179,237,0.1)"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(99,179,237,0.1)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:14,fontWeight:600}}>FX — {fxType==="CCL"?"Cable":fxType} — {fmtDD(selDate)}</div>
          <div style={{fontSize:12,color:"#718096"}}>{filtered.filter(o=>o.fxType===fxType).length} registros</div>
        </div>

        {/* Header */}
        {fxType!=="CANJE"?(
          <div style={{display:"grid",gridTemplateColumns:"100px 80px 120px 140px 180px 50px",padding:"10px 20px",background:"#0d1220",borderBottom:"1px solid rgba(99,179,237,0.08)",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"1.2px",color:"#718096"}}>
            <div>Tipo</div><div>Plazo</div><div style={{textAlign:"right"}}>VN (USD)</div><div style={{textAlign:"right"}}>PX (TC)</div><div style={{textAlign:"right"}}>Monto ARS</div><div></div>
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"100px 80px 120px 120px 160px 160px 50px",padding:"10px 20px",background:"#0d1220",borderBottom:"1px solid rgba(99,179,237,0.08)",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"1.2px",color:"#718096"}}>
            <div>Tipo</div><div>Plazo</div><div style={{textAlign:"right"}}>VN (Cable)</div><div style={{textAlign:"right"}}>PX (%)</div><div style={{textAlign:"right"}}>Cable</div><div style={{textAlign:"right"}}>MEP</div><div></div>
          </div>
        )}

        {/* Existing ops */}
        {filtered.filter(o=>o.fxType===fxType).map(op=>{
          const isC=op.tipo==="COMPRA";
          if(fxType!=="CANJE"){
            const arsVal=op.ars||0;
            const usdVal=fxType==="MEP"?(op.usd_mep||0):(op.usd_cable||0);
            return(
              <div key={op.id} style={{display:"grid",gridTemplateColumns:"100px 80px 120px 140px 180px 50px",padding:"12px 20px",borderBottom:"1px solid rgba(99,179,237,0.05)",alignItems:"center",fontSize:13}}>
                <div><span style={{padding:"3px 10px",borderRadius:4,fontSize:11,fontWeight:600,background:isC?"rgba(72,187,120,0.15)":"rgba(245,101,101,0.15)",color:isC?"#68d391":"#fc8181"}}>{op.tipo}</span></div>
                <div style={{color:"#a0aec0"}}>T+{op.plazo}</div>
                <div style={{textAlign:"right"}}>{fmtNum(Math.abs(usdVal))}</div>
                <div style={{textAlign:"right"}}>{Number(op.px).toFixed(2)}</div>
                <div style={{textAlign:"right",fontWeight:600,color:arsVal>=0?"#68d391":"#fc8181"}}>{fmtMoney(arsVal)}</div>
                <div style={{textAlign:"center"}}><button onClick={()=>removeOp(op.id)} style={{background:"none",border:"none",color:"#718096",cursor:"pointer",fontSize:14,padding:4}}>{"\u2715"}</button></div>
              </div>
            );
          }else{
            return(
              <div key={op.id} style={{display:"grid",gridTemplateColumns:"100px 80px 120px 120px 160px 160px 50px",padding:"12px 20px",borderBottom:"1px solid rgba(99,179,237,0.05)",alignItems:"center",fontSize:13}}>
                <div><span style={{padding:"3px 10px",borderRadius:4,fontSize:11,fontWeight:600,background:isC?"rgba(72,187,120,0.15)":"rgba(245,101,101,0.15)",color:isC?"#68d391":"#fc8181"}}>{op.tipo}</span></div>
                <div style={{color:"#a0aec0"}}>T+{op.plazo}</div>
                <div style={{textAlign:"right"}}>{fmtNum(op.vn)}</div>
                <div style={{textAlign:"right"}}>{Number(op.px).toFixed(2)}%</div>
                <div style={{textAlign:"right",fontWeight:600,color:(op.usd_cable||0)>=0?"#68d391":"#fc8181"}}>{fmtNum(Math.round(op.usd_cable||0))} USD</div>
                <div style={{textAlign:"right",fontWeight:600,color:(op.usd_mep||0)>=0?"#68d391":"#fc8181"}}>{fmtNum(Math.round(op.usd_mep||0))} USD</div>
                <div style={{textAlign:"center"}}><button onClick={()=>removeOp(op.id)} style={{background:"none",border:"none",color:"#718096",cursor:"pointer",fontSize:14,padding:4}}>{"\u2715"}</button></div>
              </div>
            );
          }
        })}

        {/* New op input row */}
        {fxType!=="CANJE"?(
          <div style={{display:"grid",gridTemplateColumns:"100px 80px 120px 140px 180px 50px",gap:8,padding:"12px 20px",borderTop:"1px solid rgba(99,179,237,0.1)",background:"rgba(99,179,237,0.02)",alignItems:"center"}}>
            <div style={{display:"flex",gap:2}}>
              {["COMPRA","VENTA"].map(t=>{const isC=t==="COMPRA",act=tipo===t;return(
                <button key={t} onClick={()=>setTipo(t)} style={{flex:1,padding:"8px 4px",borderRadius:isC?"6px 0 0 6px":"0 6px 6px 0",border:"1px solid",borderColor:act?(isC?"rgba(72,187,120,0.4)":"rgba(245,101,101,0.4)"):"rgba(99,179,237,0.15)",background:act?(isC?"rgba(72,187,120,0.15)":"rgba(245,101,101,0.15)"):"#1a2332",color:act?(isC?"#68d391":"#fc8181"):"#718096",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{isC?"C":"V"}</button>
              );})}
            </div>
            <div style={{display:"flex",gap:2}}>
              {["0","1"].map(p=>(
                <button key={p} onClick={()=>setPlazo(p)} style={{flex:1,padding:"8px 4px",borderRadius:p==="0"?"6px 0 0 6px":"0 6px 6px 0",border:"1px solid",borderColor:plazo===p?"rgba(99,179,237,0.4)":"rgba(99,179,237,0.15)",background:plazo===p?"rgba(99,179,237,0.15)":"#1a2332",color:plazo===p?"#63b3ed":"#718096",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>T+{p}</button>
              ))}
            </div>
            <input type="text" inputMode="numeric" placeholder="USD" value={vnDisplay} onChange={handleVnChange} onKeyDown={e=>e.key==="Enter"&&trySubmit()} style={{...iS,textAlign:"right"}} autoComplete="off"/>
            <input type="text" inputMode="decimal" placeholder="TC" value={pxRaw} onChange={handlePxChange} onKeyDown={e=>e.key==="Enter"&&trySubmit()} style={{...iS,textAlign:"right"}} autoComplete="off"/>
            <div style={{textAlign:"right",fontSize:13,fontWeight:600,color:montos?.ars==null?"#4a5568":montos.ars>=0?"#68d391":"#fc8181"}}>
              {montos?.ars!=null?fmtMoney(montos.ars):"\u2014"}
            </div>
            <div style={{textAlign:"center"}}>
              <button onClick={trySubmit} disabled={!montos} style={{background:montos?"linear-gradient(135deg,#3182ce,#63b3ed)":"#2d3748",border:"none",borderRadius:6,color:montos?"#fff":"#4a5568",cursor:montos?"pointer":"not-allowed",padding:"7px 10px",fontSize:14,fontWeight:700,fontFamily:"inherit"}}>+</button>
            </div>
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"100px 80px 120px 120px 160px 160px 50px",gap:8,padding:"12px 20px",borderTop:"1px solid rgba(99,179,237,0.1)",background:"rgba(99,179,237,0.02)",alignItems:"center"}}>
            <div style={{display:"flex",gap:2}}>
              {["COMPRA","VENTA"].map(t=>{const isC=t==="COMPRA",act=tipo===t;return(
                <button key={t} onClick={()=>setTipo(t)} style={{flex:1,padding:"8px 4px",borderRadius:isC?"6px 0 0 6px":"0 6px 6px 0",border:"1px solid",borderColor:act?(isC?"rgba(72,187,120,0.4)":"rgba(245,101,101,0.4)"):"rgba(99,179,237,0.15)",background:act?(isC?"rgba(72,187,120,0.15)":"rgba(245,101,101,0.15)"):"#1a2332",color:act?(isC?"#68d391":"#fc8181"):"#718096",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{isC?"C":"V"}</button>
              );})}
            </div>
            <div style={{display:"flex",gap:2}}>
              {["0","1"].map(p=>(
                <button key={p} onClick={()=>setPlazo(p)} style={{flex:1,padding:"8px 4px",borderRadius:p==="0"?"6px 0 0 6px":"0 6px 6px 0",border:"1px solid",borderColor:plazo===p?"rgba(99,179,237,0.4)":"rgba(99,179,237,0.15)",background:plazo===p?"rgba(99,179,237,0.15)":"#1a2332",color:plazo===p?"#63b3ed":"#718096",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>T+{p}</button>
              ))}
            </div>
            <input type="text" inputMode="numeric" placeholder="VN Cable" value={vnDisplay} onChange={handleVnChange} onKeyDown={e=>e.key==="Enter"&&trySubmit()} style={{...iS,textAlign:"right"}} autoComplete="off"/>
            <input type="text" inputMode="decimal" placeholder="%" value={pxRaw} onChange={handlePxChange} onKeyDown={e=>e.key==="Enter"&&trySubmit()} style={{...iS,textAlign:"right"}} autoComplete="off"/>
            <div style={{textAlign:"right",fontSize:12,fontWeight:600,color:montos?.usd_cable==null?"#4a5568":(montos.usd_cable>=0?"#68d391":"#fc8181")}}>
              {montos?.usd_cable!=null?fmtNum(Math.round(montos.usd_cable))+" USD":"\u2014"}
            </div>
            <div style={{textAlign:"right",fontSize:12,fontWeight:600,color:montos?.usd_mep==null?"#4a5568":(montos.usd_mep>=0?"#68d391":"#fc8181")}}>
              {montos?.usd_mep!=null?fmtNum(Math.round(montos.usd_mep))+" USD":"\u2014"}
            </div>
            <div style={{textAlign:"center"}}>
              <button onClick={trySubmit} disabled={!montos} style={{background:montos?"linear-gradient(135deg,#3182ce,#63b3ed)":"#2d3748",border:"none",borderRadius:6,color:montos?"#fff":"#4a5568",cursor:montos?"pointer":"not-allowed",padding:"7px 10px",fontSize:14,fontWeight:700,fontFamily:"inherit"}}>+</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// REGISTRO OPERACIONES (Títulos)
// ============================================================
function RegistroOps({operations,setOperations,allTickers}){
  const today=fmtD(new Date());
  const[selDate,setSelDate]=useState(()=>isBusinessDay(today)?today:getNextBusinessDay(today));
  const[showAlert,setShowAlert]=useState(true);
  const[confirmPending,setConfirmPending]=useState(null);// {op} waiting confirm
  const filtered=useMemo(()=>operations.filter(o=>o.date===selDate),[operations,selDate]);

  const isToday=selDate===today;

  // Calculate days difference
  const daysDiff=useMemo(()=>{
    const sel=new Date(selDate+"T12:00:00");
    const tod=new Date(today+"T12:00:00");
    return Math.round((tod-sel)/86400000);
  },[selDate,today]);

  const daysDiffLabel=useMemo(()=>{
    if(daysDiff===0)return null;
    const abs=Math.abs(daysDiff);
    if(daysDiff>0)return abs===1?"1 día atrás":abs+" días atrás";
    return abs===1?"1 día adelante":abs+" días adelante";
  },[daysDiff]);

  const addOp=(op)=>{
    if(!isToday){
      setConfirmPending(op);
      return;
    }
    doAddOp(op);
  };
  const doAddOp=(op)=>{
    setOperations(p=>[...p,{...op,id:Date.now().toString()+"-"+Math.random().toString(36).slice(2,6),date:selDate}]);
    setConfirmPending(null);
  };
  const removeOp=(id)=>{
    if(!isToday){
      if(!window.confirm(`Estás eliminando una operación del ${fmtDD(selDate)} (${daysDiffLabel}). ¿Confirmar?`))return;
    }
    setOperations(p=>p.filter(o=>o.id!==id));
  };
  const usH=US_HOLIDAY_MAP.get(selDate),usE=US_EARLY_MAP.get(selDate),upcoming=getUpcomingUS(selDate,7);

  // Slow pulse animation
  const pulseKeyframes=`@keyframes slowPulse{0%,100%{opacity:1}50%{opacity:0.4}}`;

  return(
    <div>
      <style>{pulseKeyframes}</style>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <label style={{fontSize:12,color:"#a0aec0",textTransform:"uppercase",letterSpacing:"1px"}}>Fecha</label>
          {/* Date picker with green/red border */}
          <div style={{borderRadius:10,border:isToday?"2px solid #48bb78":"2px solid #fc8181",padding:1}}>
            <DatePicker value={selDate} onChange={v=>{setSelDate(v);setConfirmPending(null);}}/>
          </div>
        </div>

        {/* Days-ago alert: toggleable, slow pulse when not today */}
        {daysDiffLabel&&showAlert&&(
          <div style={{
            display:"flex",alignItems:"center",gap:8,padding:"6px 14px",
            borderRadius:8,
            background:"rgba(252,129,129,0.08)",border:"1px solid rgba(252,129,129,0.25)",
            animation:"slowPulse 4s ease-in-out infinite",
            cursor:"pointer",
          }} title="Click para ocultar esta alerta" onClick={()=>setShowAlert(false)}>
            <span style={{fontSize:12,fontWeight:600,color:"#fc8181"}}>{daysDiffLabel}</span>
          </div>
        )}
        {daysDiffLabel&&!showAlert&&(
          <button onClick={()=>setShowAlert(true)} style={{fontSize:10,color:"#4a5568",background:"none",border:"1px solid rgba(99,179,237,0.1)",borderRadius:4,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit"}}>
            Mostrar alerta
          </button>
        )}

        {/* Today shortcut when not on today */}
        {!isToday&&isBusinessDay(today)&&(
          <button onClick={()=>{setSelDate(today);setShowAlert(true);}} style={{padding:"6px 14px",borderRadius:6,border:"1px solid rgba(72,187,120,0.3)",background:"rgba(72,187,120,0.1)",color:"#48bb78",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            Ir a hoy
          </button>
        )}

        {usH&&<Badge color="red" text={"\u{1F1FA}\u{1F1F8} EEUU Holiday: "+usH}/>}
        {usE&&<Badge color="orange" text={"\u{1F1FA}\u{1F1F8} "+usE}/>}
      </div>
      {upcoming.length>0&&(
        <div style={{marginBottom:16,padding:"10px 16px",background:"rgba(245,101,101,0.06)",borderRadius:8,border:"1px solid rgba(245,101,101,0.2)",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:13,color:"#fc8181",fontWeight:700}}>{"\u26A0"} EEUU próximo:</span>
          {upcoming.map(h=><span key={h.date} style={{fontSize:12,color:"#feb2b2",background:"rgba(245,101,101,0.1)",padding:"3px 10px",borderRadius:5,border:"1px solid rgba(245,101,101,0.2)"}}>{"\u{1F1FA}\u{1F1F8}"} {h.name} — {fmtDD(h.date)} ({h.daysAway===1?"mañana":"en "+h.daysAway+" días"})</span>)}
        </div>
      )}

      {/* Confirmation modal for non-today operations */}
      {confirmPending&&(
        <div style={{marginBottom:16,padding:"14px 20px",background:"rgba(246,224,94,0.08)",border:"1px solid rgba(246,224,94,0.25)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>⚠️</span>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#f6e05e"}}>Estás registrando en {fmtDD(selDate)} ({daysDiffLabel})</div>
              <div style={{fontSize:11,color:"#a0aec0"}}>
                {confirmPending.ticker} | {confirmPending.type} | VN {fmtNum(confirmPending.vn)} | PX {Number(confirmPending.px).toFixed(2)}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>doAddOp(confirmPending)} style={{padding:"7px 18px",borderRadius:6,border:"none",background:"#3182ce",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Confirmar</button>
            <button onClick={()=>setConfirmPending(null)} style={{padding:"7px 18px",borderRadius:6,border:"1px solid rgba(99,179,237,0.2)",background:"transparent",color:"#a0aec0",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{background:"#111827",borderRadius:12,border:"1px solid rgba(99,179,237,0.1)",position:"relative"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(99,179,237,0.1)",display:"flex",justifyContent:"space-between",alignItems:"center",borderRadius:"12px 12px 0 0"}}>
          <div style={{fontSize:14,fontWeight:600}}>Operaciones — {fmtDD(selDate)}</div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {filtered.length>0&&(
              <button onClick={()=>downloadCSV(filtered,selDate)} title="Descargar operaciones del día" style={{background:"none",border:"1px solid rgba(99,179,237,0.2)",borderRadius:6,color:"#63b3ed",cursor:"pointer",padding:"4px 10px",fontSize:12,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                ⬇ Excel
              </button>
            )}
            <div style={{fontSize:12,color:"#718096"}}>{filtered.length} registro{filtered.length!==1?"s":""}</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"200px 100px 80px 130px 130px 170px 50px",padding:"10px 20px",background:"#0d1220",borderBottom:"1px solid rgba(99,179,237,0.08)",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"1.2px",color:"#718096"}}>
          <div>Ticker</div><div>Tipo</div><div>Plazo</div><div style={{textAlign:"right"}}>VN</div><div style={{textAlign:"right"}}>PX (base 100)</div><div style={{textAlign:"right"}}>Monto</div><div></div>
        </div>
        {filtered.map(op=><OpRow key={op.id} op={op} onRemove={()=>removeOp(op.id)}/>)}
        <NewOpRow allTickers={allTickers} onAdd={addOp}/>
      </div>
      {filtered.length>0&&(
        <div style={{marginTop:16,padding:"14px 20px",background:"rgba(99,179,237,0.05)",borderRadius:10,border:"1px solid rgba(99,179,237,0.1)",fontSize:12,color:"#a0aec0"}}>
          <span style={{fontWeight:600,color:"#63b3ed"}}>{"\u2139"} Liquidación:</span> T+0 = {fmtDD(selDate)} | T+1 = {fmtDD(getNextBusinessDay(selDate))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DATE PICKER
// ============================================================
function DatePicker({value,onChange}){
  const[open,setOpen]=useState(false);
  const[vm,setVm]=useState(()=>{const d=new Date(value+"T12:00:00");return{y:d.getFullYear(),m:d.getMonth()};});
  const ref=useRef(null);
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  const dim=new Date(vm.y,vm.m+1,0).getDate();
  const fd=new Date(vm.y,vm.m,1).getDay();
  const days=[];for(let i=0;i<(fd===0?6:fd-1);i++)days.push(null);for(let i=1;i<=dim;i++)days.push(i);
  const mn=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return(
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={()=>setOpen(!open)} style={{padding:"8px 16px",background:"#1a2332",border:"1px solid rgba(99,179,237,0.2)",borderRadius:8,color:"#f7fafc",fontSize:14,fontFamily:"inherit",cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
        {"\u{1F4C5}"} {fmtDD(value)} <span style={{fontSize:10,color:"#718096"}}>{"\u25BC"}</span>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 8px)",left:0,zIndex:1000,background:"#1a2332",border:"1px solid rgba(99,179,237,0.2)",borderRadius:12,padding:16,boxShadow:"0 20px 60px rgba(0,0,0,0.5)",width:310}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <button onClick={()=>setVm(v=>v.m===0?{y:v.y-1,m:11}:{...v,m:v.m-1})} style={cnb}>{"\u25C0"}</button>
            <div style={{fontSize:14,fontWeight:600,color:"#e2e8f0"}}>{mn[vm.m]} {vm.y}</div>
            <button onClick={()=>setVm(v=>v.m===11?{y:v.y+1,m:0}:{...v,m:v.m+1})} style={cnb}>{"\u25B6"}</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
            {["Lu","Ma","Mi","Ju","Vi","Sá","Do"].map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:"#718096",padding:"4px 0",fontWeight:600}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
            {days.map((day,i)=>{
              if(!day)return <div key={"e"+i}/>;
              const ds=vm.y+"-"+String(vm.m+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
              const bd=isBusinessDay(ds),ush=isUSHoliday(ds),sel=ds===value,td=ds===fmtD(new Date());
              const tips=[];if(AR_HOLIDAY_MAP.has(ds))tips.push("AR: "+AR_HOLIDAY_MAP.get(ds));if(US_HOLIDAY_MAP.has(ds))tips.push("US: "+US_HOLIDAY_MAP.get(ds));if(US_EARLY_MAP.has(ds))tips.push("US: "+US_EARLY_MAP.get(ds));
              return(
                <button key={ds} onClick={()=>{if(bd){onChange(ds);setOpen(false);}}} title={tips.join(" | ")} style={{
                  padding:"7px 0",fontSize:12,fontFamily:"inherit",
                  border:td?"1px solid rgba(99,179,237,0.4)":"1px solid transparent",borderRadius:6,
                  background:sel?"#3182ce":ush&&bd?"rgba(237,137,54,0.08)":"transparent",
                  color:sel?"#fff":!bd?"#4a5568":ush?"#ed8936":"#e2e8f0",
                  cursor:bd?"pointer":"not-allowed",opacity:bd?1:0.4,
                  fontWeight:sel?700:400,textDecoration:!bd?"line-through":"none",position:"relative",
                }}>
                  {day}
                  {ush&&bd&&!sel&&<span style={{position:"absolute",bottom:1,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:"#ed8936"}}/>}
                </button>
              );
            })}
          </div>
          <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(99,179,237,0.1)",display:"flex",gap:14,fontSize:10,color:"#718096"}}>
            <span><span style={{color:"#4a5568",textDecoration:"line-through"}}>00</span> Feriado AR</span>
            <span><span style={{color:"#ed8936"}}>00</span> Feriado EEUU</span>
          </div>
        </div>
      )}
    </div>
  );
}
const cnb={background:"rgba(99,179,237,0.1)",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:"#63b3ed",cursor:"pointer",padding:"4px 10px",fontSize:11,fontFamily:"inherit"};

// ============================================================
// OPERATION ROW
// ============================================================
function OpRow({op,onRemove}){
  const isC=op.type==="COMPRA";
  return(
    <div style={{display:"grid",gridTemplateColumns:"200px 100px 80px 130px 130px 170px 50px",padding:"12px 20px",borderBottom:"1px solid rgba(99,179,237,0.05)",alignItems:"center",fontSize:13}}
      onMouseEnter={e=>{e.currentTarget.style.background="rgba(99,179,237,0.03)";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
      <div style={{fontWeight:600,color:"#f7fafc",display:"flex",alignItems:"center",gap:8}}>
        {op.ticker}
        <span style={{fontSize:9,padding:"1px 5px",borderRadius:3,background:op.currency==="ARS"?"rgba(99,179,237,0.1)":op.currency==="MEP"?"rgba(72,187,120,0.1)":"rgba(237,137,54,0.1)",color:op.currency==="ARS"?"#63b3ed":op.currency==="MEP"?"#68d391":"#ed8936"}}>{op.currency}</span>
      </div>
      <div><span style={{padding:"3px 10px",borderRadius:4,fontSize:11,fontWeight:600,background:isC?"rgba(72,187,120,0.15)":"rgba(245,101,101,0.15)",color:isC?"#68d391":"#fc8181",border:"1px solid "+(isC?"rgba(72,187,120,0.3)":"rgba(245,101,101,0.3)")}}>{op.type}</span></div>
      <div style={{color:"#a0aec0"}}>T+{op.plazo}</div>
      <div style={{textAlign:"right"}}>{fmtNum(op.vn)}</div>
      <div style={{textAlign:"right"}}>{Number(op.px).toFixed(2)}</div>
      <div style={{textAlign:"right",fontWeight:600,color:op.monto>=0?"#68d391":"#fc8181"}}>{fmtMoney(op.monto)}</div>
      <div style={{textAlign:"center"}}><button onClick={onRemove} style={{background:"none",border:"none",color:"#718096",cursor:"pointer",fontSize:14,padding:4,borderRadius:4}}>{"\u2715"}</button></div>
    </div>
  );
}

// ============================================================
// NEW OPERATION ROW
// ============================================================
function NewOpRow({allTickers,onAdd}){
  const[ticker,setTicker]=useState("");
  const[type,setType]=useState("COMPRA");
  const[plazo,setPlazo]=useState("0");
  const[vnRaw,setVnRaw]=useState(""); // raw digits string
  const[pxRaw,setPxRaw]=useState(""); // raw digits string for integer part + decimals
  const[showSug,setShowSug]=useState(false);
  const[sugIdx,setSugIdx]=useState(0);
  const tickerRef=useRef(null);
  const vnRef=useRef(null);

  const suggestions=useMemo(()=>{
    if(!ticker||ticker.length<1)return[];
    const q=ticker.toUpperCase();
    const starts=[],contains=[];
    for(const inst of allTickers){
      const t=inst.ticker.toUpperCase();
      if(t.startsWith(q))starts.push(inst);
      else if(t.includes(q))contains.push(inst);
    }
    return[...starts,...contains].slice(0,5);
  },[ticker,allTickers]);

  // Parse PX: user types digits and optionally a comma/dot for decimals
  // Display with dots for thousands: 1.234,56
  const pxNum=useMemo(()=>{
    if(!pxRaw)return 0;
    const clean=pxRaw.replace(/\./g,"").replace(",",".");
    return parseFloat(clean)||0;
  },[pxRaw]);

  const handlePxChange=(e)=>{
    let v=e.target.value;
    // Convert dot to comma (accept both as decimal sep)
    // But preserve dots used as thousands separator by user
    // Strategy: if there's a dot and no comma, treat last dot as decimal
    v=v.replace(/[^0-9.,]/g,"");
    // If user types a dot, convert to comma (decimal)
    // Replace all dots with empty first, then handle
    const dots=v.split(".").length-1;
    const commas=v.split(",").length-1;
    if(dots>0&&commas===0){
      // User used dot as decimal: replace last dot with comma, remove others
      const lastDot=v.lastIndexOf(".");
      v=v.slice(0,lastDot).replace(/\./g,"")+","+v.slice(lastDot+1);
    }else{
      // Strip dots (thousands), keep comma as decimal
      v=v.replace(/\./g,"");
    }
    // Only one comma allowed
    const parts=v.split(",");
    if(parts.length>2)v=parts[0]+","+parts.slice(1).join("");
    // Limit decimals to 4 (prices like 0,7250)
    if(parts.length===2&&parts[1].length>4)v=parts[0]+","+parts[1].slice(0,4);
    // Format integer part with dots
    const intPart=(parts[0]||"").replace(/^0+(?=\d)/,"");
    const formatted=intPart.replace(/\B(?=(\d{3})+(?!\d))/g,".");
    setPxRaw(parts.length===2?formatted+","+parts[1]:formatted);
  };

  const monto=useMemo(()=>{
    if(!vnRaw||!pxRaw)return null;
    const v=parseInt(vnRaw,10);
    if(isNaN(v)||isNaN(pxNum)||v<=0||pxNum<=0)return null;
    const val=(pxNum/100)*v;
    return type==="COMPRA"?-val:val;
  },[vnRaw,pxRaw,pxNum,type]);

  const pickSug=(inst)=>{setTicker(inst.ticker);setShowSug(false);setSugIdx(0);setTimeout(()=>vnRef.current?.focus(),50);};
  const handleTickerChange=(e)=>{const v=e.target.value.toUpperCase();setTicker(v);setShowSug(v.length>0);setSugIdx(0);};
  const handleTickerKeyDown=(e)=>{
    if(showSug&&suggestions.length>0){
      if(e.key==="ArrowDown"){e.preventDefault();setSugIdx(p=>Math.min(p+1,suggestions.length-1));return;}
      if(e.key==="ArrowUp"){e.preventDefault();setSugIdx(p=>Math.max(p-1,0));return;}
      if(e.key==="Enter"||e.key==="Tab"){e.preventDefault();pickSug(suggestions[sugIdx]);return;}
      if(e.key==="Escape"){setShowSug(false);return;}
    }else if(e.key==="Enter")trySubmit();
  };

  const handleVnChange=(e)=>{
    const raw=e.target.value.replace(/[^0-9]/g,"");
    setVnRaw(raw);
  };

  const trySubmit=()=>{
    if(!ticker||!vnRaw||!pxRaw)return;
    const m=allTickers.find(t=>t.ticker.toUpperCase()===ticker.toUpperCase());
    if(!m)return;
    const v=parseInt(vnRaw,10);
    if(isNaN(v)||isNaN(pxNum)||v<=0||pxNum<=0)return;
    const mc=(pxNum/100)*v;
    onAdd({ticker:m.ticker,type,plazo,vn:v,px:pxNum,monto:type==="COMPRA"?-mc:mc,currency:m.currency});
    setTicker("");setVnRaw("");setPxRaw("");setType("COMPRA");setPlazo("0");tickerRef.current?.focus();
  };

  const iS={padding:"8px 10px",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:"#f7fafc",fontSize:13,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};
  const cColors={ARS:{bg:"rgba(99,179,237,0.15)",color:"#63b3ed"},MEP:{bg:"rgba(72,187,120,0.15)",color:"#68d391"},CCL:{bg:"rgba(237,137,54,0.15)",color:"#ed8936"}};

  // Display VN with dots
  const vnDisplay=vnRaw?fmtNum(parseInt(vnRaw,10)):"";

  return(
    <div style={{display:"grid",gridTemplateColumns:"200px 100px 80px 130px 130px 170px 50px",gap:8,padding:"12px 20px",borderTop:"1px solid rgba(99,179,237,0.1)",background:"rgba(99,179,237,0.02)",alignItems:"center",position:"relative",overflow:"visible",borderRadius:"0 0 12px 12px"}}>
      {/* TICKER */}
      <div style={{position:"relative",overflow:"visible"}}>
        <input ref={tickerRef} type="text" placeholder="Ticker..." value={ticker}
          onChange={handleTickerChange} onFocus={()=>{if(ticker.length>0)setShowSug(true);}}
          onBlur={()=>setTimeout(()=>setShowSug(false),180)} onKeyDown={handleTickerKeyDown}
          style={{...iS,borderColor:showSug&&suggestions.length>0?"rgba(99,179,237,0.4)":"rgba(99,179,237,0.15)"}} autoComplete="off"/>
        {showSug&&suggestions.length>0&&(
          <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,width:280,zIndex:9999,background:"#151e2d",border:"1px solid rgba(99,179,237,0.25)",borderRadius:8,overflow:"hidden",boxShadow:"0 12px 40px rgba(0,0,0,0.6)"}}>
            {suggestions.map((s,idx)=>{
              const c=cColors[s.currency]||cColors.ARS;
              const active=idx===sugIdx;
              const tU=s.ticker.toUpperCase(),qU=ticker.toUpperCase(),mi=tU.indexOf(qU);
              return(
                <div key={s.ticker+"-"+s.family} onMouseDown={e=>{e.preventDefault();pickSug(s);}} onMouseEnter={()=>setSugIdx(idx)}
                  style={{padding:"10px 14px",fontSize:13,cursor:"pointer",background:active?"rgba(99,179,237,0.12)":"transparent",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:idx<suggestions.length-1?"1px solid rgba(99,179,237,0.06)":"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontWeight:600,color:"#f7fafc"}}>
                      {mi>=0?(<>{s.ticker.slice(0,mi)}<span style={{color:"#63b3ed",textDecoration:"underline",textUnderlineOffset:2}}>{s.ticker.slice(mi,mi+qU.length)}</span>{s.ticker.slice(mi+qU.length)}</>):s.ticker}
                    </span>
                    <span style={{fontSize:10,color:"#718096"}}>{s.family}</span>
                  </div>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:c.bg,color:c.color,fontWeight:700}}>{s.currency}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* TYPE */}
      <div style={{display:"flex",gap:2}}>
        {["COMPRA","VENTA"].map(t=>{const isC=t==="COMPRA",act=type===t;return(
          <button key={t} onClick={()=>setType(t)} style={{flex:1,padding:"8px 4px",borderRadius:isC?"6px 0 0 6px":"0 6px 6px 0",border:"1px solid",borderColor:act?(isC?"rgba(72,187,120,0.4)":"rgba(245,101,101,0.4)"):"rgba(99,179,237,0.15)",background:act?(isC?"rgba(72,187,120,0.15)":"rgba(245,101,101,0.15)"):"#1a2332",color:act?(isC?"#68d391":"#fc8181"):"#718096",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{isC?"C":"V"}</button>
        );})}
      </div>
      {/* PLAZO */}
      <div style={{display:"flex",gap:2}}>
        {["0","1"].map(p=>(
          <button key={p} onClick={()=>setPlazo(p)} style={{flex:1,padding:"8px 4px",borderRadius:p==="0"?"6px 0 0 6px":"0 6px 6px 0",border:"1px solid",borderColor:plazo===p?"rgba(99,179,237,0.4)":"rgba(99,179,237,0.15)",background:plazo===p?"rgba(99,179,237,0.15)":"#1a2332",color:plazo===p?"#63b3ed":"#718096",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>T+{p}</button>
        ))}
      </div>
      {/* VN formatted */}
      <input ref={vnRef} type="text" inputMode="numeric" placeholder="VN" value={vnDisplay}
        onChange={handleVnChange} onKeyDown={e=>e.key==="Enter"&&trySubmit()}
        style={{...iS,textAlign:"right"}} autoComplete="off"/>
      {/* PX formatted */}
      <input type="text" inputMode="decimal" placeholder="PX" value={pxRaw}
        onChange={handlePxChange} onKeyDown={e=>e.key==="Enter"&&trySubmit()}
        style={{...iS,textAlign:"right"}} autoComplete="off"/>
      {/* MONTO */}
      <div style={{textAlign:"right",fontSize:13,fontWeight:600,padding:"0 4px",color:monto===null?"#4a5568":monto>=0?"#68d391":"#fc8181"}}>
        {monto!==null?fmtMoney(monto):"\u2014"}
      </div>
      {/* ADD */}
      <div style={{textAlign:"center"}}>
        <button onClick={trySubmit} disabled={!ticker||!vnRaw||!pxRaw} style={{
          background:ticker&&vnRaw&&pxRaw?"linear-gradient(135deg,#3182ce,#63b3ed)":"#2d3748",
          border:"none",borderRadius:6,color:ticker&&vnRaw&&pxRaw?"#fff":"#4a5568",
          cursor:ticker&&vnRaw&&pxRaw?"pointer":"not-allowed",
          padding:"7px 10px",fontSize:14,fontWeight:700,fontFamily:"inherit",
        }}>+</button>
      </div>
    </div>
  );
}

// ============================================================
// BASE INSTRUMENTOS
// ============================================================
function BaseInstrumentos({instruments,setInstruments}){
  const[editFam,setEditFam]=useState(null);
  const[nt,setNt]=useState("");
  const[nc,setNc]=useState("ARS");
  const[nf,setNf]=useState("");
  const[showAF,setShowAF]=useState(false);
  // BYMA Open Tools state
  const[bymaQuery,setBymaQuery]=useState("");
  const[bymaResults,setBymaResults]=useState(null);
  const[bymaLoading,setBymaLoading]=useState(false);
  const[bymaPrices,setBymaPrices]=useState(null);
  const[bymaPricesFam,setBymaPricesFam]=useState(null);
  const[bymaPricesLoading,setBymaPricesLoading]=useState(false);

  const addInst=(fam)=>{if(!nt||instruments[fam].some(i=>i.ticker.toUpperCase()===nt.toUpperCase()))return;setInstruments(p=>({...p,[fam]:[...p[fam],{ticker:nt.toUpperCase(),currency:nc}]}));setNt("");setNc("ARS");};
  const remInst=(fam,t)=>setInstruments(p=>({...p,[fam]:p[fam].filter(i=>i.ticker!==t)}));
  const addFam=()=>{if(!nf||instruments[nf])return;setInstruments(p=>({...p,[nf]:[]}));setNf("");setShowAF(false);};

  const searchBYMA=async()=>{
    if(!bymaQuery.trim())return;
    setBymaLoading(true);setBymaResults(null);
    try{
      const r=await fetch("/api/byma/bonds?q="+encodeURIComponent(bymaQuery.trim()));
      const data=await r.json();
      setBymaResults(data.bonds||[]);
    }catch(e){setBymaResults([]);}
    setBymaLoading(false);
  };

  const fetchBymaPrices=async(fam)=>{
    const tickers=instruments[fam];
    if(!tickers||tickers.length===0)return;
    setBymaPricesLoading(true);setBymaPrices(null);setBymaPricesFam(fam);
    try{
      const syms=tickers.map(t=>t.ticker).join(",");
      const r=await fetch("/api/byma/quotes?symbols="+encodeURIComponent(syms));
      const data=await r.json();
      setBymaPrices(data.symbols||{});
    }catch(e){setBymaPrices({});}
    setBymaPricesLoading(false);
  };

  const importFromBYMA=(fam,symbol)=>{
    if(instruments[fam].some(i=>i.ticker.toUpperCase()===symbol.toUpperCase()))return;
    setInstruments(p=>({...p,[fam]:[...p[fam],{ticker:symbol.toUpperCase(),currency:"ARS"}]}));
  };

  const cc={ARS:{bg:"rgba(99,179,237,0.12)",color:"#63b3ed",border:"rgba(99,179,237,0.25)"},MEP:{bg:"rgba(72,187,120,0.12)",color:"#68d391",border:"rgba(72,187,120,0.25)"},CCL:{bg:"rgba(237,137,54,0.12)",color:"#ed8936",border:"rgba(237,137,54,0.25)"}};
  const cellS={padding:"6px 10px",fontSize:11,borderBottom:"1px solid rgba(99,179,237,0.06)"};
  const hdS={...cellS,fontWeight:600,color:"#718096",fontSize:9,letterSpacing:"0.5px",textTransform:"uppercase",background:"#0d1220"};

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:14,color:"#a0aec0"}}>Base de datos de instrumentos por curva</div>
        <button onClick={()=>setShowAF(!showAF)} style={{padding:"8px 16px",background:"rgba(99,179,237,0.1)",border:"1px solid rgba(99,179,237,0.2)",borderRadius:8,color:"#63b3ed",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Nueva Curva</button>
      </div>
      {showAF&&(
        <div style={{padding:16,background:"#111827",borderRadius:10,border:"1px solid rgba(99,179,237,0.15)",marginBottom:16,display:"flex",gap:12,alignItems:"center"}}>
          <input value={nf} onChange={e=>setNf(e.target.value)} placeholder="Nombre de curva..." style={{padding:"8px 12px",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:"#f7fafc",fontSize:13,fontFamily:"inherit",outline:"none",flex:1}} onKeyDown={e=>e.key==="Enter"&&addFam()}/>
          <button onClick={addFam} style={{padding:"8px 20px",background:"#3182ce",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Agregar</button>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {Object.keys(instruments).map(fam=>(
          <div key={fam} style={{background:"#111827",borderRadius:12,border:"1px solid rgba(99,179,237,0.1)",overflow:"hidden"}}>
            <div style={{padding:"14px 20px",borderBottom:"1px solid rgba(99,179,237,0.08)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:14,fontWeight:700,color:"#f7fafc",display:"flex",alignItems:"center",gap:10}}>{fam}<span style={{fontSize:10,color:"#718096",fontWeight:400,background:"rgba(99,179,237,0.08)",padding:"2px 8px",borderRadius:4}}>{instruments[fam].length}</span></div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {fam!=="Monedas"&&<button onClick={()=>fetchBymaPrices(fam)} style={{background:"none",border:"1px solid rgba(237,137,54,0.25)",borderRadius:4,color:"#ed8936",fontSize:10,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit"}} title="Traer precios BYMA Open">📊 Precios BYMA</button>}
                <button onClick={()=>setEditFam(editFam===fam?null:fam)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,padding:"4px 8px",borderRadius:4,color:editFam===fam?"#63b3ed":"#718096"}}>{"\u270F\uFE0F"}</button>
              </div>
            </div>
            <div style={{padding:"12px 20px",display:"flex",flexWrap:"wrap",gap:8}}>
              {instruments[fam].map(inst=>{const c=cc[inst.currency]||cc.ARS;return(
                <div key={inst.ticker} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",background:c.bg,border:"1px solid "+c.border,borderRadius:6,fontSize:12}}>
                  <span style={{fontWeight:600,color:"#f7fafc"}}>{inst.ticker}</span>
                  <span style={{fontSize:9,color:c.color,fontWeight:700,padding:"1px 4px",borderRadius:3,background:"rgba(0,0,0,0.2)"}}>{inst.currency}</span>
                  {editFam===fam&&<button onClick={()=>remInst(fam,inst.ticker)} style={{background:"none",border:"none",color:"#fc8181",cursor:"pointer",fontSize:11,padding:0,marginLeft:2}}>{"\u2715"}</button>}
                </div>);})}
            </div>
            {editFam===fam&&(
              <div style={{padding:"12px 20px",borderTop:"1px solid rgba(99,179,237,0.08)",display:"flex",gap:8,alignItems:"center"}}>
                <input value={nt} onChange={e=>setNt(e.target.value.toUpperCase())} placeholder="Nuevo ticker..." style={{padding:"7px 12px",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:"#f7fafc",fontSize:12,fontFamily:"inherit",outline:"none",width:140}} onKeyDown={e=>e.key==="Enter"&&addInst(fam)}/>
                <select value={nc} onChange={e=>setNc(e.target.value)} style={{padding:"7px 10px",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:"#f7fafc",fontSize:12,fontFamily:"inherit",outline:"none"}}><option value="ARS">ARS</option><option value="MEP">MEP</option><option value="CCL">CCL</option></select>
                <button onClick={()=>addInst(fam)} style={{padding:"7px 16px",background:"#3182ce",border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Agregar</button>
              </div>
            )}

            {/* BYMA Prices inline for this family */}
            {bymaPricesFam===fam&&bymaPrices&&(
              <div style={{padding:"12px 20px",borderTop:"1px solid rgba(237,137,54,0.15)",background:"rgba(237,137,54,0.03)"}}>
                <div style={{fontSize:10,color:"#ed8936",fontWeight:600,marginBottom:8}}>⏱️ Precios BYMA Open (delay ~20 min)</div>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    <th style={hdS}>Ticker</th><th style={{...hdS,textAlign:"right"}}>Last</th><th style={{...hdS,textAlign:"right"}}>Bid</th><th style={{...hdS,textAlign:"right"}}>Offer</th><th style={{...hdS,textAlign:"right"}}>VWAP</th><th style={{...hdS,textAlign:"right"}}>Vol VN</th><th style={{...hdS,textAlign:"right"}}>Monto</th><th style={{...hdS,textAlign:"center",width:30}}></th>
                  </tr></thead>
                  <tbody>
                    {instruments[fam].map(inst=>{
                      const q=bymaPrices[inst.ticker]||{};
                      const fP=v=>v!=null?Number(v).toFixed(2):"—";
                      return(<tr key={inst.ticker} style={{opacity:q.error?0.5:1}}>
                        <td style={{...cellS,fontWeight:600,color:"#f7fafc"}}>{inst.ticker}</td>
                        <td style={{...cellS,textAlign:"right",color:q.last!=null?"#f6e05e":"#4a5568"}}>{fP(q.last)}</td>
                        <td style={{...cellS,textAlign:"right",color:q.bid!=null?"#48bb78":"#4a5568"}}>{fP(q.bid)}</td>
                        <td style={{...cellS,textAlign:"right",color:q.offer!=null?"#fc8181":"#4a5568"}}>{fP(q.offer)}</td>
                        <td style={{...cellS,textAlign:"right",color:q.vwap!=null?"#b794f4":"#4a5568",fontWeight:q.vwap!=null?600:400}}>{fP(q.vwap)}</td>
                        <td style={{...cellS,textAlign:"right",color:"#a0aec0"}}>{q.vol_vn!=null?fmtNum(Math.round(q.vol_vn)):"—"}</td>
                        <td style={{...cellS,textAlign:"right",color:"#a0aec0"}}>{q.vol_amount!=null?fmtNum(Math.round(q.vol_amount)):"—"}</td>
                        <td style={{...cellS,textAlign:"center"}}>{q.error?<span title={q.error} style={{color:"#fc8181",cursor:"help",fontSize:10}}>⚠</span>:q.last!=null?<span style={{color:"#48bb78",fontSize:10}}>✓</span>:"—"}</td>
                      </tr>);
                    })}
                  </tbody>
                </table>
                <button onClick={()=>{setBymaPrices(null);setBymaPricesFam(null);}} style={{marginTop:6,background:"none",border:"none",color:"#718096",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>✕ Cerrar</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Open BYMA Tools ─────────────────────────────── */}
      <div style={{marginTop:28,background:"#111827",borderRadius:12,border:"1px solid rgba(237,137,54,0.2)",overflow:"hidden"}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid rgba(237,137,54,0.1)",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>🔍</span>
          <span style={{fontSize:13,fontWeight:700,color:"#ed8936"}}>Open BYMA Tools</span>
          <span style={{fontSize:10,color:"#a0aec0"}}>(delay ~20 min, sin credenciales)</span>
        </div>
        <div style={{padding:"16px 20px"}}>
          {/* Search / Validate */}
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
            <input value={bymaQuery} onChange={e=>setBymaQuery(e.target.value.toUpperCase())} placeholder="Buscar ticker en Open BYMA (ej: AL30, GD35)..." style={{padding:"8px 12px",background:"#1a2332",border:"1px solid rgba(237,137,54,0.2)",borderRadius:6,color:"#f7fafc",fontSize:12,fontFamily:"inherit",outline:"none",flex:1}} onKeyDown={e=>e.key==="Enter"&&searchBYMA()}/>
            <button onClick={searchBYMA} disabled={bymaLoading} style={{padding:"8px 20px",background:"rgba(237,137,54,0.15)",border:"1px solid rgba(237,137,54,0.3)",borderRadius:6,color:"#ed8936",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{bymaLoading?"Buscando...":"Buscar"}</button>
          </div>

          {/* Results table */}
          {bymaResults!==null&&(
            <div>
              {bymaResults.length===0?(
                <div style={{padding:16,textAlign:"center",color:"#4a5568",fontSize:12}}>No se encontraron resultados para "{bymaQuery}"</div>
              ):(
                <div style={{maxHeight:300,overflowY:"auto"}}>
                  <div style={{fontSize:10,color:"#718096",marginBottom:6}}>{bymaResults.length} resultado{bymaResults.length!==1?"s":""}</div>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>
                      <th style={hdS}>Símbolo</th><th style={{...hdS,textAlign:"right"}}>Last</th><th style={hdS}>Settlement</th><th style={hdS}>Descripción</th><th style={{...hdS,textAlign:"center",width:100}}>Importar a</th>
                    </tr></thead>
                    <tbody>
                      {bymaResults.map((b,i)=>(
                        <tr key={i} style={{transition:"background 0.1s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(237,137,54,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <td style={{...cellS,fontWeight:600,color:"#f7fafc"}}>{b.symbol}</td>
                          <td style={{...cellS,textAlign:"right",color:b.last!=null?"#f6e05e":"#4a5568"}}>{b.last!=null?Number(b.last).toFixed(2):"—"}</td>
                          <td style={{...cellS,color:"#a0aec0"}}>{b.settlement||"—"}</td>
                          <td style={{...cellS,color:"#a0aec0",fontSize:10,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.description||"—"}</td>
                          <td style={{...cellS,textAlign:"center"}}>
                            <select onChange={e=>{if(e.target.value)importFromBYMA(e.target.value,b.symbol);e.target.value="";}} defaultValue="" style={{padding:"3px 6px",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",borderRadius:4,color:"#63b3ed",fontSize:10,fontFamily:"inherit",outline:"none",cursor:"pointer"}}>
                              <option value="" disabled>Curva...</option>
                              {Object.keys(instruments).filter(f=>f!=="Monedas").map(f=><option key={f} value={f}>{f}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button onClick={()=>setBymaResults(null)} style={{marginTop:8,background:"none",border:"none",color:"#718096",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>✕ Cerrar resultados</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AUDITORÍA
// ============================================================
function Auditoria({operations,fxOps}){
  const today=fmtD(new Date());
  const[fromDate,setFromDate]=useState(today);
  const[toDate,setToDate]=useState(today);
  const[view,setView]=useState(null);

  // Merge titles + FX into a unified list
  const filtered=useMemo(()=>{
    if(!fromDate||!toDate)return[];
    const titleOps=operations.filter(o=>o.date>=fromDate&&o.date<=toDate).map(o=>({...o,source:"titulo"}));
    const fxList=(fxOps||[]).filter(o=>o.date>=fromDate&&o.date<=toDate).map(o=>{
      // Build a unified row for FX
      const ticker=o.fxType==="CCL"?"Cable":o.fxType;
      let montoStr="";
      if(o.fxType==="CANJE"){
        montoStr=`Cable: ${fmtNum(Math.round(o.usd_cable||0))} / MEP: ${fmtNum(Math.round(o.usd_mep||0))}`;
      }else{
        montoStr=fmtMoney(o.ars||0);
      }
      return{...o,source:"fx",ticker,type:o.tipo,monto:o.ars||0,currency:"USD",montoDisplay:montoStr};
    });
    return[...titleOps,...fxList].sort((a,b)=>a.date.localeCompare(b.date));
  },[operations,fxOps,fromDate,toDate]);

  const cellS={padding:"10px 14px",fontSize:12,borderBottom:"1px solid rgba(99,179,237,0.06)"};
  const hdS={...cellS,fontWeight:600,color:"#718096",fontSize:10,letterSpacing:"0.5px",textTransform:"uppercase",background:"#0d1220"};

  return(
    <div>
      <div style={{marginBottom:20,fontSize:14,color:"#a0aec0"}}>Consultá operaciones registradas por rango de fechas</div>

      {/* Date range with DatePicker (DD/MM/AAAA) */}
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <label style={{fontSize:11,color:"#718096",textTransform:"uppercase",letterSpacing:"1px"}}>Desde</label>
          <DatePicker value={fromDate} onChange={setFromDate}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <label style={{fontSize:11,color:"#718096",textTransform:"uppercase",letterSpacing:"1px"}}>Hasta</label>
          <DatePicker value={toDate} onChange={setToDate}/>
        </div>
        <button onClick={()=>setView("ops")} style={{padding:"8px 20px",borderRadius:8,border:"none",background:"#3182ce",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
          Ver operaciones
        </button>
        {view==="ops"&&filtered.length>0&&(
          <button onClick={()=>downloadAuditCSV(filtered,fromDate,toDate)} style={{padding:"8px 20px",borderRadius:8,border:"1px solid rgba(99,179,237,0.2)",background:"rgba(49,130,206,0.1)",color:"#63b3ed",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
            ⬇ Descargar Excel
          </button>
        )}
      </div>

      {view==="ops"&&(
        <div>
          <div style={{marginBottom:12,fontSize:12,color:"#718096"}}>
            {filtered.length} operación{filtered.length!==1?"es":""} entre {fmtDD(fromDate)} y {fmtDD(toDate)}
          </div>

          {filtered.length===0?(
            <div style={{padding:"40px 20px",textAlign:"center",color:"#4a5568",fontSize:13,background:"#111827",borderRadius:10,border:"1px solid rgba(99,179,237,0.1)"}}>
              No hay operaciones en este período
            </div>
          ):(
            <div style={{background:"#111827",borderRadius:10,border:"1px solid rgba(99,179,237,0.1)",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr>
                    <th style={hdS}>F. Concertación</th>
                    <th style={hdS}>F. Liquidación</th>
                    <th style={hdS}>Origen</th>
                    <th style={hdS}>Ticker</th>
                    <th style={hdS}>Tipo</th>
                    <th style={{...hdS,textAlign:"right"}}>VN</th>
                    <th style={{...hdS,textAlign:"right"}}>PX</th>
                    <th style={{...hdS,textAlign:"right"}}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((op,i)=>{
                    const fConc=fmtDD(op.date);
                    const fLiq=op.plazo==="0"?fmtDD(op.date):fmtDD(getNextBusinessDay(op.date));
                    const isC=(op.type||op.tipo)==="COMPRA";
                    const isFx=op.source==="fx";
                    return(
                      <tr key={op.id||i} style={{transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(99,179,237,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={cellS}>{fConc}</td>
                        <td style={cellS}>{fLiq}</td>
                        <td style={cellS}>
                          <span style={{fontSize:9,padding:"2px 6px",borderRadius:3,fontWeight:700,background:isFx?"rgba(237,137,54,0.12)":"rgba(99,179,237,0.12)",color:isFx?"#ed8936":"#63b3ed"}}>{isFx?"FX":"Título"}</span>
                        </td>
                        <td style={{...cellS,fontWeight:600,color:"#f7fafc"}}>{op.ticker}</td>
                        <td style={cellS}>
                          <span style={{padding:"3px 10px",borderRadius:4,fontSize:10,fontWeight:600,background:isC?"rgba(72,187,120,0.15)":"rgba(245,101,101,0.15)",color:isC?"#68d391":"#fc8181"}}>{op.type||op.tipo}</span>
                        </td>
                        <td style={{...cellS,textAlign:"right"}}>{fmtNum(op.vn)}</td>
                        <td style={{...cellS,textAlign:"right"}}>{isFx&&op.fxType==="CANJE"?Number(op.px).toFixed(2)+"%":Number(op.px).toFixed(2)}</td>
                        <td style={{...cellS,textAlign:"right",fontWeight:600,color:isFx?"#a0aec0":(op.monto>=0?"#68d391":"#fc8181")}}>
                          {isFx?(op.montoDisplay||"\u2014"):fmtMoney(op.monto)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// POSICIÓN & PNL — Consolidated position across all dates
// ============================================================
function PosicionPNL({operations,fxOps,tasas,bonosVencidos}){
  const today=fmtD(new Date());
  const[mktPrices,setMktPrices]=useState({});
  const[mktLoading,setMktLoading]=useState(false);
  const[manualPrices,setManualPrices]=useState(()=>loadS("manualPx2",{}));// ticker -> [{date,price}] sorted by date
  const[priceSource,setPriceSource]=useState("byma");// "byma" | "mae" | "manual"
  const[editingPx,setEditingPx]=useState(null);// ticker being edited
  const[editPxVal,setEditPxVal]=useState("");

  useEffect(()=>{saveS("manualPx2",manualPrices);},[manualPrices]);

  // Build maturity price lookup: ticker -> {px, date}
  const maturityMap=useMemo(()=>{
    const m={};
    for(const bv of(bonosVencidos||[])){
      m[bv.ticker.toUpperCase()]={px:bv.pxVto,date:bv.fechaVto};
    }
    return m;
  },[bonosVencidos]);

  // Fetch market prices based on source
  // After 17hs AR time: use cached prices, don't refetch BYMA (avoids errors)
  const fetchMarketPrices=async()=>{
    const tickers=pnlByTicker.map(p=>p.ticker).filter(t=>t);
    if(tickers.length===0)return;
    if(priceSource==="byma"&&isAfterMarketHours()&&Object.keys(mktPrices).length>0)return;// keep cached
    setMktLoading(true);
    try{
      const endpoint=priceSource==="mae"?"/api/mae/quotes":"/api/byma/quotes";
      const r=await fetch(endpoint+"?symbols="+encodeURIComponent(tickers.join(",")));
      const data=await r.json();
      const syms=data.symbols||{};
      // Only update if we got actual data (not all errors)
      const hasData=Object.values(syms).some(v=>v.vwap!=null||v.last!=null);
      if(hasData||Object.keys(mktPrices).length===0)setMktPrices(syms);
    }catch(e){console.warn("PNL market fetch error",e);}
    setMktLoading(false);
  };

  useEffect(()=>{if(pnlByTicker.length>0)fetchMarketPrices();},[pnlByTicker.length,priceSource]);

  // Build tasa lookup: date -> {rate, calDays}
  // calDays = calendar days this rate covers (until next business day)
  const tasaMap=useMemo(()=>{
    const sorted=[...(tasas||[])].sort((a,b)=>a.date.localeCompare(b.date));
    const map={};
    for(let i=0;i<sorted.length;i++){
      const t=sorted[i];
      // calDays = days from this date to next business day (or next tasa date)
      let calDays=1;
      if(i<sorted.length-1){
        const d0=new Date(t.date+"T12:00:00");
        const d1=new Date(sorted[i+1].date+"T12:00:00");
        calDays=Math.round((d1-d0)/(864e5));
      }else{
        // Last entry: count to next business day from this date
        const d0=new Date(t.date+"T12:00:00");
        const nb=getNextBusinessDay(t.date);
        const d1=new Date(nb+"T12:00:00");
        calDays=Math.round((d1-d0)/(864e5));
      }
      map[t.date]={rate:t.rate,calDays};
    }
    return map;
  },[tasas]);

  // Get sorted tasa dates for iteration
  const tasaDates=useMemo(()=>Object.keys(tasaMap).sort(),[tasaMap]);

  // Calculate adjusted cost for one operation
  // PX_adj = PX × product of (1 + rate_i/100/365 * calDays_i) for each rueda from liqDate to today
  const calcCarry=(px,liqDate)=>{
    let cost=px;
    for(const td of tasaDates){
      if(td<liqDate)continue;// tasa before liquidation, skip
      if(td>=today)break;// today or future, stop
      const t=tasaMap[td];
      if(!t)continue;
      const dailyRate=t.rate/100/365;
      cost=cost*(1+dailyRate*t.calDays);
    }
    return cost;
  };

  // Process all ARS title operations into per-op carry data
  const arsOpsWithCarry=useMemo(()=>{
    return operations
      .filter(op=>(op.currency||"ARS")==="ARS")
      .map(op=>{
        // Liquidation date
        const liqDate=op.plazo==="0"?op.date:getNextBusinessDay(op.date);
        // Only calculate carry if liquidation is in the past or today
        const pxOriginal=Math.abs(op.monto)/op.vn*100;// recover PX as percentage of VN
        const pxAdj=liqDate<=today?calcCarry(pxOriginal,liqDate):pxOriginal;
        const sign=op.type==="COMPRA"?1:-1;
        return{
          ...op,
          liqDate,
          pxOriginal,
          pxAdj,
          sign,
          vnSigned:sign*op.vn,
          costoAdj:pxAdj/100*op.vn*sign,// signed cost in ARS
        };
      });
  },[operations,tasaMap,tasaDates,today]);

  // Group by ticker: VWAP of adjusted cost, VN net
  const pnlByTicker=useMemo(()=>{
    const groups={};
    for(const op of arsOpsWithCarry){
      const k=op.ticker;
      if(!groups[k])groups[k]={ticker:k,vnNet:0,costoAdjTotal:0,vnCompra:0,vnVenta:0,ops:[]};
      groups[k].vnNet+=op.vnSigned;
      groups[k].costoAdjTotal+=op.costoAdj;
      if(op.sign>0)groups[k].vnCompra+=op.vn;
      else groups[k].vnVenta+=op.vn;
      groups[k].ops.push(op);
    }
    // Compute VWAP cost = total adjusted cost / VN net (use absolute for VWAP)
    return Object.values(groups).map(g=>{
      const totalVN=g.ops.reduce((s,o)=>s+Math.abs(o.vnSigned),0);
      const totalCost=g.ops.reduce((s,o)=>s+Math.abs(o.costoAdj),0);
      const vwapCost=totalVN>0?(totalCost/totalVN*100):0;// as % of VN
      return{...g,vwapCost};
    }).sort((a,b)=>a.ticker.localeCompare(b.ticker));
  },[arsOpsWithCarry]);

  // FX consolidated
  const fxPos=useMemo(()=>{
    const saldos={ARS:0,MEP:0,Cable:0};
    for(const fx of(fxOps||[])){
      if(fx.ars)saldos.ARS+=fx.ars;
      if(fx.usd_mep)saldos.MEP+=fx.usd_mep;
      if(fx.usd_cable)saldos.Cable+=fx.usd_cable;
    }
    return saldos;
  },[fxOps]);

  // Cash from title operations
  const cashFromTitles=useMemo(()=>{
    const cash={ARS:0,MEP:0,CCL:0};
    for(const op of operations){
      const cur=op.currency||"ARS";
      if(cash[cur]!==undefined)cash[cur]+=op.monto;
    }
    return cash;
  },[operations]);

  // Non-ARS positions (MEP/CCL) simple view
  const nonArsPositions=useMemo(()=>{
    const pos={};
    for(const op of operations){
      if((op.currency||"ARS")==="ARS")continue;
      const key=op.ticker;
      if(!pos[key])pos[key]={ticker:key,currency:op.currency,vnNet:0,montoTotal:0};
      pos[key].vnNet+=op.type==="COMPRA"?op.vn:-op.vn;
      pos[key].montoTotal+=op.monto;
    }
    return Object.values(pos).filter(p=>p.vnNet!==0);
  },[operations]);

  // Resolve price for a ticker based on source
  // Market VWAP (BYMA/MAE) is per VN=1. VTO/Manual are in % of VN.
  const getPrice=(ticker)=>{
    const mat=maturityMap[ticker.toUpperCase()];
    if(mat)return{px:mat.px,src:"VTO",isMkt:false};
    if(priceSource==="manual"){
      const hist=manualPrices[ticker];
      if(hist&&hist.length>0){const last=hist[hist.length-1];return{px:last.price,src:"MANUAL",isMkt:false};}
      return{px:null,src:"—",isMkt:false};
    }
    const mkt=mktPrices[ticker];
    const srcLabel=priceSource==="mae"?"MAE":"BYMA";
    if(mkt?.vwap!=null)return{px:mkt.vwap,src:srcLabel,isMkt:true};
    if(mkt?.last!=null)return{px:mkt.last,src:srcLabel,isMkt:true};
    // Fallback to manual if available
    const hist=manualPrices[ticker];
    if(hist&&hist.length>0){const last=hist[hist.length-1];return{px:last.price,src:"MANUAL",isMkt:false};}
    return{px:null,src:mkt?.error?"ERR":"—",isMkt:false};
  };

  // PNL totals
  // Market VWAP is per VN=1: valMkt = px * |vnNet|
  // VTO/Manual are %: valMkt = (px/100) * |vnNet|
  // Cost is always %: valCost = (vwapCost/100) * |vnNet|
  const pnlTotal=useMemo(()=>{
    let totalPnl=0;
    for(const p of pnlByTicker){
      const{px,isMkt}=getPrice(p.ticker);
      if(px!=null&&p.vnNet!==0){
        const valCost=(p.vwapCost/100)*Math.abs(p.vnNet);
        const valMkt=isMkt?(px*Math.abs(p.vnNet)):((px/100)*Math.abs(p.vnNet));
        const pnl=p.vnNet>0?(valMkt-valCost):(valCost-valMkt);
        totalPnl+=pnl;
      }
    }
    return totalPnl;
  },[pnlByTicker,mktPrices,maturityMap,manualPrices,priceSource]);

  const cellS={padding:"10px 14px",fontSize:12,borderBottom:"1px solid rgba(99,179,237,0.06)"};
  const hdS={...cellS,fontWeight:600,color:"#718096",fontSize:10,letterSpacing:"0.5px",textTransform:"uppercase",background:"#0d1220"};
  const fmtPx=(v)=>v!=null?Number(v).toFixed(4):"—";

  return(
    <div>
      <div style={{marginBottom:20,fontSize:14,color:"#a0aec0"}}>Posición consolidada — costo ajustado por fondeo + valuación a VWAP mercado</div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:24}}>
        <div style={{background:"#111827",borderRadius:12,border:"1px solid rgba(99,179,237,0.1)",padding:"16px 20px"}}>
          <div style={{fontSize:10,color:"#718096",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Saldo Cash</div>
          {[
            {label:"ARS",val:cashFromTitles.ARS+fxPos.ARS,color:"#63b3ed"},
            {label:"USD MEP",val:cashFromTitles.MEP+fxPos.MEP,color:"#68d391"},
            {label:"USD Cable",val:cashFromTitles.CCL+fxPos.Cable,color:"#ed8936"},
          ].map(r=>(
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(99,179,237,0.04)"}}>
              <span style={{fontSize:11,color:r.color,fontWeight:600}}>{r.label}</span>
              <span style={{fontSize:13,fontWeight:700,fontVariantNumeric:"tabular-nums",color:r.val===0?"#4a5568":r.val>0?"#68d391":"#fc8181"}}>{r.val===0?"0":fmtMoney(r.val)}</span>
            </div>
          ))}
        </div>
        <div style={{background:"#111827",borderRadius:12,border:"1px solid rgba(99,179,237,0.1)",padding:"16px 20px"}}>
          <div style={{fontSize:10,color:"#718096",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Posición FX neta</div>
          {Object.entries(fxPos).map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(99,179,237,0.04)"}}>
              <span style={{fontSize:11,color:"#a0aec0",fontWeight:600}}>{k}</span>
              <span style={{fontSize:13,fontWeight:700,fontVariantNumeric:"tabular-nums",color:v===0?"#4a5568":v>0?"#68d391":"#fc8181"}}>{v===0?"0":fmtMoney(v)}</span>
            </div>
          ))}
        </div>
        <div style={{background:"#111827",borderRadius:12,border:`1px solid ${pnlTotal>=0?"rgba(72,187,120,0.2)":"rgba(252,129,129,0.2)"}`,padding:"16px 20px"}}>
          <div style={{fontSize:10,color:"#718096",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>PNL Total Títulos ARS</div>
          <div style={{fontSize:28,fontWeight:800,color:pnlTotal===0?"#4a5568":pnlTotal>0?"#68d391":"#fc8181",fontVariantNumeric:"tabular-nums"}}>{fmtMoney(pnlTotal)}</div>
          <div style={{fontSize:10,color:"#4a5568",marginTop:4}}>Costo ajustado por fondeo vs {priceSource==="manual"?"precios manuales":priceSource==="mae"?"VWAP MAE":"VWAP BYMA"}</div>
        </div>
      </div>

      {/* PNL by ticker - ARS positions */}
      <div style={{background:"#111827",borderRadius:12,border:"1px solid rgba(99,179,237,0.1)",overflow:"hidden",marginBottom:24}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid rgba(99,179,237,0.08)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{fontSize:14,fontWeight:700,color:"#f7fafc"}}>PNL Títulos ARS — Costo con Fondeo</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:10,color:"#718096"}}>Precio:</span>
            <button onClick={()=>setPriceSource("byma")} style={{padding:"4px 12px",borderRadius:4,border:priceSource==="byma"?"1px solid #ed8936":"1px solid rgba(99,179,237,0.15)",background:priceSource==="byma"?"rgba(237,137,54,0.15)":"transparent",color:priceSource==="byma"?"#ed8936":"#718096",fontSize:10,fontWeight:priceSource==="byma"?700:400,cursor:"pointer",fontFamily:"inherit"}}>BYMA Open</button>
            <button onClick={()=>setPriceSource("mae")} style={{padding:"4px 12px",borderRadius:4,border:priceSource==="mae"?"1px solid #68d391":"1px solid rgba(99,179,237,0.15)",background:priceSource==="mae"?"rgba(104,211,145,0.15)":"transparent",color:priceSource==="mae"?"#68d391":"#718096",fontSize:10,fontWeight:priceSource==="mae"?700:400,cursor:"pointer",fontFamily:"inherit"}}>MAE</button>
            <button onClick={()=>setPriceSource("manual")} style={{padding:"4px 12px",borderRadius:4,border:priceSource==="manual"?"1px solid #b794f4":"1px solid rgba(99,179,237,0.15)",background:priceSource==="manual"?"rgba(183,148,244,0.15)":"transparent",color:priceSource==="manual"?"#b794f4":"#718096",fontSize:10,fontWeight:priceSource==="manual"?700:400,cursor:"pointer",fontFamily:"inherit"}}>Manual</button>
            {priceSource!=="manual"&&<button onClick={fetchMarketPrices} disabled={mktLoading} style={{padding:"4px 12px",borderRadius:4,border:"1px solid rgba(99,179,237,0.2)",background:"rgba(49,130,206,0.1)",color:"#63b3ed",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{mktLoading?"...":"↻ Refresh"}</button>}
          </div>
        </div>
        {pnlByTicker.length===0?(
          <div style={{padding:"30px 20px",textAlign:"center",color:"#4a5568",fontSize:13}}>Sin posiciones ARS</div>
        ):(
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th style={hdS}>Ticker</th>
                <th style={{...hdS,textAlign:"right"}}>VN Neto</th>
                <th style={{...hdS,textAlign:"right"}}>VWAP Costo+Fondeo</th>
                <th style={{...hdS,textAlign:"right"}}>Precio Valuación</th>
                <th style={{...hdS,textAlign:"right"}}>Costo Total</th>
                <th style={{...hdS,textAlign:"right"}}>Valor Mercado</th>
                <th style={{...hdS,textAlign:"right"}}>PNL</th>
              </tr>
            </thead>
            <tbody>
              {pnlByTicker.map(p=>{
                const{px:vwapMkt,src,isMkt}=getPrice(p.ticker);
                const valCost=(p.vwapCost/100)*Math.abs(p.vnNet);
                const valMkt=vwapMkt!=null?(isMkt?(vwapMkt*Math.abs(p.vnNet)):((vwapMkt/100)*Math.abs(p.vnNet))):null;
                const pnl=valMkt!=null?(p.vnNet>0?(valMkt-valCost):(valCost-valMkt)):null;
                const isEditingThis=editingPx===p.ticker;
                const srcColor=src==="VTO"?"#ed8936":src==="MANUAL"?"#b794f4":src==="BYMA"?"#68d391":"#4a5568";
                return(
                  <tr key={p.ticker} style={{transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(99,179,237,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{...cellS,fontWeight:600,color:"#f7fafc"}}>{p.ticker}{src==="VTO"&&<span style={{fontSize:9,color:"#ed8936",marginLeft:4}}>VTO</span>}</td>
                    <td style={{...cellS,textAlign:"right",fontWeight:700,color:p.vnNet>0?"#68d391":p.vnNet<0?"#fc8181":"#4a5568"}}>{(p.vnNet>0?"+":"")+fmtNum(p.vnNet)}</td>
                    <td style={{...cellS,textAlign:"right",color:"#f6e05e",fontWeight:600}}>{fmtPx(p.vwapCost)}</td>
                    <td style={{...cellS,textAlign:"right"}}>
                      {isEditingThis?(
                        <input value={editPxVal} onChange={e=>setEditPxVal(e.target.value)} onKeyDown={e=>{
                          if(e.key==="Enter"){const v=parseFloat(editPxVal.replace(",","."));if(!isNaN(v)){const d=fmtD(new Date());setManualPrices(prev=>{const arr=[...(prev[p.ticker]||[])].filter(x=>x.date!==d);arr.push({date:d,price:v});arr.sort((a,b)=>a.date.localeCompare(b.date));return{...prev,[p.ticker]:arr};});}setEditingPx(null);}
                          if(e.key==="Escape")setEditingPx(null);
                        }} onBlur={()=>{const v=parseFloat(editPxVal.replace(",","."));if(!isNaN(v)){const d=fmtD(new Date());setManualPrices(prev=>{const arr=[...(prev[p.ticker]||[])].filter(x=>x.date!==d);arr.push({date:d,price:v});arr.sort((a,b)=>a.date.localeCompare(b.date));return{...prev,[p.ticker]:arr};});}setEditingPx(null);}}
                        autoFocus style={{padding:"3px 6px",background:"#1a2332",border:"1px solid #b794f4",borderRadius:4,color:"#b794f4",fontSize:12,fontFamily:"inherit",outline:"none",width:70,textAlign:"right"}}/>
                      ):(
                        <span style={{cursor:"pointer",color:vwapMkt!=null?srcColor:"#4a5568",fontWeight:600}} onClick={()=>{setEditingPx(p.ticker);setEditPxVal(vwapMkt!=null?String(vwapMkt):"");}}>
                          {fmtPx(vwapMkt)}<span style={{fontSize:8,color:srcColor,marginLeft:3}}>{src}</span>
                        </span>
                      )}
                    </td>
                    <td style={{...cellS,textAlign:"right",color:"#a0aec0"}}>{fmtMoney(valCost)}</td>
                    <td style={{...cellS,textAlign:"right",color:valMkt!=null?"#a0aec0":"#4a5568"}}>{valMkt!=null?fmtMoney(valMkt):"—"}</td>
                    <td style={{...cellS,textAlign:"right",fontWeight:700,fontSize:13,color:pnl==null?"#4a5568":pnl>=0?"#68d391":"#fc8181"}}>{pnl!=null?fmtMoney(pnl):"—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Non-ARS positions (simple) */}
      {nonArsPositions.length>0&&(
        <div style={{background:"#111827",borderRadius:12,border:"1px solid rgba(99,179,237,0.1)",overflow:"hidden"}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid rgba(99,179,237,0.08)",fontSize:14,fontWeight:700,color:"#f7fafc"}}>Posición Títulos MEP/CCL</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              <th style={hdS}>Ticker</th><th style={hdS}>Moneda</th><th style={{...hdS,textAlign:"right"}}>VN Neto</th><th style={{...hdS,textAlign:"right"}}>Monto Neto</th>
            </tr></thead>
            <tbody>
              {nonArsPositions.map(p=>(
                <tr key={p.ticker} onMouseEnter={e=>e.currentTarget.style.background="rgba(99,179,237,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{...cellS,fontWeight:600,color:"#f7fafc"}}>{p.ticker}</td>
                  <td style={cellS}><span style={{fontSize:10,padding:"2px 7px",borderRadius:4,fontWeight:700,background:p.currency==="MEP"?"rgba(72,187,120,0.1)":"rgba(237,137,54,0.1)",color:p.currency==="MEP"?"#68d391":"#ed8936"}}>{p.currency}</span></td>
                  <td style={{...cellS,textAlign:"right",fontWeight:700,color:p.vnNet>0?"#68d391":"#fc8181"}}>{(p.vnNet>0?"+":"")+fmtNum(p.vnNet)}</td>
                  <td style={{...cellS,textAlign:"right",fontWeight:600,color:p.montoTotal>=0?"#68d391":"#fc8181"}}>{fmtMoney(p.montoTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{marginTop:16,fontSize:10,color:"#4a5568"}}>
        Nota: VWAP Costo+Fondeo = precio de compra ajustado por tasa de caución diaria (TNA/365 × días calendario) desde liquidación hasta hoy. VWAP Mercado = BYMA Open (delay ~20 min).
      </div>
    </div>
  );
}

// ============================================================
// MERCADO — Live Market Data via pyRofex
// ============================================================
import { curves } from "./config/curves.js";

function fmtARTime(d){
  if(!d)return"";
  return d.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
}

function Mercado(){
  const curveKeys=[...Object.keys(curves),"tasa"];
  const curveLabels={...Object.fromEntries(Object.keys(curves).map(k=>[k,curves[k].label])),tasa:"Tasas"};
  const[activeCurve,setActiveCurve]=useState(curveKeys[0]);
  const[quotes,setQuotes]=useState({});
  const[status,setStatus]=useState("idle");
  const[errorMsg,setErrorMsg]=useState("");
  const[lastUpdate,setLastUpdate]=useState(null);
  const[cauciones,setCauciones]=useState(null);
  const[caucionLoading,setCaucionLoading]=useState(false);
  const[mktSource,setMktSource]=useState("byma");// "byma" | "mae"

  const isTasa=activeCurve==="tasa";

  const fetchQuotes=async()=>{
    if(isTasa){fetchCauciones();return;}
    const syms=curves[activeCurve].symbols.map(s=>s.rofexTicker).join(",");
    if(!syms)return;
    // After 17hs AR: if BYMA and we already have quotes, don't refetch
    if(mktSource==="byma"&&isAfterMarketHours()&&Object.keys(quotes).length>0){setStatus("ok");return;}
    setStatus("loading");setErrorMsg("");
    try{
      const endpoint=mktSource==="mae"?"/api/mae/quotes":"/api/byma/quotes";
      const r=await fetch(endpoint+"?symbols="+encodeURIComponent(syms));
      const data=await r.json();
      const symsData=data.symbols||{};
      // Only update if we got actual data
      const hasData=Object.values(symsData).some(v=>v.vwap!=null||v.last!=null);
      if(hasData||Object.keys(quotes).length===0){setQuotes(symsData);setLastUpdate(new Date());}
      const vals=Object.values(symsData);
      const allErrors=vals.length>0&&vals.every(v=>v.error);
      if(allErrors&&Object.keys(quotes).length>0){setStatus("ok");return;}// keep old data
      if(allErrors){setStatus("error");setErrorMsg(vals[0]?.error||"Error desconocido");return;}
      setStatus("ok");
    }catch(e){
      if(Object.keys(quotes).length>0){setStatus("ok");return;}// keep old data
      setStatus("error");setErrorMsg(e.message||"Error de conexión");
    }
  };

  const fetchCauciones=async()=>{
    setCaucionLoading(true);setErrorMsg("");setStatus("loading");
    try{
      const r=await fetch("/api/byma/cauciones?max_days=7");
      const data=await r.json();
      setCauciones(data);setLastUpdate(new Date());
      setStatus((data.ars&&data.ars.length>0)||(data.usd&&data.usd.length>0)?"ok":"error");
      if(data.error)setErrorMsg(data.error);
    }catch(e){setStatus("error");setErrorMsg(e.message||"Error de conexión");}
    setCaucionLoading(false);
  };

  useEffect(()=>{fetchQuotes();},[activeCurve,mktSource]);

  const statusColor=status==="ok"?"#48bb78":status==="error"?"#fc8181":status==="loading"?"#f6e05e":"#a0aec0";
  const cellS={padding:"8px 12px",fontSize:12,borderBottom:"1px solid rgba(99,179,237,0.06)"};
  const hdS={...cellS,fontWeight:600,color:"#718096",fontSize:10,letterSpacing:"0.5px",textTransform:"uppercase",background:"#0d1220"};
  const fmtPx=(v)=>v!=null?Number(v).toFixed(2):"\u2014";
  const fmtRate=(v)=>v!=null?Number(v).toFixed(2)+"%":"\u2014";

  return(
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      {/* Source banner */}
      {!isTasa&&(
        <div style={{marginBottom:16,padding:"10px 20px",background:mktSource==="mae"?"rgba(104,211,145,0.08)":"rgba(237,137,54,0.08)",border:`1px solid ${mktSource==="mae"?"rgba(104,211,145,0.2)":"rgba(237,137,54,0.2)"}`,borderRadius:8,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>{mktSource==="mae"?"📊":"⏱️"}</span>
          <div style={{fontSize:12,color:mktSource==="mae"?"#68d391":"#ed8936",fontWeight:600}}>
            {mktSource==="mae"?"MAE Market Data — API con credenciales":"BYMA Open — Datos con delay ~20 min"}
            {mktSource==="byma"&&isAfterMarketHours()&&<span style={{marginLeft:8,fontSize:10,color:"#718096"}}>(fuera de rueda — precios de cierre)</span>}
          </div>
        </div>
      )}

      {/* Source + Curve tabs */}
      <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        {!isTasa&&(
          <div style={{display:"flex",gap:4,alignItems:"center",padding:"4px 6px",background:"rgba(99,179,237,0.04)",borderRadius:6,border:"1px solid rgba(99,179,237,0.08)"}}>
            <span style={{fontSize:10,color:"#718096",marginRight:4}}>Fuente:</span>
            <button onClick={()=>setMktSource("byma")} style={{padding:"4px 10px",borderRadius:4,border:mktSource==="byma"?"1px solid #ed8936":"1px solid rgba(99,179,237,0.15)",background:mktSource==="byma"?"rgba(237,137,54,0.15)":"transparent",color:mktSource==="byma"?"#ed8936":"#718096",fontSize:10,fontWeight:mktSource==="byma"?700:400,cursor:"pointer",fontFamily:"inherit"}}>BYMA Open</button>
            <button onClick={()=>setMktSource("mae")} style={{padding:"4px 10px",borderRadius:4,border:mktSource==="mae"?"1px solid #68d391":"1px solid rgba(99,179,237,0.15)",background:mktSource==="mae"?"rgba(104,211,145,0.15)":"transparent",color:mktSource==="mae"?"#68d391":"#718096",fontSize:10,fontWeight:mktSource==="mae"?700:400,cursor:"pointer",fontFamily:"inherit"}}>MAE</button>
          </div>
        )}
        <div style={{display:"flex",gap:4}}>
          {curveKeys.map(k=>(
          <button key={k} onClick={()=>setActiveCurve(k)}
            style={{padding:"8px 18px",borderRadius:6,border:activeCurve===k?"1px solid #3182ce":"1px solid rgba(99,179,237,0.15)",background:activeCurve===k?"rgba(49,130,206,0.15)":"transparent",color:activeCurve===k?"#63b3ed":"#a0aec0",fontWeight:activeCurve===k?600:400,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
            {curveLabels[k]}
          </button>
        ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:8,height:8,borderRadius:99,background:statusColor,boxShadow:`0 0 6px ${statusColor}`}}/>
          <span style={{fontSize:11,fontWeight:600,color:statusColor}}>
            {status==="ok"?"OK":status==="error"?"ERROR":status==="loading"?"...":"IDLE"}
          </span>
        </div>
        <button onClick={fetchQuotes} style={{padding:"6px 16px",borderRadius:4,border:"1px solid rgba(99,179,237,0.2)",background:"rgba(49,130,206,0.1)",color:"#63b3ed",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>↻ Refresh</button>
        {lastUpdate&&<span style={{fontSize:10,color:"#4a5568"}}>Última actualización: {fmtARTime(lastUpdate)}</span>}
      </div>

      {/* Error detail */}
      {status==="error"&&errorMsg&&(
        <div style={{marginBottom:16,padding:"10px 16px",background:"rgba(252,129,129,0.08)",border:"1px solid rgba(252,129,129,0.2)",borderRadius:8,fontSize:11,color:"#fc8181",wordBreak:"break-all"}}>{errorMsg}</div>
      )}

      {/* ── TASA TAB: Cauciones ── */}
      {isTasa&&(
        <div>
          <div style={{marginBottom:12,padding:"10px 20px",background:"rgba(237,137,54,0.08)",border:"1px solid rgba(237,137,54,0.2)",borderRadius:8}}>
            <div style={{fontSize:12,color:"#ed8936",fontWeight:600}}>⏱️ Cauciones BYMA Open — Datos con delay ~20 min</div>
          </div>
          {cauciones&&(cauciones.ars?.length>0||cauciones.usd?.length>0)?(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              {/* ARS */}
              <div style={{background:"#111827",borderRadius:10,border:"1px solid rgba(99,179,237,0.1)",overflow:"hidden"}}>
                <div style={{padding:"10px 16px",background:"#0d1220",fontWeight:700,fontSize:12,color:"#63b3ed"}}>Cauciones ARS $</div>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    <th style={hdS}>Días</th><th style={{...hdS,textAlign:"right"}}>Monto</th><th style={{...hdS,textAlign:"right"}}>VWAP</th><th style={{...hdS,textAlign:"right"}}>Last</th><th style={{...hdS,textAlign:"right"}}>Bid</th><th style={{...hdS,textAlign:"right"}}>Offer</th>
                  </tr></thead>
                  <tbody>
                    {(cauciones.ars||[]).map((c,i)=>(
                      <tr key={i} onMouseEnter={e=>e.currentTarget.style.background="rgba(99,179,237,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{...cellS,fontWeight:700,color:"#f7fafc"}}>{c.days!=null?c.days+"d":"—"}</td>
                        <td style={{...cellS,textAlign:"right",color:"#a0aec0"}}>{c.monto!=null?fmtNum(Math.round(c.monto)):"—"}</td>
                        <td style={{...cellS,textAlign:"right",color:"#f6e05e",fontWeight:600}}>{fmtRate(c.rate_vwap)}</td>
                        <td style={{...cellS,textAlign:"right",color:c.rate_last!=null?"#f7fafc":"#4a5568"}}>{fmtRate(c.rate_last)}</td>
                        <td style={{...cellS,textAlign:"right",color:c.rate_bid!=null?"#48bb78":"#4a5568"}}>{fmtRate(c.rate_bid)}</td>
                        <td style={{...cellS,textAlign:"right",color:c.rate_offer!=null?"#fc8181":"#4a5568"}}>{fmtRate(c.rate_offer)}</td>
                      </tr>
                    ))}
                    {(cauciones.ars||[]).length===0&&<tr><td colSpan={6} style={{...cellS,textAlign:"center",color:"#4a5568"}}>Sin datos ARS</td></tr>}
                  </tbody>
                </table>
              </div>
              {/* USD */}
              <div style={{background:"#111827",borderRadius:10,border:"1px solid rgba(72,187,120,0.15)",overflow:"hidden"}}>
                <div style={{padding:"10px 16px",background:"#0d1220",fontWeight:700,fontSize:12,color:"#68d391"}}>Cauciones USD U$S</div>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    <th style={hdS}>Días</th><th style={{...hdS,textAlign:"right"}}>Monto</th><th style={{...hdS,textAlign:"right"}}>VWAP</th><th style={{...hdS,textAlign:"right"}}>Last</th><th style={{...hdS,textAlign:"right"}}>Bid</th><th style={{...hdS,textAlign:"right"}}>Offer</th>
                  </tr></thead>
                  <tbody>
                    {(cauciones.usd||[]).map((c,i)=>(
                      <tr key={i} onMouseEnter={e=>e.currentTarget.style.background="rgba(72,187,120,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{...cellS,fontWeight:700,color:"#f7fafc"}}>{c.days!=null?c.days+"d":"—"}</td>
                        <td style={{...cellS,textAlign:"right",color:"#a0aec0"}}>{c.monto!=null?fmtNum(Math.round(c.monto)):"—"}</td>
                        <td style={{...cellS,textAlign:"right",color:"#f6e05e",fontWeight:600}}>{fmtRate(c.rate_vwap)}</td>
                        <td style={{...cellS,textAlign:"right",color:c.rate_last!=null?"#f7fafc":"#4a5568"}}>{fmtRate(c.rate_last)}</td>
                        <td style={{...cellS,textAlign:"right",color:c.rate_bid!=null?"#48bb78":"#4a5568"}}>{fmtRate(c.rate_bid)}</td>
                        <td style={{...cellS,textAlign:"right",color:c.rate_offer!=null?"#fc8181":"#4a5568"}}>{fmtRate(c.rate_offer)}</td>
                      </tr>
                    ))}
                    {(cauciones.usd||[]).length===0&&<tr><td colSpan={6} style={{...cellS,textAlign:"center",color:"#4a5568"}}>Sin datos USD</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ):(
            caucionLoading?
              <div style={{padding:40,textAlign:"center",color:"#a0aec0",fontSize:13}}>Cargando cauciones...</div>:
              <div style={{padding:40,textAlign:"center",color:"#4a5568",fontSize:13}}>No hay datos de cauciones disponibles. <button onClick={fetchCauciones} style={{color:"#63b3ed",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>Reintentar</button></div>
          )}
          <div style={{marginTop:16,fontSize:10,color:"#4a5568"}}>
            Debug: <code style={{background:"#1a2332",padding:"2px 6px",borderRadius:3}}>/api/byma/cauciones</code> · <code style={{background:"#1a2332",padding:"2px 6px",borderRadius:3}}>/api/byma/cauciones/raw</code>
          </div>
        </div>
      )}

      {/* ── BONDS TABLE ── */}
      {!isTasa&&(
        <div>
          <div style={{background:"#111827",borderRadius:10,border:"1px solid rgba(99,179,237,0.1)",overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  <th style={hdS}>Símbolo</th>
                  <th style={{...hdS,textAlign:"right"}}>Last</th>
                  <th style={{...hdS,textAlign:"right"}}>Bid</th>
                  <th style={{...hdS,textAlign:"right"}}>Offer</th>
                  <th style={{...hdS,textAlign:"right"}}>Spread</th>
                  <th style={{...hdS,textAlign:"right"}}>Vol VN</th>
                  <th style={{...hdS,textAlign:"right"}}>Monto</th>
                  <th style={{...hdS,textAlign:"right"}}>VWAP</th>
                  <th style={{...hdS,textAlign:"center",width:40}}></th>
                </tr>
              </thead>
              <tbody>
                {curves[activeCurve].symbols.map(s=>{
                  const q=quotes[s.rofexTicker]||{};
                  const hasError=!!q.error;
                  const spread=(q.bid!=null&&q.offer!=null)?(q.offer-q.bid).toFixed(2):"\u2014";
                  return(
                    <tr key={s.display} style={{transition:"background 0.15s",opacity:hasError?0.5:1}} onMouseEnter={e=>e.currentTarget.style.background="rgba(99,179,237,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"} title={hasError?q.error:""}>
                      <td style={{...cellS,fontWeight:600,color:"#f7fafc"}}>{s.display}</td>
                      <td style={{...cellS,textAlign:"right",color:q.last!=null?"#f6e05e":"#4a5568"}}>{fmtPx(q.last)}</td>
                      <td style={{...cellS,textAlign:"right",color:q.bid!=null?"#48bb78":"#4a5568"}}>{fmtPx(q.bid)}</td>
                      <td style={{...cellS,textAlign:"right",color:q.offer!=null?"#fc8181":"#4a5568"}}>{fmtPx(q.offer)}</td>
                      <td style={{...cellS,textAlign:"right",color:"#a0aec0"}}>{spread}</td>
                      <td style={{...cellS,textAlign:"right",color:"#a0aec0"}}>{q.vol_vn!=null?fmtNum(Math.round(q.vol_vn)):"\u2014"}</td>
                      <td style={{...cellS,textAlign:"right",color:"#a0aec0"}}>{q.vol_amount!=null?fmtNum(Math.round(q.vol_amount)):"\u2014"}</td>
                      <td style={{...cellS,textAlign:"right",color:q.vwap!=null?"#b794f4":"#4a5568",fontWeight:q.vwap!=null?600:400}}>{fmtPx(q.vwap)}</td>
                      <td style={{...cellS,textAlign:"center"}}>{hasError?<span title={q.error} style={{color:"#fc8181",cursor:"help"}}>⚠</span>:q.last!=null?<span style={{color:"#48bb78"}}>✓</span>:<span style={{color:"#4a5568"}}>—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:16,fontSize:10,color:"#4a5568"}}>
            Debug: <code style={{background:"#1a2332",padding:"2px 6px",borderRadius:3}}>/api/byma/raw?symbol=AL30</code> · <code style={{background:"#1a2332",padding:"2px 6px",borderRadius:3}}>/api/byma/bonds?q=AL30</code>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TASAS DE FONDEO
// ============================================================
function TasasFondeo({tasas,setTasas}){
  const[newDate,setNewDate]=useState("");
  const[newRate,setNewRate]=useState("");
  const[editIdx,setEditIdx]=useState(null);
  const[editRate,setEditRate]=useState("");

  const sorted=useMemo(()=>[...tasas].sort((a,b)=>b.date.localeCompare(a.date)),[tasas]);

  const addTasa=()=>{
    if(!newDate||!newRate)return;
    const rate=parseFloat(newRate.replace(",","."));
    if(isNaN(rate))return;
    // Update if date exists, else add
    const existing=tasas.findIndex(t=>t.date===newDate);
    if(existing>=0){
      setTasas(p=>p.map((t,i)=>i===existing?{...t,rate}:t));
    }else{
      setTasas(p=>[...p,{date:newDate,rate}]);
    }
    setNewDate("");setNewRate("");
  };

  const removeTasa=(date)=>{
    if(!window.confirm(`¿Eliminar tasa del ${fmtDD(date)}?`))return;
    setTasas(p=>p.filter(t=>t.date!==date));
  };

  const startEdit=(idx,rate)=>{setEditIdx(idx);setEditRate(String(rate).replace(".",","));};
  const saveEdit=(date)=>{
    const rate=parseFloat(editRate.replace(",","."));
    if(isNaN(rate)){setEditIdx(null);return;}
    setTasas(p=>p.map(t=>t.date===date?{...t,rate}:t));
    setEditIdx(null);
  };

  // Stats
  const avg=tasas.length>0?(tasas.reduce((s,t)=>s+t.rate,0)/tasas.length):0;
  const latest=sorted.length>0?sorted[0]:null;

  const cellS={padding:"8px 14px",fontSize:12,borderBottom:"1px solid rgba(99,179,237,0.06)"};
  const hdS={...cellS,fontWeight:600,color:"#718096",fontSize:10,letterSpacing:"0.5px",textTransform:"uppercase",background:"#0d1220"};

  return(
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{marginBottom:20,fontSize:14,color:"#a0aec0"}}>Registro diario de tasa de fondeo (caución)</div>

      {/* Stats */}
      <div style={{display:"flex",gap:16,marginBottom:20}}>
        <div style={{flex:1,background:"#111827",borderRadius:10,border:"1px solid rgba(99,179,237,0.1)",padding:"16px 20px"}}>
          <div style={{fontSize:10,color:"#718096",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>Última tasa</div>
          <div style={{fontSize:22,fontWeight:700,color:"#f6e05e"}}>{latest?latest.rate.toFixed(2)+"%":"—"}</div>
          <div style={{fontSize:10,color:"#4a5568",marginTop:2}}>{latest?fmtDD(latest.date):""}</div>
        </div>
        <div style={{flex:1,background:"#111827",borderRadius:10,border:"1px solid rgba(99,179,237,0.1)",padding:"16px 20px"}}>
          <div style={{fontSize:10,color:"#718096",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>Promedio</div>
          <div style={{fontSize:22,fontWeight:700,color:"#63b3ed"}}>{avg.toFixed(2)}%</div>
          <div style={{fontSize:10,color:"#4a5568",marginTop:2}}>{tasas.length} registro{tasas.length!==1?"s":""}</div>
        </div>
      </div>

      {/* Add new */}
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:20,padding:16,background:"#111827",borderRadius:10,border:"1px solid rgba(99,179,237,0.1)"}}>
        <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} style={{padding:"8px 12px",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:"#f7fafc",fontSize:12,fontFamily:"inherit",outline:"none"}}/>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <input value={newRate} onChange={e=>setNewRate(e.target.value)} placeholder="Tasa %" style={{padding:"8px 12px",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:"#f7fafc",fontSize:12,fontFamily:"inherit",outline:"none",width:100,textAlign:"right"}} onKeyDown={e=>e.key==="Enter"&&addTasa()}/>
          <span style={{fontSize:11,color:"#718096"}}>%</span>
        </div>
        <button onClick={addTasa} style={{padding:"8px 20px",background:"#3182ce",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Agregar</button>
      </div>

      {/* Table */}
      <div style={{background:"#111827",borderRadius:10,border:"1px solid rgba(99,179,237,0.1)",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              <th style={hdS}>Fecha</th>
              <th style={{...hdS,textAlign:"right"}}>Tasa Fondeo</th>
              <th style={{...hdS,textAlign:"center",width:80}}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t,i)=>{
              const isEditing=editIdx===i;
              return(
                <tr key={t.date} onMouseEnter={e=>e.currentTarget.style.background="rgba(99,179,237,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{...cellS,fontWeight:600,color:"#f7fafc"}}>{fmtDD(t.date)}</td>
                  <td style={{...cellS,textAlign:"right"}}>
                    {isEditing?(
                      <input value={editRate} onChange={e=>setEditRate(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit(t.date);if(e.key==="Escape")setEditIdx(null);}} onBlur={()=>saveEdit(t.date)} autoFocus style={{padding:"4px 8px",background:"#1a2332",border:"1px solid #3182ce",borderRadius:4,color:"#f6e05e",fontSize:12,fontFamily:"inherit",outline:"none",width:80,textAlign:"right"}}/>
                    ):(
                      <span style={{color:"#f6e05e",fontWeight:600,cursor:"pointer"}} onClick={()=>startEdit(i,t.rate)}>{t.rate.toFixed(2)}%</span>
                    )}
                  </td>
                  <td style={{...cellS,textAlign:"center"}}>
                    <button onClick={()=>startEdit(i,t.rate)} style={{background:"none",border:"none",color:"#718096",cursor:"pointer",fontSize:12,padding:"2px 6px"}}>✏️</button>
                    <button onClick={()=>removeTasa(t.date)} style={{background:"none",border:"none",color:"#718096",cursor:"pointer",fontSize:12,padding:"2px 6px"}}>✕</button>
                  </td>
                </tr>
              );
            })}
            {sorted.length===0&&(
              <tr><td colSpan={3} style={{...cellS,textAlign:"center",color:"#4a5568",padding:30}}>No hay tasas registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// PRECIOS MANUALES - Base de datos de precios día por día
// ============================================================
function PreciosManuales({manualPrices,setManualPrices}){
  const today=fmtD(new Date());
  const[newTicker,setNewTicker]=useState("");
  const[newDate,setNewDate]=useState(today);
  const[newPx,setNewPx]=useState("");
  const[filterTicker,setFilterTicker]=useState("");
  const[editKey,setEditKey]=useState(null);// "ticker|date"
  const[editVal,setEditVal]=useState("");

  // All tickers that have manual prices
  const tickers=useMemo(()=>Object.keys(manualPrices).sort(),[manualPrices]);

  // Filtered view: all entries flattened, sorted by date desc then ticker
  const allEntries=useMemo(()=>{
    const entries=[];
    for(const[ticker,arr]of Object.entries(manualPrices)){
      if(filterTicker&&!ticker.toUpperCase().includes(filterTicker.toUpperCase()))continue;
      for(const e of arr){
        entries.push({ticker,date:e.date,price:e.price});
      }
    }
    entries.sort((a,b)=>b.date.localeCompare(a.date)||a.ticker.localeCompare(b.ticker));
    return entries;
  },[manualPrices,filterTicker]);

  // Last price per ticker for quick view
  const lastPrices=useMemo(()=>{
    const m={};
    for(const[ticker,arr]of Object.entries(manualPrices)){
      if(arr.length>0)m[ticker]=arr[arr.length-1];
    }
    return m;
  },[manualPrices]);

  const addPrice=()=>{
    const ticker=newTicker.trim().toUpperCase();
    if(!ticker||!newDate||!newPx)return;
    const price=parseFloat(newPx.replace(",","."));
    if(isNaN(price))return;
    setManualPrices(prev=>{
      const arr=[...(prev[ticker]||[])].filter(x=>x.date!==newDate);
      arr.push({date:newDate,price});
      arr.sort((a,b)=>a.date.localeCompare(b.date));
      return{...prev,[ticker]:arr};
    });
    setNewPx("");
  };

  const removeEntry=(ticker,date)=>{
    setManualPrices(prev=>{
      const arr=(prev[ticker]||[]).filter(x=>x.date!==date);
      if(arr.length===0){const{[ticker]:_,...rest}=prev;return rest;}
      return{...prev,[ticker]:arr};
    });
  };

  const saveEdit=(ticker,date)=>{
    const v=parseFloat(editVal.replace(",","."));
    if(!isNaN(v)){
      setManualPrices(prev=>{
        const arr=(prev[ticker]||[]).map(x=>x.date===date?{...x,price:v}:x);
        return{...prev,[ticker]:arr};
      });
    }
    setEditKey(null);
  };

  const cellS={padding:"8px 14px",fontSize:12,borderBottom:"1px solid rgba(99,179,237,0.06)"};
  const hdS={...cellS,fontWeight:600,color:"#718096",fontSize:10,letterSpacing:"0.5px",textTransform:"uppercase",background:"#0d1220"};

  return(
    <div>
      <div style={{marginBottom:20,fontSize:14,color:"#a0aec0"}}>Base de precios manual — registrá precios por ticker y fecha. En PNL modo "Manual" usa el último precio cargado.</div>

      {/* Last prices summary */}
      {tickers.length>0&&(
        <div style={{marginBottom:16,display:"flex",gap:8,flexWrap:"wrap"}}>
          {tickers.map(t=>{const lp=lastPrices[t];return lp?(
            <div key={t} style={{padding:"6px 12px",background:"rgba(183,148,244,0.08)",border:"1px solid rgba(183,148,244,0.15)",borderRadius:6,display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:11,fontWeight:700,color:"#b794f4"}}>{t}</span>
              <span style={{fontSize:12,fontWeight:600,color:"#f7fafc"}}>{lp.price.toFixed(4)}</span>
              <span style={{fontSize:9,color:"#718096"}}>{fmtDD(lp.date)}</span>
            </div>
          ):null;})}
        </div>
      )}

      {/* Add new price */}
      <div style={{background:"#111827",borderRadius:12,border:"1px solid rgba(99,179,237,0.1)",padding:16,marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:600,color:"#b794f4",marginBottom:10}}>Agregar precio</div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <input value={newTicker} onChange={e=>setNewTicker(e.target.value.toUpperCase())} placeholder="Ticker" style={{padding:"8px 12px",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:"#f7fafc",fontSize:12,fontFamily:"inherit",outline:"none",width:120}} onKeyDown={e=>e.key==="Enter"&&addPrice()}/>
          <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} style={{padding:"8px 12px",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:"#f7fafc",fontSize:12,fontFamily:"inherit",outline:"none"}}/>
          <input value={newPx} onChange={e=>setNewPx(e.target.value)} placeholder="Precio" style={{padding:"8px 12px",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:"#f7fafc",fontSize:12,fontFamily:"inherit",outline:"none",width:100,textAlign:"right"}} onKeyDown={e=>e.key==="Enter"&&addPrice()}/>
          <button onClick={addPrice} disabled={!newTicker||!newDate||!newPx} style={{padding:"8px 16px",borderRadius:6,border:"none",background:newTicker&&newDate&&newPx?"linear-gradient(135deg,#805ad5,#b794f4)":"#2d3748",color:newTicker&&newDate&&newPx?"#fff":"#4a5568",fontSize:11,fontWeight:700,cursor:newTicker&&newDate&&newPx?"pointer":"not-allowed",fontFamily:"inherit"}}>Agregar</button>
        </div>
        <div style={{fontSize:10,color:"#4a5568",marginTop:6}}>Si el ticker+fecha ya existe, se sobreescribe el precio</div>
      </div>

      {/* Filter */}
      <div style={{marginBottom:12,display:"flex",gap:8,alignItems:"center"}}>
        <input value={filterTicker} onChange={e=>setFilterTicker(e.target.value)} placeholder="Filtrar ticker..." style={{padding:"6px 12px",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:"#f7fafc",fontSize:11,fontFamily:"inherit",outline:"none",width:160}}/>
        <span style={{fontSize:10,color:"#4a5568"}}>{allEntries.length} entradas{filterTicker?` (filtrado: ${filterTicker})`:""}</span>
      </div>

      {/* Table */}
      <div style={{background:"#111827",borderRadius:12,border:"1px solid rgba(99,179,237,0.1)",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              <th style={hdS}>Ticker</th>
              <th style={hdS}>Fecha</th>
              <th style={{...hdS,textAlign:"right"}}>Precio</th>
              <th style={{...hdS,textAlign:"center",width:60}}></th>
            </tr>
          </thead>
          <tbody>
            {allEntries.length===0?(
              <tr><td colSpan={4} style={{...cellS,textAlign:"center",color:"#4a5568"}}>Sin precios cargados</td></tr>
            ):allEntries.slice(0,200).map(e=>{
              const key=e.ticker+"|"+e.date;
              const isEd=editKey===key;
              return(
                <tr key={key} style={{transition:"background 0.15s"}} onMouseEnter={ev=>ev.currentTarget.style.background="rgba(99,179,237,0.04)"} onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
                  <td style={{...cellS,fontWeight:600,color:"#b794f4"}}>{e.ticker}</td>
                  <td style={{...cellS,color:"#a0aec0"}}>{fmtDD(e.date)}</td>
                  <td style={{...cellS,textAlign:"right"}}>
                    {isEd?(
                      <input value={editVal} onChange={ev=>setEditVal(ev.target.value)} onKeyDown={ev=>{if(ev.key==="Enter")saveEdit(e.ticker,e.date);if(ev.key==="Escape")setEditKey(null);}} onBlur={()=>saveEdit(e.ticker,e.date)} autoFocus style={{padding:"3px 6px",background:"#1a2332",border:"1px solid #b794f4",borderRadius:4,color:"#b794f4",fontSize:12,fontFamily:"inherit",outline:"none",width:80,textAlign:"right"}}/>
                    ):(
                      <span style={{cursor:"pointer",fontWeight:600,color:"#f7fafc"}} onClick={()=>{setEditKey(key);setEditVal(String(e.price));}}>{e.price.toFixed(4)}</span>
                    )}
                  </td>
                  <td style={{...cellS,textAlign:"center"}}>
                    <button onClick={()=>removeEntry(e.ticker,e.date)} style={{background:"none",border:"none",color:"#fc8181",cursor:"pointer",fontSize:13,fontFamily:"inherit",padding:2}} title="Eliminar">\u2715</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// BONOS VENCIDOS
// ============================================================
function BonosVencidos({bonosVencidos,setBonosVencidos}){
  const[newTicker,setNewTicker]=useState("");
  const[newFecha,setNewFecha]=useState("");
  const[newPx,setNewPx]=useState("");
  const[editIdx,setEditIdx]=useState(null);
  const[editPx,setEditPx]=useState("");

  const sorted=useMemo(()=>[...bonosVencidos].sort((a,b)=>b.fechaVto.localeCompare(a.fechaVto)),[bonosVencidos]);

  const addBono=()=>{
    if(!newTicker.trim()||!newFecha||!newPx)return;
    const px=parseFloat(newPx.replace(",","."));
    if(isNaN(px))return;
    const ticker=newTicker.trim().toUpperCase();
    // Update if ticker exists
    const existing=bonosVencidos.findIndex(b=>b.ticker.toUpperCase()===ticker);
    if(existing>=0){
      setBonosVencidos(p=>p.map((b,i)=>i===existing?{...b,fechaVto:newFecha,pxVto:px}:b));
    }else{
      setBonosVencidos(p=>[...p,{ticker,fechaVto:newFecha,pxVto:px}]);
    }
    setNewTicker("");setNewFecha("");setNewPx("");
  };

  const removeBono=(ticker)=>{
    if(!window.confirm(`¿Eliminar ${ticker}?`))return;
    setBonosVencidos(p=>p.filter(b=>b.ticker!==ticker));
  };

  const startEdit=(idx,px)=>{setEditIdx(idx);setEditPx(String(px).replace(".",","));};
  const saveEdit=(ticker)=>{
    const px=parseFloat(editPx.replace(",","."));
    if(isNaN(px)){setEditIdx(null);return;}
    setBonosVencidos(p=>p.map(b=>b.ticker===ticker?{...b,pxVto:px}:b));
    setEditIdx(null);
  };

  const cellS={padding:"10px 14px",fontSize:12,borderBottom:"1px solid rgba(99,179,237,0.06)"};
  const hdS={...cellS,fontWeight:600,color:"#718096",fontSize:10,letterSpacing:"0.5px",textTransform:"uppercase",background:"#0d1220"};

  return(
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{marginBottom:20,fontSize:14,color:"#a0aec0"}}>Registro de bonos que vencieron — precio de vencimiento para PNL</div>

      {/* Add new */}
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:20,padding:16,background:"#111827",borderRadius:10,border:"1px solid rgba(99,179,237,0.1)",flexWrap:"wrap"}}>
        <input value={newTicker} onChange={e=>setNewTicker(e.target.value)} placeholder="Ticker (ej: AL29)" style={{padding:"8px 12px",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:"#f7fafc",fontSize:12,fontFamily:"inherit",outline:"none",width:120,textTransform:"uppercase"}}/>
        <input type="date" value={newFecha} onChange={e=>setNewFecha(e.target.value)} style={{padding:"8px 12px",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:"#f7fafc",fontSize:12,fontFamily:"inherit",outline:"none"}}/>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <input value={newPx} onChange={e=>setNewPx(e.target.value)} placeholder="Precio vto" style={{padding:"8px 12px",background:"#1a2332",border:"1px solid rgba(99,179,237,0.15)",borderRadius:6,color:"#f7fafc",fontSize:12,fontFamily:"inherit",outline:"none",width:120,textAlign:"right"}} onKeyDown={e=>e.key==="Enter"&&addBono()}/>
          <span style={{fontSize:11,color:"#718096"}}>%VN</span>
        </div>
        <button onClick={addBono} style={{padding:"8px 20px",background:"#3182ce",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Agregar</button>
      </div>

      {/* Table */}
      <div style={{background:"#111827",borderRadius:10,border:"1px solid rgba(99,179,237,0.1)",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              <th style={hdS}>Ticker</th>
              <th style={hdS}>Fecha Vencimiento</th>
              <th style={{...hdS,textAlign:"right"}}>Precio Vto (%VN)</th>
              <th style={{...hdS,textAlign:"center",width:80}}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((bv,i)=>{
              const isEditing=editIdx===i;
              return(
                <tr key={bv.ticker} onMouseEnter={e=>e.currentTarget.style.background="rgba(99,179,237,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{...cellS,fontWeight:700,color:"#f7fafc"}}>{bv.ticker}</td>
                  <td style={{...cellS,color:"#a0aec0"}}>{fmtDD(bv.fechaVto)}</td>
                  <td style={{...cellS,textAlign:"right"}}>
                    {isEditing?(
                      <input value={editPx} onChange={e=>setEditPx(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit(bv.ticker);if(e.key==="Escape")setEditIdx(null);}} onBlur={()=>saveEdit(bv.ticker)} autoFocus style={{padding:"4px 8px",background:"#1a2332",border:"1px solid #3182ce",borderRadius:4,color:"#f6e05e",fontSize:12,fontFamily:"inherit",outline:"none",width:80,textAlign:"right"}}/>
                    ):(
                      <span style={{color:"#f6e05e",fontWeight:600,cursor:"pointer"}} onClick={()=>startEdit(i,bv.pxVto)}>{bv.pxVto.toFixed(2)}</span>
                    )}
                  </td>
                  <td style={{...cellS,textAlign:"center"}}>
                    <button onClick={()=>startEdit(i,bv.pxVto)} style={{background:"none",border:"none",color:"#718096",cursor:"pointer",fontSize:12,padding:"2px 6px"}}>✏️</button>
                    <button onClick={()=>removeBono(bv.ticker)} style={{background:"none",border:"none",color:"#718096",cursor:"pointer",fontSize:12,padding:"2px 6px"}}>✕</button>
                  </td>
                </tr>
              );
            })}
            {sorted.length===0&&(
              <tr><td colSpan={4} style={{...cellS,textAlign:"center",color:"#4a5568",padding:30}}>No hay bonos vencidos registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:16,fontSize:10,color:"#4a5568"}}>
        Los bonos vencidos se usan en Posición & PNL para valuar posiciones de tickers que ya no cotizan. El precio se expresa como % del valor nominal.
      </div>
    </div>
  );
}

function Placeholder({name}){
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400,color:"#4a5568"}}>
      <div style={{fontSize:48,marginBottom:16,opacity:0.5}}>{"\u{1F6A7}"}</div>
      <div style={{fontSize:18,fontWeight:600,marginBottom:8,color:"#718096"}}>{name}</div>
      <div style={{fontSize:13}}>En construcción — próxima etapa</div>
    </div>
  );
}
