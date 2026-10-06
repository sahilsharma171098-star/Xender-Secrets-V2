import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const reader = fs.readFileSync(new URL('../../public/reader.html', import.meta.url), 'utf8');

test('Chinese-source Gutenberg novels default to English when no reader language is saved', () => {
  assert.match(reader, /!savedLang&&\/\^zh\(\?:-\|\$\)\/i\.test\(sourceLanguage\)/);
  assert.match(reader, /languageSelect\.value="en";sessionAutoTranslate=true/);
});

test('reader preserves explicit Original choice and persists automatic translation after success', () => {
  assert.match(reader, /supported\.includes\(savedLang\)\?savedLang:"original"/);
  assert.match(reader, /localStorage\.setItem\("xsReaderAutoTranslate","1"\)/);
  assert.match(reader, /choose Original to read the source text/);
});
