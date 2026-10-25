"""Blender exterior authoring only. CC0 inputs are declared in asset-sources.json.
Run with Blender, not system Python. Authoring masters are kept outside Git.
"""
import bpy, math, random, json, hashlib, sys
from pathlib import Path
from mathutils import Vector
import numpy as np
ROOT=Path(__file__).resolve().parents[1]; SRC=ROOT/'assets-source'; OUT=ROOT/'public/assets'
OUT.mkdir(parents=True,exist_ok=True);random.seed(713)
sys.path.insert(0,str(ROOT/'scripts'))
from bake_cabin_ao import bake
REPORT=[]
def clear():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for m in list(bpy.data.meshes):
  if m.users==0:bpy.data.meshes.remove(m)
def meshes():return [o for o in bpy.context.scene.objects if o.type=='MESH']
def select(obs):
 bpy.ops.object.select_all(action='DESELECT')
 for o in obs:o.select_set(True)
 if obs:bpy.context.view_layer.objects.active=obs[0]
def export(name,obs):
 select(obs)
 for im in bpy.data.images:
  if im.source=='FILE' and im.size[0]>1024 and 'rough_wood' not in im.filepath:im.scale(1024,1024)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_image_format='JPEG',export_jpeg_quality=82)
 REPORT.append({'file':name+'.glb','sourceTriangles':sum(len(o.data.loop_triangles) for o in obs),'objects':len(obs)})
 print('EXPORTED',name,flush=True)
def normalize(o):
 bpy.context.view_layer.objects.active=o;select([o]);bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 vs=o.data.vertices
 mn=Vector((min(v.co.x for v in vs),min(v.co.y for v in vs),min(v.co.z for v in vs)))
 mx=Vector((max(v.co.x for v in vs),max(v.co.y for v in vs),max(v.co.z for v in vs)))
 offset=Vector(((mn.x+mx.x)/2,(mn.y+mx.y)/2,mn.z))
 for v in vs:v.co-=offset
 o.location=(0,0,0)
 return mx-mn

