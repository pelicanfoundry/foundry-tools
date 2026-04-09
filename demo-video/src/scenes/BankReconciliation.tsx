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

export const BankReconciliation: React.FC<DemoProps> = ({ withVoiceover }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const zoom = interpolate(frame, [0, 12 * fps], [1, 1.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
        <Img
          src={staticFile("screenshots/reconciliation.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      <Sequence from={Math.round(9 * fps)} durationInFrames={Math.round(3.5 * fps)} premountFor={30}>
        <TextOverlay
          text="If it's not in the bank, where did it go?"
          highlight="where did it go?"
          withVoiceover={withVoiceover}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
