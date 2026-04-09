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

  const pricingEntrance = spring({
    frame,
    fps,
    delay: Math.round(1.6 * fps),
    config: { damping: 200 },
  });

  const pricingOpacity = interpolate(pricingEntrance, [0, 1], [0, 1]);
  const pricingY = interpolate(pricingEntrance, [0, 1], [15, 0]);

  const urlEntrance = spring({
    frame,
    fps,
    delay: Math.round(2.4 * fps),
    config: { damping: 200 },
  });

  const urlOpacity = interpolate(urlEntrance, [0, 1], [0, 1]);

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
          Real-time fraud detection for your business
        </div>

        <div
          style={{
            opacity: urlOpacity,
            fontSize: 22,
            fontFamily: fonts.mono,
            fontWeight: 500,
            color: colors.teal,
            marginTop: 8,
          }}
        >
          foundry.pelicanfoundry.com
        </div>
      </div>
    </AbsoluteFill>
  );
};
