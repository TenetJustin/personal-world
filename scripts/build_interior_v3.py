"""Original residential cabin interior V3. Blender 5.2, metres, editable DCC master.
No photo planes, third-party furniture, film imagery, personal photos or logos.
All helper coordinates use the runtime's local Y-up system, +Z toward the lake.
"""
import bpy, math, random, json, hashlib
from pathlib import Path
from mathutils import Vector
import numpy as np
R=Path(__file__).resolve().parents[1];S=R/'assets-source';W=S/'v3';W.mkdir(exist_ok=True)
random.seed(3041)
bpy.ops.wm.open_mainfile(filepath=str(R/'assets/architecture/cabin-sprint-v2.blend'))
sc=bpy.context.scene;sc.unit_settings.system='METRIC';sc.unit_settings.scale_length=1
cabin=next(o for o in sc.objects if o.name.startswith('CABIN /'))
old_slab=bpy.data.objects.get('upper floor structural slab');assert old_slab
bpy.data.objects.remove(old_slab,do_unlink=True)
root=bpy.data.objects.new('INTERIOR_V3 / metres / Y-up contract',None);sc.collection.objects.link(root);root.parent=cabin
collections={};new_objects=[]
def cv(p):return Vector((p[0],-p[2],p[1]))
def coll(name):
 if name not in collections:
  c=bpy.data.collections.new('V3 / '+name);sc.collection.children.link(c);collections[name]=c
 return collections[name]
def register(o,name,group):
 o.name=name
 for c in list(o.users_collection):c.objects.unlink(o)
 coll(group).objects.link(o);o.parent=root;new_objects.append(o);return o

