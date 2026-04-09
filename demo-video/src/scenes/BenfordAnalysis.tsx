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

export const BenfordAnalysis: React.FC<DemoProps> = ({ withVoiceover }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Show overview first, then crossfade to vendor detail at ~7s
  // VO: "...applies a statistical law to your transaction data" (0-5s) — overview
  // VO: "If the leading digits don't follow..." (5-10s) — detail with digit bars
  // VO: "Foundry flags the vendors..." (10-13.8s) — still detail
  const switchFrame = Math.round(6 * fps);

  const overviewOpacity = interpolate(
    frame,
    [switchFrame - 0.5 * fps, switchFrame + 0.5 * fps],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const detailOpacity = interpolate(
    frame,
    [switchFrame - 0.5 * fps, switchFrame + 0.5 * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Subtle zoom on overview
  const overviewZoom = interpolate(frame, [0, 6 * fps], [1, 1.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle zoom on detail
  const detailZoom = interpolate(frame, [switchFrame, 14 * fps], [1, 1.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      {/* Overview screenshot */}
      <AbsoluteFill style={{ opacity: overviewOpacity, transform: `scale(${overviewZoom})`, transformOrigin: "center center" }}>
        <Img
          src={staticFile("screenshots/benford.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      {/* Detail screenshot — expanded vendor with digit analysis */}
      <AbsoluteFill style={{ opacity: detailOpacity, transform: `scale(${detailZoom})`, transformOrigin: "center center" }}>
        <Img
          src={staticFile("screenshots/benford-detail.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      <Sequence from={Math.round(11 * fps)} durationInFrames={Math.round(3 * fps)} premountFor={30}>
        <TextOverlay
          text="Math doesn't lie."
          withVoiceover={withVoiceover}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
