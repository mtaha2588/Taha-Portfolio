// Holographic globe surface: dark body, fine lat/long grid, fresnel rim,
// a slow scanning band and a bottom-to-top "materialise" sweep (uReveal).
uniform float uTime;
uniform float uReveal;
uniform vec3 uBody;
uniform vec3 uGrid;
uniform vec3 uRim;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vObj;

#define PI 3.14159265

float gridLine(float v, float count) {
  float x = v * count;
  float w = fwidth(x);
  return 1.0 - smoothstep(0.0, w * 1.4, abs(fract(x - 0.5) - 0.5));
}

void main() {
  vec3 n = normalize(vNormal);
  float fres = pow(1.0 - max(dot(n, normalize(vViewDir)), 0.0), 2.6);

  float lat = asin(clamp(vObj.y, -1.0, 1.0)) / PI + 0.5;
  float lon = atan(vObj.z, vObj.x) / (2.0 * PI) + 0.5;
  float grid = max(gridLine(lat, 24.0), gridLine(lon, 48.0));

  // Reveal sweep from the south pole upwards, with a bright leading edge.
  float h = vObj.y * 0.5 + 0.5;
  float edge = uReveal * 1.25 - 0.1;
  float revealed = smoothstep(edge, edge - 0.1, h);
  float edgeGlow = exp(-pow((h - edge) * 26.0, 2.0)) * (1.0 - step(0.999, uReveal));

  // Scanning band travelling up and down the globe.
  float scanY = sin(uTime * 0.35) * 0.85;
  float scan = exp(-pow((vObj.y - scanY) * 16.0, 2.0));

  vec3 col = uBody * mix(0.15, 1.0, revealed);
  col += uGrid * grid * 0.12 * revealed;
  col += uRim * fres * 0.65 * revealed;
  col += uRim * scan * 0.16 * revealed;
  col += vec3(0.55, 0.9, 1.0) * edgeGlow * 1.4;

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
