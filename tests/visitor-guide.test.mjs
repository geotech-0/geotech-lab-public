import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import collectSources from '../source-manifest.cjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const code=readFileSync(path.join(root,'src/visitor-guide.js'),'utf8');
const api=vm.runInNewContext(code+'\n({visitorGuideMarkup,visitorLanguagePreference,installVisitorGuide,VisitorExamples,VISITOR_LANGUAGE_KEY})');
function storage(initial={}){
 const values=new Map(Object.entries(initial)),writes=[];
 return {values,writes,getItem:key=>values.get(key)??null,setItem(key,value){writes.push([key,value]);values.set(key,value);}};
}
function element(dataset={}){
 return {dataset,hidden:false,innerHTML:'',textContent:'',attrs:{},listeners:{},focused:false,
  setAttribute(name,value){this.attrs[name]=value;},addEventListener(event,fn){this.listeners[event]=fn;},
  focus(){this.focused=true;},querySelectorAll(){return [];},
  click(target){this.listeners.click?.({target:{closest(selector){return target?.selector===selector?target:null;}}});}
 };
}
function documentFixture(){
 const ids=Object.fromEntries(['visitor-guide','lab-workspace','visitor-language','visitor-guide-open','visitor-lab-note','main'].map(id=>[id,element()]));
 ids['lab-workspace'].innerHTML='<h1>흙의 분류</h1><input value="18">';
 const languageButtons=['en','ko'].map(language=>element({visitorLanguage:language})),skip=element();
 ids['visitor-language'].querySelectorAll=()=>languageButtons;
 return {ids,languageButtons,skip,documentElement:{dataset:{}},getElementById:id=>ids[id],querySelector:selector=>selector==='.skip'?skip:null};
}
function chooseLanguage(doc,language){doc.ids['visitor-language'].click({selector:'[data-visitor-language]',dataset:{visitorLanguage:language}});}

