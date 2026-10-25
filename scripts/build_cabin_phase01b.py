"""Original, editable architectural master. Blender 5.2; meters, Z up.
Reference observations and rights: docs/phase-01b/01_Architectural_Reference_And_Design.md.
No film imagery, third-party cabin mesh, interiors, baked direct lighting or logos.
"""
import bpy, math, random, json, sys
from pathlib import Path
from mathutils import Vector
import numpy as np
R=Path(__file__).resolve().parents[1]; S=R/'assets-source'; O=R/'public/assets'
BLOCK='--blockout' in sys.argv
random.seed(181)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
 if c.name!='Collection':bpy.data.collections.remove(c)
sc=bpy.context.scene;sc.unit_settings.system='METRIC';sc.unit_settings.scale_length=1
collections={}
def group(name):
 if name not in collections:
  c=bpy.data.collections.new(name);sc.collection.children.link(c);collections[name]=c
 return collections[name]
def move(o,c):
 for p in list(o.users_collection):p.objects.unlink(o)
 group(c).objects.link(o);return o
def mat(name,color,rough=.7,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF')
 b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal
 return m
wood=mat('01 / warm weathered pine',(.20,.12,.066));stone=mat('04 / natural granite masonry',(.31,.29,.24),.9)
roof=mat('03 / charcoal standing-seam zinc',(.075,.085,.079),.58,.58)
trim=mat('02 / oiled timber joinery',(.13,.081,.044),.68);iron=mat('06 / blackened hardware',(.025,.028,.025),.5,.65)
glass=mat('05 / architectural clear glass - nonmetal',(.92,.98,.96),.09,0)
b=glass.node_tree.nodes.get('Principled BSDF');b.inputs['IOR'].default_value=1.48;b.inputs['Transmission Weight'].default_value=1.0
mortar=mat('07 / recessed lime mortar',(.23,.23,.20),.95)
clay=mat('Blockout / neutral clay',(.43,.48,.46),.8)
def pbr(m,asset,tint=None):
 if BLOCK:return
 nt=m.node_tree;bs=nt.nodes.get('Principled BSDF')
 for channel,socket in [('Diffuse','Base Color'),('nor_gl','Normal'),('Rough','Roughness')]:
  im=bpy.data.images.load(str(S/asset/(channel+'.jpg')),check_existing=True)
  if channel=='Diffuse' and tint:
   im=im.copy();im.name='original color grade / '+asset
   w,h=im.size;pix=np.array(im.pixels[:],dtype=np.float32).reshape(h,w,4);pix[:,:,:3]*=np.array(tint)
   im.pixels.foreach_set(pix.ravel());p=S/'phase01b';p.mkdir(exist_ok=True);im.filepath_raw=str(p/(asset+'-graded.png'));im.file_format='PNG';im.save()
  if channel!='Diffuse':im.colorspace_settings.name='Non-Color'
  tx=nt.nodes.new('ShaderNodeTexImage');tx.image=im
  if channel=='nor_gl':
   normal=nt.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.55;nt.links.new(tx.outputs['Color'],normal.inputs['Color']);nt.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
  else:nt.links.new(tx.outputs['Color'],bs.inputs[socket])
pbr(wood,'rough_wood',(.56,.46,.34));pbr(stone,'rock_wall_02',(.87,.84,.77))
def uvphysical(o,long=None):
 if not o.data.uv_layers:o.data.uv_layers.new(name='UV0 / meters')
 uv=o.data.uv_layers.active
 if long is None:long=max(range(3),key=lambda i:o.dimensions[i])
 for p in o.data.polygons:
  normal=max(range(3),key=lambda i:abs(p.normal[i]));axes=[i for i in range(3) if i!=normal]
  a=next((i for i in axes if i!=long),axes[0]);b=long if long in axes else axes[-1]
  for li in p.loop_indices:
   co=o.data.vertices[o.data.loops[li].vertex_index].co
   uv.data[li].uv=(co[a]/(.42 if o.active_material==wood else 2.4)+.173,co[b]/(2.4 if o.active_material==wood else 2.4)+.257)
def mesh(name,vs,fs,m,c):
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);group(c).objects.link(o);me.materials.append(clay if BLOCK else m);return o
def box(name,loc,size,m,c,bevel=.008):
 vs=[(x*size[0]/2,y*size[1]/2,z*size[2]/2) for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 o=mesh(name,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],m,c);o.location=loc;uvphysical(o,max(range(3),key=lambda i:size[i]))
 if bevel and not BLOCK:
  mod=o.modifiers.new('edge radius / editable','BEVEL');mod.width=bevel;mod.segments=2
  mod=o.modifiers.new('weighted surface normals','WEIGHTED_NORMAL');mod.keep_sharp=True
 return o
