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

// Lineage / insider-chain scene. Frames the lineage timeline screenshot, then
// traces the chain in three beats: the employee, the vendor they created, the
// money trail. Only relationships present in the product are narrated (SoD /
// employee-identity); no fabricated edges.
export const Lineage: React.FC<DemoProps> = ({ withVoiceover }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const zoom = interpolate(frame, [0, 14 * fps], [1, 1.02], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
        <Img
          src={staticFile("screenshots/vendor-lineage.png")}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </AbsoluteFill>

      <Sequence from={Math.round(2 * fps)} durationInFrames={Math.round(3.5 * fps)} premountFor={30}>
        <TextOverlay
          text="Every payment, traced to its source."
          highlight="traced to its source"
          withVoiceover={withVoiceover}
        />
      </Sequence>

      <Sequence from={Math.round(6 * fps)} durationInFrames={Math.round(3.5 * fps)} premountFor={30}>
        <TextOverlay
          text="Bill, payments, and the bank clearing — one chain."
          highlight="one chain"
          withVoiceover={withVoiceover}
        />
      </Sequence>

      <Sequence from={Math.round(10 * fps)} durationInFrames={Math.round(4 * fps)} premountFor={30}>
        <TextOverlay
          text="A complete chain of custody for your money."
          highlight="chain of custody"
          withVoiceover={withVoiceover}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
