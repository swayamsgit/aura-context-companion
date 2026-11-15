import {test} from 'node:test';
import assert from 'node:assert/strict';
import {metaCompletion, META_BASE_URL} from '../src/meta.mjs';
test('missing key never calls network', async () => {
  await assert.rejects(metaCompletion({messages: [], fetchImpl: () => {throw Error('network called');}}), /not configured/);
});
test('uses verified Meta endpoint and server-side bearer token', async () => {
  const output = await metaCompletion({key: 'test-secret', messages: [{role: 'user',content: 'synthetic test'}], fetchImpl: async (url, opts) => {
    assert.equal(url, META_BASE_URL + '/chat/completions');
    assert.equal(opts.headers.Authorization, 'Bearer test-secret');
    assert.equal(JSON.parse(opts.body).model, 'muse-spark-1.3');
    return {ok:true, json:async()=>({choices:[{message:{content:'ready'}}]})};
  }});
  assert.equal(output.text, 'ready');
});
test('provider errors do not expose private bodies or keys', async () => {
  await assert.rejects(metaCompletion({key:'test-secret',messages:[],fetchImpl:async()=>({ok:false,status:401,text:async()=> 'test-secret'})}), e => !e.message.includes('test-secret') && e.status === 503);
});
test('rate limits reported without retrying billable calls', async () => {
  let count=0;
  await assert.rejects(metaCompletion({key:'test',messages:[],fetchImpl:async()=>{count++;return {ok:false,status:429};}}), e => e.status === 429);
  assert.equal(count,1);
});
test('rejects empty output', async () => {
  await assert.rejects(metaCompletion({key:'test',messages:[],fetchImpl:async()=>({ok:true,json:async()=>({choices:[]})})}), /no usable text/);
});

