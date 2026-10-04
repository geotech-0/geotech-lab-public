import {writeFile} from 'node:fs/promises';
import {appDOM,untranslated} from '../tests/helpers/app-dom.mjs';
const app=appDOM(),report=[];
const inventory=app.run('Object.entries(modules).map(([key,m])=>({key,questions:m.questions.map(q=>q[0])}))');
const baseline=app.run('JSON.stringify(state)');
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
function reset(key,question){app.run(`Object.assign(state,JSON.parse(${JSON.stringify(baseline)}));state.active=${JSON.stringify(key)};state.question[state.active]=${JSON.stringify(question)};render();GeotechI18n.setLanguage('ko');`);}
function inspect(key,question,variant){
 const before=app.run('JSON.stringify({data:state.data,baselines:state.baselines,result:compute(state.active)})');
 const ko=app.document.getElementById('main').innerHTML;
 app.run("GeotechI18n.setLanguage('en')");const missing=untranslated(app.document);
 const after=app.run('JSON.stringify({data:state.data,baselines:state.baselines,result:compute(state.active)})');
 app.run("GeotechI18n.setLanguage('ko')");
 report.push({key,question,variant,untranslated:missing,stateUnchanged:before===after,koreanRestored:ko===app.document.getElementById('main').innerHTML});
}
try{
 for(const {key,questions} of inventory)for(const question of questions){
  reset(key,question);
  const selectors=[...app.document.querySelectorAll('#controls select')].map((s,i)=>({i,values:[...s.options].map(o=>o.value)}));
  for(const {i,values} of selectors)for(const value of values){reset(key,question);const select=app.document.querySelectorAll('#controls select')[i];if(!select)continue;select.value=value;select.dispatchEvent(new app.window.Event('change',{bubbles:true}));await pause();inspect(key,question,`select ${i}=${value}`);}
  reset(key,question);
  const fields=[...app.document.querySelectorAll('#controls input[type=number]')].map((s,i)=>i);
  // Every numeric field: empty input exercises validation without fabricating valid data.
  for(const i of fields){reset(key,question);const input=app.document.querySelectorAll('#controls input[type=number]')[i];if(!input)continue;input.value='';input.dispatchEvent(new app.window.Event('input',{bubbles:true}));input.dispatchEvent(new app.window.Event('change',{bubbles:true}));await pause();inspect(key,question,`empty numeric ${i}`);}
 }
 app.document.getElementById('worksheet-open').click();await pause();
 const worksheet=app.document.getElementById('worksheet-root');
 const inspectWorksheet=variant=>{
  app.run("GeotechI18n.setLanguage('ko')");const ko=worksheet.innerHTML,storage=JSON.stringify(app.window.localStorage);
  app.run("GeotechI18n.setLanguage('en')");const missing=untranslated(app.document);app.run("GeotechI18n.setLanguage('ko')");
  report.push({key:'worksheet',question:'worksheet',variant,untranslated:missing,stateUnchanged:storage===JSON.stringify(app.window.localStorage),koreanRestored:ko===worksheet.innerHTML});
 };
 const wsSelects=[...worksheet.querySelectorAll('select')].map(el=>({path:el.dataset.wsPath,values:[...el.options].map(o=>o.value)}));
 for(const item of wsSelects)for(const value of item.values){const el=worksheet.querySelector(`select[data-ws-path="${item.path}"]`);if(!el)continue;el.value=value;el.dispatchEvent(new app.window.Event('change',{bubbles:true}));await pause();inspectWorksheet(`select ${item.path}=${value}`);}
 const wsInputs=[...worksheet.querySelectorAll('input[type=number]')].map(el=>({id:el.id,value:el.value}));
 for(const item of wsInputs){const el=app.document.getElementById(item.id);if(!el)continue;el.value='';el.dispatchEvent(new app.window.Event('input',{bubbles:true}));el.dispatchEvent(new app.window.Event('change',{bubbles:true}));await pause();inspectWorksheet(`empty ${item.id}`);el.value=item.value;el.dispatchEvent(new app.window.Event('input',{bubbles:true}));el.dispatchEvent(new app.window.Event('change',{bubbles:true}));await pause();}
 app.document.getElementById('ws-report').click();await pause();inspectWorksheet('report preview');
 app.document.getElementById('ws-dialog-close').click();
 await writeFile(process.argv[2],JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({variants:report.length,missing:[...new Set(report.flatMap(r=>r.untranslated))],stateFailures:report.filter(r=>!r.stateUnchanged).length,koreanFailures:report.filter(r=>!r.koreanRestored).length}));
}finally{app.close();}
