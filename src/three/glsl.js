// Shared GLSL snippets
export const noiseGLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m=m*m;m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
float fbm(vec2 p){
  float f=0.0;float a=0.5;
  for(int i=0;i<5;i++){f+=a*snoise(p);p*=2.02;a*=0.5;}
  return f;
}
`

// Billboarded instanced quad: each instance faces the camera.
// Instance scale is read from the instance matrix.
export const billboardVertex = /* glsl */ `
attribute float aSeed;
varying vec2 vUv;
varying float vSeed;
varying float vDepth;
uniform float uTime;
void main(){
  vUv=uv; vSeed=aSeed;
  vec4 center=modelViewMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0);
  float sx=length(instanceMatrix[0].xyz);
  float sy=length(instanceMatrix[1].xyz);
  float rot=aSeed*6.2831*0.05 + sin(uTime*0.05+aSeed*10.0)*0.05;
  vec2 p=position.xy*vec2(sx,sy);
  p=mat2(cos(rot),-sin(rot),sin(rot),cos(rot))*p;
  center.xy+=p;
  vDepth=-center.z;
  gl_Position=projectionMatrix*center;
}
`

// Vertical gradient sky dome with an optional sun glow.
export const skyVertex = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir=normalize(position);
  vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  gl_Position=p.xyww;
}
`
export const skyFragment = /* glsl */ `
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom;
uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uSunSize; uniform float uSunGlow;
uniform float uTime;
varying vec3 vDir;
${noiseGLSL}
void main(){
  vec3 d=normalize(vDir);
  float h=d.y;
  vec3 col=mix(uHorizon,uTop,smoothstep(0.0,0.55,h));
  col=mix(col,uBottom,smoothstep(0.0,-0.35,h));
  float s=max(dot(d,normalize(uSunDir)),0.0);
  col+=uSunColor*pow(s,8.0)*0.35*uSunGlow;
  col+=uSunColor*pow(s,64.0)*0.8*uSunGlow;
  col+=uSunColor*smoothstep(1.0-uSunSize,1.0-uSunSize*0.6,s)*2.0*uSunGlow;
  // subtle high streaks
  float n=fbm(vec2(atan(d.x,d.z)*2.0,h*6.0)+uTime*0.003);
  col+=uTop*0.06*n*smoothstep(0.05,0.4,h);
  gl_FragColor=vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`
