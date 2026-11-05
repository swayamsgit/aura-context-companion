export const seed = {
  people: [{id:'p1',name:'Sarah',relationship:'Daughter',note:'Started a new role at the library. Ask how her first week went.',source:'Caregiver-entered example'}, {id:'p2',name:'Daniel',relationship:'Neighbour',note:'Enjoys the community garden. You usually meet on the afternoon walk.',source:'Caregiver-entered example'}],
  events: [{id:'e1',time:'10:00',text:'Walked in the park with Sarah.',source:'Manually confirmed example',selected:true},{id:'e2',time:'12:30',text:'Had lunch at home and listened to jazz.',source:'Manually confirmed example',selected:true}],
};
export function isMedical(text) { return /\b(pill|medication|medicine|dosage|dose|diagnos|prescri|tablet|insulin|blood pressure|treat(?:ment)?)\b/i.test(text); }
export function contextPrompt(person) {
  if (!person) return {text:'I do not have a confirmed person for this moment. Choose a saved person only if you know who they are.',source:null};
  if (isMedical(person.note)) return {text:'This note concerns health or medication. Ask your caregiver or qualified clinician; Aura cannot advise what to take.',source:person.id,blocked:true};
  return {text:`You selected ${person.name}, your ${person.relationship.toLowerCase()}. ${person.note}`,source:person.id};
}
export function draftSummary(events) {
  const chosen = events.filter(e=>e.selected && !isMedical(e.text));
  return chosen.length ? 'Daily check-in draft\n\n' + chosen.map(e=>`${e.time}: ${e.text} [${e.id}]`).join('\n') + '\n\nThese are manually entered notes, not observations by Aura. Please review for accuracy before sharing.' : 'No non-medical events selected. Add or select a confirmed everyday event first.';
}
export function validateEvents(events) {
  if (!Array.isArray(events) || !events.length || events.length>20) throw Error('Choose between 1 and 20 events.');
  return events.map(e=> {
    if (!e || typeof e.id!=='string' || !/^[a-zA-Z0-9_-]{1,60}$/.test(e.id) || typeof e.text!=='string' || e.text.length<1 || e.text.length>500 || typeof e.time!=='string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)) throw Error('An event is invalid. Use a time and 1-500 characters.');
    if (isMedical(e.text)) throw Error('Health and medication notes are not sent for AI processing.');
    return {id:e.id,text:e.text,time:e.time};
  });
}
export function validateModelDraft(raw,events) {
  let obj;
  try { obj=JSON.parse(raw); } catch { throw Error('The AI draft was not valid structured text. Use the local evidence draft instead.'); }
  if (!Array.isArray(obj.items) || !obj.items.length || obj.items.length!==events.length) throw Error('The AI draft did not contain valid evidence links.');
  const byId = new Map(events.map(e=>[e.id,e]));
  const out = obj.items.map(item=> {
    if (!item || !byId.has(item.sourceId) || typeof item.text!=='string' || item.text.length>600 || !item.text.trim() || isMedical(item.text)) throw Error('The AI draft failed its safety or evidence checks.');
    // Only exact confirmed event text can survive the boundary. Model chooses order/grouping, never new facts.
    const e=byId.get(item.sourceId);
    if (item.text!==e.text) throw Error('The AI changed a confirmed fact. Use the local evidence draft instead.');
    return `${e.time}: ${e.text} [${e.id}]`;
  });
  if (new Set(obj.items.map(x=>x.sourceId)).size!==obj.items.length) throw Error('The AI duplicated an event.');
  return 'Daily check-in draft\n\n'+out.join('\n')+'\n\nAI-organised from manually entered notes. No health, mood or identity conclusions are made. Please review before sharing.';
}