def build_tree():
 clear();bpy.ops.import_scene.gltf(filepath=str(SRC/'fir_tree_01/fir_tree_01.gltf'))
 src=meshes()[0];dims=normalize(src);src.name='fir_source'
 bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'fir-master.blend'))
 # Far-only prelit alpha impostors, from the real source mesh, not invented cones.
 sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=24
 sc.render.resolution_x=512;sc.render.resolution_y=1024;sc.render.resolution_percentage=100
 sc.render.film_transparent=True;sc.world.color=(0.24,0.28,0.34)
 sc.view_settings.view_transform='Standard';sc.view_settings.look='None';sc.view_settings.exposure=0
 bpy.ops.object.light_add(type='SUN',location=(-10,-15,25));sun=bpy.context.object;sun.data.energy=2.4;sun.data.angle=math.radians(5);sun.rotation_euler=(Vector((0,0,5))-sun.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();cam=bpy.context.object;sc.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=dims.z*1.12
 for n in range(4):
  a=n*math.pi/2;cam.location=(math.sin(a)*30,-math.cos(a)*30,dims.z*.50)
  cam.rotation_euler=(Vector((0,0,dims.z*.5))-cam.location).to_track_quat('-Z','Y').to_euler()
  sc.render.filepath=str(OUT/f'fir-impostor-{n}.png');sc.render.image_settings.file_format='PNG';sc.render.image_settings.color_mode='RGBA';bpy.ops.render.render(write_still=True)
 for o in [sun,cam]:bpy.data.objects.remove(o,do_unlink=True)
 result=[]
 for name,ratio in [('fir_near',.50),('fir_mid',.12)]:
  o=src.copy();o.data=src.data.copy();bpy.context.collection.objects.link(o);o.name=name
  select([o]);mod=o.modifiers.new('measured-source-lod','DECIMATE');mod.ratio=ratio;bpy.ops.object.modifier_apply(modifier=mod.name)
  for poly in o.data.polygons:poly.use_smooth=True
  o.data.calc_loop_triangles();result.append(o)
 export('fir',result)
 (OUT/'fir-dimensions.json').write_text(json.dumps({'width':dims.x,'depth':dims.y,'height':dims.z,'impostorHeight':dims.z*1.12}))

def build_scans():
 for asset,name in [('rock_moss_set_01','rocks'),('grass_medium_01','grass')]:
  clear();bpy.ops.import_scene.gltf(filepath=str(SRC/asset/(asset+'.gltf')))
  obs=meshes()
  if name=='grass':obs=[o for o in obs if 250<=len(o.data.polygons)<=2400]
  for i,o in enumerate(obs):
   normalize(o);o.name=f'{name}_{i:02d}';o.data.calc_loop_triangles()
  export(name,obs)

def material(name,color,rough=.65,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal;return m

def pbr(name,asset):
 m=material(name,(.65,.43,.25));nt=m.node_tree;bs=nt.nodes.get('Principled BSDF')
 for channel,socket in [('Diffuse','Base Color'),('Rough','Roughness'),('nor_gl','Normal')]:
  tex=nt.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(SRC/asset/(channel+'.jpg')),check_existing=True)
  if channel!='Diffuse':tex.image.colorspace_settings.name='Non-Color'
  if channel=='nor_gl':
   n=nt.nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.65;nt.links.new(tex.outputs['Color'],n.inputs['Color']);nt.links.new(n.outputs['Normal'],bs.inputs['Normal'])
  else:nt.links.new(tex.outputs['Color'],bs.inputs[socket])
 return m

def box(name,loc,scale,mat,bevel=.008):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 # Physical grain spacing on box parts; retain along each member's long axis.
 long=max(range(3),key=lambda i:scale[i]);uv=o.data.uv_layers.active
 if uv:
  for face in o.data.polygons:
   normal=max(range(3),key=lambda i:abs(face.normal[i]));short=next((i for i in range(3) if i!=long and i!=normal),(long+1)%3)
   for li in face.loop_indices:
    co=o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(co[short]/.45+.37,co[long]/2.2+.18)

 if bevel:
  mod=o.modifiers.new('real edge radius','BEVEL');mod.width=bevel;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o

def mesh(name,vs,fs,mat):
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.materials.append(mat);o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);return o

