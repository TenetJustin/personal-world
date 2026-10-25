/** Shared first-person capsule clearance and 2.5D safe route planning. Metres. */
import { Vector3 } from 'three/src/math/Vector3.js';
import { Quaternion } from 'three/src/math/Quaternion.js';
import { CABIN, WALK_COLLIDERS, architecturalFloor, cabinToWorld, worldToCabin, interiorCeilingHeight, interiorStairHeight, hasUpperFloor } from './architecture.ts';
import { groundHeight } from './landscape.ts';
export const BODY_RADIUS=.22, BODY_HEIGHT=1.76, MAX_STEP=.235, EYE=1.65;
export type Obstacle={id:string;minX:number;maxX:number;minZ:number;maxZ:number;minY:number;maxY:number};
const obstacles:Obstacle[]=[];
export function resetEnvironmentColliders(){obstacles.length=0;}
export function addEnvironmentCollider(c:Obstacle){obstacles.push(c);}
export function environmentColliderCount(){return obstacles.length;}
const box=(x:number,z:number,r:number,b:{minX:number;maxX:number;minZ:number;maxZ:number})=>Math.hypot(x-Math.max(b.minX,Math.min(b.maxX,x)),z-Math.max(b.minZ,Math.min(b.maxZ,z)))<r;
const wall=(id:string,minX:number,maxX:number,minZ:number,maxZ:number):Obstacle=>({id,minX,maxX,minZ,maxZ,minY:.4,maxY:9});
const shell=[wall('west-wall',-6.15,-5.82,-4.7,4.7),wall('east-wall',5.82,6.15,-4.7,4.7),wall('rear-wall',-6.15,6.15,-4.72,-4.32),wall('front-left',-6.15,.555,4.32,4.70),wall('front-right',1.665,6.15,4.32,4.70),
 wall('porch-west-rail',-8.22,-8.08,4.45,7.12),wall('porch-east-rail',8.08,8.22,4.45,7.12),wall('porch-front-left',-8.17,.12,6.96,7.10),wall('porch-front-right',2.20,8.17,6.96,7.10)];
