import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed, isMedical, routineView, greeting, shareLinks, sanitizeState, draftSummary, contextPrompt} from '../public/core.js';
test('routine status is done, due or later', () => {
  const v = routineView([{id:'a',time:'09:00',text:'x',doneOn:'2026-11-15'},{id:'b',time:'10:00',text:'y',doneOn:''},{id:'c',time:'18:00',text:'z',doneOn:''}], '12:00', '2026-11-15');
  assert.deepEqual(v.map(r => r.status), ['done', 'due', 'later']);
});
test('ticks from a previous day do not count as done', () => assert.equal(routineView([{id:'a',time:'09:00',text:'x',doneOn:'2026-11-14'}], '12:00', '2026-11-15')[0].status, 'due'));
test('greeting by hour', () => { assert.equal(greeting(8), 'Good morning'); assert.equal(greeting(14), 'Good afternoon'); assert.equal(greeting(20), 'Good evening'); });
test('share links carry the text and nothing else', () => { const l = shareLinks('a b&c'); assert.match(l.whatsapp, /^https:\/\/wa\.me\/\?text=a%20b%26c$/); assert.match(l.email, /^mailto:\?subject=/); });
test('sanitize drops medical and malformed items and limits size', () => {
  const s = seed(); s.events.push({id:'m',time:'11:00',text:'Take medication',source:'x',selected:true}, {id:'bad id',time:'11:00',text:'x'}, {id:'t',time:'99:99',text:'x'});
  s.people.push({id:'px',name:'Eve',relationship:'Friend',note:'ok',photo:'javascript:alert(1)'});
  const c = sanitizeState(s); assert.equal(c.events.length, 2); assert.equal(c.people.find(p => p.id === 'px').photo, '');
});
test('sanitize rejects non-backups', () => { assert.throws(() => sanitizeState({}), /not an Aura backup/); assert.throws(() => sanitizeState(null)); });
test('sanitize strips unknown settings', () => assert.equal(sanitizeState({...seed(), settings:{text:'huge',contrast:'yes'}}).settings.text, 'normal'));
test('medical words are caught', () => assert.ok(isMedical('take the blue pill')) );
test('context and draft keep source ids and stay non-clinical', () => { const s = seed(); assert.equal(contextPrompt(s.people[0]).source, 'p1'); assert.match(draftSummary(s.events), /\[e1\]/); assert.doesNotMatch(draftSummary(s.events), /mood|safe/i); });
