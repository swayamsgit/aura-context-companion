export const isMedical = text => /\b(pill|medication|medicine|dosage|dose|diagnos|prescri|tablet|insulin|blood pressure|treat(?:ment)?)\b/i.test(text);

export const seed = () => ({
  demo: true,
  settings: {text: 'normal', contrast: false},
  people: [
    {id: 'p1', name: 'Sarah', relationship: 'Daughter', note: 'Started a new role at the library. Ask how her first week went.', source: 'Caregiver-entered example', photo: ''},
    {id: 'p2', name: 'Daniel', relationship: 'Neighbour', note: 'Enjoys the community garden. You usually meet on the afternoon walk.', source: 'Caregiver-entered example', photo: ''}
  ],
  events: [
    {id: 'e1', time: '10:00', text: 'Walked in the park with Sarah.', source: 'Manually confirmed example', selected: true},
    {id: 'e2', time: '12:30', text: 'Had lunch at home and listened to jazz.', source: 'Manually confirmed example', selected: true}
  ],
  routines: [
    {id: 'r1', time: '09:00', text: 'Morning walk', doneOn: ''},
    {id: 'r2', time: '13:00', text: 'Water the plants', doneOn: ''},
    {id: 'r3', time: '16:00', text: 'Tea with Daniel in the garden', doneOn: ''}
  ]
});

export const LIMITS = {people: 12, events: 30, routines: 20};

export function contextPrompt(person) {
  if (!person) return {text: 'I do not have a confirmed person for this moment. Choose a saved person only if you know who they are.', source: null};
  if (isMedical(person.note)) return {text: 'This note concerns health or medication. Ask your caregiver or qualified clinician; Aura cannot advise what to take.', source: person.id, blocked: true};
  return {text: `You selected ${person.name}, your ${person.relationship.toLowerCase()}. ${person.note}`, source: person.id};
}

export function draftSummary(events) {
  const chosen = events.filter(e => e.selected && !isMedical(e.text)).sort((a, b) => a.time.localeCompare(b.time));
  return chosen.length
    ? 'Daily check-in draft\n\n' + chosen.map(e => `${e.time}: ${e.text} [${e.id}]`).join('\n') + '\n\nThese are manually entered notes, not observations by Aura. Please review for accuracy before sharing.'
    : 'No non-medical events selected. Add or select a confirmed everyday event first.';
}

export function greeting(hour) {
  return hour < 5 ? 'Good evening' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Routine items sorted by time, each with a status: done, due (time has passed) or later. */
export function routineView(routines, nowHHMM, today) {
  return [...routines].sort((a, b) => a.time.localeCompare(b.time)).map(r => ({
    ...r,
    status: r.doneOn === today ? 'done' : r.time <= nowHHMM ? 'due' : 'later'
  }));
}

export function shareLinks(text) {
  const body = encodeURIComponent(text);
  return {
    whatsapp: `https://wa.me/?text=${body}`,
    email: `mailto:?subject=${encodeURIComponent('Daily check-in')}&body=${body}`
  };
}

const str = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const id = v => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,60}$/.test(v);
const hhmm = v => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const photo = v => typeof v === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 70000 ? v : '';

/** Validate and clean any stored or imported data. Never trust it. Health/medication text is dropped. */
export function sanitizeState(obj) {
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.people) || !Array.isArray(obj.events)) throw Error('This file is not an Aura backup.');
  const people = obj.people.slice(0, LIMITS.people).filter(p => p && id(p.id) && str(p.name, 50) && str(p.relationship, 50) && str(p.note, 300))
    .map(p => ({id: p.id, name: str(p.name, 50), relationship: str(p.relationship, 50), note: str(p.note, 300), source: str(p.source, 80) || 'Entered on this browser', photo: photo(p.photo)}));
  const events = obj.events.slice(0, LIMITS.events).filter(e => e && id(e.id) && hhmm(e.time) && str(e.text, 500) && !isMedical(str(e.text, 500)))
    .map(e => ({id: e.id, time: e.time, text: str(e.text, 500), source: str(e.source, 80) || 'Manually entered', selected: e.selected === true}));
  const routines = (Array.isArray(obj.routines) ? obj.routines : []).slice(0, LIMITS.routines).filter(r => r && id(r.id) && hhmm(r.time) && str(r.text, 120) && !isMedical(str(r.text, 120)))
    .map(r => ({id: r.id, time: r.time, text: str(r.text, 120), doneOn: /^\d{4}-\d{2}-\d{2}$/.test(r.doneOn || '') ? r.doneOn : ''}));
  const s = obj.settings || {};
  return {
    demo: obj.demo === true,
    settings: {text: ['normal', 'large', 'xl'].includes(s.text) ? s.text : 'normal', contrast: s.contrast === true},
    people, events, routines
  };
}

export const newId = prefix => prefix + Math.random().toString(36).slice(2, 10);
