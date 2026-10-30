// 가짜 구글 Apps Script 환경에서 server/Code.gs 를 그대로 돌리는 테스트 서버
// node tools/gas-mock.js [포트]  → http://localhost:포트 (POST = doPost, GET = doGet) · /__dump 시트 내용 · /__discord 보낸 알림
const http=require("http"),fs=require("fs"),vm=require("vm"),path=require("path"),crypto=require("crypto");
const PORT=+(process.argv[2]||8787),sheets={},props={},discord=[];
// 진짜 시트처럼: 숫자처럼 보이는 글자 → 숫자, true/false → 참거짓
const sheetVal=x=>typeof x!=="string"?x:/^-?\d+(\.\d+)?$/.test(x.trim())?Number(x):/^(true|false)$/i.test(x)?/^true$/i.test(x):x;
function Sheet(name){const d=[];return {name,d,getLastRow:()=>d.length,setFrozenRows(){},appendRow:r=>d.push(r.map(sheetVal)),
  getRange:(r,c,nr=1,nc=1)=>({setValues:v=>{for(let i=0;i<nr;i++){d[r-1+i]=d[r-1+i]||[];for(let j=0;j<nc;j++)d[r-1+i][c-1+j]=sheetVal(v[i][j])}},
    getValues:()=>Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>{const x=(d[r-1+i]||[])[c-1+j];return x===undefined?"":x})),
    clearContent:()=>{for(let i=0;i<nr;i++)for(let j=0;j<nc;j++)if(d[r-1+i])d[r-1+i][c-1+j]=""}})}}
const ctx={SpreadsheetApp:{getActive:()=>({getSheetByName:n=>sheets[n]||null,insertSheet:n=>(sheets[n]=Sheet(n))})},
  ContentService:{MimeType:{JSON:"json"},createTextOutput:s=>({s,setMimeType(){return this}})},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]??null,setProperty:(k,v)=>{props[k]=String(v)},deleteProperty:k=>{delete props[k]}})},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},Utilities:{getUuid:()=>crypto.randomUUID()},
  UrlFetchApp:{fetch:(u,o)=>{discord.push(JSON.parse(o.payload).content);return {}}},console};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,"../server/Code.gs"),"utf8"),ctx);
http.createServer((q,s)=>{const H={"Access-Control-Allow-Origin":"*","Content-Type":"application/json"};
  if(q.url==="/__dump"){s.writeHead(200,H);return s.end(JSON.stringify(Object.fromEntries(Object.entries(sheets).map(([k,v])=>[k,v.d.length]))))}
  if(q.url==="/__discord"){s.writeHead(200,H);return s.end(JSON.stringify(discord))}
  if(q.method==="OPTIONS"){s.writeHead(204,{...H,"Access-Control-Allow-Headers":"*"});return s.end()}
  if(q.method==="GET"){s.writeHead(200,H);return s.end(ctx.doGet().s)}
  let b="";q.on("data",c=>b+=c);q.on("end",()=>{if(process.env.OFF){s.destroy();return}const r=ctx.doPost({postData:{contents:b}});s.writeHead(200,H);s.end(r.s)})}).listen(PORT,()=>console.log("gas-mock on",PORT));
