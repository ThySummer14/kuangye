import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyReading, startBook, updateBook, noteBook, shelveBook, reopenBook, normalizeReading } from '../src/game/reading.js';
import { normalizeHome } from '../src/game/home.js';
test('reading keeps bookmarks and notes across shelving, rereading and save normalization', () => {
  const r=emptyReading();
  assert.equal(startBook(r,{title:'  山间的一天 ',qid:'read-s1'},'one','2026-09-28').ok,true);
  assert.equal(startBook(r,{title:'第二本'},'two','2026-09-28').ok,false);
  updateBook(r,'one',{title:'山间的一天',bookmark:'第 32 页',next:'读下一节',qid:'read-s1'});
  assert.equal(noteBook(r,'one','  ','2026-09-28').ok,false);
  noteBook(r,'one','树影落在书页上。','2026-09-28');
  shelveBook(r,'one',true,'2026-09-28');
  startBook(r,{title:'第二本'},'two','2026-09-28');
  assert.equal(reopenBook(r,'one').ok,false);
  shelveBook(r,'two',false,'2026-09-28');
  assert.equal(reopenBook(r,'one').ok,true);
  const home=normalizeHome(JSON.parse(JSON.stringify({reading:r,lumens:15})),[]);
  assert.deepEqual(home.reading,r);
  assert.equal(home.lumens,15);
  assert.equal(home.reading.books[1].notes[0].bookmark,'第 32 页');
  assert.equal(home.reading.books[1].finished,'');
  assert.deepEqual(normalizeHome({},[]).reading,emptyReading());
});
test('reading import validates fields, keeps all notes, and never treats a book as a task reward', () => {
  const r=normalizeReading({books:[{id:'a',title:'A',status:'reading',qid:'unknown',xp:900,notes:[null,{text:'保留',at:'2026-09-28'}]},{id:'b',title:'B',status:'reading',notes:[]},{id:'a',title:'duplicate'}]});
  assert.equal(r.books.length,2);assert.equal(r.books[1].status,'shelved');
  assert.equal(r.books[0].qid,'');assert.equal(r.books[0].xp,undefined);
  assert.equal(r.books[0].notes[0].text,'保留');
});