def mat(name,color,rough=.7,metal=0):
 m=bpy.data.materials.new('V3 / '+name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF')
 b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal
 return m
wood=mat('natural oiled pine',(.52,.35,.18),.74);oak=mat('honey oak joinery',(.42,.23,.10),.64)
stone=mat('natural masonry',(.35,.32,.28),.88)
cloth=mat('oatmeal linen upholstery',(.64,.61,.51),.95);green=mat('moss wool cushions',(.20,.27,.20),.97)
rug=mat('woven wool rug',(.52,.49,.40),1)
metal=mat('dark bronze hardware',(.05,.055,.048),.42,.75)
steel=mat('brushed stainless',(.44,.47,.48),.32,.95)
black=mat('black cast iron',(.025,.028,.025),.82,.2)
ceramic=mat('cream glazed stoneware',(.70,.67,.56),.30)
cabinet=mat('muted sage cabinetry',(.23,.30,.24),.73)
white=mat('off white crockery',(.77,.75,.67),.39)
worktop=mat('honed limestone worktop',(.43,.42,.37),.72)
mattress=mat('cotton bedding',(.76,.73,.65),.98)
leather=mat('cognac leather reading chair',(.28,.14,.07),.58)
book_mats=[mat('book spine '+str(i),c,.96) for i,c in enumerate([(.29,.34,.27),(.38,.27,.17),(.24,.28,.30),(.53,.44,.31),(.50,.49,.41)])]
pages=mat('book paper edges',(.68,.64,.53),.93)
ember=mat('banked ember glow',(.38,.06,.01),.88);ember.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(1,.17,.015,1);ember.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=2
lamp=mat('warm lamp diffuser',(.85,.77,.56),.58);lamp.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(1,.75,.40,1);lamp.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.65

def pbr(m,asset,tint):
 nt=m.node_tree;bs=nt.nodes.get('Principled BSDF')
 for channel,socket in [('Diffuse','Base Color'),('nor_gl','Normal'),('Rough','Roughness')]:
  im=bpy.data.images.load(str(S/asset/(channel+'.jpg')),check_existing=True)
  if channel=='Diffuse':
   im=im.copy();im.name='V3 grade '+m.name
   w,h=im.size;pix=np.array(im.pixels[:],dtype=np.float32).reshape(h,w,4);pix[:,:,:3]*=np.array(tint)
   im.pixels.foreach_set(pix.ravel());im.filepath_raw=str(W/(m.name.replace('/','-')+'.png'));im.file_format='PNG';im.save()
  else:im.colorspace_settings.name='Non-Color'
  tx=nt.nodes.new('ShaderNodeTexImage');tx.image=im
  if channel=='nor_gl':
   no=nt.nodes.new('ShaderNodeNormalMap');no.inputs['Strength'].default_value=.30;nt.links.new(tx.outputs['Color'],no.inputs['Color']);nt.links.new(no.outputs['Normal'],bs.inputs['Normal'])
  else:nt.links.new(tx.outputs['Color'],bs.inputs[socket])
pbr(wood,'rough_wood',(.86,.75,.57));pbr(oak,'rough_wood',(.69,.49,.30));pbr(stone,'rock_wall_02',(.84,.81,.74))
# Original fine-weave maps are generated at real thread scale; not borrowed photographs.
n=1024;yy,xx=np.mgrid[:n,:n];rng=np.random.default_rng(83)
weave=.5+.13*np.sin(xx*math.pi)*np.cos(yy*math.pi)+.055*np.sin(xx*.19)+.045*np.cos(yy*.21)+rng.normal(0,.025,(n,n))
for m,base in [(cloth,(.64,.61,.53)),(green,(.24,.31,.24)),(rug,(.55,.51,.43)),(mattress,(.78,.75,.67))]:
 im=bpy.data.images.new(m.name+' original weave',n,n,alpha=True)
 a=np.ones((n,n,4),np.float32);a[:,:,:3]=np.clip(np.array(base)[None,None,:]*(.87+weave[:,:,None]*.25),0,1)
 im.pixels.foreach_set(a.ravel());im.filepath_raw=str(W/(m.name.replace('/','-')+'-weave.png'));im.file_format='PNG';im.save()
 nt=m.node_tree;bs=nt.nodes.get('Principled BSDF');tx=nt.nodes.new('ShaderNodeTexImage');tx.image=im;nt.links.new(tx.outputs['Color'],bs.inputs['Base Color'])
 bs.inputs['Sheen Weight'].default_value=.22;bs.inputs['Sheen Roughness'].default_value=.75
# Fine weave normal map, not a rock-like cloth displacement.
im=bpy.data.images.new('V3 fine weave normal',n,n,alpha=True);im.colorspace_settings.name='Non-Color'
a=np.ones((n,n,4),np.float32);a[:,:,0]=.5+.05*np.sin(xx*.9)*np.cos(yy*.3);a[:,:,1]=.5+.05*np.cos(yy*.9)*np.sin(xx*.3);a[:,:,2]=.995
im.pixels.foreach_set(a.ravel());im.filepath_raw=str(W/'fine-weave-normal.png');im.file_format='PNG';im.save()
for m in [cloth,green,rug,mattress]:
 nt=m.node_tree;tx=nt.nodes.new('ShaderNodeTexImage');tx.image=im;no=nt.nodes.new('ShaderNodeNormalMap');no.inputs['Strength'].default_value=.32;nt.links.new(tx.outputs['Color'],no.inputs['Color']);nt.links.new(no.outputs['Normal'],nt.nodes.get('Principled BSDF').inputs['Normal'])

def uvphysical(o):
 if not o.data.uv_layers:o.data.uv_layers.new(name='UV / physical metres')
 uv=o.data.uv_layers.active
 for p in o.data.polygons:
  axis=max(range(3),key=lambda a:abs(p.normal[a]));axes=[a for a in range(3) if a!=axis]
  for li in p.loop_indices:
   v=o.data.vertices[o.data.loops[li].vertex_index].co
   scale=.38 if o.active_material in [cloth,green,rug,mattress] else 1.6
   uv.data[li].uv=(v[axes[0]]/scale,v[axes[1]]/scale)
def mesh(name,vs,fs,m,group):
 me=bpy.data.meshes.new(name);me.from_pydata([cv(v) for v in vs],[],fs);me.update();o=bpy.data.objects.new(name,me);coll(group).objects.link(o);o.parent=root;new_objects.append(o);me.materials.append(m);uvphysical(o);return o
def box(name,p,size,m,group,bevel=.012,smooth=False):
 # All geometry stays editable; runtime joins only after export.
 vs=[(x*size[0]/2,y*size[1]/2,z*size[2]/2) for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1),(-1,1,-1),(1,1,-1),(1,1,1),(-1,1,1)]]
 o=mesh(name,vs,[tuple(reversed(f)) for f in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]],m,group);o.location=cv(p)
 if bevel:
  b=o.modifiers.new('rounded milled edge','BEVEL');b.width=bevel;b.segments=3 if bevel<.04 else 5
  no=o.modifiers.new('weighted surface normals','WEIGHTED_NORMAL');no.keep_sharp=True
 if smooth:
  for f in o.data.polygons:f.use_smooth=True
 return o

def cyl(name,a,b,r,m,group,vertices=16,r2=None):
 a,b=cv(a),cv(b);bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r if r2 is None else r2,depth=(b-a).length,location=(a+b)/2)
 o=bpy.context.object;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();o.data.materials.append(m);register(o,name,group)
 mod=o.modifiers.new('soft lathed rim','BEVEL');mod.width=min(.004,r*.12);mod.segments=2
 for f in o.data.polygons:f.use_smooth=True
 return o

