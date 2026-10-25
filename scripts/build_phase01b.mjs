import{spawnSync}from'node:child_process';
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{stdio:'inherit',env:{...process.env,BLENDER_USER_CONFIG:process.cwd()+'/work/blender-config'}});if(r.status!==0)process.exit(r.status??1);};
const blender=process.env.BLENDER_BIN??(process.platform==='darwin'?'/Applications/Blender.app/Contents/MacOS/Blender':'blender');
run(process.execPath,['scripts/repair_opacity.mjs']);
for(const script of ['build_cabin_phase01b.py','build_fir_phase01b.py','rebuild_foliage_phase01b.py','rebuild_grass_phase01b.py','verify_cabin_phase01b.py'])run(blender,['--background','--factory-startup','--disable-autoexec','--python','scripts/'+script]);
for(const script of ['prepare_cabin_phase01b.mjs','prepare_environment_phase01b.mjs','write_phase01b_manifest.mjs'])run(process.execPath,['scripts/'+script]);
