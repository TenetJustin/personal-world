import {cp} from 'node:fs/promises';
for(const name of ['cmaps','standard_fonts','wasm'])await cp(`node_modules/pdfjs-dist/${name}`,`public/pdfjs/${name}`,{recursive:true});
