import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fonts, colors } from "../theme";

type KPICardProps = {
  label: string;
  targetValue: number;
  formatted: string;
  trend: string | null;
  delay: number;
};

export const KPICard: React.FC<KPICardProps> = ({
  label,
  targetValue,
  formatted,
  trend,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 200 },
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const translateY = interpolate(entrance, [0, 1], [30, 0]);

  const countProgress = interpolate(
    frame,
    [delay, delay + fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const isMonetary = formatted.startsWith("$");
  let displayValue: string;

  if (isMonetary) {
    const numericTarget = targetValue / 1000;
    const current = Math.round(numericTarget * countProgress);
    displayValue = `$${current}K`;
  } else {
    const current = Math.round(targetValue * countProgress);
    displayValue = String(current);
  }

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: "20px 24px",
        flex: 1,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontFamily: fonts.sans,
          fontWeight: 500,
          color: colors.textMuted,
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 36,
          fontFamily: fonts.mono,
          fontWeight: 700,
          color: colors.textPrimary,
        }}
      >
        {displayValue}
      </div>
      {trend && (
        <div
          style={{
            fontSize: 14,
            fontFamily: fonts.sans,
            fontWeight: 500,
            color: colors.teal,
            marginTop: 4,
          }}
        >
          {trend}
        </div>
      )}
    </div>
  );
};
