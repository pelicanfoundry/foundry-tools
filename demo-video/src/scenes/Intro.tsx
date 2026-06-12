import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors } from "../theme";
import { BrandLogo } from "../components/BrandLogo";

// Branded cold open — the login-screen logo (pelican mark + Cinzel wordmark)
// springs in and holds, then the TransitionSeries fade dissolves into the hook.
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: { damping: 200 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const scale = interpolate(s, [0, 1], [0.88, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ opacity, transform: `scale(${scale})` }}>
        <BrandLogo />
      </div>
    </AbsoluteFill>
  );
};
