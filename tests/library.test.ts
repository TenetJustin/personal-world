import test from 'node:test';
import assert from 'node:assert/strict';
import {newEntry,validateEntry,mergeEntries,parseRoute,entryPath,safeURL,MAX_LIBRARY} from '../src/library/model.ts';
import {encodeBackup,decodeBackup} from '../src/library/storage.ts';
test('local records reject unsafe URLs, invalid IDs and incompatible attachments',()=>{
  const e=newEntry('projects','测试项目');
  assert.equal(safeURL('javascript:alert(1)'),null);
  assert.equal(safeURL('https://example.com'),'https://example.com/');
  assert.throws(()=>validateEntry({...e,url:'data:text/html,unsafe'}));
  assert.throws(()=>validateEntry({...e,id:'../../secret'}));
  assert.throws(()=>validateEntry({...e,title:' '}));
  assert.throws(()=>validateEntry({...e,blob:new Blob(['<svg/>'],{type:'image/svg+xml'})}));
  assert.throws(()=>validateEntry({...e,blob:new Blob(['x'],{type:'image/png'})}));
});
test('backup round trip preserves Chinese text, timestamps, trash state and original PDF bytes',async()=>{
  const e={...newEntry('resume','测试履历'),body:'# 经历\n这是一条自动化测试资料。',fileName:'test.pdf',blob:new Blob(['%PDF-1.7\nfixture\n%%EOF'],{type:'application/pdf'}),deletedAt:new Date().toISOString()};
  const json=await encodeBackup([e]);const restored=await decodeBackup(new Blob([json]));
  assert.equal(restored.length,1);assert.equal(restored[0].body,e.body);assert.equal(restored[0].deletedAt,e.deletedAt);
  assert.equal(restored[0].createdAt,e.createdAt);assert.equal(restored[0].blob?.type,'application/pdf');
  assert.deepEqual(await restored[0].blob?.arrayBuffer(),await e.blob.arrayBuffer());
});
test('restore is a validated, idempotent merge and rejects duplicate IDs before writing',()=>{
  const a=newEntry('notes','原内容'),b=newEntry('notes','其他资料');
  const restored={...a,body:'备份中的内容'};
  const once=mergeEntries([a,b],[restored]);assert.equal(once.length,2);assert.equal(once[0].body,restored.body);
  assert.deepEqual(mergeEntries(once,[restored]),once);
  assert.throws(()=>mergeEntries([],[a,a]));
  assert.throws(()=>mergeEntries([],Array.from({length:5001},()=>newEntry('notes'))));
  assert.ok(MAX_LIBRARY===100*1024*1024);
});
test('corrupted or unknown backup formats cannot enter the data store',async()=>{
  for(const input of ['bad json',JSON.stringify({format:'unknown',version:1,records:[]}),JSON.stringify({format:'personal-world-backup',version:2,records:[]}),JSON.stringify({format:'personal-world-backup',version:1,records:[{...newEntry('resume'),attachment:'data:application/pdf;base64,eA=='}]})])await assert.rejects(decodeBackup(new Blob([input])));
});
test('content routes round trip without needing the 3D world',()=>{
  const e=newEntry('notes');assert.deepEqual(parseRoute(entryPath(e.kind,e.id)),{kind:e.kind,id:e.id});
  assert.deepEqual(parseRoute('/photos/'),{kind:'photos',id:null});
  assert.deepEqual(parseRoute('/'),{kind:null,id:null});assert.deepEqual(parseRoute('/notes/%XX/'),{kind:'notes',id:null});
});