def beam(name,a,b,width,depth,m,c):
 a,b=Vector(a),Vector(b);o=box(name,(a+b)*.5,(width,depth,(b-a).length),m,c,.007);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def panel(name,vs,m,c,thickness=.055):
 if m==roof and (Vector(vs[1])-Vector(vs[0])).cross(Vector(vs[2])-Vector(vs[0])).z<0:vs=list(reversed(vs))
 o=mesh(name,vs,[tuple(range(len(vs)))],m,c);uvphysical(o)
 so=o.modifiers.new('physical thickness','SOLIDIFY');so.thickness=thickness
 if not BLOCK:
  b=o.modifiers.new('fold edge radius','BEVEL');b.width=.004;b.segments=2
 return o
def intervals(lo,hi,cuts):
 out=[(lo,hi)]
 for a,b in cuts:
  new=[]
  for x,y in out:
   if b<=x or a>=y:new.append((x,y))
   else:
    if a>x:new.append((x,a))
    if b<y:new.append((b,y))
  out=new
 return out
# Front is Blender -Y. Log shell has an actual inner face and ~.28m thickness.
def log(axis,fixed,z,a,b,row,c='01 / log shell'):
 if b-a<.04:return
 # Flat inside, gently hewn convex outside; original mesh, not decorative cylinders.
 profile=[(-.14,-.122),(.06,-.122),(.127,-.085),(.152,-.025),(.149,.04),(.11,.105),(.035,.122),(-.14,.122)]
 vs=[];n=8;steps=max(2,math.ceil((b-a)/.65));seed=random.random()*8
 for k in range(steps+1):
  q=a+(b-a)*k/steps
  for dep,h in profile:
   warp=.003*math.sin(q*5+seed)
   vs.append((q,fixed+dep,z+h+warp) if axis=='X' else (fixed+dep,q,z+h+warp))
 fs=[]
 for k in range(steps):
  for j in range(n):fs.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
 fs+=[tuple(reversed(range(n))),tuple(steps*n+j for j in range(n))]
 o=mesh(f'hewn log {axis} / course {row:02d}',vs,fs,wood,c);uvphysical(o,0 if axis=='X' else 1)
 return o
# Main level + knee wall, real openings. Window dims are shared by frame and cuts.
front=[(-3.8,1.7,2.15,3.8),(3.7,1.65,2.15,3.8)]
back=[(-3.8,1.6,2.1,3.7),(0,1.7,2.1,3.7),(3.8,1.6,2.1,3.7)]
side=[(-1.65,1.65,2.1,3.75),(1.8,1.65,2.1,3.75)]
for row in range(16):
 z=1.475+row*.245
 for y,windows in [(-4.5,front),(4.5,back)]:
  cuts=[(cx-w/2,cx+w/2) for cx,w,lo,hi in windows if lo-.12<z<hi+.12]
  if y<0 and z<3.74:cuts.append((.55,1.67))
  for a,b in intervals(-6.09,6.09,cuts):log('X',y,z,a,b,row)
 for x in ([-6,6] if row<15 else []):
  cuts=[(cy-w/2,cy+w/2) for cy,w,lo,hi in side if lo-.12<z<hi+.12]
  for a,b in intervals(-4.62,4.62,cuts):log('Y',x,z,a,b,row)
