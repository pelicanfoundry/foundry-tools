import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fonts, colors } from "../theme";
import { BrandLogo } from "../components/BrandLogo";
import type { DemoProps } from "../types";

export const CTA: React.FC<DemoProps> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoEntrance = spring({ frame, fps, config: { damping: 200 } });
  const logoOpacity = interpolate(logoEntrance, [0, 1], [0, 1]);
  const logoScale = interpolate(logoEntrance, [0, 1], [0.9, 1]);

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
          gap: 28,
        }}
      >
        <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})` }}>
          <BrandLogo scale={0.7} />
        </div>

        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            fontSize: 32,
            fontFamily: fonts.sans,
            fontWeight: 500,
            color: colors.textPrimary,
            textAlign: "center",
            maxWidth: 720,
          }}
        >
          Real-time fraud detection for the people you trust with your money.
        </div>
      </div>
    </AbsoluteFill>
  );
};
