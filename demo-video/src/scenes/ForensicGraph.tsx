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

export const ForensicGraph: React.FC<DemoProps> = ({ withVoiceover }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slow zoom + pan toward the node cluster
  const zoom = interpolate(frame, [0, 15 * fps], [1, 1.1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const panX = interpolate(frame, [Math.round(2 * fps), Math.round(12 * fps)], [0, -50], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const panY = interpolate(frame, [Math.round(2 * fps), Math.round(12 * fps)], [0, -20], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AbsoluteFill
        style={{
          transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={staticFile("screenshots/graph.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      <Sequence from={Math.round(11 * fps)} durationInFrames={Math.round(4 * fps)} premountFor={30}>
        <TextOverlay
          text="See connections your spreadsheet can't."
          withVoiceover={withVoiceover}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