# Gable infill: log lengths follow the roof; a real upper window in each end.
for sideX in [-6,6]:
 for k in range(14):
  z=5.15+k*.235;half=min(4.5,max(.05,(8.5-z-.14)/(3.4/4.9)))
  cuts=([(-2.625,-1.375)] if 5.23<z<6.67 else []) if sideX>0 else ([(-.8,.8)] if 5.33<z<7.02 else [])
  for a,b in intervals(-half,half,cuts):log('Y',sideX,z,a,b,20+k,'02 / gable ends')
for x in [-6,6]:
 vs=[(x,-.28,8.30),(x,.28,8.30),(x,0,8.49)]
 panel('gable / apex infill',vs if x>0 else list(reversed(vs)),wood,'02 / gable ends',.24)
for y in [-4.5,4.5]:box('wall / top plate',(0,y,5.32),(12.2,.28,.14),trim,'03 / floor and framing')
# Structural slabs reserve coherent future rooms, without developing an interior set.
box('main floor structural slab',(0,0,1.22),(11.72,8.72,.22),trim,'03 / floor and framing')
box('upper floor structural slab',(0,0,4.22),(11.72,8.72,.18),trim,'03 / floor and framing')
# Frames: reveal boxes extend through the shell; glazing has thickness and is non-metallic.
def window(cx,cy,lo,w,h,rot=0,label='ground window'):
 local=[]
 def part(name,x,y,z,dims,m,bevel=.006):
  o=box(label+' / '+name,(x,y,z),dims,m,'04 / doors and windows',bevel);local.append(o);return o
 for x in [-w/2,w/2]:part('deep jamb',x,0,lo+h/2,(.10,.30,h+.18),trim)
 for z in [lo,lo+h]:part('head or sill',0,0,z,(w+.20,.32,.11),trim)
 part('projecting sloped sill',0,-.11,lo-.05,(w+.30,.44,.09),wood)
 part('glazing',0,-.045,lo+h/2,(w-.10,.014,h-.11),glass,.002)
 for x in [-w*.25,0,w*.25]:part('muntin',x,-.064,lo+h/2,(.026,.036,h-.12),trim,.002)
 for z in [lo+h*.45]:part('meeting rail',0,-.068,z,(w-.08,.045,.036),trim,.002)
 for o in local:
  x,y=o.location.x,o.location.y;o.location.x=cx+x*math.cos(rot)-y*math.sin(rot);o.location.y=cy+x*math.sin(rot)+y*math.cos(rot);o.rotation_euler.z=rot
for y,ws,rot in [(-4.5,front,0),(4.5,back,math.pi)]:
 for cx,w,lo,hi in ws:window(cx,y,lo,w,hi-lo,rot)
for x in [-6,6]:
 for cy,w,lo,hi in side:window(x,cy,lo,w,hi-lo,math.pi/2 if x>0 else -math.pi/2)
 window(x,-2.0 if x>0 else 0,5.35 if x>0 else 5.45,1.25 if x>0 else 1.6,1.2 if x>0 else 1.45,math.pi/2 if x>0 else -math.pi/2,'upper gable window')
