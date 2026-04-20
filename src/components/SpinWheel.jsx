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

function getTextPosition(cx, cy, r, startAngle, endAngle) {
  const middleAngle = (startAngle + endAngle) / 2;
  const textRadius = r * 0.62;
  return polarToCartesian(cx, cy, textRadius, middleAngle);
}

function truncateText(text, maxLength = 18) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

export default function SpinWheel({ options, rotation, spinDuration, colors = [] }) {
  const palette = colors.length ? colors : FALLBACK_COLORS;

  const segments = useMemo(() => {
    if (!options.length) return [];

    const anglePerSegment = 360 / options.length;

    return options.map((option, index) => {
      const startAngle = index * anglePerSegment;
      const endAngle = startAngle + anglePerSegment;
      const textPosition = getTextPosition(200, 200, 180, startAngle, endAngle);

      return {
        option,
        color: palette[index % palette.length],
        path: describeArcPath(200, 200, 180, startAngle, endAngle),
        textX: textPosition.x,
        textY: textPosition.y,
        textRotate: (startAngle + endAngle) / 2 + 90,
      };
    });
  }, [options, palette]);

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
        <svg viewBox="0 0 400 400" className="spin-wheel-svg">
          <circle cx="200" cy="200" r="190" fill="#0b1220" stroke="#e5e7eb" strokeWidth="6" />

          {segments.map((segment, index) => (
            <g key={`${segment.option}-${index}`}>
              <path d={segment.path} fill={segment.color} stroke="#111827" strokeWidth="2" />
              <text
                x={segment.textX}
                y={segment.textY}
                fill="#ffffff"
                fontSize="12"
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${segment.textRotate} ${segment.textX} ${segment.textY})`}
              >
                {truncateText(segment.option.label || segment.option)}

                <text
  x={segment.textX}
  y={segment.textY}
  fill="#ffffff"
  fontSize="12"
  fontWeight="700"
  textAnchor="middle"
  dominantBaseline="middle"
  transform={`rotate(${segment.textRotate} ${segment.textX} ${segment.textY})`}
>
  {truncateText(segment.option.label || segment.option)}
</text>
              </text>
            </g>
          ))}

          <circle cx="200" cy="200" r="38" fill="#111827" stroke="#f9fafb" strokeWidth="4" />
          
        </svg>
      </div>
    </div>
  );
}

