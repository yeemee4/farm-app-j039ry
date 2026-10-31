// 가짜 구글 Apps Script 환경에서 server/Code.gs 를 그대로 돌리는 테스트 서버
// node tools/gas-mock.js [포트]  → http://localhost:포트 (POST = doPost, GET = doGet) · /__dump 시트 내용 · /__discord 보낸 알림
const http=require("http"),fs=require("fs"),vm=require("vm"),path=require("path"),crypto=require("crypto");
const PORT=+(process.argv[2]||8787);
function makeGas(){const sheets={},props={},discord=[],drive={};
// 진짜 시트처럼: 숫자처럼 보이는 글자 → 숫자, true/false → 참거짓
const sheetVal=x=>typeof x!=="string"?x:/^-?\d+(\.\d+)?$/.test(x.trim())?Number(x):/^(true|false)$/i.test(x)?/^true$/i.test(x):x;
function Sheet(name){const d=[];let mc=26;return {name,d,getName:()=>name,getLastRow:()=>d.length,getLastColumn:()=>Math.max(0,...d.map(r=>{let n=r.length;while(n&&(r[n-1]===""||r[n-1]===undefined))n--;return n})),
  getMaxColumns:()=>mc,insertColumnsAfter:(a,n)=>{mc+=n},setFrozenRows(){},appendRow:r=>d.push(r.map(sheetVal)),
  getRange:(r,c,nr=1,nc=1)=>({setValues:v=>{if(c-1+nc>mc)throw new Error("범위가 시트 밖");if(v.some(x=>x.some(y=>typeof y==="string"&&y.length>50000)))throw new Error("하나에 셀에 허용되는 최대 문자수 50000개를 초과해서 입력했습니다.");for(let i=0;i<nr;i++){d[r-1+i]=d[r-1+i]||[];for(let j=0;j<nc;j++)d[r-1+i][c-1+j]=sheetVal(v[i][j])}},
    getValues:()=>Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>{const x=(d[r-1+i]||[])[c-1+j];return x===undefined?"":x})),
    clearContent:()=>{for(let i=0;i<nr;i++)for(let j=0;j<nc;j++)if(d[r-1+i])d[r-1+i][c-1+j]=""}}),clearContents(){d.length=0}}}
// 가짜 드라이브: 폴더 이름 → {이름: 내용}
const it=a=>{let i=0;return {hasNext:()=>i<a.length,next:()=>a[i++]}};
const Folder=n=>{const F=drive[n]=drive[n]||{};const file=k=>({getName:()=>k,setTrashed:()=>{delete F[k]},getBlob:()=>({getDataAsString:()=>F[k]})});
  return {getFilesByName:k=>it(k in F?[file(k)]:[]),getFiles:()=>it(Object.keys(F).map(file)),createFile:(k,c)=>{F[k]=c;return file(k)}}};
const ctx={SpreadsheetApp:{getActive:()=>({getName:()=>"비담농장 서버 (테스트)",getSheetByName:n=>sheets[n]||null,insertSheet:n=>(sheets[n]=Sheet(n)),getSheets:()=>Object.values(sheets),deleteSheet:x=>{delete sheets[x.name]}})},
  DriveApp:{getFoldersByName:n=>it(drive[n]?[Folder(n)]:[]),createFolder:n=>Folder(n)},
  ContentService:{MimeType:{JSON:"json"},createTextOutput:s=>({s,setMimeType(){return this}})},
  PropertiesService:{getScriptProperties:()=>({getKeys:()=>Object.keys(props),getProperty:k=>props[k]??null,setProperty:(k,v)=>{props[k]=String(v)},deleteProperty:k=>{delete props[k]}})},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},Utilities:{getUuid:()=>crypto.randomUUID(),formatDate:(d,tz,f)=>{const P=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(d).map(x=>[x.type,x.value]));return f.replace("yyyy",P.year).replace("MM",P.month).replace("dd",P.day).replace("HH",P.hour).replace("mm",P.minute)}},
  UrlFetchApp:{fetch:(u,o)=>{discord.push(JSON.parse(o.payload).content);return {}}},console};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,"../server/Code.gs"),"utf8"),ctx);return {ctx,sheets,props,discord,drive}}
module.exports={makeGas};
if(require.main===module){const {ctx,sheets,discord}=makeGas();
http.createServer((q,s)=>{const H={"Access-Control-Allow-Origin":"*","Content-Type":"application/json"};
  if(q.url==="/__dump"){s.writeHead(200,H);return s.end(JSON.stringify(Object.fromEntries(Object.entries(sheets).map(([k,v])=>[k,v.d.length]))))}
  if(q.url==="/__discord"){s.writeHead(200,H);return s.end(JSON.stringify(discord))}
  if(q.method==="OPTIONS"){s.writeHead(204,{...H,"Access-Control-Allow-Headers":"*"});return s.end()}
  if(q.method==="GET"){s.writeHead(200,H);return s.end(ctx.doGet().s)}
  let b="";q.on("data",c=>b+=c);q.on("end",()=>{if(process.env.OFF){s.destroy();return}const r=ctx.doPost({postData:{contents:b}});s.writeHead(200,H);s.end(r.s)})}).listen(PORT,()=>console.log("gas-mock on",PORT));}
