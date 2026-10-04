import {writeFile} from 'node:fs/promises';
import {appDOM,untranslated} from '../tests/helpers/app-dom.mjs';
const app=appDOM(),inventory=app.run('Object.entries(modules).map(([key,m])=>({key,name:m.name,questions:m.questions.map(q=>q[0])}))');
const report=[];
try{
 for(const item of inventory){
  const variants=[];
  for(const question of item.questions){
   app.run(`GeotechI18n.setLanguage('ko');state.active=${JSON.stringify(item.key)};state.question[state.active]=${JSON.stringify(question)};render();`);
   const before=app.run('JSON.stringify({data:state.data,baselines:state.baselines,result:compute(state.active)})');
   app.run("GeotechI18n.clearMissing();GeotechI18n.setLanguage('en')");
   const missing=untranslated(app.document),rawMissing=app.run('GeotechI18n.missing()'),after=app.run('JSON.stringify({data:state.data,baselines:state.baselines,result:compute(state.active)})');
   variants.push({question,untranslated:missing,rawMissing,stateAndCalculationUnchanged:before===after});
  }
  report.push({...item,variants});
 }
 app.run("GeotechI18n.setLanguage('ko')");app.document.getElementById('worksheet-open').click();
 await new Promise(resolve=>setTimeout(resolve,0));app.run("GeotechI18n.setLanguage('en')");
 report.push({key:'worksheet',variants:[{question:'worksheet',untranslated:untranslated(app.document)}]});
 const output=process.argv[2]||'test-results/i18n-audit.json';
 await writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({modules:inventory.length,questions:report.reduce((n,m)=>n+m.variants.length,0),untranslated:[...new Set(report.flatMap(m=>m.variants.flatMap(v=>v.untranslated)))].length,output}));
}finally{app.close();}
