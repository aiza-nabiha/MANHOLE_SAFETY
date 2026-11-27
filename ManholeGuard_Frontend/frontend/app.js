
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let selected="MH-03",range="30m",chart=null;
const rank = {
  EMERGENCY: 5,
  DANGER: 4,
  WARNING: 3,
  HIGH: 3,
  MEDIUM: 2,
  SAFE: 1,
  NORMAL: 1,
  FAULT: 0,
  OFFLINE: -1
};

const label = {
  EMERGENCY: "EMERGENCY",
  DANGER: "Danger",
  WARNING: "Warning",
  SAFE: "Safe",
  NORMAL: "Safe",
  MEDIUM: "Warning",
  HIGH: "Danger",
  OFFLINE: "Offline",
  FAULT: "Sensor fault",
  UNKNOWN: "Unknown"
};

const statusOf = m =>
  m.overallStatus ||
  (m.sos ? "EMERGENCY" : m.status);

const cls = (s) => {
  return {
    EMERGENCY: "emergency",
    DANGER: "high",
    WARNING: "medium",
    SAFE: "normal",
    NORMAL: "normal",
    MEDIUM: "medium",
    HIGH: "high",
    OFFLINE: "offline",
    FAULT: "fault",
    UNKNOWN: "offline"
  }[s] || "offline";
};

const badge=s=>`<span class="badge ${cls(s)}">${label[s]||s}</span>`;

function toast(t){
  const x=$("#toast");
  x.textContent=t;
  x.classList.add("show");
  setTimeout(()=>x.classList.remove("show"),2200)
}

