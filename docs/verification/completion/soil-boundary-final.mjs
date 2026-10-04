import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SoilInputs} from '../../../src/soil-inputs.mjs';
import {Soil} from '../../../src/soil.mjs';
let cases=0,errors=[];
for(const fines of [5,12,20,50])for(const gravelShare of [0,25,50,75,100])for(const gradation of ['broad','uniform','gap'])for(const mass of [1,12.345,333.3,3333,10000.1]){
 const points=SoilInputs.generateCurve({fines,gravelShare,gradation});points.unshift({size:.02,passing:1});const a=Soil.classify({points,ll:32,pl:22}),conv=SoilInputs.passingToRetained(points,mass),b=Soil.classify({points:conv.points,ll:32,pl:22});
 if(a.status==='classified'&&b.status==='classified'){cases++;if(a.symbol!==b.symbol)errors.push({fines,gravelShare,gradation,mass,before:a.symbol,after:b.symbol,afterFines:b.fines,gravel:b.gravel,sand:b.sand});}
}
const summary={cases,failures:errors.length,errors};fs.writeFileSync(new URL('./soil-boundary-final-results.json',import.meta.url),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({cases,failures:errors.length}));assert.equal(errors.length,0,'Mass scaling must not change a boundary classification');
