varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vObj;

void main() {
  vObj = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
