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
  useEffect(()=>{saveS("i1",instruments);},[instruments]);
  useEffect(()=>{saveS("o1",operations);},[operations]);
  useEffect(()=>{saveS("fx1",fxOps);},[fxOps]);
  const allTickers=useMemo(()=>{const l=[];Object.entries(instruments).forEach(([f,its])=>{if(f==="Monedas")return;its.forEach(i=>l.push({...i,family:f}));});return l;},[instruments]);

  const tabs=[
    {id:"dashboard",label:"Dashboard",icon:"\u{1F4CA}"},
    {id:"blotter",label:"Blotter",icon:"\u{1F4CB}"},
    {id:"auditoria",label:"Auditoría",icon:"\u{1F50D}"},
    {id:"instrumentos",label:"Base de Instrumentos",icon:"\u{1F5C4}\uFE0F"},
    {id:"posicion",label:"Posición & PNL",icon:"\u{1F4B0}"},
    {id:"mercado",label:"Mercado",icon:"\u{1F4E1}"},
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
        {tab==="posicion"&&<PosicionPNL operations={operations} fxOps={fxOps}/>}
        {tab==="mercado"&&<Mercado/>}
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

  // Parse PX: user types digits and optionally a comma for decimals
  // Display with dots for thousands: 1.234,56
  const pxNum=useMemo(()=>{
    if(!pxRaw)return 0;
    const clean=pxRaw.replace(/\./g,"").replace(",",".");
    return parseFloat(clean)||0;
  },[pxRaw]);

  const handlePxChange=(e)=>{
    // Allow digits, one comma for decimals, dots for thousands (we format them)
    let v=e.target.value;
    // Strip everything except digits and comma
    v=v.replace(/[^0-9,]/g,"");
    // Only one comma allowed
    const parts=v.split(",");
    if(parts.length>2)v=parts[0]+","+parts.slice(1).join("");
    // Limit decimals to 2
    if(parts.length===2&&parts[1].length>2)v=parts[0]+","+parts[1].slice(0,2);
    // Format integer part with dots
    const intPart=parts[0].replace(/^0+(?=\d)/,"");
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
function PosicionPNL({operations,fxOps}){
  // Consolidate ALL title operations into net position per ticker
  const positions=useMemo(()=>{
    const pos={};// ticker -> {vn, compras, ventas, avgPx, currency, family}
    for(const op of operations){
      const key=op.ticker;
      if(!pos[key])pos[key]={ticker:key,currency:op.currency||"ARS",vnNet:0,vnCompra:0,vnVenta:0,montoTotal:0};
      if(op.type==="COMPRA"){
        pos[key].vnNet+=op.vn;
        pos[key].vnCompra+=op.vn;
      }else{
        pos[key].vnNet-=op.vn;
        pos[key].vnVenta+=op.vn;
      }
      pos[key].montoTotal+=op.monto;
    }
    return Object.values(pos).filter(p=>p.vnNet!==0||p.vnCompra>0||p.vnVenta>0).sort((a,b)=>a.ticker.localeCompare(b.ticker));
  },[operations]);

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

  const cellS={padding:"10px 14px",fontSize:12,borderBottom:"1px solid rgba(99,179,237,0.06)"};
  const hdS={...cellS,fontWeight:600,color:"#718096",fontSize:10,letterSpacing:"0.5px",textTransform:"uppercase",background:"#0d1220"};

  return(
    <div>
      <div style={{marginBottom:20,fontSize:14,color:"#a0aec0"}}>Posición consolidada global — todas las operaciones acumuladas</div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
        {/* Cash position from titles + FX */}
        <div style={{background:"#111827",borderRadius:12,border:"1px solid rgba(99,179,237,0.1)"}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid rgba(99,179,237,0.08)",fontSize:14,fontWeight:700,color:"#f7fafc"}}>
            Saldo Cash
          </div>
          <div style={{padding:"16px 20px"}}>
            {[
              {label:"ARS",val:cashFromTitles.ARS+fxPos.ARS,color:"#63b3ed"},
              {label:"USD MEP",val:cashFromTitles.MEP+fxPos.MEP,color:"#68d391"},
              {label:"USD Cable",val:cashFromTitles.CCL+fxPos.Cable,color:"#ed8936"},
            ].map(r=>(
              <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid rgba(99,179,237,0.04)"}}>
                <span style={{fontSize:12,fontWeight:600,color:r.color}}>{r.label}</span>
                <span style={{fontSize:16,fontWeight:700,fontVariantNumeric:"tabular-nums",color:r.val===0?"#4a5568":r.val>0?"#68d391":"#fc8181"}}>
                  {r.val===0?"0":fmtMoney(r.val)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* FX position detail */}
        <div style={{background:"#111827",borderRadius:12,border:"1px solid rgba(99,179,237,0.1)"}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid rgba(99,179,237,0.08)",fontSize:14,fontWeight:700,color:"#f7fafc"}}>
            Posición FX neta
          </div>
          <div style={{padding:"16px 20px"}}>
            {Object.entries(fxPos).map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid rgba(99,179,237,0.04)"}}>
                <span style={{fontSize:12,fontWeight:600,color:"#a0aec0"}}>{k}</span>
                <span style={{fontSize:16,fontWeight:700,fontVariantNumeric:"tabular-nums",color:v===0?"#4a5568":v>0?"#68d391":"#fc8181"}}>
                  {v===0?"0":fmtMoney(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Titles position table */}
      <div style={{background:"#111827",borderRadius:12,border:"1px solid rgba(99,179,237,0.1)",overflow:"hidden"}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid rgba(99,179,237,0.08)",fontSize:14,fontWeight:700,color:"#f7fafc"}}>
          Posición en Títulos (VN neto)
        </div>
        {positions.length===0?(
          <div style={{padding:"30px 20px",textAlign:"center",color:"#4a5568",fontSize:13}}>Sin posiciones abiertas</div>
        ):(
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th style={hdS}>Ticker</th>
                <th style={hdS}>Moneda</th>
                <th style={{...hdS,textAlign:"right"}}>VN Comprado</th>
                <th style={{...hdS,textAlign:"right"}}>VN Vendido</th>
                <th style={{...hdS,textAlign:"right"}}>VN Neto</th>
                <th style={{...hdS,textAlign:"right"}}>Monto Neto</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(p=>(
                <tr key={p.ticker} style={{transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(99,179,237,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{...cellS,fontWeight:600,color:"#f7fafc"}}>{p.ticker}</td>
                  <td style={cellS}>
                    <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,fontWeight:700,background:p.currency==="ARS"?"rgba(99,179,237,0.1)":p.currency==="MEP"?"rgba(72,187,120,0.1)":"rgba(237,137,54,0.1)",color:p.currency==="ARS"?"#63b3ed":p.currency==="MEP"?"#68d391":"#ed8936"}}>{p.currency}</span>
                  </td>
                  <td style={{...cellS,textAlign:"right",color:"#68d391"}}>{p.vnCompra>0?"+"+fmtNum(p.vnCompra):"\u2014"}</td>
                  <td style={{...cellS,textAlign:"right",color:"#fc8181"}}>{p.vnVenta>0?"-"+fmtNum(p.vnVenta):"\u2014"}</td>
                  <td style={{...cellS,textAlign:"right",fontWeight:700,fontSize:14,color:p.vnNet>0?"#68d391":p.vnNet<0?"#fc8181":"#4a5568"}}>
                    {p.vnNet>0?"+":""}{fmtNum(p.vnNet)}
                  </td>
                  <td style={{...cellS,textAlign:"right",fontWeight:600,color:p.montoTotal>=0?"#68d391":"#fc8181"}}>
                    {fmtMoney(p.montoTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MERCADO — Live Market Data via pyRofex
// ============================================================
import { curves } from "./config/curves.js";

const INTERVALS=[
  {label:"1 min",ms:60000},
  {label:"5 min",ms:300000},
  {label:"10 min",ms:600000},
  {label:"30 min",ms:1800000},
  {label:"1 hora",ms:3600000},
];

function getArgentinaTime(){
  // Argentina is UTC-3 always (no DST)
  const now=new Date();
  const utc=now.getTime()+now.getTimezoneOffset()*60000;
  return new Date(utc-3*3600000);
}

function isMarketOpen(){
  const ar=getArgentinaTime();
  const day=ar.getDay();
  if(day===0||day===6)return false;// weekend
  const h=ar.getHours();
  const m=ar.getMinutes();
  const mins=h*60+m;
  // 10:30 to 16:59 AR
  return mins>=630&&mins<1020;
}

function fmtARTime(d){
  if(!d)return"";
  const ar=new Date(d.getTime());
  // We show the local time as-is since we want to show "when we fetched"
  return ar.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
}

function Mercado(){
  const curveKeys=[...Object.keys(curves),"tasa"];
  const curveLabels={...Object.fromEntries(Object.keys(curves).map(k=>[k,curves[k].label])),tasa:"Tasas"};
  const[activeCurve,setActiveCurve]=useState(curveKeys[0]);
  const[quotes,setQuotes]=useState({});
  const[status,setStatus]=useState("idle");
  const[errorMsg,setErrorMsg]=useState("");
  const[intervalIdx,setIntervalIdx]=useState(1);
  const[lastUpdate,setLastUpdate]=useState(null);
  const[mktOpen,setMktOpen]=useState(isMarketOpen());
  const[source,setSource]=useState("rofex");
  const[cauciones,setCauciones]=useState(null);
  const[caucionLoading,setCaucionLoading]=useState(false);
  const timerRef=useRef(null);
  const mktCheckRef=useRef(null);

  const isTasa=activeCurve==="tasa";
  const isByma=source==="byma";

  const fetchQuotes=async()=>{
    if(isTasa){fetchCauciones();return;}
    const syms=curves[activeCurve].symbols.map(s=>s.rofexTicker).join(",");
    if(!syms)return;
    setStatus("loading");setErrorMsg("");
    try{
      const endpoint=isByma?"/api/byma/quotes":"/api/quotes";
      const r=await fetch(endpoint+"?symbols="+encodeURIComponent(syms));
      const data=await r.json();
      const symsData=data.symbols||{};
      setQuotes(symsData);setLastUpdate(new Date());
      const vals=Object.values(symsData);
      const allErrors=vals.length>0&&vals.every(v=>v.error);
      if(allErrors){setStatus("error");setErrorMsg(vals[0]?.error||"Error desconocido");return;}
      setStatus("ok");
    }catch(e){setStatus("error");setErrorMsg(e.message||"Error de conexión");}
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

  useEffect(()=>{
    const check=()=>setMktOpen(isMarketOpen());
    check();mktCheckRef.current=setInterval(check,30000);
    return()=>clearInterval(mktCheckRef.current);
  },[]);

  useEffect(()=>{
    fetchQuotes();
    clearInterval(timerRef.current);
    if(!isTasa&&!isByma){
      const ms=INTERVALS[intervalIdx].ms;
      timerRef.current=setInterval(fetchQuotes,ms);
    }
    return()=>clearInterval(timerRef.current);
  },[activeCurve,intervalIdx,source]);

  const statusColor=status==="ok"?"#48bb78":status==="error"?"#fc8181":status==="loading"?"#f6e05e":"#a0aec0";
  const cellS={padding:"8px 12px",fontSize:12,borderBottom:"1px solid rgba(99,179,237,0.06)"};
  const hdS={...cellS,fontWeight:600,color:"#718096",fontSize:10,letterSpacing:"0.5px",textTransform:"uppercase",background:"#0d1220"};
  const btnS=(active)=>({padding:"6px 14px",borderRadius:4,border:active?"1px solid #3182ce":"1px solid rgba(99,179,237,0.15)",background:active?"rgba(49,130,206,0.15)":"transparent",color:active?"#63b3ed":"#718096",fontSize:10,fontWeight:active?600:400,cursor:"pointer",fontFamily:"inherit"});
  const srcBtnS=(active,color)=>({padding:"6px 14px",borderRadius:4,border:active?`1px solid ${color}`:"1px solid rgba(99,179,237,0.15)",background:active?`${color}22`:"transparent",color:active?color:"#718096",fontSize:10,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit"});
  const fmtPx=(v)=>v!=null?Number(v).toFixed(2):"\u2014";
  const fmtRate=(v)=>v!=null?Number(v).toFixed(2)+"%":"\u2014";

  return(
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      {/* BYMA delay banner */}
      {isByma&&!isTasa&&(
        <div style={{marginBottom:16,padding:"10px 20px",background:"rgba(237,137,54,0.08)",border:"1px solid rgba(237,137,54,0.2)",borderRadius:8,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>⏱️</span>
          <div style={{fontSize:12,color:"#ed8936",fontWeight:600}}>BYMA Open — Datos con delay ~20 min</div>
        </div>
      )}

      {/* Market status banner (ROFEX only) */}
      {!mktOpen&&!isByma&&!isTasa&&(
        <div style={{marginBottom:16,padding:"12px 20px",background:"rgba(246,224,94,0.08)",border:"1px solid rgba(246,224,94,0.2)",borderRadius:8,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>🔒</span>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"#f6e05e"}}>Mercado cerrado</div>
            <div style={{fontSize:11,color:"#a0aec0"}}>Horario BYMA: 10:30 a 17:00 hs (Argentina)</div>
          </div>
        </div>
      )}

      {/* Source toggle + Curve tabs */}
      <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        {!isTasa&&(
          <div style={{display:"flex",gap:4,alignItems:"center",padding:"4px 6px",background:"rgba(99,179,237,0.04)",borderRadius:6,border:"1px solid rgba(99,179,237,0.08)"}}>
            <span style={{fontSize:10,color:"#718096",marginRight:4}}>Fuente:</span>
            <button onClick={()=>setSource("rofex")} style={srcBtnS(source==="rofex","#63b3ed")}>ROFEX</button>
            <button onClick={()=>setSource("byma")} style={srcBtnS(source==="byma","#ed8936")}>BYMA Open</button>
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

      {/* Controls bar (only for ROFEX, not BYMA, not Tasa) */}
      {!isByma&&!isTasa&&(
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:8,height:8,borderRadius:99,background:statusColor,boxShadow:`0 0 6px ${statusColor}`}}/>
            <span style={{fontSize:11,fontWeight:600,color:statusColor}}>
              {status==="ok"?(mktOpen?"LIVE":"OK"):status==="error"?"ERROR":status==="loading"?"...":"IDLE"}
            </span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:10,color:"#718096",marginRight:4}}>Actualizar cada:</span>
            {INTERVALS.map((iv,i)=>(
              <button key={i} onClick={()=>setIntervalIdx(i)} style={btnS(i===intervalIdx)}>{iv.label}</button>
            ))}
          </div>
          <button onClick={fetchQuotes} style={{padding:"6px 16px",borderRadius:4,border:"1px solid rgba(99,179,237,0.2)",background:"rgba(49,130,206,0.1)",color:"#63b3ed",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>↻ Refresh</button>
          {lastUpdate&&<span style={{fontSize:10,color:"#4a5568"}}>Última actualización: {fmtARTime(lastUpdate)}</span>}
        </div>
      )}

      {/* BYMA/Tasa minimal controls */}
      {(isByma||isTasa)&&(
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:8,height:8,borderRadius:99,background:statusColor,boxShadow:`0 0 6px ${statusColor}`}}/>
            <span style={{fontSize:11,fontWeight:600,color:statusColor}}>
              {status==="ok"?"DELAYED":status==="error"?"ERROR":status==="loading"?"...":"IDLE"}
            </span>
          </div>
          <button onClick={fetchQuotes} style={{padding:"6px 16px",borderRadius:4,border:"1px solid rgba(99,179,237,0.2)",background:"rgba(49,130,206,0.1)",color:"#63b3ed",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>↻ Refresh</button>
          {lastUpdate&&<span style={{fontSize:10,color:"#4a5568"}}>Última actualización: {fmtARTime(lastUpdate)}</span>}
        </div>
      )}

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
                    <tr key={s.display} style={{transition:"background 0.15s",opacity:hasError?0.5:1}} onMouseEnter={e=>e.currentTarget.style.background="rgba(99,179,237,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"} title={hasError?q.error:(q.resolved_ticker||"")}>
                      <td style={{...cellS,fontWeight:600,color:"#f7fafc"}}>{s.display}</td>
                      <td style={{...cellS,textAlign:"right",color:q.last!=null?"#f6e05e":"#4a5568"}}>{fmtPx(q.last)}</td>
                      <td style={{...cellS,textAlign:"right",color:q.bid!=null?"#48bb78":"#4a5568"}}>{fmtPx(q.bid)}</td>
                      <td style={{...cellS,textAlign:"right",color:q.offer!=null?"#fc8181":"#4a5568"}}>{fmtPx(q.offer)}</td>
                      <td style={{...cellS,textAlign:"right",color:"#a0aec0"}}>{spread}</td>
                      <td style={{...cellS,textAlign:"right",color:"#a0aec0"}}>{q.vol_vn!=null?fmtNum(Math.round(q.vol_vn)):"\u2014"}</td>
                      <td style={{...cellS,textAlign:"right",color:"#a0aec0"}}>{q.vol_amount!=null?fmtNum(Math.round(q.vol_amount)):(q.effective_volume!=null?fmtNum(Math.round(q.effective_volume)):"\u2014")}</td>
                      {isByma&&<td style={{...cellS,textAlign:"right",color:q.vwap!=null?"#b794f4":"#4a5568",fontWeight:q.vwap!=null?600:400}}>{fmtPx(q.vwap)}</td>}
                      {!isByma&&<td style={{...cellS,textAlign:"right",color:"#4a5568"}}>—</td>}
                      <td style={{...cellS,textAlign:"center"}}>{hasError?<span title={q.error} style={{color:"#fc8181",cursor:"help"}}>⚠</span>:q.last!=null?<span style={{color:"#48bb78"}}>✓</span>:<span style={{color:"#4a5568"}}>—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:16,fontSize:10,color:"#4a5568"}}>
            Debug: <code style={{background:"#1a2332",padding:"2px 6px",borderRadius:3}}>/api/health</code> · <code style={{background:"#1a2332",padding:"2px 6px",borderRadius:3}}>{isByma?"/api/byma/raw?symbol=AL30":"/api/debug/AL30"}</code> · <code style={{background:"#1a2332",padding:"2px 6px",borderRadius:3}}>{isByma?"/api/byma/bonds?q=AL30":"/api/instruments?q=AL30"}</code>
          </div>
        </div>
      )}
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
