/* Keep changed parameters next to the controls that produced the result. */
function renderControlComparison(){
 const key=state.active,current=state.data[key],reference=state.baselines[key];
 for(const control of $('controls').querySelectorAll('.control')){
  const input=control.querySelector('input[type=number][data-field]');
  if(!input)continue;
  const field=input.dataset.field,old=reference[field],value=current[field];
  const changed=state.compare[key]&&Number.isFinite(old)&&Number.isFinite(value)&&old!==value&&!(key==='stress'&&field==='depth')&&!labRegistry[key]?.comparisonIgnoredFields?.includes(field);
  control.classList.toggle('is-changed',changed);
  let hint=control.querySelector('.control-baseline');
  if(!changed){hint?.remove();continue;}
  if(!hint){hint=document.createElement('p');hint.className='control-baseline';control.append(hint);}
  const unit=control.querySelector('.unit')?.textContent||'';
  hint.textContent=`기준 ${fmt(old/Number(input.dataset.mult||1),2)} ${unit}`;
 }
}
