import bpy,json,sys
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'));from build_assets import clear,meshes,normalize,select
clear();bpy.ops.import_scene.gltf(filepath=str(R/'assets-source/grass_medium_01/grass_medium_01.gltf'));obs=meshes();chosen=[];report=[]
# Include the full dense clumps omitted by the earlier polygon-count filter.
for i in [1,9,10,0,2,7,8]:
 o=obs[i];d=normalize(o);o.name=f'grass_dense_{len(chosen):02d}';chosen.append(o);report.append({'name':o.name,'meters':list(d),'polygons':len(o.data.polygons)})
select(chosen);bpy.ops.export_scene.gltf(filepath=str(R/'public/assets/grass-dense.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_image_format='AUTO')
(R/'docs/phase-01b/grass-build.json').write_text(json.dumps(report,indent=2)+'\n');print('GRASS_DIMENSIONS',report,flush=True)