function route(){
  let p=location.hash.replace(/^#\/?/,"").split("/");
  return {page:p[0]||"home",id:p[1]||"MH-01"}
}

function mapSvg(){
  let pts=[[105,65],[230,150],[360,90],[495,190],[605,95],[665,275]],
  colors={NORMAL:"#16a36a",MEDIUM:"#e6a01d",HIGH:"#df414b",OFFLINE:"#8995a6"};

  return `<div class="map"><svg viewBox="0 0 760 340"><defs><pattern id="blocks" width="118" height="90" patternUnits="userSpaceOnUse"><rect width="118" height="90" fill="#eeefe9"/><path d="M7 8h42v27H7zM67 9h42v27H67zM10 53h38v28H10zM67 52h43v29H67z" fill="#fff" stroke="#dddcd4" stroke-width="2"/><path d="M57 0v90M0 43h118" stroke="#fff" stroke-width="10"/></pattern></defs><rect width="760" height="340" fill="url(#blocks)"/><path d="M-20 50C110 75 120 180 220 205S360 245 410 370" fill="none" stroke="#a1d7ec" stroke-width="46"/><path d="M0 300L760 65" stroke="#f2d477" stroke-width="12"/><path d="M330 -20L475 370" stroke="#fff" stroke-width="17"/><path d="M35 180l90-48 72 35-20 78-100 8zM530 15h120l60 70-90 38-90-35zM550 255l125-25 65 90-130 25z" fill="#cde8c7"/><g font-size="11" fill="#78877b"><text x="25" y="25">NORTH PARK</text><text x="565" y="325">RIVER ROAD</text></g>${MANHOLES.map((m,i)=>`<g class="pin" data-open="${m.id}" transform="translate(${pts[i][0]} ${pts[i][1]})"><circle r="14" fill="${colors[statusOf(m)]}"/><text y="1">${i+1}</text><title>${m.id} · ${m.location} · ${m.status}</title></g>`).join("")}</svg><div class="map-caption">ILLUSTRATIVE DEMO MAP · NOT ACTUAL GPS</div></div>`
}

function alertRow(a){
  return `<div class="alertrow" data-open="${a.manholeId}"><i class="dot ${a.type==="HIGH"||a.type==="SOS"?"high":a.type==="NORMAL"?"normal":"medium"}"></i><div><b>${a.title} · ${a.manholeId}</b><small>${a.desc}</small></div><time>${a.time}</time></div>`
}

function chartDraw(id,h){
  let el=document.getElementById(id);
  if(!el||!window.Chart)return;
  let old=Chart.getChart(el);
  if(old)old.destroy();
  let dark=document.documentElement.dataset.theme==="dark",
  c=dark?"#a9bdd6":"#78869b",
  g=dark?"#244363":"#e8edf4";

  chart=new Chart(el,{
    type:"line",
    data:{
      labels:h.labels,
      datasets:[
        {label:"MQ-4 relative response (%)",data:h.mq4,borderColor:"#e34d58",backgroundColor:"#e34d5817",fill:true,tension:.35,pointRadius:2},
        {label:"MQ-136 relative response (%)",data:h.mq136,borderColor:"#3182e8",backgroundColor:"#3182e817",fill:true,tension:.35,pointRadius:2}
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      interaction:{mode:"index",intersect:false},
      plugins:{legend:{position:"bottom",labels:{color:c,boxWidth:8,font:{size:9}}}},
      scales:{
        x:{ticks:{color:c,maxTicksLimit:6,font:{size:8}},grid:{color:g}},
        y:{beginAtZero:true,ticks:{color:c,font:{size:8}},grid:{color:g},title:{display:true,text:"Relative response increase (%)",color:c,font:{size:9}}}
      }
    }
  })
}

function home(){
  let counts=["NORMAL","MEDIUM","HIGH"].map(s=>MANHOLES.filter(m=>m.status===s).length);
  let unavailable=MANHOLES.filter(m=>["OFFLINE","UNKNOWN","FAULT"].includes(m.status)).length;
  let top=[...MANHOLES].sort((a,b)=>rank[b.status]-rank[a.status]||(b.mq4||0)+(b.mq136||0)-(a.mq4||0)-(a.mq136||0))[0];

  if(!window.manualSelect)selected=top.id;

  return `<div class="stats"><div class="stat"><i class="stat-icon blue">▣</i><div><strong>6</strong><span>Total Manholes</span></div></div><div class="stat"><i class="stat-icon green">✓</i><div><strong>${counts[0]}</strong><span>Safe · NORMAL</span></div></div><div class="stat"><i class="stat-icon amber">⚠</i><div><strong>${counts[1]}</strong><span>Warning · MEDIUM</span></div></div><div class="stat"><i class="stat-icon red">!</i><div><strong>${unavailable}</strong><span>Offline / Unverified</span></div></div></div>
<div class="row home-top"><article class="panel"><div class="head"><h2>⌖ Manhole Locations</h2><div class="legend"><span><i style="background:var(--green)"></i>Safe</span><span><i style="background:var(--amber)"></i>Warning</span><span><i style="background:var(--red)"></i>Danger</span><span><i style="background:#8995a6"></i>Offline</span></div></div>${mapSvg()}</article>
<article class="panel"><div class="head"><div><h2>☷ Manhole Status</h2><p>Six monitored locations · select a row for details</p></div><span class="badge offline">6 MANHOLES</span></div><div class="tablewrap"><table><thead><tr><th>Manhole</th><th>Location</th><th>Status</th><th>MQ-4</th><th>MQ-136</th><th>Worker</th><th>Fan</th><th>Updated</th></tr></thead><tbody>${MANHOLES.map(m=>`<tr data-open="${m.id}" class="${selected===m.id?"selected":""}"><td><b>${m.id}</b></td><td>${m.location}</td><td>${badge(statusOf(m))}</td><td>${m.mq4??"—"}%</td><td>${m.mq136??"—"}%</td><td>${m.worker}</td><td>${m.fan?"ON":"OFF"}</td><td>${m.updated}</td></tr>`).join("")}</tbody></table></div></article></div>
<div class="row home-bottom"><article class="panel"><div class="head"><div><h2>▥ Gas Response Trend — ${selected}</h2><p>Relative response increase (%)</p></div><div><select id="homeSelect" class="select"><option value="MH-01">MH-01</option><option value="MH-02">MH-02</option><option value="MH-03" selected>MH-03</option><option value="MH-04">MH-04</option><option value="MH-05">MH-05</option><option value="MH-06">MH-06</option></select> <select id="homeRange" class="select"><option value="30m">30 min</option><option value="1h">1 hour</option><option value="6h">6 hours</option><option value="24h">24 hours</option></select></div></div><div class="chartbox"><canvas id="homeChart"></canvas></div></article>
<article class="panel"><div class="head"><h2>▣ Manhole Inspection / Node Summary</h2><span class="badge offline">${selected}</span></div><div id="nodeSummary" class="summary"></div></article>
<article class="panel"><div class="head"><h2>♧ Alert Feed</h2><a href="#/alerts">View all →</a></div><div id="banner"></div><div>${ALERTS.slice(0,4).map(alertRow).join("")}</div></article></div>`
}

async function renderHomeExtra() {
  const m = MANHOLES.find(x => x.id === selected);
  if (!m) return;

  const summary = $("#nodeSummary");

  if (summary) {
    summary.innerHTML = [
      ["Worker presence", m.worker],
      ["Gas status", label[m.status] || m.status],
      ["Probe Node", m.probe],
      ["Worker Node", m.workerNode],
      ["Surface Unit", m.surface],
      ["Fan status", m.fan ? "ON" : "OFF"]
    ].map(x =>
      `<div><span>${x[0]}</span><b>${x[1]}</b></div>`
    ).join("");
  }

  const a = ALERTS.find(x =>
    x.active && ["HIGH", "SOS", "FAULT"].includes(x.type)
  );

  const banner = $("#banner");

  if (banner) {
    banner.innerHTML = a
      ? `<div class="alertbanner">⚠ <b>${a.title.toUpperCase()} — ${a.manholeId}</b>${a.desc}</div>`
      : "No high-priority active alerts";
  }

  try {
    const history = await getHistory(selected);
    chartDraw("homeChart", history);
  } catch (error) {
    console.error("History loading failed:", error);
  }
}

function diagram() {
  return `
    <div class="diagram reference-diagram">
      <img
        src="./assets/manhole-overview.png"
        alt="Manhole overview showing Surface Unit ESP32, Manhole Cover, Gas Sensors and Worker Node ESP32"
      />
    </div>
  `;
}

function detail(id) {
  let m = MANHOLES.find(x => x.id === id) || MANHOLES[0];

  if (!m) return "<div class='empty'>No manhole data available.</div>";

  selected = m.id;

  let nodes = [
    ["Probe Node", m.probe],
    ["Worker Node", m.workerNode],
    ["Surface Unit", m.surface],
    ["Wireless Link", "Not reported"]
  ];

  let sensors = [
    ["♨", "MQ-4 response", m.mq4 == null ? "—" : m.mq4 + "%", m.status],
    ["♨", "MQ-136 response", m.mq136 == null ? "—" : m.mq136 + "%", m.status],
    ["♧", "Temperature", m.temp == null ? "—" : m.temp + " °C", "NORMAL"],
    ["◉", "Humidity", m.humidity == null ? "—" : m.humidity + "%", "NORMAL"],
    ["♙", "Worker Motion", m.worker, "NORMAL"],
    ["!", "SOS", m.sos ? "PRESSED" : "NOT PRESSED", m.sos ? "HIGH" : "NORMAL"],
    ["◉", "Fan", m.fan ? "ON" : "OFF", "NORMAL"]
  ];

  return `
    <div class="head">
        <div>
            <h2>${m.id} · ${m.location}</h2>
            <p>Individual manhole monitoring · Backend readings</p>
        </div>
        <div>${badge(statusOf(m))} <a class="button secondary" href="#/home">← Back Home</a></div>
    </div>

    <div class="row detailgrid">
        <article class="panel">
            <div class="head">
                <h2>▣ Manhole Overview Diagram</h2>
                <span class="badge offline">SYSTEM MODEL</span>
            </div>
            ${diagram()}
        </article>

        <article class="panel">
            <div class="head">
                <h2>▥ Node Connectivity</h2>
                <span class="badge offline">BACKEND STATUS</span>
            </div>
            <div class="health">
                ${nodes.map(n => `
                    <div>
                        <div class="healthtop">
                            <b>${n[0]}</b>
                            <span>${n[1]}</span>
                        </div>
                        <small>Connection status reported by backend</small>
                    </div>
                `).join("")}
            </div>
            ${m.faultMessage ? `<p class="muted">Fault: ${m.faultMessage}</p>` : ""}
        </article>
    </div>

    <h3 class="sectiontitle">Sensor & Worker Parameters</h3>

    <div class="sensors">
        ${sensors.map(s => `
            <article class="sensor ${s[3] === "HIGH" ? "danger" : s[3] === "MEDIUM" ? "warn" : ""}">
                <div>${s[0]}</div>
                <small>${s[1]}</small>
                <strong>${s[2]}</strong>
                <span>${s[3]}</span>
            </article>
        `).join("")}
    </div>

    <div class="row detailbottom">
        <article class="panel">
            <div class="head">
                <div>
                    <h2>▥ Gas Response History</h2>
                    <p>MQ-4 and MQ-136 relative response increase (%)</p>
                </div>
                <select id="detailRange" class="select">
                    <option value="30m">30 minutes</option>
                    <option value="1h">1 hour</option>
                    <option value="6h">6 hours</option>
                    <option value="24h">24 hours</option>
                </select>
            </div>
            <div class="chartbox">
                <canvas id="detailChart"></canvas>
            </div>
            <p class="muted">
                MQ values are relative response increases, not certified gas safety limits.
            </p>
        </article>

        <article class="panel">
            <div class="head">
                <h2>♧ Recent Alerts & Events</h2>
                <span class="badge offline">${m.id}</span>
            </div>
            <div class="events">
                ${ALERTS.filter(a => a.manholeId === m.id).map(a => `
                    <div class="event">
                        <b>${a.title}</b>
                        <small>${a.desc}</small>
                        <small>${a.time}</small>
                    </div>
                `).join("") || '<div class="empty">No recent events for this manhole.</div>'}
            </div>
            <div class="summary" style="margin-top:12px">
                <div><span>Worker presence</span><b>${m.worker}</b></div>
                <div><span>Fan status</span><b>${m.fan ? "ON" : "OFF"}</b></div>
                <div><span>Last data</span><b>${m.updated}</b></div>
            </div>
        </article>
    </div>`;
}

function alertsPage(){
  return `<article class="panel"><div class="head"><div><h2>All Alerts & Notifications</h2><p>Events across all six demo manholes</p></div><span class="badge offline">${ALERTS.length} EVENTS</span></div><div class="toolbar"><select id="alertFilter" class="filter"><option value="ALL">All alerts</option><option value="HIGH">Danger / HIGH</option><option value="MEDIUM">Warning / MEDIUM</option><option value="SOS">Worker SOS</option><option value="FAULT">Sensor / Node faults</option><option value="NORMAL">Normal events</option></select><select id="alertState" class="filter"><option value="ALL">All states</option><option value="ACTIVE">Active only</option><option value="RESOLVED">Resolved only</option></select></div><div id="alertRows"></div></article>`
}

function fillAlerts(){
  let t=$("#alertFilter").value,
  s=$("#alertState").value,
  a=ALERTS.filter(x=>(t==="ALL"||x.type===t)&&(s==="ALL"||(s==="ACTIVE"?x.active:!x.active)));

  $("#alertRows").innerHTML=a.length?`<div class="tablewrap"><table><thead><tr><th>Severity</th><th>Manhole</th><th>Event</th><th>Description</th><th>Time</th><th>State</th></tr></thead><tbody>${a.map(x=>`<tr data-open="${x.manholeId}"><td>${badge(x.type==="SOS"?"HIGH":x.type==="FAULT"?"OFFLINE":x.type)}</td><td>${x.manholeId}</td><td>${x.title}</td><td>${x.desc}</td><td>${x.time}</td><td>${x.active?"Active":"Resolved"}</td></tr>`).join("")}</tbody></table></div>`:'<div class="empty">No alerts match this filter.</div>';

  bindOpen()
}

function analytics(){
  let valid=MANHOLES.filter(m=>m.mq4!==null),
  avg=(k)=>Math.round(valid.reduce((a,m)=>a+m[k],0)/valid.length);

  return `<div class="kpis"><div class="kpi"><small>HIGH manholes</small><b>${MANHOLES.filter(m=>m.status==="HIGH").length}</b></div><div class="kpi"><small>MEDIUM manholes</small><b>${MANHOLES.filter(m=>m.status==="MEDIUM").length}</b></div><div class="kpi"><small>Average MQ-4 response</small><b>${avg("mq4")}%</b></div><div class="kpi"><small>Average MQ-136 response</small><b>${avg("mq136")}%</b></div></div><div class="row twocharts"><article class="panel"><div class="head"><h2>Manhole-wise Gas Response</h2><span class="badge offline">DEMO</span></div><div class="chartbox largechart"><canvas id="compareChart"></canvas></div></article><article class="panel"><div class="head"><h2>Status Distribution</h2></div><div class="chartbox largechart"><canvas id="statusChart"></canvas></div></article></div><article class="panel" style="margin-top:14px"><div class="head"><h2>Manhole Comparison</h2></div><div class="tablewrap"><table><thead><tr><th>Manhole</th><th>Location</th><th>MQ-4 %</th><th>MQ-136 %</th><th>Status</th><th>Node faults</th></tr></thead><tbody>${MANHOLES.map(m=>`<tr data-open="${m.id}"><td>${m.id}</td><td>${m.location}</td><td>${m.mq4??"—"}</td><td>${m.mq136??"—"}</td><td>${badge(m.status)}</td><td>${m.probe==="OFFLINE"?"1":"0"}</td></tr>`).join("")}</tbody></table></div></article>`
}

function drawAnalytics(){
  let el=$("#compareChart");
  if(el)new Chart(el,{
    type:"bar",
    data:{
      labels:MANHOLES.map(m=>m.id),
      datasets:[
        {label:"MQ-4 (%)",data:MANHOLES.map(m=>m.mq4||0),backgroundColor:"#df4b56"},
        {label:"MQ-136 (%)",data:MANHOLES.map(m=>m.mq136||0),backgroundColor:"#3182e8"}
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}},scales:{y:{beginAtZero:true}}}
  });

  el=$("#statusChart");
  if(el)new Chart(el,{
    type:"doughnut",
    data:{
      labels:["NORMAL","MEDIUM","HIGH","OFFLINE"],
      datasets:[{data:["NORMAL","MEDIUM","HIGH","OFFLINE"].map(s=>MANHOLES.filter(m=>m.status===s).length),backgroundColor:["#16a36a","#e6a01d","#df414b","#8995a6"]}]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}}}
  })
}

