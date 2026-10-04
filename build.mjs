import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import collectSources from './source-manifest.cjs';
import {Script} from 'node:vm';
import {evidenceAssetPolicy} from './build-asset-policy.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=file=>readFile(path.join(root,'src',file),'utf8');
const publicBuild=process.argv.includes('--public');
const externalAssets=evidenceAssetPolicy({publicBuild});
const {scriptFiles}=collectSources(root,{publicBuild});
const [shell,baseStyle,libraryStyle,worksheetStyle,excavationStyle,...scripts]=await Promise.all(['shell.html','style.css','learning-library.css','worksheet.css','excavation.css',...scriptFiles].map(read));
const style=[baseStyle,libraryStyle,worksheetStyle,excavationStyle].join('\n');
const font=await readFile(path.join(root,'assets/fonts/PretendardVariable.woff2'));
const license=await readFile(path.join(root,'assets/fonts/OFL.txt'),'utf8');
const fontCss=`/* Pretendard v1.3.9 — Copyright Kil Hyung-jin. SIL OFL 1.1.\n${license.replace(/\*\//g,'* /')}\n*/\n@font-face{font-family:'Pretendard Variable';font-weight:45 920;font-style:normal;font-display:swap;src:url(data:font/woff2;base64,${font.toString('base64')}) format('woff2');}`;
const source=scripts.map(s=>s.replace(/^export /gm,'')).join('\n');
const assetPaths=[...new Set([...source.matchAll(/["'](assets\/(?:data|compaction)\/[^"'\s]+\.(?:csv|tsv|json|txt|md|pdf|xlsx))["']/g)].map(m=>m[1]))].filter(name=>!Object.hasOwn(externalAssets,name));
const assets=Object.fromEntries(await Promise.all(assetPaths.map(async name=>{const encoding=/\.(pdf|xlsx)$/.test(name)?'base64':'utf8';return [name,{encoding,data:(await readFile(path.join(root,name))).toString(encoding)}];})));
const script='const PACKAGED_DATA='+JSON.stringify(assets).replace(/</g,'\\u003c')+';\nconst EVIDENCE_ASSET_POLICY='+JSON.stringify(externalAssets).replace(/</g,'\\u003c')+';\n'+source;
if(/<\/script/i.test(script))throw new Error('Script contains a closing script tag');
new Script(script,{filename:'geotech-lab.js'});
// A callback preserves JavaScript replacement tokens such as $`, $&, and $'.
const html=shell.replace('/*APP_STYLE*/',()=>style+'\n'+fontCss).replace('/*APP_SCRIPT*/',()=>script);
const embedded=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
if(embedded!==script)throw new Error('Embedded script differs from validated source');
if(publicBuild){
 await mkdir(path.join(root,'dist-public'),{recursive:true});
 await writeFile(path.join(root,'dist-public','index.html'),html);
}else{
 await writeFile(path.join(root,'index.html'),html);
 await mkdir(path.join(root,'dist'),{recursive:true});
 await writeFile(path.join(root,'dist','index.html'),html);
 await writeFile(path.join(root,'dist','migration-export.html'),await readFile(path.join(root,'migration-export.html'),'utf8'));
}
console.log(`Built ${publicBuild?'public':'personal'} self-contained geotech-lab.html`);