def beam(name,a,b,w,d,m,group):
 a,b=Vector(a),Vector(b);o=box(name,tuple((a+b)/2),(w,(b-a).length,d),m,group,.007);o.rotation_euler=(cv(b)-cv(a)).to_track_quat('Z','Y').to_euler();return o

def tube(name,points,r,m,group):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=12;cu.bevel_depth=r;cu.bevel_resolution=2
 sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
 for q,p in zip(sp.points,points):v=cv(p);q.co=(*v,1)
 o=bpy.data.objects.new(name,cu);coll(group).objects.link(o);o.parent=root;cu.materials.append(m);new_objects.append(o);return o

def cushion(name,p,size,m,group,tilt=0):
 o=box(name,p,size,m,group,min(.09,min(size)*.43),True)
 # Applied subdivisions create soft upholstered volume rather than six flat box faces.
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
 sub=o.modifiers.new('cloth loft smooth subdivision','SUBSURF');sub.subdivision_type='SIMPLE';sub.levels=2
 tex=bpy.data.textures.get('V3 cushion fabric relief') or bpy.data.textures.new('V3 cushion fabric relief',type='CLOUDS');tex.noise_scale=.11
 dis=o.modifiers.new('subtle cushion compression','DISPLACE');dis.texture=tex;dis.strength=.006;dis.mid_level=.55
 o.rotation_euler.x=tilt
 return o

def chair(name,x,y,z,rot=0,m=oak,upholstery=cloth,group='Dining'):
 obs=[]
 def track(o):obs.append(o);return o
 track(cushion(name+' upholstered seat',(x,y+.46,z),(.48,.085,.47),upholstery,group))
 for a in [-1,1]:
  for b in [-1,1]:track(cyl(name+' splayed leg',(x+a*.235,y+.025,z+b*.225),(x+a*.19,y+.435,z+b*.18),.021,m,group,12,r2=.015))
 for a in [-1,1]:track(cyl(name+' back upright',(x+a*.205,y+.43,z+.21),(x+a*.22,y+.96,z+.26),.021,m,group,12))
 track(tube(name+' steam bent back rail',[(x-.23+i*.46/16,y+.94+.035*math.sin(math.pi*i/16),z+.26-.025*math.sin(math.pi*i/16)) for i in range(17)],.027,m,group))
 for i in range(5):track(cyl(name+' fine back spindle',(x-.16+i*.08,y+.51,z+.22),(x-.16+i*.08,y+.94,z+.25),.009,m,group,10))
 for o in obs:
  v=Vector((o.location.x-x,o.location.y+z,0));c=math.cos(-rot);s=math.sin(-rot)
  # Blender plane rotation about local cabin vertical.
  if o.type=='CURVE':
   for spl in o.data.splines:
    for q in spl.points:
     dx=q.co.x-x;dy=q.co.y+z;q.co.x=x+c*dx-s*dy;q.co.y=-z+s*dx+c*dy
  else:
   dx=o.location.x-x;dy=o.location.y+z;o.location.x=x+c*dx-s*dy;o.location.y=-z+s*dx+c*dy;o.rotation_euler.z-=rot
 return obs

# Ground level finish and actual threshold. A single board is not a full floor texture plane.
for iz in range(40):
 z=-4.247+iz*.2178
 for ix in range(4):
  edges=[-5.84,-2.92+(.11 if iz%2 else 0),(.11 if iz%2 else 0),2.92+(.11 if iz%2 else 0),5.84];a,b=edges[ix:ix+2]
  box(f'floor oak plank {iz:02d}-{ix}',((a+b)/2,1.351,z),(b-a-.008,.038,.214),wood,'Structure',.003)
box('entry solid timber threshold',(1.11,1.343,4.39),(1.10,.026,.20),oak,'Structure',.004)
# Upper floor plates, real stair opening. Only four rectangular plates are required.
plates=[(-5.82,5.82,-4.32,-3.47),(-5.82,-5.55,-3.47,.30),(-4.20,5.82,-3.47,.30),(-5.82,5.82,.30,1.65)]
for i,(a,b,c,d) in enumerate(plates):
 box('mezzanine loadbearing slab '+str(i),((a+b)/2,4.115,(c+d)/2),(b-a,.17,d-c),oak,'Structure',.004)
 # Upper finished boards fit precisely around the stairwell, avoiding a hidden solid ceiling.
 for iz in range(math.ceil((d-c)/.22)):
  lo=c+iz*.22;hi=min(d,lo+.217)
  if hi>lo:box('upper floor board '+str(i)+'-'+str(iz),((a+b)/2,4.225,(lo+hi)/2),(b-a,.05,hi-lo),wood,'Structure',.003)
