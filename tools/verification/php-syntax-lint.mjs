import { PHP } from '@php-wasm/universal';
import { loadNodeRuntime, createNodeFsMountHandler } from '@php-wasm/node';
import fs from 'fs'; import path from 'path';
const root = process.argv[2]; const files = process.argv.slice(3);
const php = new PHP(await loadNodeRuntime('8.4', { emscriptenOptions: { processId: 1 } }));
php.mkdir('/proj'); await php.mount('/proj', createNodeFsMountHandler(root));
const list = files.length ? files : [];
php.writeFile('/tmp/list.json', JSON.stringify(list));
const r = await php.run({ code: `<?php
$files = json_decode(file_get_contents('/tmp/list.json'), true); $bad = 0;
foreach ($files as $f) { $src = @file_get_contents('/proj/'.$f); if ($src === false) { echo "MISSING $f\\n"; $bad++; continue; }
  try { token_get_all($src, TOKEN_PARSE); } catch (ParseError $e) { echo "ERR $f:" . $e->getLine() . " " . $e->getMessage() . "\\n"; $bad++; } }
echo "checked " . count($files) . " files, errors: $bad\\n";` });
console.log(r.text);
process.exit(0);
