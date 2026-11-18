/* All readings below are SIMULATED demo data. Replace DataService with FastAPI fetch calls later. */
const MANHOLES=[
{id:"MH-01",location:"Central Road",status:"NORMAL",mq4:14,mq136:8,temp:28,humidity:62,worker:"OUTSIDE",motion:false,sos:false,fan:false,probe:"ONLINE",workerNode:"ONLINE",surface:"ONLINE",health:[98,96,100,98],updated:"2 min ago"},
{id:"MH-02",location:"Market Area",status:"MEDIUM",mq4:27,mq136:18,temp:29,humidity:65,worker:"INSIDE",motion:true,sos:false,fan:true,probe:"ONLINE",workerNode:"ONLINE",surface:"ONLINE",health:[96,94,100,94],updated:"1 min ago"},
{id:"MH-03",location:"Bus Stand",status:"HIGH",mq4:58,mq136:53,temp:31,humidity:71,worker:"INSIDE",motion:false,sos:true,fan:true,probe:"ONLINE",workerNode:"ONLINE",surface:"ONLINE",health:[95,89,100,91],updated:"30 sec ago"},
{id:"MH-04",location:"Hospital Road",status:"NORMAL",mq4:11,mq136:9,temp:27,humidity:59,worker:"OUTSIDE",motion:false,sos:false,fan:false,probe:"ONLINE",workerNode:"ONLINE",surface:"ONLINE",health:[99,97,100,99],updated:"3 min ago"},
{id:"MH-05",location:"Green Park",status:"MEDIUM",mq4:34,mq136:24,temp:30,humidity:68,worker:"INSIDE",motion:true,sos:false,fan:true,probe:"ONLINE",workerNode:"ONLINE",surface:"ONLINE",health:[94,95,100,93],updated:"45 sec ago"},
{id:"MH-06",location:"College Area",status:"OFFLINE",mq4:null,mq136:null,temp:null,humidity:null,worker:"UNKNOWN",motion:null,sos:false,fan:false,probe:"OFFLINE",workerNode:"UNKNOWN",surface:"OFFLINE",health:[0,45,0,0],updated:"18 min ago"}
];
const ALERTS=[
{id:1,manholeId:"MH-03",type:"HIGH",title:"High gas response detected",desc:"MQ-4 and MQ-136 relative response entered HIGH prototype range.",time:"10:42:17",active:true},
{id:2,manholeId:"MH-02",type:"MEDIUM",title:"Medium gas response detected",desc:"MQ-4 relative response entered MEDIUM prototype range.",time:"10:40:02",active:true},
{id:3,manholeId:"MH-03",type:"SOS",title:"Worker SOS activated",desc:"SOS button event received from Worker Node.",time:"10:39:44",active:true},
{id:4,manholeId:"MH-04",type:"NORMAL",title:"Worker outside manhole",desc:"Worker presence status updated.",time:"10:31:08",active:false},
{id:5,manholeId:"MH-06",type:"FAULT",title:"Surface Node disconnected",desc:"No recent communication from Surface Node.",time:"10:24:19",active:true},
{id:6,manholeId:"MH-01",type:"NORMAL",title:"Gas response normal",desc:"Latest demo reading is within NORMAL prototype range.",time:"10:18:31",active:false}
];
function historyFor(id,range="30m"){
 const m=MANHOLES.find(x=>x.id===id)||MANHOLES[0],n=range==="30m"?16:range==="1h"?20:24,labels=[],a=[],b=[];
 for(let i=0;i<n;i++){labels.push(range==="30m"?`${10+Math.floor(i/2)}:${i%2?"30":"00"}`:range==="1h"?`${i*3}m`:range==="6h"?`${i*15}m`:`${String(i).padStart(2,"0")}:00`);
 a.push(m.mq4==null?0:Math.max(0,Math.round(m.mq4*(.7+.3*i/(n-1)+Math.sin(i*1.1)*.06))));
 b.push(m.mq136==null?0:Math.max(0,Math.round(m.mq136*(.72+.28*i/(n-1)+Math.cos(i*1.2)*.05))));}
 return {labels,mq4:a,mq136:b};
}
const DataService={
 async getManholes(){return MANHOLES.map(x=>({...x}));},
 async getManhole(id){return {...(MANHOLES.find(x=>x.id===id)||MANHOLES[0])};},
 async getAlerts(){return ALERTS.map(x=>({...x}));},
 async getHistory(id,range){return historyFor(id,range);}
};
// Future: replace these methods with fetch("http://localhost:8000/api/...") calls.
// Keep the returned object fields unchanged so UI components do not need rewriting.