# 16 rises of .18m = 2.88m, with15 physical treads then upper landing.
for i in range(15):
 z=-3.45+(i+.5)*.25;y=1.37+(i+1)*.18
 box(f'stair tread {i+1:02d}',(-4.875,y-.035,z),(1.15,.07,.263),oak,'Stair and guards',.012)
 box(f'stair riser {i+1:02d}',(-4.875,y-.115,z-.119),(1.12,.16,.022),wood,'Stair and guards',.003)
for x in [-5.43,-4.32]:
 beam('stair loadbearing stringer',(x,1.37,-3.57),(x,4.16,.35),.10,.24,oak,'Stair and guards')
 # Sloping handrail over treads, separate from upper guard along the void.
 cyl('stair continuous handrail',(x,2.40,-3.42),(x,5.25,.31),.030,oak,'Stair and guards',16)
 for i in range(16):
  z=-3.45+i*.25;y=1.37+min(16,i+1)*.18
  cyl('stair spindle',(x,y,z),(x,y+.98,z),.012,metal,'Stair and guards',10)
 for z,y in [(-3.45,1.37),(.30,4.25)]:box('stair newel',(x,y+.53,z),(.10,1.06,.10),oak,'Stair and guards',.009)
# Guard rails along mezzanine front, opening right and rear. No barrier across the arrival landing.
def guard(name,a,b):
 a,b=Vector(a),Vector(b);length=(b-a).length
 cyl(name+' continuous top rail',tuple(a+Vector((0,1.01,0))),tuple(b+Vector((0,1.01,0))),.033,oak,'Stair and guards',16)
 for i in range(math.ceil(length/1.2)+1):
  p=a.lerp(b,i/max(1,math.ceil(length/1.2)));box(name+' timber newel',tuple(p+Vector((0,.52,0))),(.08,1.04,.08),oak,'Stair and guards',.008)
 for i in range(1,math.ceil(length/.12)):
  p=a.lerp(b,i/math.ceil(length/.12));cyl(name+' slim steel baluster',tuple(p+Vector((0,.04,0))),tuple(p+Vector((0,.98,0))),.009,metal,'Stair and guards',10)
guard('mezzanine lake-facing guard',(-5.78,4.25,1.65),(5.78,4.25,1.65))
guard('stairwell right guard',(-4.22,4.25,-3.47),(-4.22,4.25,.27))
guard('stairwell rear guard',(-5.50,4.25,-3.47),(-4.22,4.25,-3.47))
# Floor beam and actual columns keep the mezzanine structurally supported.
box('mezzanine front carrying beam',(0,3.91,1.55),(11.68,.24,.23),oak,'Structure',.015)
for x in [-5.55,-1.8,2.4,5.55]:
 box('mezzanine structural post',(x,2.70,1.55),(.20,2.66,.20),oak,'Structure',.015)
 for sign in [-1,1]:beam('column knee brace',(x,3.36,1.55),(x+sign*.45,3.80,1.55),.09,.12,oak,'Structure')
# Pitched interior roof liner and exposed rafters share the exterior roof plane.
def roof_y(z):return 8.5-(3.4/4.9)*abs(z)
for side in [-1,1]:
 vs=[(-5.86,roof_y(0)-.10,0),(5.86,roof_y(0)-.10,0),(5.86,roof_y(side*4.35)-.10,side*4.35),(-5.86,roof_y(side*4.35)-.10,side*4.35)]
 o=mesh('sloped pine roof lining '+str(side),vs,[tuple(range(4))] if side>0 else [tuple(reversed(range(4)))],wood,'Structure')
 solid=o.modifiers.new('roof liner thickness','SOLIDIFY');solid.thickness=.022
 for x in [-5.4,-4.2,-3,-1.8,-.6,.6,1.8,3,4.2,5.4]:beam('exposed pitched rafter',(x,roof_y(0)-.17,0),(x,roof_y(side*4.30)-.17,side*4.30),.14,.17,oak,'Structure')
box('structural ridge beam',(0,8.22,0),(11.72,.27,.20),oak,'Structure',.012)

# Lake-facing writing desk; MacBook will be authored separately by the root agent.
box('writing desk solid oak top',(-3.6,2.085,2.95),(1.90,.09,.85),oak,'Workspace',.023)
for x in [-4.40,-2.8]:
 for z in [2.64,3.26]:box('writing desk mortised leg',(x,1.705,z),(.075,.67,.075),oak,'Workspace',.008)
