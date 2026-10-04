import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {cpSync,existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import collectSources from '../source-manifest.cjs';
import {evidenceAssetPolicy,publicExternalAssets} from '../build-asset-policy.mjs';
import {privateOriginalSkipReason} from './helpers/evidence-original-policy.mjs';
import {OedometerEvidence} from '../src/oedometer-evidence.mjs';
import {CompactionEvidence} from '../src/compaction-evidence.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('public bundle excludes account sync while personal bundle retains it',()=>{
 const personal=collectSources(root).scriptFiles;
 const publicFiles=collectSources(root,{publicBuild:true}).scriptFiles;
 assert.ok(personal.includes('learning-cloud.js'));
 assert.ok(personal.includes('cloud-sync.js'));
 assert.ok(!personal.includes('learning-public.js'));
 assert.ok(publicFiles.includes('learning-public.js'));
 assert.ok(publicFiles.includes('workspace-adapter.js'));
 assert.ok(!publicFiles.includes('learning-cloud.js'));
 assert.ok(!publicFiles.includes('cloud-sync.js'));
});

function evidenceViews(policy){
 const code=['learning-downloads.js','learning-oedometer-evidence.js','learning-compaction-evidence.js'].map(f=>readFileSync(path.join(root,'src',f),'utf8')).join('\n');
 const helpers={OedometerEvidence,CompactionEvidence,fmt:(n,d=1)=>Number(n).toFixed(d),metric:()=>'',svgWrap:s=>s,fieldControl:()=>''};
 // Source-only VM tests intentionally have no injected build policy.
 if(policy!==undefined)helpers.EVIDENCE_ASSET_POLICY=policy;
 return vm.runInNewContext(code+';({oedometer:OedometerEvidenceView.render({result:OedometerEvidence.read()}).method,compaction:CompactionEvidenceView.render({result:CompactionEvidence.solve()}).method})',helpers);
}

test('public evidence views link official originals online and retain selected-data downloads',()=>{
 const views=evidenceViews(evidenceAssetPolicy({publicBuild:true}));
 assert.equal(publicExternalAssets[OedometerEvidence.source.original].url,OedometerEvidence.source.url);
 assert.equal(publicExternalAssets['assets/compaction/usace-em1110-3-141-page3-3.pdf'].url,CompactionEvidence.source.url);
 for(const source of Object.values(publicExternalAssets)){
  assert.ok(Object.values(views).some(html=>html.includes(`href="${source.url}"`)&&html.includes(source.label)));
 }
 for(const original of Object.keys(publicExternalAssets))assert.ok(Object.values(views).every(html=>!html.includes(`href="${original}"`)));
 assert.match(views.oedometer,/공개 앱에는 선택한 점만 포함/);
 assert.match(views.compaction,/해당 페이지 PDF를 포함하지 않습니다/);
 assert.match(views.compaction,/인터넷 연결이 필요/);
 assert.match(views.oedometer,/href="assets\/data\/oedometer-usgs-15021308-points\.json"/);
 assert.match(views.compaction,/href="assets\/compaction\/usace-em1110-3-141-points\.json"/);
});

test('personal and source-only VM views keep the original offline download links',()=>{
 for(const policy of [undefined,evidenceAssetPolicy()]){
  const views=evidenceViews(policy);
  for(const original of Object.keys(publicExternalAssets))assert.ok(Object.values(views).some(html=>html.includes(`href="${original}"`)));
  assert.match(views.oedometer,/원본 Excel 다운로드/);
  assert.match(views.oedometer,/원본은 변경 없이 보관했습니다/);
  assert.match(views.compaction,/원그림 해당 페이지 PDF/);
 }
});

test('public build succeeds with both originals absent and embeds only selected evidence',t=>{
 const fixture=mkdtempSync(path.join(tmpdir(),'geotech-public-build-'));
 t.after(()=>rmSync(fixture,{recursive:true,force:true}));
 const omitted=new Set(Object.keys(publicExternalAssets));
 for(const entry of ['src','assets','build.mjs','source-manifest.cjs','build-asset-policy.mjs'])cpSync(path.join(root,entry),path.join(fixture,entry),{
  recursive:true,filter:source=>!omitted.has(path.relative(root,source).split(path.sep).join('/')),
 });
 for(const original of omitted)assert.equal(existsSync(path.join(fixture,original)),false);
 const run=spawnSync(process.execPath,[path.join(fixture,'build.mjs'),'--public'],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr||run.stdout);
 const html=readFileSync(path.join(fixture,'dist-public/index.html'),'utf8');
 const packaged=JSON.parse(html.match(/const PACKAGED_DATA=([^\n]+);\n/)[1]);
 const policy=JSON.parse(html.match(/const EVIDENCE_ASSET_POLICY=([^\n]+);\n/)[1]);
 assert.deepEqual(policy,publicExternalAssets);
 for(const original of omitted)assert.equal(Object.hasOwn(packaged,original),false);
 for(const selected of ['assets/data/oedometer-usgs-15021308-points.json','assets/compaction/usace-em1110-3-141-points.json']){
  assert.equal(packaged[selected].encoding,'utf8');
  assert.equal(packaged[selected].data,readFileSync(path.join(root,selected),'utf8'));
 }
 assert.equal(existsSync(path.join(fixture,'index.html')),false);
 // The private path still fails on a missing original instead of silently dropping it.
 const personal=spawnSync(process.execPath,[path.join(fixture,'build.mjs')],{encoding:'utf8'});
 assert.notEqual(personal.status,0);assert.match(personal.stderr,/ENOENT/);
});

test('original verification can be skipped only by an exact public-export declaration',t=>{
 const fixture=mkdtempSync(path.join(tmpdir(),'geotech-original-policy-'));
 t.after(()=>rmSync(fixture,{recursive:true,force:true}));
 const original=Object.keys(publicExternalAssets)[0],options={projectRoot:fixture};
 assert.equal(privateOriginalSkipReason(original,options),false);
 const marker=path.join(fixture,'public-release.json');
 writeFileSync(marker,JSON.stringify({sourceDistribution:'public',omittedOriginals:[original]}));
 assert.throws(()=>privateOriginalSkipReason(original,options));
 writeFileSync(marker,JSON.stringify({sourceDistribution:'public',omittedOriginals:Object.keys(publicExternalAssets)}));
 assert.match(privateOriginalSkipReason(original,options),/original-byte verification is not rerun/);
 mkdirSync(path.dirname(path.join(fixture,original)),{recursive:true});writeFileSync(path.join(fixture,original),'unexpected bundled original');
 assert.throws(()=>privateOriginalSkipReason(original,options),/Public export must omit/);
});
