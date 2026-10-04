function createWholeWorkspaceAdapter({getState,setState,library,worksheet,catalog,defaultState}){
 const shapeFiles=createLearningSessionFiles({catalog,validate:()=>({valid:true})});
 function validate(records){WorkspaceFiles.inspectRecords(records);
  if(records.experiment!==null){const record=JSON.parse(records.experiment),s=record.state,keys=Object.keys(catalog);
   if(Object.keys(record).sort().join(',')!=='state,version'||Object.keys(s).sort().join(',')!=='active,baselineNames,baselines,bearingViewed,compare,data,question'||!keys.includes(s.active)||typeof s.bearingViewed!=='boolean')throw new Error('실험 전체 저장 형식을 확인하세요.');
   for(const name of ['data','baselines','question','compare','baselineNames'])if(!s[name]||Object.keys(s[name]).sort().join(',')!==keys.slice().sort().join(','))throw new Error('실험 목록이 현재 버전과 다릅니다. 원래 앱 버전으로 복원하세요.');
   for(const key of keys){shapeFiles.inspect({module:key,question:s.question[key],current:s.data[key],baseline:s.baselines[key],compare:s.compare[key]});if(typeof s.baselineNames[key]!=='string'||s.baselineNames[key].length>200)throw new Error('비교 기준 이름을 확인하세요.');}
  }
  if(records.library!==null)library.store.validate(JSON.parse(records.library));
  if(records.worksheet!==null)FoundationWorksheetFiles.parse(records.worksheet);
  return records;
 }
 const initial=defaultState||getState(),emptyLibrary=JSON.stringify({version:1,examples:[],progress:{},activeRoute:null});
 function capture(){return {experiment:JSON.stringify({version:1,state:getState()}),library:JSON.stringify(library.store.load()),worksheet:FoundationWorksheetFiles.serialize(worksheet.getInput())};}
 function apply(records){validate(records);const complete={experiment:records.experiment||JSON.stringify({version:1,state:initial}),library:records.library||emptyLibrary,worksheet:records.worksheet||FoundationWorksheetFiles.serialize(FoundationWorksheet.example())};
  WorkspaceFiles.writeAtomic(localStorage,complete);library.store.acceptRestored(JSON.parse(complete.library));setState(JSON.parse(complete.experiment).state);worksheet.setInput(FoundationWorksheetFiles.parse(complete.worksheet));library.refresh();
 }
 return {capture,apply,validate};
}