box('writing desk apron',(-3.6,1.99,3.24),(1.63,.15,.045),oak,'Workspace',.008)
chair('desk chair',-2.25,1.37,2.96,-.12,group='Workspace')
box('linen bound notebook',(-2.94,2.146,3.03),(.24,.028,.18),book_mats[0],'Workspace',.007)
box('notebook visible paper',(-2.94,2.148,3.03),(.23,.014,.17),pages,'Workspace',.003)
cyl('desk ceramic cup',(-4.18,2.13,2.96),(-4.18,2.25,2.96),.043,ceramic,'Workspace',24,r2=.048)
tube('ceramic cup curved handle',[(-4.23-.027*math.sin(math.pi*i/16),2.19+.036*math.cos(math.pi*i/16),2.96) for i in range(17)],.007,ceramic,'Workspace')

# Living room: modelled cushion volumes, piping, a draped throw, low table and wool rug.
box('living wool rug',(3.55,1.377,1.70),(3.32,.014,3.02),rug,'Living',.04)
box('sofa hardwood underframe',(3.675,1.61,2.40),(2.43,.19,1.02),oak,'Living',.04)
for x in [2.58,4.77]:
 for z in [2.00,2.82]:cyl('sofa turned foot',(x,1.37,z),(x,1.60,z),.035,oak,'Living',16,r2=.027)
for i in range(3):
 x=2.94+i*.735
 cushion('sofa linen seat '+str(i),(x,1.83,2.25),(.72,.22,.79),cloth,'Living')
 cushion('sofa linen back '+str(i),(x,2.10,2.80),(.72,.57,.22),cloth,'Living',-.12)
 # Fine top seam catches grazing light rather than a painted stripe.
 tube('seat welt seam '+str(i),[(x-.30,1.922,1.94),(x+.30,1.922,1.94),(x+.32,1.922,2.55),(x-.32,1.922,2.55),(x-.30,1.922,1.94)],.003,cloth,'Living')
for x in [2.49,4.86]:cushion('sofa rolled padded arm',(x,1.97,2.40),(.19,.59,1.08),cloth,'Living')
for x,z,tilt in [(2.80,2.55,.10),(4.35,2.55,-.13)]:
 o=cushion('loose moss wool pillow',(x,2.04,z),(.43,.45,.16),green,'Living',tilt);o.rotation_euler.z=.18 if x<3 else -.22
# Draped textile over one arm, original grid geometry with mild folds.
vs=[];fs=[]
for i in range(24):
 for j in range(30):
  u=i/23;v=j/29;x=2.35+u*.75;z=1.88+v*.90;y=1.96+.025*math.sin(v*8*math.pi)+.012*math.sin(u*7*math.pi)-.43*max(0,(.25-u)/.25)
  vs.append((x,y,z))
for i in range(23):
 for j in range(29):a=i*30+j;fs.append((a,a+30,a+31,a+1))
o=mesh('woven throw naturally draped over sofa arm',vs,fs,green,'Living');so=o.modifiers.new('cloth fabric thickness','SOLIDIFY');so.thickness=.004
for p in o.data.polygons:p.use_smooth=True
box('low oak coffee table top',(3.50,1.765,.775),(1.20,.07,.65),oak,'Living',.055)
for x in [3.04,3.96]:
 for z in [.56,.99]:box('coffee table short tapered leg',(x,1.565,z),(.055,.39,.055),oak,'Living',.008)
for i in range(2):box('coffee table reading book '+str(i),(3.67,1.816+i*.025,.77),(.29,.025,.21),book_mats[3-i],'Living',.004)
cyl('coffee table hand thrown bowl',(3.19,1.80,.77),(3.19,1.84,.77),.092,ceramic,'Living',24,r2=.115)
# Fireplace aligns with the existing right gable chimney. Stone surround leaves a real firebox.
box('granite hearth slab',(5.15,1.415,0),(1.30,.09,2.10),stone,'Fireplace',.035)
box('firebox black rear lining',(5.05,1.99,0),(.07,1.08,1.04),black,'Fireplace',.006)
for sign in [-1,1]:box('firebox side lining',(4.85,1.99,sign*.55),(.45,1.08,.08),black,'Fireplace',.004)
box('firebox upper lining',(4.85,2.55,0),(.48,.08,1.16),black,'Fireplace',.005)
# Each irregular fieldstone is an editable beveled object with a physically scaled scan.
for row in range(9):
 y=1.57+row*.235
 intervals=[(-1.00,-.59),(.59,1.00)] if y<2.65 else [(-1.00,1.00)]
 for lo,hi in intervals:
  pos=lo
  while pos<hi-.05:
   width=min(random.uniform(.24,.43),hi-pos);o=box('fireplace hand laid fieldstone',(4.70,y,pos+width/2),(.33+random.uniform(-.025,.025),.215,width-.012),stone,'Fireplace',.028)
   for vert in o.data.vertices:vert.co+=Vector((random.uniform(-.012,.012),random.uniform(-.012,.012),random.uniform(-.012,.012)))
   pos+=width