for x in [.50,1.72]:box('entry / full depth jamb',(x,-4.5,2.5),(.11,.32,2.4),trim,'04 / doors and windows')
box('entry / header',(1.11,-4.5,3.74),(1.35,.33,.14),trim,'04 / doors and windows')
# Separate solid closed door. Its opening remains real if this named leaf is removed.
for i in range(7):box('entry door / individual board',(.63+i*.16,-4.50,2.49),(.158,.10,2.26),wood,'04 / doors and windows')
for z in [1.65,3.3]:box('entry door / forged strap',(.81,-4.57,z),(.35,.028,.05),iron,'04 / doors and windows')
box('entry door / handle',(1.5,-4.6,2.4),(.035,.07,.18),iron,'04 / doors and windows',.014)
# Main gable roof, dormer roof cuts calculated at the intersection of the two planes.
RIDGE=8.5;SLOPE=3.4/4.9;EAVE=-5.12
DORMERS=[(-2.8,1.30,7.80),(2.05,1.14,7.63)]
def mainZ(y):return RIDGE+SLOPE*y
def dormZ(x,cx,peak):return peak-.73*abs(x-cx)
def interY(x,cx,peak):return (dormZ(x,cx,peak)-RIDGE)/SLOPE
edges=[-6.55,6.55]
for cx,hw,peak in DORMERS:edges +=[cx-hw,cx,cx+hw]
edges.sort()
for a,b in zip(edges,edges[1:]):
 d=next((d for d in DORMERS if d[0]-d[1]<(a+b)/2<d[0]+d[1]),None)
 if d:
  cx,hw,peak=d;ya,yb=interY(a,cx,peak),interY(b,cx,peak)
  panel('main roof / behind dormer',[(a,0,RIDGE),(b,0,RIDGE),(b,yb,mainZ(yb)),(a,ya,mainZ(ya))],roof,'05 / main roof')
  panel('main roof / below dormer',[(a,-4.02,mainZ(-4.02)),(b,-4.02,mainZ(-4.02)),(b,EAVE,mainZ(EAVE)),(a,EAVE,mainZ(EAVE))],roof,'05 / main roof')
 else:panel('main roof / intact bay',[(a,0,RIDGE),(b,0,RIDGE),(b,EAVE,mainZ(EAVE)),(a,EAVE,mainZ(EAVE))],roof,'05 / main roof')
panel('main roof / rear slope',[(-6.55,0,RIDGE),(-6.55,5.12,mainZ(-5.12)),(6.55,5.12,mainZ(-5.12)),(6.55,0,RIDGE)],roof,'05 / main roof')
# Physical seams obey dormer cutouts, no coplanar decorative strips across openings.
for x in np.arange(-6.5,6.55,.43):
 x=float(x);d=next((d for d in DORMERS if abs(x-d[0])<d[1]),None)
 runs=[(EAVE,0)] if not d else [(EAVE,-4.02),(interY(x,d[0],d[2]),0)]
 for a,b in runs:beam('main roof / raised seam',(x,a,mainZ(a)+.014),(x,b,mainZ(b)+.014),.019,.024,roof,'05 / main roof')
 beam('rear roof / raised seam',(x,0,RIDGE+.014),(x,5.12,mainZ(-5.12)+.014),.019,.024,roof,'05 / main roof')
beam('main ridge folded cap',(-6.62,0,RIDGE+.018),(6.62,0,RIDGE+.018),.20,.07,roof,'05 / main roof')
for x in [-6.55,6.55]:
 for sideY in [-1,1]:beam('gable / barge board',(x,0,8.44),(x,sideY*5.16,4.9),.18,.22,trim,'05 / main roof')
for y in [-5.13,5.13]:beam('main eave / fascia',(-6.56,y,4.91),(6.56,y,4.91),.14,.23,trim,'05 / main roof')
for cx,hw,peak in DORMERS:
 fy=-4.02;base=mainZ(fy)-.03;shoulder=peak-.73*hw
 # front wall with real window opening, short boards at sill/head and full jamb bays
 lo=base+.15;wh=shoulder-lo-.13;ww=hw*1.18
 for a,b in [(cx-hw,cx-ww/2-.06),(cx+ww/2+.06,cx+hw)]:box('dormer / front cheek',((a+b)/2,fy,(base+shoulder)/2),(b-a,.22,shoulder-base),wood,'06 / dormers')
 for z,h in [(base+.05,.1),(shoulder-.04,.08)]:box('dormer / front sill or header',(cx,fy,z),(2*hw,.22,h),wood,'06 / dormers')
 panel('dormer / front gable',[(cx-hw,fy,shoulder),(cx+hw,fy,shoulder),(cx,fy,peak)],wood,'06 / dormers',.22)
 window(cx,fy,lo,ww,wh,0,'dormer window')
 for sign in [-1,1]:
  x=cx+sign*hw;yback=interY(x,cx,peak)
  panel('dormer / side cheek',[(x,fy,base),(x,yback,mainZ(yback)),(x,yback,shoulder),(x,fy,shoulder)],wood,'06 / dormers',.18)
  # intersecting roof trapezoid - back edge lies exactly on main roof plane
  xo=cx+sign*(hw+.13);yo=interY(xo,cx,peak)
  panel('dormer / metal roof',[(cx,fy-.18,peak+.04),(xo,fy-.18,dormZ(xo,cx,peak)+.04),(xo,yo,dormZ(xo,cx,peak)+.04),(cx,interY(cx,cx,peak),peak+.04)],roof,'06 / dormers')
  beam('dormer / front fascia',(cx,fy-.20,peak),(xo,fy-.20,dormZ(xo,cx,peak)),.12,.15,trim,'06 / dormers')
  beam('dormer / valley flashing',(xo,fy,mainZ(fy)+.04),(xo,yo,mainZ(yo)+.04),.16,.035,roof,'06 / dormers')
  for dx in np.arange(.10,hw+.1,.32):
   sx=cx+sign*float(dx);ey=interY(sx,cx,peak);zz=dormZ(sx,cx,peak)+.06
   beam('dormer / metal seam',(sx,fy-.16,zz),(sx,ey,zz),.019,.025,roof,'06 / dormers')
