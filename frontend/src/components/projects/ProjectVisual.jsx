import { useId } from "react";

/**
 * Abstract, code-generated artwork for each project. These are
 * illustrations of each project's domain, not screenshots of the
 * software; real screenshots go in the case-study gallery.
 */

const ACCENTS = {
  cyan: ["#22d3ee", "#4f8cff"],
  violet: ["#8b5cf6", "#22d3ee"],
  electric: ["#4f8cff", "#8b5cf6"],
};

function TerrainArt({ c1, c2, uid }) {
  // Stacked ridge lines built from a few sine waves read like a terrain cross-section.
  const ridges = Array.from({ length: 11 }, (_, i) => {
    const pts = [];
    for (let x = 0; x <= 400; x += 8) {
      const y =
        70 +
        i * 14 -
        Math.sin(x / 38 + i * 0.6) * (18 - i) -
        Math.sin(x / 15 + i) * 4 -
        Math.max(0, 46 - Math.abs(x - 230) * 0.45) * (1 - i / 12);
      pts.push(`${x},${y.toFixed(1)}`);
    }
    return pts.join(" ");
  });
  const hotspots = [
    [228, 64, c1],
    [150, 104, c2],
    [300, 96, c1],
  ];
  return (
    <>
      {ridges.map((points, i) => (
        <polyline
          key={i}
          points={points}
          fill="none"
          stroke={`url(#${uid}-line)`}
          strokeOpacity={0.25 + (i / ridges.length) * 0.6}
          strokeWidth={i === 0 ? 1.6 : 1}
        />
      ))}
      {hotspots.map(([x, y, color], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="18" fill={color} opacity="0.12" />
          <circle cx={x} cy={y} r="9" fill="none" stroke={color} strokeOpacity="0.6" />
          <circle cx={x} cy={y} r="3" fill={color} />
        </g>
      ))}
      <g fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#9aa7c2">
        <text x="16" y="222">
          DEM · SLOPE · ASPECT
        </text>
        <text x="300" y="222">
          ML LAYER
        </text>
      </g>
    </>
  );
}

function AgentArt({ c1, c2 }) {
  const cx = 200;
  const cy = 112;
  const nodes = [
    { x: 76, y: 52, label: "API" },
    { x: 330, y: 50, label: "DATA" },
    { x: 60, y: 168, label: "SCHED" },
    { x: 340, y: 170, label: "REPORT" },
    { x: 200, y: 206, label: "REVIEW" },
  ];
  return (
    <>
      {nodes.map((n, i) => (
        <line
          key={`l${i}`}
          x1={cx}
          y1={cy}
          x2={n.x}
          y2={n.y}
          stroke={i % 2 ? c2 : c1}
          strokeOpacity="0.55"
          strokeDasharray="4 6"
          className="animate-dash"
        />
      ))}
      <circle cx={cx} cy={cy} r="54" fill="none" stroke={c1} strokeOpacity="0.15" />
      <circle cx={cx} cy={cy} r="36" fill="none" stroke={c2} strokeOpacity="0.25" />
      <circle cx={cx} cy={cy} r="24" fill="#0b1222" stroke={c1} strokeOpacity="0.8" />
      <text x={cx} y={cy + 3.5} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#e6ecf8">
        LLM
      </text>
      {nodes.map((n, i) => (
        <g key={`n${i}`}>
          <rect
            x={n.x - 26}
            y={n.y - 11}
            width="52"
            height="22"
            rx="6"
            fill="#0b1222"
            stroke={i % 2 ? c2 : c1}
            strokeOpacity="0.5"
          />
          <text
            x={n.x}
            y={n.y + 3}
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
            fontSize="8"
            fill="#c7d3ee"
          >
            {n.label}
          </text>
        </g>
      ))}
    </>
  );
}

function PipelineArt({ c1, c2 }) {
  const columns = ["NEW", "CONTACTED", "TEST DRIVE", "FOLLOW-UP"];
  const cards = [3, 2, 2, 1];
  return (
    <>
      {columns.map((label, i) => {
        const x = 22 + i * 92;
        return (
          <g key={label}>
            <rect x={x} y="28" width="80" height="176" rx="8" fill="#0a1020" stroke="#94afff" strokeOpacity="0.12" />
            <text x={x + 10} y="46" fontFamily="JetBrains Mono, monospace" fontSize="7.5" fill="#9aa7c2">
              {label}
            </text>
            {Array.from({ length: cards[i] }, (_, j) => (
              <g key={j}>
                <rect
                  x={x + 8}
                  y={58 + j * 44}
                  width="64"
                  height="36"
                  rx="5"
                  fill="#101a33"
                  stroke={j === 0 ? (i % 2 ? c2 : c1) : "#94afff"}
                  strokeOpacity={j === 0 ? 0.6 : 0.15}
                />
                <rect x={x + 15} y={67 + j * 44} width="34" height="4" rx="2" fill="#c7d3ee" opacity="0.6" />
                <rect x={x + 15} y={77 + j * 44} width="48" height="3" rx="1.5" fill="#9aa7c2" opacity="0.35" />
                <rect x={x + 15} y={84 + j * 44} width="26" height="3" rx="1.5" fill="#9aa7c2" opacity="0.35" />
              </g>
            ))}
          </g>
        );
      })}
      <path
        d="M102 76 H112 M194 76 H204 M286 76 H296"
        stroke={c1}
        strokeWidth="1.5"
        strokeDasharray="3 4"
        className="animate-dash"
      />
    </>
  );
}

export default function ProjectVisual({ project, className = "" }) {
  const uid = useId().replace(/:/g, "");
  const [c1, c2] = ACCENTS[project.accent] ?? ACCENTS.electric;
  const slug = project.slug;

  let Art = AgentArt;
  if (slug.includes("avalanche")) Art = TerrainArt;
  else if (slug.includes("car")) Art = PipelineArt;

  return (
    <svg
      viewBox="0 0 400 240"
      className={`h-full w-full ${className}`}
      role="img"
      aria-label={`Illustration for ${project.title}`}
    >
      <defs>
        <linearGradient id={`${uid}-line`} x1="0" x2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
        <radialGradient id={`${uid}-bg`} cx="0.5" cy="0.35" r="0.8">
          <stop offset="0" stopColor={c1} stopOpacity="0.16" />
          <stop offset="1" stopColor="#04060d" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${uid}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#94afff" strokeOpacity="0.06" />
        </pattern>
      </defs>
      <rect width="400" height="240" fill="#070b17" />
      <rect width="400" height="240" fill={`url(#${uid}-grid)`} />
      <rect width="400" height="240" fill={`url(#${uid}-bg)`} />
      <Art c1={c1} c2={c2} uid={uid} />
    </svg>
  );
}
