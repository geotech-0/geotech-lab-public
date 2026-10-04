// Public exports retain selected evidence data and link to publisher originals.
// Personal builds continue to package their locally preserved originals.
export const publicExternalAssets=Object.freeze({
 'assets/data/oedometer-usgs-15021308-original.xlsx':Object.freeze({
  url:'https://zenodo.org/records/15021308',
  label:'원본 Excel · 온라인 출처',
 }),
 'assets/compaction/usace-em1110-3-141-page3-3.pdf':Object.freeze({
  url:'https://www.publications.usace.army.mil/portals/76/publications/engineermanuals/em_1110-3-141.pdf',
  label:'원문 PDF · 온라인 (인쇄 p.3-3)',
 }),
});

export function evidenceAssetPolicy({publicBuild=false}={}){
 return publicBuild?publicExternalAssets:{};
}