def build_cabin():
 clear();wood=pbr('peeled pine / physical grain','rough_wood');end=material('end grain',(.48,.30,.15),.83)
 # Original radial grain, no branded or unlicensed image inputs.
 N=512; yy,xx=np.mgrid[-1:1:complex(N),-1:1:complex(N)];r=np.sqrt((xx+.08)**2+(yy-.04)**2)
 rings=np.sin(r*130+np.sin(yy*11)*.55+np.sin(xx*7)*.7);v=.53+.045*rings+.025*np.sin(xx*97+yy*25)
 rgb=np.stack([v*.91,v*.67,v*.42,np.ones_like(v)],axis=-1).astype('f');im=bpy.data.images.new('original end grain',N,N);im.pixels.foreach_set(rgb.ravel());im.filepath_raw=str(SRC/'original-end-grain.png');im.file_format='PNG';im.save()
 tx=end.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im;end.node_tree.links.new(tx.outputs['Color'],end.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
 roof=material('weathered charcoal standing seam',(.055,.064,.063),.74,.42);trim=material('oiled edge timber',(.18,.10,.048),.70)
 glass=material('closed exterior glazing',(.45,.55,.59),.07,.95);steel=material('blackened iron',(.025,.029,.026),.48,.72)
 def log(name,axis,fixed,height,start,stop,row):
  if stop-start<.12:return
  seg=28;steps=max(2,int((stop-start)/.5));vs=[]
  rad=.135;seed=random.random()*10
  for k in range(steps+1):
   q=start+(stop-start)*k/steps
   for j in range(seg):
    a=2*math.pi*j/seg;rr=rad*(1+.014*math.sin(q*4+seed+a*3)+.008*math.sin(q*11+a*7))
    vs.append((q,fixed+rr*math.cos(a),height+rr*math.sin(a)) if axis=='X' else (fixed+rr*math.cos(a),q,height+rr*math.sin(a)))
  fs=[]
  for k in range(steps):
   for j in range(seg):fs.append((k*seg+j,k*seg+(j+1)%seg,(k+1)*seg+(j+1)%seg,(k+1)*seg+j))
  fs += [tuple(reversed(range(seg))),tuple(steps*seg+j for j in range(seg))]
  o=mesh(name,vs,fs,wood);o.data.materials.append(end);uv=o.data.uv_layers.new(name='UV0')
  for p in o.data.polygons:
   cap=p.index>=len(fs)-2;p.material_index=int(cap);p.use_smooth=not cap
   for li in p.loop_indices:
    vi=o.data.loops[li].vertex_index;co=o.data.vertices[vi].co
    if cap:
     a=(co.y-fixed) if axis=='X' else (co.x-fixed);uv.data[li].uv=(.5+a/(rad*2),.5+(co.z-height)/(rad*2))
    else:uv.data[li].uv=((vi%seg)/seg+row*.071,(co.x if axis=='X' else co.y)/2.2+row*.17)
  return o
 def intervals(lo,hi,cuts):
  out=[(lo,hi)]
  for a,b in cuts:
   new=[]
   for x,y in out:
    if b<=x or a>=y:new.append((x,y))
    else:
     if x<a:new.append((x,a))
     if b<y:new.append((b,y))
   out=new
  return out
 # Blender XY corresponds to Three.js X,-Z; front is negative Y.
 for row in range(12):
  h=1.16+row*.238;ex=.18 if row%2==0 else .05
  cuts=[]
  if h<3.23:cuts.append((.92,2.08))
  if 1.9<h<2.95:cuts.append((-2.95,-1.15))
  for a,b in intervals(-4.2-ex,4.2+ex,cuts):log('front log','X',-3.5,h,a,b,row)
  log('back log','X',3.5,h,-4.2-ex,4.2+ex,row)
  for side in [-1,1]:
   cuts=[(-1.25,1.25)] if 1.85<h<3.0 else []
   for a,b in intervals(-3.5-ex,3.5+ex,cuts):log('side log','Y',side*4.2,h,a,b,row)
 # Gable ends use progressively shorter real logs.
 for j in range(9):
  h=4.0+j*.225;half=max(.16,(5.96-h)/.45)
  for z in [-3.5,3.5]:log('gable log','X',z,h,-half,half,j+20)
 for side in [-1,1]:
  o=mesh('metal roof',[(0,-4.15,6.02),(side*4.8,-4.15,3.91),(side*4.8,4.05,3.91),(0,4.05,6.02)],[(0,1,2,3)],roof)
  mod=o.modifiers.new('roof thickness','SOLIDIFY');mod.thickness=.06
  for q in np.arange(-4.1,4.05,.48):
   o=box('raised metal seam',(side*2.40,float(q),4.99),(5.24,.016,.025),roof,.004);o.rotation_euler.y=side*math.atan2(2.11,4.8)
  for y in [-4.16,4.06]:
   o=box('gable fascia',(side*2.40,y,4.96),(5.25,.16,.20),trim,.012);o.rotation_euler.y=side*math.atan2(2.11,4.8)
  box('eave fascia',(side*4.8,-.03,3.86),(.15,8.28,.23),trim,.01)
 # Real framed windows, sealed exterior only; no interior set is generated.
 def window(cx,cy,cz,width,height,side=False):
  pane=box('closed glass',(cx,cy,cz),(width,.035,height),glass,.005)
  if side:pane.rotation_euler.z=math.pi/2
  for dx in [-width/2,width/2,0]:
   o=box('window mullion',(cx+dx,cy-.045,cz),(.085,.15,height+.18),wood,.007)
   if side:o.location=(cx+.045,cy+dx,cz);o.rotation_euler.z=math.pi/2
  for dz in [-height/2,height/2]:
   o=box('window rail',(cx,cy-.045,cz+dz),(width+.18,.15,.10),wood,.007)
   if side:o.location=(cx+.045,cy,cz+dz);o.rotation_euler.z=math.pi/2
 window(-2.05,-3.61,2.42,1.8,1.08)
 window(4.31,0,2.42,2.5,1.15,True);window(-4.31,0,2.42,2.5,1.15,True)
 door=box('closed solid door',(1.5,-3.55,2.14),(1.10,.12,2.08),wood,.018)
 for i in range(6):box('solid door face plank',(.96+i*.18,-3.62,2.14),(.176,.028,2.04),wood,.004)
 for z in [1.52,2.78]:box('exterior strap hinge',(1.12,-3.652,z),(.32,.024,.045),steel,.004)
 for x in [.91,2.09]:box('door jamb',(x,-3.67,2.13),(.11,.18,2.23),trim,.008)
 box('door lintel',(1.5,-3.67,3.24),(1.31,.18,.13),trim,.008)
 box('iron door handle',(1.91,-3.72,2.09),(.035,.08,.16),steel,.009)
 # Detailed deck, joists, posts and stepped approach.
 for x in np.arange(-.9,4.15,.165):box('deck plank',(float(x),-4.49,1.05),(.16,1.9,.055),wood,.006)
 for x in [-.8,4.0]:
  for y in [-3.75,-5.25]:box('porch post',(x,y,.69),(.17,.17,.70),trim,.008)
 for k in range(3):box('step',(1.5,-5.7-k*.28,.92-k*.15),(1.5,.32,.12),wood,.01)
 # Stone footing modeled as a discontinuous rock-like masonry course, grounded.
 stone=material('granite footing',(.24,.25,.22),.94)
 for x in np.arange(-4.15,4.2,.65):
  for y in [-3.5,3.5]:
   o=box('stone footing',(float(x),y,.83),(.65,.48,.42),stone,.08);o.rotation_euler.z=random.uniform(-.07,.07)
 for y in np.arange(-3.0,3.2,.65):
  for x in [-4.2,4.2]:box('stone footing',(x,float(y),.83),(.48,.65,.42),stone,.08)
 allobs=meshes();select(allobs);bpy.ops.object.join();cab=bpy.context.object;cab.name='cabin_exterior';cab.data.calc_loop_triangles()
 bake(cab,SRC)
 bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'cabin-exterior-master.blend'))
 export('cabin',[cab])