function reports(){
  return `<article class="panel"><div class="head"><div><h2>Generate Monitoring Report</h2><p>Download a CSV summary of demo manholes or alerts.</p></div><span class="badge offline">CSV EXPORT</span></div><div class="formgrid"><div class="field"><label>Manhole</label><select id="reportId"><option value="ALL">All six manholes</option>${MANHOLES.map(m=>`<option value="${m.id}">${m.id} · ${m.location}</option>`).join("")}</select></div><div class="field"><label>Report content</label><select id="reportType"><option value="summary">Current monitoring summary</option><option value="events">Alerts and events</option></select></div></div><p><button class="button" id="download">↓ Download CSV report</button></p></article><article class="panel" style="margin-top:14px"><div class="head"><h2>Report Preview</h2></div><div class="tablewrap"><table><thead><tr><th>Manhole</th><th>Location</th><th>Status</th><th>MQ-4</th><th>MQ-136</th><th>Worker</th><th>Fan</th></tr></thead><tbody>${MANHOLES.map(m=>`<tr><td>${m.id}</td><td>${m.location}</td><td>${m.status}</td><td>${m.mq4??"—"}</td><td>${m.mq136??"—"}</td><td>${m.worker}</td><td>${m.fan?"ON":"OFF"}</td></tr>`).join("")}</tbody></table></div></article>`
}