for sign in [-1,1]:box('fireplace deep masonry side return',(5.15,2.69,sign*.96),(.70,2.59,.18),stone,'Fireplace',.025)
box('fireplace flue transition to existing chimney',(5.10,3.76,0),(.64,.54,1.55),stone,'Fireplace',.022)
box('fireplace heavy oak mantel',(4.64,2.70,0),(.42,.14,2.22),oak,'Fireplace',.027)
for z in [-.72,.72]:beam('mantel carved corbel',(4.80,2.30,z),(4.60,2.60,z),.14,.16,oak,'Fireplace')
for i in range(4):
 z=-.37+i*.25;cyl('banked firewood log',(4.89,1.55,z-.16),(4.89,1.61,z+.20),.08,black,'Fireplace',12)
for i in range(14):
 x=4.78+random.random()*.25;z=(random.random()-.5)*.8;box('small ember under log',(x,1.50,z),(.022,.016,.03),ember,'Fireplace',.006)
for i in range(2):cyl('mantel ceramic vessel',(4.65,2.77,-.72+i*1.44),(4.65,2.92,-.72+i*1.44),.055,ceramic,'Fireplace',24,r2=.04)
# Open kitchen with recessed shaker doors, drawers, real countertop aperture and sink bowl.
for i in range(8):
 x=-1.45+i*.79
 box('kitchen oak carcass '+str(i),(x,1.79,-3.88),(.775,.80,.67),cabinet,'Kitchen',.008)
 # Five rails form each recessed face; the door is not a texture sticker.
 for dx in [-.32,.32]:box('cabinet shaker upright',(x+dx,1.81,-3.535),(.065,.66,.035),wood,'Kitchen',.006)
 for y in [1.505,2.115]:box('cabinet shaker horizontal rail',(x,y,-3.535),(.65,.065,.035),wood,'Kitchen',.005)
 box('cabinet recessed panel',(x,1.81,-3.552),(.57,.52,.018),cabinet,'Kitchen',.003)
 cyl('cabinet bronze handle',(x+.21,1.91,-3.50),(x+.21,2.04,-3.50),.010,metal,'Kitchen',12)
box('kitchen recessed dark toe kick',(1.31,1.425,-3.90),(6.36,.11,.48),black,'Kitchen',.005)
# Worktop split geometrically around a .51x.42m real sink aperture at x2.55.
for name,p,sz in [('left',( .20,2.255,-3.88),(4.16,.07,.77)),('right',(3.70,2.255,-3.88),(1.84,.07,.77)),('sink back',(2.55,2.255,-4.16),(.51,.07,.21)),('sink front',(2.55,2.255,-3.57),(.51,.07,.15))]:box('honed worktop '+name,p,sz,worktop,'Kitchen',.012)
box('stainless sink basin bottom',(2.55,2.08,-3.88),(.48,.025,.39),steel,'Kitchen',.04)
for x in [2.295,2.805]:box('sink basin side',(x,2.17,-3.88),(.025,.20,.42),steel,'Kitchen',.01)
for z in [-4.10,-3.66]:box('sink basin end',(2.55,2.17,z),(.51,.20,.025),steel,'Kitchen',.01)
tube('kitchen gooseneck tap',[(2.55,2.29,-4.12),(2.55,2.54,-4.12),(2.55,2.62,-4.06),(2.55,2.62,-3.94),(2.55,2.57,-3.88)],.016,steel,'Kitchen')
cyl('tap lever',(2.68,2.28,-4.10),(2.68,2.38,-4.10),.012,steel,'Kitchen',12)
# Oven and induction hob sit over a continuous but recessed cabinet bay.
box('oven enamel front',(-.66,1.79,-3.51),(.65,.58,.035),black,'Kitchen',.014)
box('oven front smoked glass',(-.66,1.78,-3.488),(.54,.36,.008),metal,'Kitchen',.015)
cyl('oven brushed handle',(-.91,2.035,-3.45),(-.41,2.035,-3.45),.014,steel,'Kitchen',12)
box('induction black ceramic top',(-.66,2.296,-3.88),(.65,.012,.58),black,'Kitchen',.024)
for x in [-.82,-.50]:
 for z in [-4.01,-3.73]:
  tube('induction fine burner ring',[(x+.10*math.cos(i*2*math.pi/32),2.304,z+.10*math.sin(i*2*math.pi/32)) for i in range(33)],.0015,steel,'Kitchen')