export function floorAt(x:number,z:number,foot:number){const p=worldToCabin([x,0,z]);return architecturalFloor(p[0],p[2],foot)??groundHeight(x,z);}
export function clearance(x:number,z:number,foot:number,door=1):string|null{
 if(x< -16||x>64||z< -44||z>70)return 'world-boundary';
 const p=worldToCabin([x,foot,z]),lx=p[0],lz=p[2];
 for(const b of shell)if(box(lx,lz,BODY_RADIUS,b))return b.id;
 if(Math.abs(lx)<5.82&&Math.abs(lz)<4.32){
  if(foot<CABIN.floorY-.24)return 'foundation';
  if(interiorCeilingHeight(lx,lz,foot)<foot+BODY_HEIGHT)return 'headroom';
 }
 for(const b of WALK_COLLIDERS)if(foot<b.maxY-.035&&foot+BODY_HEIGHT>b.minY+.035&&box(lx,lz,BODY_RADIUS,b))return b.id;
 // Rotated real door leaf about the authored hinge. Windows remain solid walls.
 if(foot<CABIN.door.topY&&foot+BODY_HEIGHT>CABIN.door.bottomY){
  const a=door*CABIN.door.swingRadians,dx=lx-.55,dz=lz-4.5;
  const ux=Math.cos(a)*dx-Math.sin(a)*dz,uz=Math.sin(a)*dx+Math.cos(a)*dz;
  if(box(ux,uz,BODY_RADIUS,{minX:0,maxX:1.12,minZ:-.045,maxZ:.045}))return 'door';
 }
 for(const b of obstacles)if(foot<b.maxY-.03&&foot+BODY_HEIGHT>b.minY+.03&&box(x,z,BODY_RADIUS,b))return b.id;
 if(architecturalFloor(lx,lz,foot)===null){
  if(groundHeight(x,z)<.075)return 'shore-water';
  const dx=(groundHeight(x+.15,z)-groundHeight(x-.15,z))/.3,dz=(groundHeight(x,z+.15)-groundHeight(x,z-.15))/.3;
  if(Math.hypot(dx,dz)>Math.tan(38*Math.PI/180))return 'slope';
 }
 return null;
}
export function canStep(from:Vector3,to:Vector3,door=1){
 const n=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.035));let foot=from.y-EYE;
 for(let i=1;i<=n;i++){const f=i/n,x=from.x+(to.x-from.x)*f,z=from.z+(to.z-from.z)*f,next=floorAt(x,z,foot);if(next-foot>MAX_STEP||foot-next>.28||clearance(x,z,next,door))return false;foot=next;}
 return Math.abs(foot-(to.y-EYE))<.26;
}
export class Walker{
 velocity=new Vector3();vertical=0;lastCollision='';forward=0;strafe=0;sprint=false;
 clear(){this.forward=this.strafe=0;this.sprint=false;this.velocity.set(0,0,0);this.vertical=0;}
 input(forward:number,strafe:number,sprint=false){const l=Math.max(1,Math.hypot(forward,strafe));this.forward=forward/l;this.strafe=strafe/l;this.sprint=sprint;}
 update(position:Vector3,rotation:Quaternion,dt:number,door:number){
  const forward=new Vector3(0,0,-1).applyQuaternion(rotation);forward.y=0;forward.normalize();
  const right=new Vector3(-forward.z,0,forward.x),speed=this.sprint?3.2:1.65;
  const desired=forward.multiplyScalar(this.forward).addScaledVector(right,this.strafe).multiplyScalar(speed);
  this.velocity.lerp(desired,1-Math.exp(-dt*(desired.lengthSq()>0?9:12)));
  if(this.velocity.lengthSq()<1e-7)this.velocity.set(0,0,0);
  const count=Math.max(1,Math.ceil(this.velocity.length()*dt/.035)),s=dt/count;
  this.lastCollision='';
  for(let i=0;i<count;i++){
   for(const axis of ['x','z'] as const){
    const next=position[axis]+this.velocity[axis]*s,x=axis==='x'?next:position.x,z=axis==='z'?next:position.z;
    const foot=position.y-EYE,h=floorAt(x,z,foot),reason=h-foot>MAX_STEP?'step-height':clearance(x,z,Math.max(foot,h),door);
    if(!reason){position[axis]=next;if(h>foot-.25){position.y=h+EYE;this.vertical=0;}}
    else this.lastCollision=reason;
   }
   const foot=position.y-EYE,h=floorAt(position.x,position.z,foot);
   if(foot>h+.005){this.vertical-=9.81*s;position.y=Math.max(h+EYE,position.y+this.vertical*s);if(position.y<=h+EYE+.001)this.vertical=0;}
  }
 }
}
type Node={i:number;j:number;layer:number;x:number;z:number;y:number;key:string;g:number;f:number;parent?:Node};
class Heap{items:Node[]=[];push(n:Node){let i=this.items.push(n)-1;while(i){const p=(i-1)>>1;if(this.items[p].f<=n.f)break;this.items[i]=this.items[p];i=p;}this.items[i]=n;}pop(){const top=this.items[0],last=this.items.pop()!;if(this.items.length){let i=0;while(i*2+1<this.items.length){let c=i*2+1;if(c+1<this.items.length&&this.items[c+1].f<this.items[c].f)c++;if(this.items[c].f>=last.f)break;this.items[i]=this.items[c];i=c;}this.items[i]=last;}return top;}}
/** Both floors coexist in the graph. Only real stair treads connect the layers. */
export function planSafePath(start:Vector3,target:Vector3):Vector3[]|null{
 if(canStep(start,target))return [target.clone()];
 const a=worldToCabin(start.toArray()),b=worldToCabin(target.toArray()),grid=.25;
 const surface=(i:number,j:number,layer:number)=>{
  const x=i*grid,z=j*grid,stair=interiorStairHeight(x,z);let y:number;
  if(stair!==null)y=stair;
  else if(layer===1){if(!hasUpperFloor(x,z))return null;y=4.25;}
  else {const w=cabinToWorld([x,0,z]);y=architecturalFloor(x,z,1.37)??groundHeight(w[0],w[2]);}
  const w=cabinToWorld([x,y+EYE,z]);return clearance(w[0],w[2],y)?null:{x:w[0],z:w[2],y:y+EYE};
 };
 const endpoint=(p:Vector3,local:number[])=>{
  const candidates:Node[]=[];
  for(let r=0;r<=3;r++)for(let di=-r;di<=r;di++)for(let dj=-r;dj<=r;dj++)for(let layer=0;layer<2;layer++){
   const i=Math.round(local[0]/grid)+di,j=Math.round(local[2]/grid)+dj,s=surface(i,j,layer);if(!s||Math.abs(s.y-p.y)>.27)continue;
   const v=new Vector3(s.x,s.y,s.z);if(!canStep(p,v))continue;
   candidates.push({i,j,layer,...s,key:`${i},${j},${layer}`,g:0,f:v.distanceTo(p)});
  }
  return candidates.sort((x,y)=>x.f-y.f)[0];
 };
 const first=endpoint(start,a),end=endpoint(target,b);if(!first||!end)return null;
 const open=new Heap(),best=new Map<string,number>();first.f=Math.hypot(first.x-end.x,first.z-end.z,first.y-end.y);open.push(first);best.set(first.key,0);
 let expanded=0;
 while(open.items.length&&expanded++<45000){const cur=open.pop();if(cur.g>(best.get(cur.key)??Infinity)+1e-6)continue;
  if(cur.key===end.key){const result:Vector3[]=[target.clone()];let c:Node|undefined=cur;while(c){result.push(new Vector3(c.x,c.y,c.z));c=c.parent;}result.reverse();
   // Remove only segments independently proven clear on the same collision surfaces.
   const simple:Vector3[]=[];let prev=start,index=0;while(index<result.length){let far=index;for(let k=index+1;k<Math.min(result.length,index+35);k++){if(canStep(prev,result[k]))far=k;else break;}simple.push(result[far]);prev=result[far];index=far+1;}return simple;
  }
  for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++)for(const layer of [cur.layer,1-cur.layer]){
   if(!di&&!dj&&layer===cur.layer)continue;
   const i=cur.i+di,j=cur.j+dj,s=surface(i,j,layer);if(!s||Math.abs(s.y-cur.y)>MAX_STEP)continue;
   if(layer!==cur.layer&&Math.abs(cur.y-EYE-4.25)>.24&&Math.abs(cur.y-EYE-1.37)>.24)continue;
   const g=cur.g+Math.hypot(s.x-cur.x,s.z-cur.z,s.y-cur.y)+(layer!==cur.layer?.02:0),key=`${i},${j},${layer}`;
   if(g>=(best.get(key)??Infinity)||!canStep(new Vector3(cur.x,cur.y,cur.z),new Vector3(s.x,s.y,s.z)))continue;
   best.set(key,g);open.push({i,j,layer,...s,key,g,f:g+Math.hypot(s.x-end.x,s.z-end.z,s.y-end.y),parent:cur});
  }
 }
 return null;
}