function download(){
  let id=$("#reportId").value,
  type=$("#reportType").value,
  rows=type==="events"
    ? [["Manhole","Type","Title","Description","Time","Active"],...ALERTS.filter(a=>id==="ALL"||a.manholeId===id).map(a=>[a.manholeId,a.type,a.title,a.desc,a.time,a.active])]
    : [["Manhole","Location","Status","MQ-4 relative response (%)","MQ-136 relative response (%)","Temperature C","Humidity %","Worker","Motion","SOS","Fan","Probe Node","Worker Node","Surface Node","Updated"],...MANHOLES.filter(m=>id==="ALL"||m.id===id).map(m=>[m.id,m.location,m.status,m.mq4??"",m.mq136??"",m.temp??"",m.humidity??"",m.worker,m.motion??"",m.sos,m.fan,m.probe,m.workerNode,m.surface,m.updated])];

  let csv=rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\\n"),
  url=URL.createObjectURL(new Blob([csv],{type:"text/csv"})),
  a=document.createElement("a");

  a.href=url;
  a.download="manhole-guard-report.csv";
  a.click();
  URL.revokeObjectURL(url);
  toast("CSV report downloaded")
}

function settings(){
  return `<article class="panel"><div class="head"><div><h2>Dashboard Preferences</h2><p>Manage display and demo monitoring behaviour.</p></div></div><div class="setting"><div><b>Dark mode</b><small>Use a deep navy monitoring interface.</small></div><input type="checkbox" class="switch" id="darkSetting" ${document.documentElement.dataset.theme==="dark"?"checked":""}></div><div class="setting"><div><b>Desktop notifications</b><small>In-dashboard notification feedback for demo alerts.</small></div><input type="checkbox" class="switch" checked></div><div class="setting"><div><b>Alert sound</b><small>Sound is not enabled in this frontend demo.</small></div><input type="checkbox" class="switch"></div><div class="setting"><div><b>Dashboard refresh interval</b><small>Preference for future API integration.</small></div><select class="select"><option>2 seconds</option><option selected>5 seconds</option><option>10 seconds</option><option>30 seconds</option></select></div><p class="muted">Actual preferences and backend refresh will be connected during API integration.</p></article>`
}

