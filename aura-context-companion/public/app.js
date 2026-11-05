import {seed,contextPrompt,draftSummary,isMedical} from './core.js';
const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
let state=clone(seed), current='moment',personId='p1',api={enabled:false,remaining:0},memoryOnly=false;
try {const saved=JSON.parse(localStorage.getItem('aura.v1'));if(saved && Array.isArray(saved.people) && Array.isArray(saved.events)&&saved.people.length<=12&&saved.events.length<=30) state=saved;}catch{memoryOnly=true;}
function save(){try{localStorage.setItem('aura.v1',JSON.stringify(state));}catch{memoryOnly=true;toast('Storage unavailable. Changes last for this visit only.');}invalidateDraft();render();}
function text(el,s){el.textContent=s;return el;}
function node(tag,cls,s){const e=document.createElement(tag);if(cls)e.className=cls;if(s!==undefined)e.textContent=s;return e;}
function status(id,message,error=false){$(id).textContent=message;$(id).classList.toggle('error',error);}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;setTimeout(()=>$('toast').hidden=true,4000);}
function go(page){if(!['moment','people','journal','caregiver','about'].includes(page))page='moment';current=page;document.querySelectorAll('.page').forEach(e=>e.hidden=e.id!==page);document.querySelectorAll('.nav').forEach(e=>e.classList.toggle('active',e.dataset.page===page));location.hash=page;window.scrollTo(0,0);}
function invalidateDraft(){if($('draft-text').value){$('draft-text').value='';$('draft-method').textContent='Notes changed';} $('review-confirm').checked=false;$('copy-draft').disabled=true;}
function render(){
 const person=state.people.find(p=>p.id===personId);
 const prompt=contextPrompt(person);
 const choices=$('person-choices');choices.replaceChildren();
 for(const p of state.people){const b=node('button','person-choice'+(p.id===personId?' active':''));b.type='button';b.setAttribute('aria-pressed',String(p.id===personId));b.append(node('span','avatar',p.name.charAt(0)),node('span','',p.name));b.onclick=()=>{personId=p.id;render();};choices.append(b);}
 const unknown=node('button','person-choice'+(!person?' active':''),'Not sure');unknown.onclick=()=>{personId='';render();};choices.append(unknown);
 $('nudge').replaceChildren(node('span','',prompt.text),node('span','source',prompt.source?`SOURCE / ${person?.source||'Entered on this browser'} · ${prompt.source}`:'No confirmed source. No identity guessed.'));
 $('log-moment').disabled=!person||!!prompt.blocked;
 const timeline=$('moment-timeline');timeline.replaceChildren();
 const events=[...state.events].sort((a,b)=>a.time.localeCompare(b.time));
 if(!events.length)timeline.append(node('p','empty','No moments saved yet. Add a confirmed everyday event in Daily notes.'));
 for(const e of events.slice(-3)){const d=node('div','timeline-item');d.append(node('span','time',e.time),node('p','',e.text),node('small','',`Source ${e.id} · manually entered`));timeline.append(d);}
 const list=$('people-list');list.replaceChildren();
 if(!state.people.length)list.append(node('p','empty','Your circle is empty. Add someone using the form below.'));
 for(const p of state.people){const d=node('article','panel person-card'),head=node('div','person-title'),info=node('div');info.append(node('h2','',p.name),node('span','relation',p.relationship));head.append(node('span','avatar',p.name.charAt(0)),info);const del=node('button','delete','Remove person');del.onclick=()=>{state.people=state.people.filter(x=>x.id!==p.id);save();};d.append(head,node('p','',p.note),node('p','source',`${p.source} · ${p.id}`),del);list.append(d);}
 $('nav-count').textContent=String(state.events.length);$('event-count').textContent=`${state.events.length} notes`;
 const eventList=$('event-list');eventList.replaceChildren();
 if(!events.length)eventList.append(node('p','empty','No daily notes. Add a moment to start a check-in.'));
 for(const e of events){const row=node('div','event-row'),lab=node('label'),check=node('input'),body=node('span');check.type='checkbox';check.checked=e.selected;check.setAttribute('aria-label',`Include event ${e.id} in check-in`);check.onchange=()=>{e.selected=check.checked;save();};body.append(node('time','',e.time),node('span','',e.text),node('small','',`${e.source} · ${e.id}`));lab.append(check,body);const del=node('button','delete','Remove');del.setAttribute('aria-label',`Remove event ${e.id}`);del.onclick=()=>{state.events=state.events.filter(x=>x.id!==e.id);save();};row.append(lab,del);eventList.append(row);}
 const selected=$('selected-events');selected.replaceChildren();const chosen=state.events.filter(e=>e.selected&&!isMedical(e.text));
 if(!chosen.length) selected.append(node('p','empty','No everyday notes selected. Select events in Daily notes first.'));
 chosen.forEach(e=>{const d=node('div','selected-note');d.append(node('span','',`${e.time} / ${e.id}`),node('div','',e.text));selected.append(d);});
 $('local-draft').disabled=chosen.length===0;
 $('meta-draft').disabled=!api.enabled||!$('cloud-consent').checked||chosen.length===0||api.remaining<=0;
 $('api-status').textContent=api.enabled?`${api.remaining} calls left`:'Live calls off';
 if(!api.enabled)status('cloud-status','API-ready code, not live AI. Run the Node server with an approved key and call limit to enable.');
 if(memoryOnly) document.querySelector('.local').textContent='Storage unavailable / this visit only';
}
document.querySelectorAll('[data-page]').forEach(e=>e.onclick=()=>go(e.dataset.page));document.querySelectorAll('[data-goto]').forEach(e=>e.onclick=()=>go(e.dataset.goto));window.addEventListener('hashchange',()=>go(location.hash.slice(1)));
$('speak').onclick=()=>{if(!('speechSynthesis'in window)){status('moment-status','Read-aloud is not supported by this browser.',true);return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(contextPrompt(state.people.find(p=>p.id===personId)).text);u.rate=.85;u.onerror=()=>status('moment-status','Read-aloud is unavailable. The context card remains readable.',true);speechSynthesis.speak(u);status('moment-status','Reading the confirmed context card.');};
$('log-moment').onclick=()=>{if(state.events.length>=30){status('moment-status','Maximum 30 demo events. Remove an event first.',true);return;}const p=state.people.find(p=>p.id===personId);if(!p)return;const t=new Date().toTimeString().slice(0,5);state.events.push({id:'e'+crypto.randomUUID().slice(0,8),time:t,text:`Spent time with ${p.name}.`,source:'Manually selected and saved',selected:true});save();status('moment-status','Moment saved to daily notes. No recognition was inferred.');};
$('person-form').onsubmit=e=>{e.preventDefault();if(state.people.length>=12)return status('people-status','Maximum 12 demo people. Remove one first.',true);const name=$('person-name').value.trim(),relationship=$('person-relation').value.trim(),note=$('person-note').value.trim();if(!name||!relationship||!note)return status('people-status','Complete all three fields.',true);if(isMedical(note))return status('people-status','Keep health and medication instructions out of this non-clinical prototype.',true);state.people.push({id:'p'+crypto.randomUUID().slice(0,8),name,relationship,note,source:'Entered on this browser'});save();e.target.reset();status('people-status','Person saved on this browser.');};
$('event-form').onsubmit=e=>{e.preventDefault();const t=$('event-time').value,body=$('event-text').value.trim();if(!body||!t)return status('event-status','Enter a time and a confirmed event.',true);if(isMedical(body))return status('event-status','Aura does not record or advise medication decisions. Use a caregiver or qualified clinician.',true);if(state.events.length>=30)return status('event-status','Maximum 30 demo events. Remove one first.',true);state.events.push({id:'e'+crypto.randomUUID().slice(0,8),time:t,text:body,source:'Entered on this browser',selected:true});save();$('event-text').value='';status('event-status','Confirmed event added.');};
function setDraft(value,method){$('draft-text').value=value;$('draft-method').textContent=method;$('review-confirm').checked=false;$('copy-draft').disabled=true;status('copy-status','Review this text against the selected notes. Nothing is sent.');}
$('local-draft').onclick=()=>setDraft(draftSummary(state.events),'Local evidence draft');
$('cloud-consent').onchange=render;
$('meta-draft').onclick=async()=>{if(!$('cloud-consent').checked)return;const events=state.events.filter(e=>e.selected&&!isMedical(e.text)).map(({id,time,text})=>({id,time,text}));$('meta-draft').disabled=true;status('cloud-status','Sending only the selected notes to Meta.');try{const r=await fetch('/api/summary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,events})});const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed.');api.remaining=data.remaining;setDraft(data.text,'Live Meta / '+data.model);status('cloud-status','Meta returned a source-validated draft. Review it before copying.');}catch(e){status('cloud-status',e.message||'Meta is unavailable. Use the local evidence draft.',true);}finally{render();}};
$('review-confirm').onchange=()=>{$('copy-draft').disabled=!$('review-confirm').checked||!$('draft-text').value.trim();};
$('draft-text').oninput=()=>{$('review-confirm').checked=false;$('copy-draft').disabled=true;};
$('copy-draft').onclick=async()=>{if(!$('review-confirm').checked)return;try{await navigator.clipboard.writeText($('draft-text').value);status('copy-status','Reviewed text copied. You choose where to paste it. Nothing was sent.');}catch{$('draft-text').focus();$('draft-text').select();status('copy-status','Clipboard unavailable. Select and copy the reviewed text manually.',true);}};
$('reset').onclick=()=>{if(!confirm('Replace this browser’s notes with the fictional demo day?'))return;state=clone(seed);personId='p1';save();toast('Fictional demo restored.');};
$('clear-all').onclick=()=>{if(!confirm('Delete all people and daily notes on this browser? This cannot be undone.'))return;state={people:[],events:[]};personId='';save();status('clear-status','All browser notes deleted.');};
fetch('/api/status').then(r=>r.ok?r.json():null).then(data=>{if(data)api=data;render();}).catch(()=>render());
render();go(location.hash.slice(1)||'moment');
