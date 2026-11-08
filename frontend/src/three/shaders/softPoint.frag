// Shared soft round particle. Colour picks between uColor and uColorB per point.
uniform vec3 uColor;
uniform vec3 uColorB;
uniform float uOpacity;
varying float vAlpha;
varying float vRand;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.05, d);
  vec3 col = mix(uColor, uColorB, step(0.9, vRand));
  gl_FragColor = vec4(col, a * vAlpha * uOpacity);
  #include <colorspace_fragment>
}
