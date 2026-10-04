import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicExternalAssets} from '../../build-asset-policy.mjs';

const defaultRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');

// Absence alone never skips verification: only the declared public distribution
// may omit these two originals. A personal checkout missing either file fails.
export function privateOriginalSkipReason(relativePath,{projectRoot=defaultRoot}={}){
 assert.ok(Object.hasOwn(publicExternalAssets,relativePath),'Only explicitly excluded originals may skip byte verification');
 const marker=path.join(projectRoot,'public-release.json');
 if(!existsSync(marker))return false;
 const policy=JSON.parse(readFileSync(marker,'utf8'));
 assert.equal(policy.sourceDistribution,'public');
 assert.deepEqual([...policy.omittedOriginals].sort(),Object.keys(publicExternalAssets).sort());
 for(const original of policy.omittedOriginals)assert.ok(!existsSync(path.join(projectRoot,original)),`Public export must omit ${original}`);
 return 'Public export intentionally omits the publisher original; original-byte verification is not rerun here. Selected data and source provenance remain tested.';
}
