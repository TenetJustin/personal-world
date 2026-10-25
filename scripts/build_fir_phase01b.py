"""Derive fuller-crown runtime fir from Poly Haven fir_tree_01 A (CC0).
Original source stays ignored; license/range/hash in phase-01b asset-sources.json.
"""
import bpy,sys,math,json
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from build_assets import clear,normalize,select,meshes
p=R/'assets-source/fir_tree_01_A/fir_A.gltf';g=json.loads(p.read_text())
for im in g['images']:
 if 'twig_diff' in im.get('name',''):im['uri']='../fir_tree_01/textures/fir_tree_01_twig_rgba_1k.png';im['mimeType']='image/png'
for m in g['materials']:
 if m.get('alphaMode')=='BLEND':m['alphaMode']='MASK';m['alphaCutoff']=.35;m['doubleSided']=True
p.write_text(json.dumps(g));clear();bpy.ops.import_scene.gltf(filepath=str(p));src=meshes()[0];dims=normalize(src)
print('SOURCE_DIMENSIONS',list(dims),flush=True)
# Actual source tree rendered only to derive distant foliage atlas; NOT scene acceptance renders.
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=16;sc.render.resolution_x=512;sc.render.resolution_y=1024;sc.render.resolution_percentage=100;sc.render.film_transparent=True
sc.world.use_nodes=True;sc.world.node_tree.nodes.get('Background').inputs[0].default_value=(.27,.33,.40,1);sc.world.node_tree.nodes.get('Background').inputs[1].default_value=.60
sc.view_settings.view_transform='Standard';sc.view_settings.look='None';sc.view_settings.exposure=0
bpy.ops.object.light_add(type='SUN',location=(.60*60,-.436*60,.67*60));sun=bpy.context.object;sun.data.energy=2.0;sun.data.angle=math.radians(1);sun.rotation_euler=(Vector((0,0,0))-sun.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;sc.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=dims.z*1.10
for n in range(4):
 a=n*math.pi/2;cam.location=(math.sin(a)*40,-math.cos(a)*40,dims.z*.5);cam.rotation_euler=(Vector((0,0,dims.z*.5))-cam.location).to_track_quat('-Z','Y').to_euler();sc.render.filepath=str(R/f'public/assets/fir-full-impostor-{n}.png');sc.render.image_settings.file_format='PNG';sc.render.image_settings.color_mode='RGBA';bpy.ops.render.render(write_still=True)
(R/'public/assets/fir-full-dimensions.json').write_text(json.dumps({'width':dims.x,'depth':dims.y,'height':dims.z,'impostorHeight':dims.z*1.10}))
print('FULL_CROWN_READY',flush=True)
