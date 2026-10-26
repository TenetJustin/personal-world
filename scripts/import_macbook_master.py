"""Create an editable Blender source from the original runtime-authored GLB.
Run after SceneQA 'Export original MacBook GLB'; no Apple assets are imported.
"""
import bpy
from pathlib import Path
root=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(root/'assets/architecture/macbook-air-m5-v3.glb'))
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.unit_settings.scale_length=1
scene['source']='Original Personal World MacBook model; canonical parametric source: src/scene/MacBook.tsx, macbookModel.ts, macbookKeyboard.ts'
scene['external_artwork']='None. Original canvas desktop and ordinary system-font key legends only.'
scene['units']='metres; cabin-local placement; source GLB is a review/editing export, not an extra runtime download'
scene['revision']='v3-reliability-audio'
bpy.ops.wm.save_as_mainfile(filepath=str(root/'assets/architecture/macbook-air-m5-v3.blend'))
print('MACBOOK_MASTER',len(scene.objects),sum(len(o.data.polygons) for o in scene.objects if o.type=='MESH'))