function bindOpen(){
  $$("[data-open]").forEach(e=>e.addEventListener("click",()=>location.hash="#/manhole/"+e.dataset.open))
}

async function render() {
  let r = route();

  if (!MANHOLES.length) {
    $("#view").innerHTML = `
      <article class="panel">
        <h2>Connecting to Manhole Guard backend...</h2>
        <p>Please wait while readings are fetched.</p>
      </article>`;
    return;
  }

  let titles = {
    home: ["Manhole Safety Monitor", "Live monitoring · Worker safety first", "OVERVIEW"],
    manhole: [r.id + " Monitoring", MANHOLES.find(m => m.id === r.id)?.location || "Individual monitoring", "MANHOLE / " + r.id],
    alerts: ["Alerts & Notifications", "Review safety alerts, faults and events", "ALERT CENTRE"],
    analytics: ["Analytics", "Sensor response and comparisons", "INSIGHTS"],
    reports: ["Reports", "Generate and download monitoring summaries", "REPORTING"],
    settings: ["Settings", "Configure dashboard preferences", "PREFERENCES"]
  };

  let t = titles[r.page] || titles.home;

  $("#title").textContent = t[0];
  $("#subtitle").textContent = t[1];
  $("#crumb").textContent = t[2];

  $$(".sidebar nav a").forEach(a =>
    a.classList.toggle(
      "active",
      a.dataset.page === r.page ||
      (r.page === "manhole" && a.dataset.page === "manhole")
    )
  );

  let html =
    r.page === "home" ? home() :
    r.page === "manhole" ? detail(r.id) :
    r.page === "alerts" ? alertsPage() :
    r.page === "analytics" ? analytics() :
    r.page === "reports" ? reports() :
    r.page === "settings" ? settings() : home();

  $("#view").innerHTML = html;

  $("#bellCount").textContent = ALERTS.filter(a => a.active).length;
  $("#navCount").textContent = ALERTS.filter(a => a.active).length;

  bindOpen();

  if (r.page === "home") {
    let sel = $("#homeSelect");
    sel.value = selected;

    renderHomeExtra();

    sel.addEventListener("change", e => {
      selected = e.target.value;
      window.manualSelect = true;
      renderHomeExtra();
    });

    $("#homeRange").value = range;

    $("#homeRange").addEventListener("change", e => {
      range = e.target.value;
      renderHomeExtra();
    });
  }

  if (r.page === "manhole") {
    $("#detailRange").value = range;

    getHistory(r.id)
      .then(h => chartDraw("detailChart", h))
      .catch(error => console.error("History error:", error));

    $("#detailRange").addEventListener("change", async e => {
      range = e.target.value;

      try {
        const h = await getHistory(r.id);
        chartDraw("detailChart", h);
      } catch (error) {
        console.error("History error:", error);
      }
    });
  }

  if (r.page === "alerts") {
    $("#alertFilter").addEventListener("change", fillAlerts);
    $("#alertState").addEventListener("change", fillAlerts);
    fillAlerts();
  }

  if (r.page === "analytics") drawAnalytics();

  if (r.page === "reports") {
    $("#download").addEventListener("click", download);
  }

  if (r.page === "settings") {
    $("#darkSetting").addEventListener("change", e =>
      theme(e.target.checked ? "dark" : "light")
    );
  }
}