# L-shaped / three-face wraparound porch, lower than main roof with coherent hip corners.
panel('porch / front roof',[(-6,-4.5,4.45),(6,-4.5,4.45),(8.25,-7.08,3.72),(-8.25,-7.08,3.72)],roof,'07 / porch roof')
for sign in [-1,1]:
 panel('porch / side roof',[(sign*6,-4.5,4.45),(sign*6,4.75,4.45),(sign*8.25,4.75,3.72),(sign*8.25,-7.08,3.72)],roof,'07 / porch roof')
 beam('porch / hip cap',(sign*6,-4.5,4.49),(sign*8.25,-7.08,3.76),.11,.06,roof,'07 / porch roof')
 for y in np.arange(-4.4,4.7,.45):beam('porch / side metal seam',(sign*6,float(y),4.49),(sign*8.25,float(y),3.76),.018,.025,roof,'07 / porch roof')
for x in np.arange(-5.9,6.0,.44):beam('porch / front metal seam',(float(x),-4.5,4.49),(float(x),-7.08,3.76),.018,.025,roof,'07 / porch roof')
# Deck boards. Left/right walkways connect to full front deck.
for x in np.arange(-8.1,8.12,.147):box('front deck / plank',(float(x),-5.76,1.32),(.142,2.65,.065),wood,'08 / porch structure',.004)
for sign in [-1,1]:
 for y in np.arange(-4.35,4.55,.147):box('side deck / plank',(sign*7.09,float(y),1.32),(2.15,.142,.065),wood,'08 / porch structure',.004)
posts=[(x,-6.87) for x in [-8,-5.45,-2.9,-.35,2.2,5.1,8]]
posts +=[(sign*8,y) for sign in [-1,1] for y in [-3.9,-1.05,1.8,4.5]]
for x,y in posts:
 box('porch / structural post',(x,y,2.5),(.19,.19,2.45),wood,'08 / porch structure',.014)
 box('porch / post capital',(x,y,3.65),(.26,.26,.10),trim,'08 / porch structure')
 box('porch / stone pier',(x,y,.72),(.42,.42,1.12),stone,'09 / masonry',.045)
 # knee braces meet beam and post, not detached diagonal decoration
 for dx in [-.40,.40]:beam('porch / knee brace',(x,y,3.15),(x+dx,y,3.60),.075,.10,wood,'08 / porch structure')
beam('porch / front carrying beam',(-8.15,-6.87,3.62),(8.15,-6.87,3.62),.20,.26,trim,'08 / porch structure')
for sign in [-1,1]:beam('porch / side carrying beam',(sign*8,-6.87,3.62),(sign*8,4.65,3.62),.20,.26,trim,'08 / porch structure')
# Exposed rafters and joists readable in approach.
for x in np.arange(-7.9,8,.62):
 beam('front porch / rafter',(float(x),-4.48,4.34),(float(x),-7.04,3.61),.08,.14,trim,'08 / porch structure')
 beam('front porch / joist',(float(x),-4.5,1.18),(float(x),-6.97,1.18),.085,.18,trim,'08 / porch structure')
