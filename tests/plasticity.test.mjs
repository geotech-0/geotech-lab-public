import test from 'node:test';
import assert from 'node:assert/strict';
import { Plasticity } from '../src/plasticity.mjs';
import { Soil } from '../src/soil.mjs';

test('default LL32 PL22 locates the fines in CL and distinguishes the coarse soil', () => {
  const result = Plasticity.analyze({ ll: 32, pl: 22, fines: 8 });
  assert.equal(result.valid, true);
  assert.deepEqual(result.point, { ll: 32, pi: 10 });
  assert.equal(result.zone, 'CL');
  assert.equal(result.scope, 'coarse-fines');
  assert.equal(Soil.classify({ points: Soil.generateCurve({ fines: 8 }), ll: 32, pl: 22 }).symbol, 'SW-SC');
});

test('LL50 and PI4/7 boundaries agree with the whole-soil engine', () => {
  const cases = [[25,21.001,'ML'],[25,21,'CL-ML'],[25,18,'CL-ML'],[25,17.999,'CL'],[50,28.1,'CH'],[50,28.101,'MH']];
  for (const [ll,pl,zone] of cases) {
    assert.equal(Plasticity.analyze({ ll,pl,fines:60 }).zone, zone);
    assert.equal(Soil.classify({ points:Soil.generateCurve({fines:60}),ll,pl }).symbol, zone);
  }
});

test('U-line exceedance is advisory and never blocks a mathematically valid point', () => {
  const result = Plasticity.analyze({ ll: 40, pl: 5, fines: 60 });
  assert.equal(result.valid, true);
  assert.equal(result.zone, 'CL');
  assert.equal(result.plausibility.aboveU, true);
  assert.match(result.plausibility.note, /분류 경계가 아닙니다/);
  assert.equal(Plasticity.analyze({ ll:40, pl:11.2 }).plausibility.aboveU, false);
});

test('NP does not invent PI=0 or require an unused PL', () => {
  const result = Plasticity.analyze({ ll: 32, pl: null, np: true, fines: 10 });
  assert.equal(result.valid, true);
  assert.equal(result.status, 'nonplastic');
  assert.equal(result.pi, null);
  assert.equal(result.point, null);
  assert.equal(result.zone, null);
  assert.equal(Plasticity.analyze({ np:true }).valid, true);
});

test('NP is not the same as a measured zero index', () => {
  const result = Plasticity.analyze({ll:30,pl:30});
  assert.equal(result.status,'plotted');
  assert.deepEqual(result.point,{ll:30,pi:0});
  assert.equal(result.zone,'ML');
});

test('LL above 100 expands the chart without changing or capping inputs', () => {
  const result = Plasticity.analyze({ ll: 180, pl: 40, fines: 60 });
  assert.equal(result.valid,true);
  assert.equal(result.point.ll,180);
  assert.equal(result.pi,140);
  assert.ok(result.displayDomain.xMax > 180);
  assert.ok(result.displayDomain.yMax > 140);
  assert.equal(result.zone,'CH');
});

test('impossible or incomplete inputs do not leave a plotted point', () => {
  for (const input of [{ll:20,pl:21},{ll:0,pl:0},{ll:NaN,pl:10},{ll:40,pl:-1},{ll:40,pl:''},{ll:40,pl:10,fines:101},{ll:40,pl:10,np:'yes'}]) {
    const result = Plasticity.analyze(input);
    assert.equal(result.valid,false);
    assert.equal(result.point,null);
    assert.ok(result.errors.length);
  }
});

test('scope changes at 5 and 50 percent and clean coarse soil does not use chart zone', () => {
  for (const [fines,scope] of [[4.99,'clean-coarse'],[5,'coarse-fines'],[49.99,'coarse-fines'],[50,'fine-soil']]) {
    assert.equal(Plasticity.analyze({ll:40,pl:20,fines}).scope,scope);
  }
  assert.match(Plasticity.analyze({ll:40,pl:20,fines:3}).scopeNote,/결정하지 않습니다/);
});