function fillAlerts(){
  let f=$("#alertFilter").value,
  s=$("#alertState").value,
  a=ALERTS.filter(x=>(f==="ALL"||x.type===f)&&(s==="ALL"||(s==="ACTIVE"?x.active:!x.active)));

  $("#alertRows").innerHTML=a.length?`<div class="tablewrap"><table><thead><tr><th>Severity</th><th>Manhole</th><th>Event</th><th>Description</th><th>Time</th><th>State</th></tr></thead><tbody>${a.map(x=>`<tr data-open="${x.manholeId}"><td>${badge(x.type==="SOS"?"HIGH":x.type==="FAULT"?"OFFLINE":x.type)}</td><td>${x.manholeId}</td><td>${x.title}</td><td>${x.desc}</td><td>${x.time}</td><td>${x.active?"Active":"Resolved"}</td></tr>`).join("")}</tbody></table></div>`:'<div class="empty">No alerts match this filter.</div>';

  bindOpen()
}

function theme(v){
  document.documentElement.dataset.theme=v;
  localStorage.setItem("mg-theme",v);
  $("#theme").textContent=v==="dark"?"☀":"☾";
  if(route().page==="settings"&&$("#darkSetting"))$("#darkSetting").checked=v==="dark"
}

function search(q){
  if(!q.trim())return;
  let m=MANHOLES.find(x=>x.id.toLowerCase()===q.toLowerCase()||x.location.toLowerCase().includes(q.toLowerCase()));
  if(m)location.hash="#/manhole/"+m.id;
  else toast("No matching demo manhole")
}

