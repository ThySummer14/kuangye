import test from 'node:test';
import assert from 'node:assert/strict';
import { createFileStorage, createWebStorage } from '../src/services/storage.js';
const state = (review = '沿河的风') => ({
  active: [], done: [{qid:'run-s1', xp:25, at:'2026-09-22', review}], abandoned: [],
});
const text = review => JSON.stringify(state(review));
const envelope = review => JSON.stringify({version:3,state:state(review)});
function fixture(entries = {}) {
  const files = new Map(Object.entries(entries));
  const legacy = new Map();
  const operations = [];
  const io = {
    read: async key => files.get(key) ?? null,
    writeAtomic: async (key,value) => { operations.push(key); files.set(key,value); },
  };
  return { files, legacy, io, operations, old: {getItem:key=>legacy.get(key) ?? null} };
}
test('native migration copies and verifies v1/v2/v3 keys without removing originals', async () => {
  for(const key of ['kuangye.v1','kuangye.v2','kuangye.v3']) {
    const f = fixture(); f.legacy.set(key,text());
    const driver = await createFileStorage(f.io,f.old);
    assert.equal(driver.load().done[0].review,'沿河的风');
    assert.equal(f.legacy.get(key),text());
    assert.equal(JSON.parse(f.files.get('current')).version,3);
    const reopened = await createFileStorage(f.io,f.old);
    assert.equal(reopened.load().done.length,1);
    assert.equal(reopened.load().home.lumens,15);
  }
});
test('native migration readback mismatch refuses startup and leaves old keys intact', async () => {
  const f=fixture(); f.legacy.set('kuangye.v3',text());
  f.io.writeAtomic=async(key)=>f.files.set(key,'corrupt');
  await assert.rejects(createFileStorage(f.io,f.old),/校验/);
  assert.equal(f.legacy.get('kuangye.v3'),text());
});
test('syntax damage falls back to previous and subsequent writes preserve good backup', async () => {
  const f=fixture({current:'{broken',previous:envelope('旧回顾')});
  const driver=await createFileStorage(f.io,f.old);
  assert.match(driver.notice,/恢复/);
  assert.equal(driver.load().done[0].review,'旧回顾');
  await driver.save(text('新回顾'));
  assert.equal(f.files.get('previous'),envelope('旧回顾'));
  assert.equal((await createFileStorage(f.io,f.old)).load().done[0].review,'新回顾');
});
test('unsupported native histories never fall back or overwrite files', async () => {
  for(const current of [JSON.stringify({version:4,state:state()}),JSON.stringify({...state(),done:[{qid:'future-task'}]}),'{}']) {
    const f=fixture({current,previous:envelope()});
    await assert.rejects(createFileStorage(f.io,f.old));
    assert.equal(f.files.get('current'),current);
    assert.deepEqual(f.operations,[]);
  }
  const f=fixture({current:'bad',previous:'bad'});
  await assert.rejects(createFileStorage(f.io,f.old),/无法读取/);
});
test('each failure point retains the last valid generation and retry can save', async () => {
  for(const target of ['previous','current']) {
    const f=fixture({current:envelope('旧')});
    const driver=await createFileStorage(f.io,f.old);
    const write=f.io.writeAtomic;
    f.io.writeAtomic=async(k,v)=>{if(k===target) throw Error('disk full'); await write(k,v);};
    await assert.rejects(driver.save(text('未存下')),/disk full/);
    assert.equal((await createFileStorage(f.io,f.old)).load().done[0].review,'旧');
    f.io.writeAtomic=write;
    await driver.save(text('重试'));
    assert.equal((await createFileStorage(f.io,f.old)).load().done[0].review,'重试');
  }
});
test('current write corruption reports failure and recovers verified previous on restart', async () => {
  const f=fixture({current:envelope('旧')});
  const driver=await createFileStorage(f.io,f.old);
  const write=f.io.writeAtomic;
  f.io.writeAtomic=(k,v)=>write(k,k==='current'?'broken':v);
  await assert.rejects(driver.save(text('新')),/校验/);
  assert.equal((await createFileStorage(f.io,f.old)).load().done[0].review,'旧');
});
test('overlapping save calls preserve request order and the penultimate generation', async () => {
  const f=fixture({current:envelope('起点')});
  const driver=await createFileStorage(f.io,f.old);
  const write=f.io.writeAtomic;
  let release;
  const gate=new Promise(resolve=>release=resolve);
  let first=true;
  f.io.writeAtomic=async(k,v)=>{ if(first){ first=false; await gate; } await write(k,v); };
  const one=driver.save(text('第一条')), two=driver.save(text('第二条'));
  release(); await Promise.all([one,two]);
  assert.equal(JSON.parse(f.files.get('current')).state.done[0].review,'第二条');
  assert.equal(JSON.parse(f.files.get('previous')).state.done[0].review,'第一条');
  assert.deepEqual(f.operations,['previous','current','previous','current']);
});
test('web driver keeps original keys, QA isolation, and write errors observable', () => {
  const f=fixture(); const mem={getItem:f.old.getItem,setItem:(k,v)=>f.legacy.set(k,v)};
  f.legacy.set('kuangye.v2',text());
  const web=createWebStorage(()=>mem); assert.equal(web.load().done.length,1);
  const qa=createWebStorage(()=>mem,true); assert.equal(qa.load(),null);
  qa.save(text('QA')); assert.equal(f.legacy.get('kuangye.v2'),text());
  web.save(text('Web')); assert.equal(JSON.parse(f.legacy.get('kuangye.v3')).done[0].review,'Web');
  mem.setItem=()=>{throw Error('quota');}; assert.throws(()=>web.save(text()),/quota/);
});
