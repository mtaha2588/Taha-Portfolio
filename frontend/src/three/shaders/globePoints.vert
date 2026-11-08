uniform float uTime;
uniform float uReveal;
uniform float uSize;
uniform float uPixelRatio;
attribute float aRand;
varying float vAlpha;
varying float vRand;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;

  float h = normalize(position).y * 0.5 + 0.5;
  float edge = uReveal * 1.25 - 0.1;
  float revealed = smoothstep(edge, edge - 0.1, h);
  float twinkle = 0.7 + 0.3 * sin(uTime * (0.6 + aRand * 1.8) + aRand * 40.0);

  vAlpha = revealed * twinkle;
  vRand = aRand;
  gl_PointSize = uSize * uPixelRatio * (0.75 + aRand * 0.5) * (16.0 / -mv.z);
}
