import{readdir,readFile,writeFile,rename,mkdir}from'node:fs/promises';import{createHash}from'node:crypto';
// Intermediate authoring GLB must not be served or included in runtime payload.
try{await rename('public/assets/cabin-authoring.glb','assets-source/phase01b/cabin-runtime-before-compression.glb');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir('assets-source/phase01b/unused-phase01-runtime',{recursive:true});
for(const name of ['fir.glb','grass.glb','fir-dimensions.json','fir-impostor-0.png','fir-impostor-1.png','fir-impostor-2.png','fir-impostor-3.png','grass-color.webp','grass-normal.webp','grass-rough.webp']) {
 try{await rename('public/assets/'+name,'assets-source/phase01b/unused-phase01-runtime/'+name);}catch(e){if(e.code!=='ENOENT')throw e;}
}
const files=[];for(const file of(await readdir('public/assets')).sort()){
 if(file==='manifest.json')continue;
 const b=await readFile('public/assets/'+file);
 const sourceIds=file.startsWith('cabin')?['original-architecture-phase01b','rough_wood','rock_wall_02']:file.startsWith('fir-full')?['fir_tree_01_A','fir_tree_01']:file.startsWith('fir')?['fir_tree_01']:file.startsWith('rocks')?['rock_moss_set_01']:file==='grass.glb'||file==='grass-dense.glb'?['grass_medium_01']:file.startsWith('forest-')?['forest_floor']:file.startsWith('meadow-')?['grass_ground']:file.startsWith('grass-')?['aerial_grass_rock']:['alps_field'];
 files.push({file,sourceIds,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});
}
await writeFile('public/assets/manifest.json',JSON.stringify({generatedAt:new Date().toISOString(),sceneRevision:'phase-01b-candidate',files},null,2)+'\n');console.log('Manifest files:',files.length);