def environment():
 clear();im=bpy.data.images.load(str(SRC/'alps_field.hdr'));w,h=im.size;data=np.array(im.pixels[:],dtype=np.float32).reshape(h,w,4)
 # The display background keeps the real sky; lighting probe removes only solar disk peaks.
 bright=data[:,:,:3].max(axis=2);yi,xi=np.unravel_index(np.argmax(bright),bright.shape)
 sun={'u':float((xi+.5)/w),'vBottom':float((yi+.5)/h),'maximum':float(bright.max())}
 (OUT/'environment.json').write_text(json.dumps(sun))
 # Save original unclipped HDR as the display sky. A separate probe bounds direct disk energy.
 im.filepath_raw=str(OUT/'alps-background.hdr');im.file_format='HDR';im.save()
 mask=bright>20
 clipped=data.copy();clipped[:,:,:3]=np.minimum(clipped[:,:,:3],8.0)
 im.pixels.foreach_set(clipped.ravel());im.scale(512,256);im.filepath_raw=str(OUT/'alps-lighting.hdr');im.save()
 # Viewing reference only, from the actual CC0 input. Not a browser acceptance image.
 im.scale(w,h);im.pixels.foreach_set(data.ravel());bpy.context.scene.view_settings.view_transform='AgX';im.filepath_raw=str(SRC/'alps-reference.png');im.file_format='PNG';im.save_render(str(SRC/'alps-reference.png'),scene=bpy.context.scene)
 print('ENVIRONMENT_READY',sun,flush=True)

if __name__=='__main__':
 build_tree();build_scans();build_cabin();environment()
 for r in REPORT:
  p=OUT/r['file'];r['bytes']=p.stat().st_size;r['sha256']=hashlib.sha256(p.read_bytes()).hexdigest()
 (ROOT/'docs/phase-01/blender-build.json').write_text(json.dumps({'blender':bpy.app.version_string,'assets':REPORT},indent=2)+'\n')
 print('BUILD_ASSETS_COMPLETE',flush=True)