test('both introductions feature excavation first and settlement inverse non-uniqueness second',()=>{
 for(const language of ['en','ko']){
  const markup=api.visitorGuideMarkup(language),cards=[...markup.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].map(match=>match[0]);
  assert.equal(cards.length,2);
  assert.match(cards[0],/visitor-example-primary/);assert.match(cards[0],/01 \//);
  assert.match(cards[0],/data-visitor-example="excavation"/);
  assert.ok(cards[0].includes(language==='ko'?'대표 예제':'Main example'));
  assert.match(cards[1],/02 \//);assert.match(cards[1],/data-visitor-example="settlement"/);
  assert.ok(cards[1].includes(language==='ko'?'역산의 비유일성':'INVERSE NON-UNIQUENESS'));
  assert.ok(cards[1].includes(language==='ko'?'두 번째 예제':'Second example'));
 }
});

test('language preference defaults safely, survives reload, and writes only its own key',()=>{
 const store=storage({'soil-sense-lab-v1':'existing experiment','learning-progress':'existing progress'});
 const preference=api.visitorLanguagePreference(store);
 assert.equal(preference.get(),'en');assert.equal(store.writes.length,0);
 preference.set('ko');assert.equal(api.visitorLanguagePreference(store).get(),'ko');
 assert.deepEqual(store.writes,[[api.VISITOR_LANGUAGE_KEY,'ko']]);
 assert.equal(store.values.get('soil-sense-lab-v1'),'existing experiment');
 assert.equal(store.values.get('learning-progress'),'existing progress');
 preference.set('invalid');assert.equal(preference.get(),'ko');assert.equal(store.writes.length,1);
 assert.equal(api.visitorLanguagePreference(storage({[api.VISITOR_LANGUAGE_KEY]:'unrecognized'})).get(),'en');
});
test('denied browser storage leaves the language switch usable in the current window',()=>{
 const preference=api.visitorLanguagePreference({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});
 assert.equal(preference.get(),'en');assert.equal(preference.set('ko'),'ko');assert.equal(preference.get(),'ko');
});
test('fresh visitors see the English introduction and can open existing labs without replacing Korean markup',()=>{
 const doc=documentFixture(),store=storage(),opened=[];
 const guide=api.installVisitorGuide({document:doc,storage:store,openExample:example=>opened.push(example)});
 assert.equal(doc.documentElement.lang,'en');assert.equal(guide.isOpen(),true);
 assert.equal(doc.ids['visitor-guide'].hidden,false);assert.equal(doc.ids['lab-workspace'].hidden,true);
 assert.match(doc.ids['visitor-guide'].innerHTML,/Switch every lab, control, explanation and calculation note/);
 const original=doc.ids['lab-workspace'].innerHTML;
 doc.ids['visitor-guide'].click({selector:'[data-visitor-example]',dataset:{visitorExample:'settlement'}});
 assert.equal(opened[0].module,'layered-settlement');assert.equal(opened[0].question,'observation');
 assert.equal(doc.documentElement.lang,'en');assert.equal(doc.ids['lab-workspace'].hidden,false);
 assert.equal(doc.ids['visitor-lab-note'].hidden,true);assert.equal(doc.ids.main.focused,true);
 assert.equal(doc.ids['lab-workspace'].innerHTML,original);assert.equal(store.writes.length,0);
});
test('Korean selection preserves the workspace and reloads directly into the Korean experience',()=>{
 const store=storage(),doc=documentFixture(),opened=[];
 api.installVisitorGuide({document:doc,storage:store,openExample:example=>opened.push(example)});
 const original=doc.ids['lab-workspace'].innerHTML;
 chooseLanguage(doc,'ko');
 assert.equal(doc.documentElement.lang,'ko');assert.equal(doc.ids['visitor-guide'].hidden,false);
 assert.equal(doc.ids['visitor-lab-note'].hidden,true);assert.equal(doc.ids['lab-workspace'].innerHTML,original);
 assert.equal(doc.languageButtons[1].attrs['aria-pressed'],'true');assert.equal(opened.length,0);
 const reloaded=documentFixture();
 const guide=api.installVisitorGuide({document:reloaded,storage:store,openExample:()=>assert.fail('unexpected navigation')});
 assert.equal(guide.isOpen(),false);assert.equal(reloaded.ids['lab-workspace'].hidden,false);
 reloaded.ids['visitor-guide-open'].click();
 assert.equal(guide.isOpen(),true);assert.equal(reloaded.ids['visitor-guide'].lang,'ko');
 assert.match(reloaded.ids['visitor-guide'].innerHTML,/층별 침하와 역산/);
 chooseLanguage(reloaded,'en');assert.equal(reloaded.ids['visitor-guide'].lang,'en');
 assert.equal(api.visitorLanguagePreference(store).get(),'en');
});
test('featured routes exist in both builds and solve with the registered default inputs',()=>{
 for(const publicBuild of [false,true]){
  const manifest=collectSources(root,{publicBuild});
  assert.ok(manifest.scriptFiles.includes('visitor-guide.js'));
  const sources=manifest.scriptFiles.filter(file=>file!=='app.js').map(file=>readFileSync(path.join(root,'src',file),'utf8').replace(/^export /gm,'')).join('\n');
  const labs=vm.runInNewContext(sources+'\nExtensionLabs',{structuredClone,TextEncoder,performance});
  for(const example of Object.values(api.VisitorExamples)){
   const lab=labs.find(item=>item.key===example.module);
   assert.ok(lab);assert.ok(lab.meta.questions.some(([question])=>question===example.question));
   const result=lab.compute(structuredClone(lab.defaults),example.question);
   assert.equal(result.valid,true,`${example.module}: ${JSON.stringify(result.errors)}`);
  }
 }
});
test('language switching preserves an open worksheet; the guide and featured routes preserve its inputs',()=>{
 const doc=documentFixture(),store=storage({[api.VISITOR_LANGUAGE_KEY]:'ko'}),route={hash:'#worksheet'},opened=[];
 const worksheet=element();worksheet.innerHTML='<input id="project" value="기존 계산서"><input id="load" value="1400">';
 doc.ids['worksheet-root']=worksheet;doc.ids['lab-workspace'].hidden=true;
 api.installVisitorGuide({document:doc,storage:store,location:route,openExample:example=>opened.push(example)});
 const original=worksheet.innerHTML;
 assert.equal(worksheet.hidden,false);assert.equal(doc.ids['lab-workspace'].hidden,true);
 chooseLanguage(doc,'en');
 assert.equal(doc.ids['visitor-guide'].hidden,true);assert.equal(worksheet.hidden,false);assert.equal(doc.ids['lab-workspace'].hidden,true);
 assert.equal(route.hash,'#worksheet');assert.equal(worksheet.innerHTML,original);
 chooseLanguage(doc,'ko');
 assert.equal(doc.ids['visitor-guide'].hidden,true);assert.equal(worksheet.hidden,false);assert.equal(doc.ids['lab-workspace'].hidden,true);
 assert.equal(worksheet.focused,true);assert.equal(doc.skip.href,'#worksheet-root');
 chooseLanguage(doc,'en');
 doc.ids['visitor-guide-open'].click();
 doc.ids['visitor-guide'].click({selector:'[data-visitor-example]',dataset:{visitorExample:'excavation'}});
 assert.equal(route.hash,'learn');assert.equal(worksheet.hidden,true);assert.equal(doc.ids['lab-workspace'].hidden,false);
 assert.equal(opened[0].module,'excavation');assert.equal(worksheet.innerHTML,original);
 assert.equal(doc.skip.href,'#main');
});
test('worksheet hash updates cannot uncover either workspace or steal focus while the guide is visible',()=>{
 const worksheetSource=readFileSync(path.join(root,'src/learning-worksheet.js'),'utf8');
 const start=worksheetSource.indexOf(' function showMode(){'),end=worksheetSource.indexOf("\n entry.addEventListener('click'",start);
 const doc=documentFixture(),host=element(),entry=element(),dialog={open:false},library=element(),description=element(),status=element();
 doc.documentElement.dataset.visitorView='guide';doc.ids['learning-library-open']=library;doc.ids['save-status']=status;
 doc.body={classList:{remove(){},toggle(){}}};
 doc.querySelector=selector=>selector==='.layout'?doc.ids['lab-workspace']:selector==='.header-description'?description:null;
 const route={hash:'#worksheet'};
 const showMode=vm.runInNewContext(`let request=0,importCandidate=null,pending=null,data={},mounted=true,storageNote='';${worksheetSource.slice(start,end)}\nshowMode`,{
  document:doc,location:route,host,entry,dialog,$:id=>doc.getElementById(id),scrollTo(){},mount(){assert.fail('unexpected remount');},finish(){assert.fail('unexpected edit');},persist(){assert.fail('unexpected save');}
 });
 showMode();assert.equal(host.hidden,true);assert.equal(doc.ids['lab-workspace'].hidden,true);assert.equal(host.focused,false);
 route.hash='#learn';showMode();assert.equal(host.hidden,true);assert.equal(doc.ids['lab-workspace'].hidden,true);assert.equal(doc.ids.main.focused,false);
 doc.documentElement.dataset.visitorView='lab';showMode();assert.equal(host.hidden,true);assert.equal(doc.ids['lab-workspace'].hidden,false);assert.equal(doc.ids.main.focused,true);
});
