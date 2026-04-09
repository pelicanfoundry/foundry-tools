import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors } from "../theme";
import { TextOverlay } from "../components/TextOverlay";
import type { DemoProps } from "../types";

export const AlertInvestigation: React.FC<DemoProps> = ({ withVoiceover }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const zoom = interpolate(frame, [0, 17 * fps], [1, 1.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
        <Img
          src={staticFile("screenshots/alert-detail.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      <Sequence from={Math.round(14 * fps)} durationInFrames={Math.round(3 * fps)} premountFor={30}>
        <TextOverlay
          text="Plain English. AI-Powered. Actionable."
          withVoiceover={withVoiceover}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
