"""Read the actual packed Blender master; verify structural probes, not a source mirror."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];bpy.ops.wm.open_mainfile(filepath=str(R/'assets/architecture/cabin-phase01b.blend'))
sc=bpy.context.scene;assert sc.unit_settings.system=='METRIC' and sc.unit_settings.scale_length==1
root=bpy.data.objects['CABIN / 12x9m / Phase01B'];assert abs(root.rotation_euler.z-math.radians(-35))<1e-5
assert all(abs(a-b)<1e-5 for a,b in zip(root.location,(8,3,0)))
logs=[o for o in sc.objects if o.type=='MESH' and o.name.startswith('hewn log')]
probes=[('front window L',(-3.8,-4.95,2.9),(0,1,0)),('front window R',(3.7,-4.95,2.9),(0,1,0)),('entry',(1.11,-4.95,2.5),(0,1,0)),('side window front',(6.4,-1.65,2.9),(-1,0,0)),('side window rear',(6.4,1.8,2.9),(-1,0,0)),('upper gable',(6.4,-2.0,5.95),(-1,0,0))]
bvhs=[BVHTree.FromPolygons([v.co for v in o.data.vertices],[p.vertices[:] for p in o.data.polygons]) for o in logs]
checks=[]
for name,p,d in probes:
 hits=[b.ray_cast(Vector(p),Vector(d),.85)[0] for b in bvhs];assert all(h is None for h in hits),name+' obstructed by structural log wall'
 checks.append({'opening':name,'structuralWallProbe':'PASS','localOrigin':p,'localDirection':d})
# Every gable log stays under the actual pitched roof, including its end profile.
for o in sc.objects:
 if o.type=='MESH' and any(c.name=='02 / gable ends' for c in o.users_collection):
  for v in o.data.vertices:assert v.co.z<=8.5-(3.4/4.9)*abs(v.co.y)+.035,(o.name,tuple(v.co))
for name in ['ANCHOR_entry_threshold','ANCHOR_porch_arrival','ANCHOR_upper_floor']:assert name in bpy.data.objects
images=[im for im in bpy.data.images if im.source=='FILE' and im.users>0];assert images and all(im.packed_file for im in images)
glass=bpy.data.materials['05 / architectural clear glass - nonmetal'].node_tree.nodes.get('Principled BSDF')
assert glass.inputs['Metallic'].default_value==0 and glass.inputs['Transmission Weight'].default_value>.99
out={'status':'PASS','blender':bpy.app.version_string,'metersPerUnit':1,'openingProbes':checks,'gableLogsUnderRoof':True,'packedTextureCount':len(images),'glassMetalness':0,'glassTransmission':glass.inputs['Transmission Weight'].default_value,'scope':'Structural and packaging verification only; not human visual approval.'}
(R/'docs/phase-01b/architecture-validation.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out),flush=True)