def railing(a,b):
 a,b=Vector(a),Vector(b);dist=(b-a).length
 for z,w,d in [(2.34,.105,.085),(1.50,.07,.07)]:beam('porch / rail',(*a[:2],z),(*b[:2],z),w,d,wood,'10 / rails and stairs')
 for k in range(1,max(2,round(dist/.145))):
  p=a.lerp(b,k/round(dist/.145));box('porch / baluster',(p.x,p.y,1.91),(.037,.037,.82),wood,'10 / rails and stairs',.003)
# Entry gap centered at x1.11, 1.8m wide.
railing((-8,-6.87,0),(.15,-6.87,0));railing((2.2,-6.87,0),(8,-6.87,0))
for sign in [-1,1]:railing((sign*8,-6.87,0),(sign*8,4.5,0))
for k in range(5):
 z=1.30-k*.17;y=-7.03-k*.30
 box('entry stair / tread',(1.16,y,z),(1.92,.315,.07),wood,'10 / rails and stairs')
 box('entry stair / riser',(1.16,y+.12,z-.075),(1.90,.035,.14),trim,'10 / rails and stairs')
for x in [.18,2.14]:
 beam('stair / stringer',(x,-6.9,1.22),(x,-8.58,.45),.09,.19,trim,'10 / rails and stairs')
 beam('stair / handrail',(x,-6.9,2.32),(x,-8.57,1.60),.075,.08,wood,'10 / rails and stairs')
 box('stair / lower newel',(x,-8.5,1.0),(.12,.12,1.20),wood,'10 / rails and stairs')
# Foundation and chimney masonry: actual irregular beveled blocks over recessed mortar.
def stoneblock(name,loc,dims):
 o=box(name,loc,dims,stone,'09 / masonry',.028)
 for v in o.data.vertices:
  v.co.x+=random.uniform(-.025,.025);v.co.y+=random.uniform(-.023,.023);v.co.z+=random.uniform(-.022,.022)
 uvphysical(o);return o
def masonry_wall(axis,fixed,a,b,bottom,top,depth=.42):
 for row in range(math.ceil((top-bottom)/.245)):
  z=bottom+row*.245+.116;start=a-(.31 if row%2 else 0)
  while start<b:
   length=random.uniform(.42,.78);lo=max(a,start);hi=min(b,start+length-.015)
   if hi-lo>.08:
    loc=((lo+hi)/2,fixed,z) if axis=='X' else (fixed,(lo+hi)/2,z)
    dims=(hi-lo,depth,.225) if axis=='X' else (depth,hi-lo,.225)
    stoneblock('foundation / individual granite',loc,dims)
   start+=length
# Base follows slope via variable buried depth; no bright thin floating foundation rim.
for y in [-4.45,4.45]:masonry_wall('X',y,-5.95,5.95,-.10,1.25)
for x in [-5.95,5.95]:masonry_wall('Y',x,-4.45,4.45,-.10,1.25)
# Stone plinth under front porch, with opening only for stair access.
for a,b in [(-8,.10),(2.22,8)]:masonry_wall('X',-6.83,a,b,-.18,1.23,.32)
for sign in [-1,1]:masonry_wall('Y',sign*7.95,-6.83,4.5,-.18,1.23,.32)
# Structural chimney on right gable, reduced stack over shoulder, proper cap / flue.
for lo,hi,w,d in [(-.1,5.15,1.65,1.45),(5.15,8.95,1.28,1.12)]:
 cx=5.9;cy=.05
 box('chimney / recessed mortar core',(cx,cy,(lo+hi)/2),(w-.10,d-.10,hi-lo),mortar,'09 / masonry')
 for y in [cy-d/2,cy+d/2]:masonry_wall('X',y,cx-w/2,cx+w/2,lo,hi,.21)
 for x in [cx-w/2,cx+w/2]:masonry_wall('Y',x,cy-d/2,cy+d/2,lo,hi,.21)
