import {
  AbsoluteFill,
  Img,
  staticFile,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors } from "../theme";

// Branded cold open: the Foundry logo springs up on the dark background and
// holds, then the TransitionSeries fade dissolves into the problem hook.
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: { damping: 200 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const scale = interpolate(s, [0, 1], [0.86, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Img
        src={staticFile("foundry-logo.png")}
        style={{
          width: 720,
          height: "auto",
          opacity,
          transform: `scale(${scale})`,
          filter: "drop-shadow(0 0 50px rgba(230,110,0,0.30))",
        }}
      />
    </AbsoluteFill>
  );
};
