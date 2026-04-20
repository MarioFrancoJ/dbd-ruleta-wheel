import { useMemo } from "react";

const FALLBACK_COLORS = [
  "#b91c1c",
  "#1f2937",
  "#7c3aed",
  "#0f766e",
  "#1d4ed8",
  "#92400e",
  "#be123c",
  "#065f46",
];

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function getMidPoint(cx, cy, r, startAngle, endAngle, radiusFactor) {
  const mid = (startAngle + endAngle) / 2;
  return polarToCartesian(cx, cy, r * radiusFactor, mid);
}

function truncateText(text, maxLength = 14) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 2)}..`;
}

export default function SpinWheel({ options, rotation, spinDuration, colors = [] }) {
  const palette = colors.length ? colors : FALLBACK_COLORS;

  const segments = useMemo(() => {
    if (!options.length) return [];
    const anglePerSegment = 360 / options.length;

    return options.map((option, index) => {
      const startAngle = index * anglePerSegment;
      const endAngle = startAngle + anglePerSegment;
      const hasImage = typeof option === "object" && Boolean(option.image);
      const label = typeof option === "object" ? (option.label || "") : String(option);
      const imageSrc = hasImage ? option.image : null;

      // Con imagen: texto centrado en el segmento
      const imgPos = null;
      const txtPos = getMidPoint(200, 200, 180, startAngle, endAngle, 0.62);
      const rotate = (startAngle + endAngle) / 2 + 90;

      return {
        index,
        label,
        imageSrc,
        hasImage,
        color: palette[index % palette.length],
        path: describeArcPath(200, 200, 180, startAngle, endAngle),
        txtX: txtPos.x,
        txtY: txtPos.y,
        imgX: imgPos?.x,
        imgY: imgPos?.y,
        rotate,
      };
    });
  }, [options, palette]);

  // Tamaño de imagen según cantidad de segmentos
  const imgSize = options.length <= 12 ? 36 : options.length <= 24 ? 26 : 20;

  return (
    <div className="spin-wheel-wrapper">
      <div className="spin-wheel-pointer" />
      <div
        className="spin-wheel"
        style={{
          transform: `rotate(${rotation}deg)`,
          transitionDuration: `${spinDuration}s`,
        }}
      >
        <svg
          viewBox="0 0 400 400"
          className="spin-wheel-svg"
          focusable="false"
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
        >
          <circle cx="200" cy="200" r="190" fill="#000000" stroke="#e5e7eb" strokeWidth="6" />

          {segments.map((seg) => (
            <g key={seg.index}>
              {/* Segmento */}
              <path d={seg.path} fill={seg.color} stroke="#111827" strokeWidth="2" />

              {/* Texto */}
              <text
                x={seg.txtX}
                y={seg.txtY}
                fill="#ffffff"
                fontSize={options.length > 30 ? "9" : "11"}
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${seg.rotate} ${seg.txtX} ${seg.txtY})`}
                style={{ pointerEvents: "none" }}
              >
                {truncateText(seg.label)}
              </text>
            </g>
          ))}

          <circle cx="200" cy="200" r="38" fill="#111827" stroke="#f9fafb" strokeWidth="4" />
        </svg>
      </div>
    </div>
  );
}
