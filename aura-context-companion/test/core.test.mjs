import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,contextPrompt,draftSummary,validateEvents,validateModelDraft} from '../src/core.mjs';
test('person context is explicitly user selected with a source',()=>{const p=contextPrompt(seed.people[0]);assert.match(p.text,/You selected Sarah/);assert.equal(p.source,'p1');});
test('unknown person is not identified',()=>assert.equal(contextPrompt(null).source,null));
test('medication prompts are blocked',()=>assert.equal(contextPrompt({...seed.people[0],note:'Take a blue pill'}).blocked,true));
test('summary links only selected event facts',()=>{const s=draftSummary(seed.events);assert.match(s,/\[e1\]/);assert.doesNotMatch(s,/mood|recognised|medication/i);});
test('medical events rejected before network',()=>assert.throws(()=>validateEvents([{id:'a',time:'10:00',text:'Take medication'}]),/not sent/));
test('invalid time and oversized input rejected',()=>{assert.throws(()=>validateEvents([{id:'a',time:'99:00',text:'x'}]));assert.throws(()=>validateEvents(Array(21).fill(seed.events[0])));});
test('model may not fabricate or rewrite evidence',()=>assert.throws(()=>validateModelDraft(JSON.stringify({items:[{sourceId:'e1',text:'Sarah seemed happy'}]}),[seed.events[0]]),/changed/));
test('model source ids verified',()=>assert.throws(()=>validateModelDraft(JSON.stringify({items:[{sourceId:'fake',text:'fact'}]}),seed.events),/evidence|safety/));
test('exact evidence survives validation',()=>assert.match(validateModelDraft(JSON.stringify({items:seed.events.map(e=>({sourceId:e.id,text:e.text}))}),seed.events),/AI-organised/));

test('model cannot silently omit confirmed events',()=>assert.throws(()=>validateModelDraft(JSON.stringify({items:[{sourceId:'e1',text:seed.events[0].text}]}),seed.events),/evidence/));