box('refrigerator rounded metal body',(5.13,2.305,-3.87),(.79,1.87,.76),steel,'Kitchen',.045)
for y,h in [(1.80,.81),(2.75,.98)]:box('fridge separate door',(5.13,y,-3.475),(.75,h,.045),steel,'Kitchen',.025)
for y in [2.06,2.49]:cyl('fridge vertical handle',(4.86,y,-3.421),(4.86,y+.28,-3.421),.013,metal,'Kitchen',12)
# Open shelves only in wall bays, not across the glazing.
for y in [2.80,3.28]:
 box('kitchen open oak shelf',(-1.85,y,-4.12),(1.45,.045,.30),oak,'Kitchen',.01)
 for x in [-2.44,-1.26]:box('shelf wall bracket',(x,y-.12,-4.25),(.025,.20,.025),metal,'Kitchen',.003)
 for i in range(4):cyl('kitchen stacked cup',(-2.35+i*.22,y+.025,-4.11),(-2.35+i*.22,y+.13,-4.11),.044,white,'Kitchen',20,r2=.049)
cyl('utensil crock',(4.12,2.29,-4.02),(4.12,2.46,-4.02),.07,ceramic,'Kitchen',20)
for i in range(4):cyl('wooden cooking utensil',(4.09+i*.025,2.42,-4.01),(4.04+i*.04,2.71,-4.01),.007,oak,'Kitchen',10)
box('kitchen chopping board',(3.35,2.304,-3.83),(.35,.025,.24),oak,'Kitchen',.024)
# Dining area,4chairs with bentwood backs and independent spindles.
box('family oak dining table',(.40,2.085,-1.65),(1.80,.09,.86),oak,'Dining',.045)
for x in [-.29,1.09]:
 for z in [-1.95,-1.35]:cyl('dining table tapered leg',(x,1.37,z),(x,2.04,z),.035,oak,'Dining',16,r2=.025)
chair('dining west',-.98,1.37,-1.65,math.pi/2)
chair('dining east',1.78,1.37,-1.65,-math.pi/2)
chair('dining back',.40,1.37,-2.52,math.pi)
chair('dining front',.40,1.37,-.77,0)
cyl('dining stoneware vase',(.40,2.13,-1.65),(.40,2.35,-1.65),.075,ceramic,'Dining',24,r2=.045)
for i in range(4):tube('dried stem arrangement',[(.40,2.30,-1.65),(.40+(i-1.5)*.055,2.62+(i%2)*.08,-1.65+(i-1.5)*.025)],.0025,oak,'Dining')
# Upstairs bedroom: real mattress seams, bed frame/legs, pillows and slightly rumpled duvet.
box('upper oak bed frame',(-2.40,4.52,-2.72),(2.10,.20,2.20),oak,'Upper bedroom',.045)
for x in [-3.30,-1.50]:
 for z in [-3.68,-1.78]:box('bed foot',(x,4.36,z),(.08,.22,.08),oak,'Upper bedroom',.012)
box('upholstered headboard',(-2.40,4.81,-3.76),(2.08,.98,.12),cloth,'Upper bedroom',.05)
cushion('thick mattress with rounded corners',(-2.40,4.70,-2.72),(2.00,.24,2.08),mattress,'Upper bedroom')
for x in [-2.91,-1.89]:cushion('bed pillow',(x,4.89,-3.36),(.81,.16,.48),mattress,'Upper bedroom',-.03)
vs=[];fs=[]
for i in range(35):
 for j in range(42):
  u=i/34;v=j/41;x=-3.43+u*2.06;z=-3.12+v*1.54;y=4.83+.024*math.sin(u*10+v*7)+.015*math.sin(v*27)-.20*(max(0,.08-u)+max(0,u-.92))*12
  vs.append((x,y,z))
for i in range(34):
 for j in range(41):a=i*42+j;fs.append((a,a+42,a+43,a+1))
o=mesh('rumpled woven duvet draped over mattress',vs,fs,mattress,'Upper bedroom');so=o.modifiers.new('duvet thin loft','SOLIDIFY');so.thickness=.012
for p in o.data.polygons:p.use_smooth=True
box('bedside oak cabinet',(-.925,4.535,-2.925),(.55,.57,.55),oak,'Upper bedroom',.025)
box('bedside drawer reveal',(-.925,4.62,-2.64),(.46,.018,.012),black,'Upper bedroom',.001)
cyl('bedside lamp stem',(-.925,4.83,-2.925),(-.925,5.08,-2.925),.012,metal,'Upper bedroom',12)
cyl('bedside linen shade',(-.925,5.04,-2.925),(-.925,5.22,-2.925),.125,lamp,'Upper bedroom',24,r2=.09)
# A reading chair overlooking the double-height room and lake beyond.
cushion('upper reading seat',(3.10,4.73,-1.42),(.76,.16,.74),leather,'Upper reading')
cushion('upper reading back',(3.10,5.02,-1.76),(.77,.57,.18),leather,'Upper reading',-.14)
for x in [2.69,3.51]:cushion('reading chair arm',(x,4.94,-1.44),(.12,.43,.77),oak,'Upper reading')
for x in [2.82,3.38]:
 for z in [-1.67,-1.18]:cyl('reading chair splayed leg',(x,4.25,z),(x,4.65,z),.026,oak,'Upper reading',12,r2=.020)
