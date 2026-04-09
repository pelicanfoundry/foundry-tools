import { fonts, colors } from "../theme";

type Severity = "critical" | "high" | "medium" | "low";

const severityColors: Record<Severity, string> = {
  critical: colors.critical,
  high: colors.high,
  medium: colors.medium,
  low: colors.low,
};

type SeverityBadgeProps = {
  severity: Severity;
  label?: string;
};

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  label,
}) => {
  const color = severityColors[severity];
  const displayLabel = label ?? severity.charAt(0).toUpperCase() + severity.slice(1);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: 6,
        fontSize: 13,
        fontFamily: fonts.sans,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color,
        backgroundColor: `${color}20`,
        border: `1px solid ${color}40`,
      }}
    >
      {displayLabel}
    </span>
  );
};
