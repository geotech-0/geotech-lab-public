import test from 'node:test';import assert from 'node:assert/strict';import {Reinforcement as R} from '../src/reinforcement.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8);
test('unit-width hand calculation 2 surfaces with kPa*m gives kN/m',()=>{const r=R.solve();near(r.pullout,100);near(r.resistance,80);near(r.transitionLength,1.6);assert.equal(r.governing,'tensile');});
test('embedment doubles pullout but cannot exceed specified tensile comparison',()=>{const a=R.solve({embedment:.5}),b=R.solve({embedment:1}),c=R.solve({embedment:4});near(a.resistance,25);near(b.resistance,50);near(c.pullout,200);near(c.resistance,80);});
test('effective stress and tested interaction factor scale pullout independently',()=>{near(R.solve({normalStress:25}).pullout,50);near(R.solve({pulloutFactor:.25}).pullout,50);});
test('transition equality and opposite sides classify the limiting mode',()=>{assert.equal(R.solve({embedment:1.6}).governing,'equal');assert.equal(R.solve({embedment:1.5}).governing,'pullout');assert.equal(R.solve({embedment:1.7}).governing,'tensile');});
test('zero confinement or interaction has no fictitious finite transition length',()=>{for(const d of [{normalStress:0},{pulloutFactor:0}]){const r=R.solve(d);near(r.resistance,0);assert.equal(r.transitionLength,null);}near(R.solve({tensileResistance:0}).resistance,0);});
test('invalid and overflowing inputs are rejected',()=>{for(const d of [null,[],{embedment:-1},{normalStress:NaN},{pulloutFactor:'0.5'},{normalStress:1e308,embedment:1e308}])assert.equal(R.solve(d).valid,false);});