cyl('reading side table pedestal',(4.03,4.25,-1.35),(4.03,4.81,-1.35),.035,metal,'Upper reading',16)
cyl('reading side table round top',(4.03,4.81,-1.35),(4.03,4.86,-1.35),.29,oak,'Upper reading',32)
for y in [4.30,4.64,4.99,5.34]:box('upper bookcase shelf',(4.97,y,-2.15),(.58,.045,1.48),oak,'Upper reading',.008)
for z in [-2.89,-1.41]:box('upper bookcase side',(4.97,4.83,z),(.58,1.16,.05),oak,'Upper reading',.008)
for i in range(25):
 z=-2.77+(i%9)*.145;y=4.82 if i<9 else 5.16 if i<18 else 4.47
 box('upper library bound book',(4.99,y,z),(.32,.23+(i%3)*.025,.082),book_mats[i%len(book_mats)],'Upper reading',.004)
# Physical pendant fixtures. Small dynamic light emitters are added by the runtime component.
for name,x,z,y in [('dining',.40,-1.65,3.48),('living',3.55,2.1,4.60)]:
 top=4.02 if name=='dining' else roof_y(z)-.28
 cyl(name+' pendant flex',(x,y+.15,z),(x,top,z),.007,metal,'Lighting',10)
 cyl(name+' spun bronze pendant shade',(x,y-.08,z),(x,y+.15,z),.26,metal,'Lighting',32,r2=.10)
 cyl(name+' opal pendant diffuser',(x,y-.089,z),(x,y-.077,z),.22,lamp,'Lighting',32)
# Named anchors permit deterministic inspection without camera logic in the GLB.
for name,p in [('ANCHOR_stair_bottom',(-4.875,1.37,-3.95)),('ANCHOR_stair_top',(-4.875,4.25,.95)),('ANCHOR_workspace_surface',(-3.6,2.13,2.95))]:
 o=bpy.data.objects.new(name,None);coll('Anchors').objects.link(o);o.parent=root;o.location=cv(p)
sc['phase']='V3 / original residential interior with walkable mezzanine';sc['units']='1 Blender/Three unit = 1m'
sc['rights']='Original geometry and fabric maps; existing Poly Haven rough_wood / rock_wall_02 CC0 PBR'
bpy.ops.file.pack_all();master=R/'assets/architecture/cabin-interior-v3.blend';bpy.ops.wm.save_as_mainfile(filepath=str(master))
# Exterior derivative only removes the earlier opaque slab. Preserve cabin.glb itself unchanged.
bpy.ops.object.select_all(action='DESELECT')
original=[o for o in sc.objects if o.type=='MESH' and o not in new_objects and not o.name.startswith('entry door /')]
for o in original:o.select_set(True)
bpy.context.view_layer.objects.active=original[0]
bpy.ops.export_scene.gltf(filepath=str(W/'cabin-v3-shell-authoring.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
# Runtime interior is cabin-local; React applies the shared world transform once.
root.parent=None;root.location=(0,0,0);root.rotation_euler=(0,0,0)
bpy.ops.object.select_all(action='DESELECT')
for o in new_objects:o.select_set(True)
root.select_set(True);bpy.context.view_layer.objects.active=next(o for o in new_objects if o.type=='MESH')
bpy.ops.export_scene.gltf(filepath=str(W/'cabin-interior-v3-authoring.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
report={'blender':bpy.app.version_string,'master':str(master.relative_to(R)),'originalExteriorSha256':hashlib.sha256((R/'public/assets/cabin.glb').read_bytes()).hexdigest(),'newShellRemovesOnly':'upper floor structural slab','objectCount':len(new_objects),'collections':list(collections),'floorY':1.37,'upperY':4.25,'upperSlabUnderside':4.03,'stair':{'minX':-5.45,'maxX':-4.30,'bottomZ':-3.45,'topZ':.30,'rise':.18,'run':.25,'treads':15,'risers':16},'upperPlates':[list(p) for p in plates],'stairOpening':{'minX':-5.55,'maxX':-4.20,'minZ':-3.47,'maxZ':.30},'desktopSurface':[-3.6,2.13,2.95],'license':'Original geometry + original weave maps + registered CC0 rough_wood / rock_wall_02'}
(R/'docs/v3/interior-geometry.json').write_text(json.dumps(report,indent=2)+'\n');print('INTERIOR_V3_READY',report,flush=True)
