import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fonts, colors } from "../theme";
import { FoundryLogo } from "../components/FoundryLogo";
import type { DemoProps } from "../types";

export const CTA: React.FC<DemoProps> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const taglineEntrance = spring({
    frame,
    fps,
    delay: Math.round(0.8 * fps),
    config: { damping: 200 },
  });

  const taglineOpacity = interpolate(taglineEntrance, [0, 1], [0, 1]);
  const taglineY = interpolate(taglineEntrance, [0, 1], [20, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        <FoundryLogo scale={1.2} />

        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            fontSize: 28,
            fontFamily: fonts.sans,
            fontWeight: 500,
            color: colors.textPrimary,
            textAlign: "center",
            maxWidth: 600,
            marginTop: 16,
          }}
        >
          Real-time fraud detection for the people you trust with your money.
        </div>
      </div>
    </AbsoluteFill>
  );
};
