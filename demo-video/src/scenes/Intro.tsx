import {
  AbsoluteFill,
  Img,
  staticFile,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Cinzel";
import { colors } from "../theme";

const { fontFamily: cinzel } = loadFont("normal", { weights: ["500"] });

// Branded cold open — matches the login screen: the pelican mark above the
// gradient "Foundry" wordmark, on the dark background, springing in and holding
// before the TransitionSeries fade dissolves into the problem hook.
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
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Img
          src={staticFile("pelican-mark.png")}
          style={{
            height: 300,
            width: "auto",
            marginBottom: 36,
            filter:
              "drop-shadow(0 0 18px rgba(255,160,70,0.60)) drop-shadow(0 0 52px rgba(235,110,20,0.40)) drop-shadow(0 0 120px rgba(200,70,0,0.22))",
          }}
        />
        <div
          style={{
            fontFamily: cinzel,
            fontSize: 150,
            fontWeight: 500,
            letterSpacing: "0.22em",
            textIndent: "0.22em",
            textTransform: "uppercase",
            background:
              "linear-gradient(180deg, #ffd9a0 0%, #f0962e 42%, #c85a12 72%, #8a3a08 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter:
              "drop-shadow(0 0 28px rgba(230,110,0,0.40)) drop-shadow(0 2px 4px rgba(0,0,0,0.85))",
            lineHeight: 1,
          }}
        >
          Foundry
        </div>
      </div>
    </AbsoluteFill>
  );
};
