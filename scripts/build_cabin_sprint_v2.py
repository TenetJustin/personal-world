"""Derive navigable V2 shell and an independently hinged leaf from the Phase 01B master.
The historical master is never overwritten. No remotely sourced/new assets are required.
"""
import bpy, json
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(R/'assets/architecture/cabin-phase01b.blend'))
sc=bpy.context.scene
root=next(o for o in sc.objects if o.name.startswith('CABIN /'))
leaves=[o for o in sc.objects if o.type=='MESH' and o.name.startswith('entry door /')]
assert len(leaves)==10, [o.name for o in leaves]
pivot=bpy.data.objects.new('DOOR / left hinge / swing inward 100 degrees',None)
sc.collection.objects.link(pivot);pivot.parent=root;pivot.location=(.55,-4.5,1.35)
for o in leaves:
 # A 20mm higher leaf clears the new 40mm interior floor finish. Preserve jambs/header.
 o.location.z+=.02
 # Millimetre clearance inside existing 1.11m jamb; do not shrink the real opening.
 o.location.x=1.11+(o.location.x-1.11)*.985;o.scale.x*=.985
 o.parent=pivot;o.location-=pivot.location
sc['phase']='Sprint V2 / navigable ground floor; original Phase 01B architecture retained'
bpy.ops.wm.save_as_mainfile(filepath=str(R/'assets/architecture/cabin-sprint-v2.blend'))
out=R/'assets-source/sprint-v2';out.mkdir(parents=True,exist_ok=True)
# Shell has the same world-space placement as Phase 01B but contains NO closed door leaf.
bpy.ops.object.select_all(action='DESELECT')
for o in sc.objects:
 if o.type=='MESH' and o not in leaves:o.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in sc.objects if o.select_get())
bpy.ops.export_scene.gltf(filepath=str(out/'cabin-shell-authoring.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
# Door is exported in local coordinates about the physical hinge. Runtime adds its pivot.
for o in leaves:
 o.parent=None
bpy.ops.object.select_all(action='DESELECT')
for o in leaves:o.select_set(True)
bpy.context.view_layer.objects.active=leaves[0]
bpy.ops.export_scene.gltf(filepath=str(out/'cabin-door-authoring.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
report={'source':'assets/architecture/cabin-phase01b.blend','master':'assets/architecture/cabin-sprint-v2.blend','doorLeafObjects':len(leaves),'shellExcludesDoor':True,'localThreeHinge':[.55,1.35,4.5],'localThreeDoorOpening':{'x':[.555,1.665],'z':4.5,'y':[1.35,3.67]},'doorSwingDegrees':100,'originalExteriorPlacementUnchanged':True,'license':'Original architecture, original door; existing rough_wood CC0 texture'}
(R/'docs/sprint-v2').mkdir(exist_ok=True)
(R/'docs/sprint-v2/architecture-build.json').write_text(json.dumps(report,indent=2)+'\n')
print('V2_ARCHITECTURE_READY',report,flush=True)
