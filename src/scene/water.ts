import * as THREE from "three";
import { Water } from "../vendor/Water.js";
// Planar camera/oblique clipping: Three.js Water, MIT. Shading below is original.
export function createLake(sun: THREE.Vector3, size: number) {
  const water = new Water(new THREE.PlaneGeometry(1100, 1100, 180, 180), {
    textureWidth: size,
    textureHeight: size,
    sunDirection: sun,
    waterColor: 0x244c43,
    distortionScale: 0.4,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(-130, 0.015, -5);
  const mat = water.material as THREE.ShaderMaterial;
  mat.transparent = true;
  mat.depthWrite = false;
  mat.vertexShader = `
 uniform mat4 textureMatrix; uniform float time;
 varying vec4 mirrorCoord; varying vec3 wp;
 #include <common>
 #include <logdepthbuf_pars_vertex>
 void main(){
 vec4 world=modelMatrix*vec4(position,1.);
 float wave=sin(world.x*.71+world.z*.23+time*.8)*.008+sin(world.z*1.31-world.x*.42-time*.71)*.005;
 world.y+=wave; wp=world.xyz;mirrorCoord=textureMatrix*world;
 vec4 mvPosition=viewMatrix*world;gl_Position=projectionMatrix*mvPosition;
 #include <logdepthbuf_vertex>
 }`;
  mat.fragmentShader = `
 uniform sampler2D mirrorSampler;uniform float time;uniform vec3 eye;uniform vec3 sunDirection;
 varying vec4 mirrorCoord;varying vec3 wp;
 #include <common>
 #include <logdepthbuf_pars_fragment>
 float sx(float z){return -8.+7.5*sin(z*.029)+1.4*sin(z*.081);}
 void main(){
 #include <logdepthbuf_fragment>
 float d=max(max(wp.x-sx(wp.z),-245.+26.*sin(wp.z*.013)-wp.x),abs(wp.z+10.)-130.+.0006*pow(wp.x+100.,2.));
 if(d>7.)discard;
 float bed=-4.1+4.72*smoothstep(-10.,7.,d);
 float depth=max(.0,wp.y-bed);
 if(depth<.002)discard;
 vec2 p=wp.xz;
 vec2 slope=vec2(cos(dot(p,vec2(.71,.23))+time*.8)*.018,cos(dot(p,vec2(-.42,1.31))-time*.71)*.018);
 for(int i=0;i<4;i++){
 float f=pow(2.1,float(i));float a=.015/(1.+float(i)*.6);
 slope+=vec2(sin(p.x*f*2.7+p.y*f*.41-time*.31),cos(p.y*f*3.1+p.x*f*.7+time*.21))*a;
 }
 vec3 n=normalize(vec3(slope.x,1.,slope.y));vec3 view=normalize(eye-wp.xyz);
 float fresnel=.0204+.9796*pow(1.-max(dot(n,view),0.),5.);
 vec2 uv=mirrorCoord.xy/mirrorCoord.w+slope*(.012+1.2/max(length(eye-wp),1.));
 vec3 reflection=texture2D(mirrorSampler,uv).rgb;
 float absorption=1.-exp(-depth*.85);
 vec3 body=mix(vec3(.12,.20,.12),vec3(.025,.105,.091),smoothstep(.0,3.,depth));
 float alpha=clamp(fresnel+(1.-fresnel)*absorption,.06,1.);
 vec3 col=(reflection*fresnel+body*(1.-fresnel)*absorption)/alpha;
 vec3 h=normalize(view+sunDirection);float glint=pow(max(dot(n,h),0.),700.);
 col+=vec3(1.,.87,.65)*glint*.7;
 gl_FragColor=vec4(col,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;
  mat.needsUpdate = true;
  water.renderOrder = 2;
  return water;
}