function tick(){
  let d=new Date();
  $("#clock").textContent=d.toLocaleTimeString();
  $("#date").textContent=d.toLocaleDateString(undefined,{weekday:"short",day:"2-digit",month:"short"})
}

$("#theme").addEventListener("click",()=>theme(document.documentElement.dataset.theme==="dark"?"light":"dark"));
$("#bell").addEventListener("click",()=>location.hash="#/alerts");
$("#menu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#search").addEventListener("keydown",e=>{if(e.key==="Enter")search(e.target.value)});
window.addEventListener("hashchange",()=>{$("#sidebar").classList.remove("open");render()});

theme(localStorage.getItem("mg-theme") || "light");

tick();
setInterval(tick, 1000);

let refreshing = false;

async function loadBackendData(initial = false) {
  if (refreshing) return;

  refreshing = true;

  try {
    await refreshData();

    if (!MANHOLES.some(m => m.id === selected)) {
      selected = MANHOLES[0]?.id || "MH-01";
    }

    render();

  } catch (error) {
    console.error("Backend connection failed:", error);

    if (initial && MANHOLES.length === 0) {
      $("#view").innerHTML = `
        <article class="panel">
          <h2>Unable to connect to backend</h2>
          <p>${error.message}</p>
          <p>Please check your internet connection and try again.</p>
        </article>`;
    }

  } finally {
    refreshing = false;
  }
}

loadBackendData(true);

// Fetch fresh readings every 1 second.
setInterval(() => loadBackendData(false), 1000);
