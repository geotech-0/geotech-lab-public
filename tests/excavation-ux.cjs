/* Run against a freshly built local app: GEOTECH_URL=http://127.0.0.1:8771 node tests/excavation-ux.cjs.
 * PLAYWRIGHT_MODULE can point to an existing Playwright installation; CHROME_EXECUTABLE is optional. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const output=path.resolve(__dirname,'../test-results');
fs.mkdirSync(output,{recursive:true});

(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{channel:'chrome'})});
 const errors=[],passed=[],measurements={};
 const check=(name,condition)=>{assert.ok(condition,name);passed.push(name);};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100},colorScheme:'light',reducedMotion:'reduce',acceptDownloads:true});
  page.on('pageerror',e=>errors.push(e.message));
  const field=key=>page.locator(`[data-ex-field="${key}"]`);
  const data=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('soil-sense-lab-v1')).state.data.excavation);
  const detail=async title=>{const summary=page.getByText(title,{exact:true});if(!await summary.evaluate(el=>el.parentElement.open))await summary.click();};
  const number=async(key,value)=>{const input=field(key);await input.fill(String(value));await input.press('Tab');};
  const phase=value=>page.locator(`[data-ex-action="phase"][data-phase="${value}"]`).click();
  const bar=page.locator('#ex-depth-bar');
  const plotCount=()=>page.locator('[data-ex-plot] path.ex-current').count();
  const noOverflow=()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
  await page.goto(process.env.GEOTECH_URL||'http://127.0.0.1:8771');
  // This regression targets the Korean lab workspace; the introduction has separate tests.
  await page.getByRole('button',{name:'한국어',exact:true}).click();
  await page.locator('[data-module="excavation"]').click();
  await page.locator('.ex-workspace').waitFor();
  const defaults=await data();
  check('excavation starts at H=0',Number(await bar.inputValue())===0&&defaults.observation.depth===0);
  check('four real result curves and bilateral initial pressure',await plotCount()===4&&await page.locator('.ex-pressure-back').count()===1&&await page.locator('.ex-pressure-front').count()===1);

  await field('count').selectOption('0');
  check('zero support count has no ghost support controls',!(await data()).supports.length&&await page.locator('[data-ex-field^="support."]').count()===0&&await field('selected').count()===0);
  check('unsupported wall keeps four valid initial results',await plotCount()===4);
  check('zero support state has no invented selected tier',!(await page.locator('[data-ex-stage-summary]').textContent()).includes('1단')&&!(await page.locator('[data-ex-plan-summary]').textContent()).includes('선택 단'));
  await detail('되메움 중 대체 지지');await field('slab.enabled').check();
  check('slab-only model is not presented as a primary support',(await data()).supports.length===1&&(await data()).supports[0].type==='slab'&&await field('supportType').count()===0);
  await field('slab.enabled').uncheck();await field('count').selectOption('2');
  check('supports can be added back after zero',await field('supportType').count()===1&&(await data()).supports.length===2);
  await page.locator('#reset').click();
  await page.locator('.ex-workspace').waitFor();

  await detail('되메움 중 대체 지지');await field('slab.enabled').check();
  const beforeSwitch=await data(),slabBefore=beforeSwitch.supports.find(s=>s.type==='slab');
  const primary=()=>data().then(d=>d.supports.filter(s=>s.type!=='slab'));
  const inclinedLines=()=>page.locator('[data-ex-section] line.ex-support').evaluateAll(lines=>lines.filter(el=>Number(el.getAttribute('y2'))>Number(el.getAttribute('y1'))).length);
  await field('selected').selectOption('1');await field('supportType').selectOption('strut');
  check('one type selection applies to every primary level', (await primary()).every(s=>s.type==='strut'&&s.angle===0));
  check('global type leaves replacement slab unchanged',JSON.stringify((await data()).supports.find(s=>s.type==='slab'))===JSON.stringify(slabBefore));
  check('global type preserves level geometry and properties',(await primary()).every((s,i)=>['id','z','stiffness','spacing','capacity','preload','installClearance','releaseClearance'].every(k=>s[k]===beforeSwitch.supports[i][k])));
  await field('selected').selectOption('2');
  check('level selection does not change the global type',await field('supportType').inputValue()==='strut'&&await field('support.type').count()===0);
  await field('supportType').selectOption('anchor');
  check('strut to anchor restores all input angles and sloping drawings',(await primary()).every(s=>s.type==='anchor'&&s.angle===15)&&await inclinedLines()===3);
  await field('supportType').selectOption('corner');await field('supportType').selectOption('anchor');
  check('corner to anchor restores every inclination',(await primary()).every(s=>s.angle===15)&&await inclinedLines()===3);
  await page.locator('#undo').click();
  check('one undo restores the previous type at every level',(await primary()).every(s=>s.type==='corner'&&s.angle===0));
  await field('count').selectOption('4');
  check('added level inherits the global support type',(await primary()).length===4&&(await primary()).every(s=>s.type==='corner'&&s.angle===0));
  await field('supportType').selectOption('nail');
  check('nail transition applies passive retained state to every level',(await primary()).every(s=>s.type==='nail'&&s.preload===0&&s.retained&&s.angle>0));
  await page.locator('#reset').click();

  await field('supportType').selectOption('corner');await detail('평면 배치 · 벽과 관찰 위치');
  for(const corner of [0,1,2,3])await page.locator(`[data-ex-corner="${corner}"]`).uncheck();
  check('corner supports without a selected corner report invalid input',await page.locator('#results .error-box').count()===1);
  await field('supportType').selectOption('anchor');
  check('switching away from empty corners restores four valid graphs',await plotCount()===4&&(await data()).plan.corners.length===0);
  await field('count').selectOption('0');
  check('empty corner selection does not invalidate unsupported excavation',await plotCount()===4);
  await page.locator('#reset').click();

  // Import an existing mixed record through the same file flow used by learners.
  const mixed=await data();mixed.supports[1].type='strut';mixed.supports[1].angle=0;
  const mixedFile={format:'soil-sense-experiment',version:5,experiment:{module:'excavation',question:'construction',current:mixed,baseline:defaults,compare:false}};
  await page.locator('#session-file-input').setInputFiles({name:'mixed-excavation.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mixedFile))});
  await page.locator('#session-file-dialog').waitFor({state:'visible'});await page.locator('#session-file-apply').click();
  await page.reload();await page.locator('.ex-workspace').waitFor();
  const mixedBefore=await data();
  check('old mixed record is explicit and is not silently changed',await field('supportType').inputValue()===''&&(await primary()).map(s=>s.type).join(',')==='anchor,strut,anchor');
  await field('selected').selectOption('2');await field('supportType').selectOption('anchor');
  check('global choice unifies an old mixed record',(await primary()).every(s=>s.type==='anchor')&&await inclinedLines()===3);
  await page.locator('#undo').click();
  check('undo recovers the complete mixed record',JSON.stringify(await data())===JSON.stringify(mixedBefore));
  await page.locator('#reset').click();

  await bar.scrollIntoViewIfNeeded();
  const box=await bar.boundingBox();
  await page.mouse.move(box.x+8,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width*.38,box.y+box.height/2,{steps:12});await page.mouse.up();
  measurements.dragDepth=Number(await bar.inputValue());
  check('continuous drag retains its focused range and valid curves',measurements.dragDepth>2&&measurements.dragDepth<4&&await bar.evaluate(el=>document.activeElement===el)&&await plotCount()===4);
  await bar.fill('3.2');await phase('backfill');
  let current=await data();
  check('backfill resets to final excavation before any fill',current.observation.depth===current.height&&current.observation.eventSide==='before'&&Number(await bar.inputValue())===0);
  check('all three initial supports remain active at backfill start',(await page.locator('.ex-force-table tbody tr').allTextContents()).every(t=>t.includes('작동')));
  await phase('excavation');check('excavation tab resets to zero',(await data()).observation.depth===0);
  await number('clearance',1);
  const installDepth=defaults.supports[0].z+1;
  check('shared clearance changes installation marker',await page.locator(`[data-ex-event-depth="${installDepth}"]`).count()===1);
  await phase('backfill');
  check('linked release uses the same clearance',await page.locator(`[data-ex-event-depth="${installDepth}"]`).count()===1);
  await page.locator(`[data-ex-event-depth="${installDepth}"]`).click();await page.locator('[data-ex-event-side]').selectOption('before');
  const releaseBefore=await page.locator('.ex-force-table tbody tr').first().textContent();
  await page.locator('[data-ex-event-side]').selectOption('after');
  check('release has distinct states at identical depth',releaseBefore.includes('작동')&&(await page.locator('.ex-force-table tbody tr').first().textContent()).includes('해체·해제'));
  await phase('excavation');await number('clearance',.5);await bar.fill('4');
  check('desktop chart columns fit and remain enabled',await noOverflow()&&!await bar.isDisabled()&&await plotCount()===4);
  measurements.plotWidths=await page.locator('[data-ex-plot]').evaluateAll(es=>es.map(el=>Math.round(el.getBoundingClientRect().width)));
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'excavation-desktop.png'),fullPage:true});

  await page.locator('#compare').check();
  check('comparison overlays all four results',await page.locator('[data-ex-plot] path.baseline').count()===4);
  await page.locator('#compare').uncheck();
  await detail('해석 가정 · 결과 범위');await field('observation.resultMode').selectOption('envelope');
  check('actual history envelope supplies min and max on four panels',await page.locator('[data-ex-plot] path.ex-envelope').count()===8);
  await field('observation.mode').selectOption('shape');
  check('shape idealization only permits total results',(await field('observation.resultMode').locator('option').allTextContents()).length===1&&await field('observation.resultMode').inputValue()==='total');
  await field('observation.mode').selectOption('history');
  await page.locator('[data-ex-axis-lock]').check();
  const axes=await page.locator('[data-ex-plot="displacement"] text').allTextContents();
  await bar.fill('4.2');
  check('locked axes preserve depth and result ticks',JSON.stringify(await page.locator('[data-ex-plot="displacement"] text').allTextContents())===JSON.stringify(axes));
  await page.locator('[data-ex-axis-lock]').uncheck();await bar.fill('3');

  await detail('벽체와 선택 지보의 강성');
  check('unspecified bond stiffness shows rigid connection',await field('support.bondStiffness').inputValue()===''&&await field('support.bondStiffness').getAttribute('placeholder')==='강체 연결');
  await field('supportType').selectOption('corner');
  check('planar braces have zero angle and no dead angle control',(await data()).supports[0].angle===0&&await field('support.angle').count()===0);
  await detail('평면 배치 · 벽과 관찰 위치');await field('plan.membersPerCorner').selectOption('2');
  await detail('평면 배치와 관찰 위치');
  check('four selected corners times two members gives eight members',await page.locator('[data-ex-member]').count()===8);
  await page.locator('[data-ex-corner="1"]').uncheck();
  check('specific corner checkbox changes actual geometry',await page.locator('[data-ex-member]').count()===6&&!(await data()).plan.corners.includes(1));
  await page.locator('[data-ex-corner="1"]').check();
  await detail('평면 배치와 관찰 위치');await page.locator('[data-ex-wall="B"]').first().click();
  current=await data();measurements.selectedWall=current.observation.wallId;measurements.selectedPosition=current.observation.position;
  check('plan point selects its wall and calculation strip',current.observation.wallId==='B'&&Math.abs(current.observation.position-1/6)<1e-8&&(await page.locator('[data-ex-plan-summary]').textContent()).includes('B벽'));
  for(const type of ['nail','rock','raker','strut']){await field('supportType').selectOption(type);check(type+' uses a valid input branch and renders four results',await field('supportType').inputValue()===type&&(await primary()).every(s=>s.type===type)&&await plotCount()===4);}
  await field('observation.wallId').selectOption('A');await number('observation.position',.5);
  await detail('되메움토 물성');await page.locator('[data-ex-action="copy-soil"]').click();
  current=await data();check('copy material copies all shared constitutive fields',['gamma','gammaSat','c','phi','kh','k0'].every(k=>current.fill[k]===current.soil[k]));
  const referenceKh=current.fill.kh;
  await page.locator('[data-ex-kh="fill"][data-ex-ratio="0.5"]').click();check('half kh preset changes actual saved input',(await data()).fill.kh===referenceKh*.5);
  await page.locator('[data-ex-kh="fill"][data-ex-ratio="2"]').click();check('double kh preset retains a stable reference',(await data()).fill.kh===referenceKh*2);
  await page.locator('[data-ex-kh="fill"][data-ex-ratio="1"]').click();

  await number('clearance',5);
  check('invalid installation depth reports failure instead of clamping',await page.locator('#results .error-box').count()===1&&(await data()).clearance===5&&await page.locator('[data-ex-plot]').count()===0&&!await bar.isDisabled());
  await number('clearance',.5);check('correcting input restores results',await plotCount()===4);
  await detail('되메움 중 대체 지지');await field('slab.enabled').check();await phase('backfill');
  await page.locator('[data-ex-event]').filter({hasText:'S'}).click();
  check('replacement slab exposes a separate connection-before-removal state',(await page.locator('[data-ex-event-side] option').allTextContents()).includes('연결 후 · 기존 지보 해체 전'));
  await page.locator('[data-ex-event-side]').selectOption('installed');
  const intermediate=await page.locator('.ex-force-table tbody tr').allTextContents();
  check('replacement connection retains both slab and existing support',intermediate[0].includes('작동')&&intermediate.at(-1).includes('대체 슬래브')&&intermediate.at(-1).includes('잔존'));
  await phase('excavation');await bar.fill('4');

  await page.locator('#compare').check();await detail('지보 축력 · 결과 내보내기');
  for(const format of ['csv','svg']){const pending=page.waitForEvent('download');await page.locator(`[data-ex-export="${format}"]`).click();await(await pending).saveAs(path.join(output,`excavation-verified.${format}`));}
  const csv=fs.readFileSync(path.join(output,'excavation-verified.csv'),'utf8'),svg=fs.readFileSync(path.join(output,'excavation-verified.svg'),'utf8');
  measurements.svgPanels=(svg.match(/<svg\b/g)||[]).length-1;measurements.csvLines=csv.split(/\r?\n/).length;
  check('CSV includes computed profiles, bilateral pressure, and physical support forces',csv.includes('retained_kPa')&&csv.includes('excavation_kPa')&&csv.includes('"profile"')&&csv.includes('"support"')&&csv.includes('max_axial_kN')&&measurements.csvLines>20);
  check('SVG is portable and contains all five result panels',measurements.svgPanels===5&&!svg.includes('var(--'));
  check('SVG includes Korean analysis labels and pressure/baseline legend',['시공 이력','총결과','배면(+)','굴착측(−)','순압','기준안'].every(s=>svg.includes(s)));
  const svgPage=await browser.newPage({viewport:{width:950,height:460}});svgPage.on('pageerror',e=>errors.push(e.message));
  await svgPage.goto(pathToFileURL(path.join(output,'excavation-verified.svg')).href);
  check('exported SVG parses independently',await svgPage.locator('parsererror').count()===0&&await svgPage.locator('svg svg').count()===5);
  await svgPage.screenshot({path:path.join(output,'excavation-svg-export.png')});await svgPage.close();await page.locator('#compare').uncheck();
  const beforeReload=await data();await page.reload();await page.locator('.ex-workspace').waitFor();
  check('reload preserves nested inputs, slab, and observation',JSON.stringify(await data())===JSON.stringify(beforeReload)&&Number(await bar.inputValue())===4);

  await page.emulateMedia({colorScheme:'dark'});await page.screenshot({path:path.join(output,'excavation-dark.png'),fullPage:true});
  for(const width of [390,320]){
   await page.setViewportSize({width,height:1200});
   await page.waitForFunction(()=>[...document.querySelectorAll('[data-ex-plot]')].every(svg=>Math.abs(svg.viewBox.baseVal.width-svg.clientWidth)<1));
   check(width+'px viewport has no horizontal page overflow',await noOverflow());
   check(width+'px viewport keeps four readable results',await plotCount()===4);
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,`excavation-mobile${width}.png`),fullPage:true});
  }
  check('no browser exceptions',errors.length===0);
  fs.writeFileSync(path.join(output,'excavation-ux-results.json'),JSON.stringify({total:passed.length,passed,measurements,errors},null,2));
  console.log(JSON.stringify({total:passed.length,measurements,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
