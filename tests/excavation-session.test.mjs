import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {ExcavationSchema as S} from '../src/excavation-schema.mjs';
import {Retaining} from '../src/retaining.mjs';

const read=file=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
const old=JSON.parse(readFileSync(new URL('./fixtures/session-v4-excavation.json',import.meta.url),'utf8'));
const clone=value=>JSON.parse(JSON.stringify(value));
const defaults=()=>({modelVersion:2,height:8,embedment:4,EI:500000,mesh:.5,increment:.25,soil:{gamma:18,gammaSat:20,c:0,phi:30,kh:20000,k0:null},fill:{gamma:18,gammaSat:20,c:0,phi:30,kh:20000,k0:null,initialPressure:0,pressureModel:'soil'},water:{retained:20,excavation:20,restore:20},surcharge:10,clearance:.5,releaseLinked:true,releaseClearance:.5,supports:[{id:'support-1',type:'anchor',z:2,stiffness:50000,preload:100,angle:15,spacing:2,length:12,preloadLoss:0,capacity:null,bondStiffness:null,baseStiffness:null,retained:false}],plan:{lx:20,ly:14,walerEI:100000,stations:3,corners:[0,1,2,3],membersPerCorner:1,offset:2,spacing:1.2},observation:{phase:'backfill',depth:8,eventSide:'before',mode:'history',wallId:'A',position:.5,resultMode:'total'}});
const factory=vm.runInNewContext(['session-schema-v1.js','session-schema-v2.js','session-schema-v3.js','learning-session-files.js'].map(read).join('\n')+'\ncreateLearningSessionFiles',{TextEncoder});
function service(){return factory({catalog:{excavation:{name:'흙막이 시공과정',questions:[['displacement','변위'],['moment','모멘트'],['pressure','토압']],defaults:defaults(),sessionShape:S.validateData,sessionLegacyShape:S.validateLegacyData,sessionLegacyQuestions:['displacement','moment']}},validate:(key,data)=>data.modelVersion===2?{valid:true}:Retaining.excavation(data)});}
const snapshot=()=>({module:'excavation',question:'displacement',current:defaults(),baseline:defaults(),compare:false});

test('legacy excavation files v1–v4 keep exact inputs, selected stage and linear calculation',()=>{
  const files=service();
  for(const version of [1,2,3,4]){
    const record={...clone(old),version},restored=files.parse(JSON.stringify(record));
    assert.deepEqual(clone(restored.snapshot),record.experiment);
    for(const side of ['current','baseline']){
      assert.equal('modelVersion' in restored.snapshot[side],false);
      assert.deepEqual(Retaining.excavation(clone(restored.snapshot[side])),Retaining.excavation(record.experiment[side]));
    }
    const saved=JSON.parse(files.serialize(restored.snapshot).text);
    assert.equal(saved.version,5);assert.deepEqual(saved.experiment,record.experiment);
  }
});
test('local restore never mixes staged defaults into a legacy experiment or baseline',()=>{
  for(const side of ['current','baseline']){const source=clone(old.experiment[side]),restored=S.restoreData(source,defaults());assert.deepEqual(restored,source);assert.notEqual(restored,source);assert.equal('modelVersion' in restored,false);}
  assert.deepEqual(S.restoreData(undefined,defaults()),defaults());
  const incomplete=clone(old.experiment.current);delete incomplete.anchorDepth;
  assert.throws(()=>S.restoreData(incomplete,defaults()),/항목/);
});
test('staged files round-trip nested plan, optional support data and independent comparison',()=>{
  const files=service(),input=snapshot();input.baseline.supports[0].z=3;input.current.observation.resultMode='envelope';
  const restored=files.parse(files.serialize(input).text);
  assert.deepEqual(clone(restored.snapshot),input);assert.equal(restored.preview.rows.find(row=>row.key==='supports').currentDisplay,'1개 행');
  input.current.plan.corners.pop();assert.equal(restored.snapshot.current.plan.corners.length,4);
});
test('replacement slab activation is explicitly saved independently of ordinary supports',()=>{
 const files=service(),input=snapshot();input.current.supports.push({...clone(input.current.supports[0]),id:'replacement-1',type:'slab',preload:0,angle:0,spacing:1,retained:true,activateAtBackfill:6});
 const restored=files.parse(files.serialize(input).text).snapshot.current.supports;
 assert.equal(restored[1].type,'slab');assert.equal(restored[1].activateAtBackfill,6);assert.equal(restored[1].retained,true);assert.equal('activateAtBackfill' in restored[0],false);
});
test('mixed legacy and staged variants can be previewed without injecting missing default fields',()=>{
  const files=service(),input=snapshot();input.baseline=clone(old.experiment.baseline);
  const restored=files.inspect(input);assert.equal(restored.preview.rows.find(row=>row.key==='groundK').currentDisplay,'해당 없음');assert.equal(restored.preview.rows.find(row=>row.key==='soil').baselineDisplay,'해당 없음');assert.deepEqual(clone(restored.snapshot.baseline),old.experiment.baseline);
});
test('legacy version labels cannot bypass frozen old excavation schema or old questions',()=>{
  const files=service();for(const version of [1,2,3,4]){
    assert.throws(()=>files.parse(JSON.stringify({format:files.format,version,experiment:snapshot()})),/항목/);
    const record={...clone(old),version};record.experiment.question='pressure';assert.throws(()=>files.parse(JSON.stringify(record)),/이전 파일 버전/);
  }
});
test('nested staged input shapes reject unknown keys, injected enums, strings and duplicate identities',()=>{
  const mutations=[d=>{d.extra=1;},d=>{d.soil.extra=1;},d=>{delete d.water.retained;},d=>{d.supports[0].z='2';},d=>{d.supports[0].type='<script>';},d=>{d.supports.push(clone(d.supports[0]));},d=>{d.plan.corners=[0,0];},d=>{d.plan.corners=[4];},d=>{d.observation.envelope=true;},d=>{d.observation.wallId='E';},d=>{d.modelVersion=3;},d=>{d.soil.phi=Infinity;},d=>{d.supports=Array.from({length:25},(_,i)=>({...d.supports[0],id:String(i)}));}];
  for(const mutate of mutations){const data=defaults();mutate(data);assert.equal(S.validateData(data).valid,false);}
  const poisoned=JSON.parse(JSON.stringify(defaults()).replace('"soil":{','"soil":{"__proto__":{"polluted":true},'));
  assert.equal(S.validateData(poisoned).valid,false);assert.equal({}.polluted,undefined);
});
test('shape validation preserves unfinished numeric drafts without claiming a valid physical model',()=>{
  const data=defaults();data.supports[0].z=null;data.soil.kh=null;data.plan.lx=0;data.observation.depth=null;
  assert.equal(S.validateData(data).valid,true);assert.deepEqual(S.restoreData(data,defaults()),data);
});
