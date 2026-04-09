import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fonts } from "../theme";

type FoundryLogoProps = {
  scale?: number;
};

export const FoundryLogo: React.FC<FoundryLogoProps> = ({ scale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const springVal = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const opacity = interpolate(springVal, [0, 1], [0, 1]);
  const scaleAnim = interpolate(springVal, [0, 1], [0.8, 1]);

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scaleAnim * scale})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span
        style={{
          fontFamily: fonts.sans,
          fontWeight: 900,
          fontSize: 80 * scale,
          letterSpacing: "0.18em",
          background: "linear-gradient(135deg, #f97316, #eab308)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        FOUNDRY
      </span>
      <span
        style={{
          fontFamily: fonts.sans,
          fontWeight: 400,
          fontSize: 18 * scale,
          color: "#8b949e",
          letterSpacing: "0.1em",
        }}
      >
        by Pelican Foundry
      </span>
    </div>
  );
};
