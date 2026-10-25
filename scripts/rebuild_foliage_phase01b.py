"""Source-derived foliage cluster LOD. Preserve real full-crown occupancy instead
of collapsing disconnected needle components. CC0 twig atlas / trunk are original
Poly Haven input. No cone tree or whole-tree near billboard.
"""
import bpy,numpy as np,math,random,json,sys
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from build_assets import clear,meshes,normalize,select
random.seed(181);clear();bpy.ops.import_scene.gltf(filepath=str(R/'assets-source/fir_tree_01_A/fir_A.gltf'));src=meshes()[0];dims=normalize(src)
v=np.empty(len(src.data.vertices)*3,dtype=np.float32);src.data.vertices.foreach_get('co',v);v=v.reshape(-1,3)
mi=np.empty(len(src.data.polygons),dtype=np.int32);src.data.polygons.foreach_get('material_index',mi)
li=np.empty(len(src.data.loops),dtype=np.int32);src.data.loops.foreach_get('vertex_index',li)
leafIds=np.unique(li.reshape(-1,3)[mi==2].ravel());points=v[leafIds]
# Original trunk/dead branch geometry is kept; only expensive disconnected needles replaced.
select([src]);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='DESELECT');bpy.ops.object.mode_set(mode='OBJECT')
for p in src.data.polygons:p.select=p.material_index==2
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.delete(type='FACE');bpy.ops.object.mode_set(mode='OBJECT')
leaf=bpy.data.materials.new('fir / source twig clusters');leaf.use_nodes=True;nt=leaf.node_tree;bs=nt.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.88
tex=nt.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(R/'assets-source/fir_tree_01/textures/fir_tree_01_twig_rgba_1k.png'));nt.links.new(tex.outputs['Color'],bs.inputs['Base Color']);nt.links.new(tex.outputs['Alpha'],bs.inputs['Alpha']);leaf.surface_render_method='DITHERED';leaf.use_transparency_overlap=False
# Atlas bounds of three real scanned branch clusters. UV values use bottom-up origin.
patches=[(.18,.68,.45,.97),(.28,.21,.66,.60),(.64,.15,.99,.60)]
roots=[];report=[]
for name,cell,trunkRatio in [('fir_full_near',.28,.45),('fir_full_mid',.48,.16)]:
 root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root);roots.append(root)
 trunk=src.copy();trunk.data=src.data.copy();bpy.context.collection.objects.link(trunk);trunk.name=name+'_structural_branches';select([trunk]);m=trunk.modifiers.new('woody branch reduction only','DECIMATE');m.ratio=trunkRatio;bpy.ops.object.modifier_apply(modifier=m.name);trunk.parent=root
 for p in trunk.data.polygons:p.use_smooth=True
 keys=np.floor(points/cell).astype(np.int32);_,ids=np.unique(keys,axis=0,return_index=True);centers=points[ids]
 verts=[];faces=[];uvs=[]
 for idx,c in enumerate(centers):
  p=Vector(c);rad=Vector((p.x,p.y,.16));rad.normalize()
  sideways=rad.cross(Vector((0,0,1))).normalized();up=rad.cross(sideways).normalized()
  for k in range(3):
   a=k*math.pi/3+random.uniform(-.25,.25);width=sideways*math.cos(a)+up*math.sin(a);length=rad
   w=cell*random.uniform(1.15,1.55);h=cell*random.uniform(1.55,1.95);p2=p+Vector((random.uniform(-.04,.04),random.uniform(-.04,.04),random.uniform(-.035,.035)))
   start=len(verts);verts += [tuple(p2-width*w*.5-length*h*.5),tuple(p2+width*w*.5-length*h*.5),tuple(p2+width*w*.5+length*h*.5),tuple(p2-width*w*.5+length*h*.5)]
   faces.append((start,start+1,start+2,start+3));u0,v0,u1,v1=patches[(idx+k)%3];uvs +=[(u0,v0),(u1,v0),(u1,v1),(u0,v1)]
 me=bpy.data.meshes.new(name+'_source_crown_clusters');me.from_pydata(verts,[],faces);me.update();me.materials.append(leaf);uv=me.uv_layers.new(name='UV0');uv.data.foreach_set('uv',np.asarray(uvs,dtype=np.float32).ravel());o=bpy.data.objects.new(me.name,me);bpy.context.collection.objects.link(o);o.parent=root
 # Spherical canopy normals soften card orientation without flattening the silhouette.
 normals=[]
 for p in me.vertices:
  n=Vector((p.co.x*.35,p.co.y*.35,.55)).normalized();normals.append(n)
 me.normals_split_custom_set_from_vertices(normals)
 me.calc_loop_triangles();trunk.data.calc_loop_triangles();report.append({'name':name,'voxelMeters':cell,'sourceOccupiedCells':len(centers),'foliageTriangles':len(me.loop_triangles),'woodyTriangles':len(trunk.data.loop_triangles)})
 print('CROWN',report[-1],flush=True)
bpy.data.objects.remove(src,do_unlink=True);bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(R/'assets-source/phase01b/fir-cluster-master.blend'))
obs=meshes();select(obs);bpy.ops.export_scene.gltf(filepath=str(R/'public/assets/fir-full.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_image_format='AUTO')
(R/'docs/phase-01b/foliage-build.json').write_text(json.dumps({'blender':bpy.app.version_string,'method':'Full source crown occupancy sampled into crossed scanned-twig clusters; trunk-only decimation. Near trees are 3D foliage volumes, not whole-tree billboards.','lods':report},indent=2)+'\n')
print('CROWN_REBUILT',flush=True)
