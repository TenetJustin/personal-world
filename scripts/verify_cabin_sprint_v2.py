"""Geometry assertions against the editable Blender master, not a visual-quality verdict."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(R/'assets/architecture/cabin-sprint-v2.blend'))
sc=bpy.context.scene
root=next(o for o in sc.objects if o.name.startswith('CABIN /'))
pivot=next(o for o in sc.objects if o.name.startswith('DOOR /'))
leaves=[o for o in sc.objects if o.type=='MESH' and o.name.startswith('entry door /')]
assert len(leaves)==10
def hits(start,end,only=None,exclude=()):
 deps=bpy.context.evaluated_depsgraph_get();result=[]
 a=root.matrix_world@Vector(start);b=root.matrix_world@Vector(end);direction=(b-a).normalized();distance=(b-a).length
 for o in sc.objects:
  if o.type!='MESH' or o in exclude or (only is not None and o not in only):continue
  eo=o.evaluated_get(deps);me=eo.to_mesh()
  try:
   vs=[eo.matrix_world@v.co for v in me.vertices];fs=[tuple(p.vertices) for p in me.polygons]
   hit=BVHTree.FromPolygons(vs,fs).ray_cast(a,direction,distance)[0]
   if hit is not None:result.append(o.name)
  finally:eo.to_mesh_clear()
 return result
probes=[]
for x in [.9,1.11,1.32]:
 for h in [1.8,2.4,3.05]:
  a=(x,-4.95,h);b=(x,-4.05,h)
  shell=hits(a,b,exclude=leaves);closed=hits(a,b,only=leaves)
  assert not shell, ('solid geometry intrudes into opening',shell,x,h)
  assert closed, ('closed door must obstruct entry',x,h)
  probes.append({'x':x,'height':h,'shellClear':True,'closedDoorObstructs':True})
pivot.rotation_euler.z=math.radians(100);bpy.context.view_layer.update()
for p in probes:
 assert not hits((p['x'],-4.95,p['height']),(p['x'],-4.05,p['height'])),('open door blocks corridor',p)
 p['openDoorClear']=True
report={'passed':True,'blender':bpy.app.version_string,'master':'assets/architecture/cabin-sprint-v2.blend','physicalClearanceProbes':probes,'doorLeafObjects':len(leaves),'hingeLocalBlender':list(pivot.location),'swingDegrees':100,'checks':['shell genuinely open independent of door','closed door blocks all nine body-height rays','open door clears all nine passage rays'],'limits':'Geometric aperture checks; not human visual acceptance or full free-walking collision certification.'}
(R/'docs/sprint-v2/architecture-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('V2_ARCHITECTURE_VALIDATED',report,flush=True)