box('chimney / stone cap',(5.9,.05,9.04),(1.55,1.36,.16),stone,'09 / masonry',.025)
for x in [5.56,6.24]:box('chimney / cap standoff',(x,.05,9.24),(.055,.055,.30),iron,'09 / masonry')
box('chimney / rain cap',(5.9,.05,9.42),(1.32,1.18,.045),iron,'09 / masonry')
# Quiet signs of habitation: a built porch bench, firewood stack, exterior lanterns.
for x in [-3.4,-2.1]:box('porch bench / leg',(x,-5.0,1.57),(.10,.46,.46),trim,'11 / exterior details')
for j in range(3):box('porch bench / seat',(-2.75,-4.84-j*.15,1.81),(1.65,.145,.05),wood,'11 / exterior details')
for h in [2.05,2.25]:box('porch bench / back',(-2.75,-4.66,h),(1.65,.07,.12),wood,'11 / exterior details')
for x in [-.12,2.24]:
 beam('lantern / bracket',(x,-4.63,3.35),(x,-4.88,3.35),.035,.035,iron,'11 / exterior details')
 box('lantern / body',(x,-4.86,3.12),(.17,.15,.30),iron,'11 / exterior details',.015)
# Named empty anchors reserve coherent Phase 02 entry and walkable porch.
for name,loc in [('ANCHOR_entry_threshold',(1.11,-4.5,1.35)),('ANCHOR_porch_arrival',(1.11,-6,2.95)),('ANCHOR_upper_floor',(0,0,4.31))]:
 o=bpy.data.objects.new(name,None);group('12 / anchors').objects.link(o);o.location=loc
# Transform entire architectural assembly to the outdoor world, while retaining editable hierarchy.
root=bpy.data.objects.new('CABIN / 12x9m / Phase01B',None);sc.collection.objects.link(root)
for o in list(sc.objects):
 if o!=root:o.parent=root
root.location=(8,3,0);root.rotation_euler.z=math.radians(-35) # glTF Z-up -> Y-up: Three rotation Y = -35deg
# Cameras store the same positions as browser, no offline beauty rendering used for acceptance.
for name,p,t,fov in [('S01',(6,-43,2.8),(-3,3,4),48),('S02',(15,-20,3.2),(7,3,4.1),48)]:
 bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.name=name;move(cam,'13 / browser reference cameras');cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens_unit='FOV';cam.data.angle=math.radians(fov)
sc['design']='Original cabin inspired by observed Endgame location. Not a replica or a surveyed building.'
sc['phase']='01B / pending human visual acceptance';sc['units']='1 unit = 1 meter'
# Pack every file texture; master retains components and unapplied bevel / thickness modifiers.
if not BLOCK:bpy.ops.file.pack_all()
master=R/'assets/architecture'/('cabin-blockout.blend' if BLOCK else 'cabin-phase01b.blend')
bpy.ops.wm.save_as_mainfile(filepath=str(master))
# Export a temporary duplicate assembly and merge by material only, leaving master untouched.
obs=[o for o in sc.objects if o.type=='MESH'];bpy.ops.object.select_all(action='DESELECT')
for o in obs:o.select_set(True)
bpy.context.view_layer.objects.active=obs[0]
bpy.ops.export_scene.gltf(filepath=str(O/('cabin-blockout.glb' if BLOCK else 'cabin-authoring.glb')),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_image_format='AUTO')
report={'blender':bpy.app.version_string,'blockout':BLOCK,'master':str(master.relative_to(R)),'editableMeshObjects':len(obs),'collections':list(collections),'footprintMeters':[12,9],'wallThicknessMeters':.28,'floorLevelsMeters':[1.35,4.25],'eaveMeters':5.1,'ridgeMeters':8.5,'chimneyHeightMeters':9.44,'dormerCount':len(DORMERS),'worldPlacement':{'position':[8,0,-3],'rotationYDegrees':-35},'notes':'No interior set; structural floor slabs reserve future interior. Real openings; removable named closed door.'}
(R/'docs/phase-01b'/('blockout-build.json' if BLOCK else 'architecture-build.json')).write_text(json.dumps(report,indent=2)+'\n')
print('ARCHITECTURE_READY',report,flush=True)
