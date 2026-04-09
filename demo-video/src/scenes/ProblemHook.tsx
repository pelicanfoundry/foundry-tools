import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fonts, colors, sizes } from "../theme";
import { FoundryLogo } from "../components/FoundryLogo";
import { problemStats } from "../data/demo-data";
import type { DemoProps } from "../types";

const StatLine: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(
    frame,
    [delay, delay + 0.5 * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const translateY = interpolate(
    frame,
    [delay, delay + 0.5 * fps],
    [15, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        fontSize: sizes.sceneTitle,
        fontFamily: fonts.sans,
        fontWeight: 600,
        color: colors.textPrimary,
        marginBottom: 20,
      }}
    >
      {text}
    </div>
  );
};

export const ProblemHook: React.FC<DemoProps> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Matched to voiceover (13.5s total):
  // VO: "42% of fraud..." — 0-3s
  // VO: "The average loss..." — 3-6s
  // VO: "And it takes a full year..." — 6-8s
  // VO: "Your bookkeeper handles every payment." — 8-10.5s
  // VO: "But what if they're the one stealing?" — 10.5-13.5s
  // Logo: 13.5-15s

  // Phase 1: Stats stay visible 0-8.5s (fade out 8-8.5s)
  const statsEnd = Math.round(8.5 * fps);

  // Phase 2: "Your bookkeeper..." appears at 8s, fades out at 10.5s
  const bookkeeperStart = Math.round(8 * fps);
  const bookkeeperEnd = Math.round(10.5 * fps);

  // Phase 3: 0.5s dark pause (10.5-11s)

  // Phase 4: "What if they're stealing?" at 11s, holds until 13.5s
  const stealingStart = Math.round(11 * fps);
  const stealingEnd = Math.round(13.5 * fps);

  // Phase 5: Logo at 13.5s
  const logoStart = Math.round(13.5 * fps);

  // Stats fade out
  const statsFadeOut = interpolate(
    frame,
    [statsEnd - 0.5 * fps, statsEnd],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // "Your bookkeeper..." fade in/out
  const bookkeeperOpacity = interpolate(
    frame,
    [bookkeeperStart, bookkeeperStart + 0.4 * fps, bookkeeperEnd - 0.4 * fps, bookkeeperEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // "Stealing" — punchy entrance after dark pause
  const stealingOpacity = interpolate(
    frame,
    [stealingStart, stealingStart + 0.15 * fps, stealingEnd - 0.3 * fps, stealingEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const stealingScale = interpolate(
    frame,
    [stealingStart, stealingStart + 0.3 * fps],
    [1.08, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Logo
  const logoOpacity = interpolate(
    frame,
    [logoStart, logoStart + 0.5 * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Stats — appear one by one, timed to voiceover */}
      {frame < statsEnd && (
        <div
          style={{
            opacity: statsFadeOut,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <StatLine text={problemStats[0]} delay={Math.round(0.3 * fps)} />
          <StatLine text={problemStats[1]} delay={Math.round(3 * fps)} />
          <StatLine text={problemStats[2]} delay={Math.round(5.8 * fps)} />
        </div>
      )}

      {/* "Your bookkeeper processes every payment." */}
      {frame >= bookkeeperStart && frame < bookkeeperEnd && (
        <div
          style={{
            opacity: bookkeeperOpacity,
            fontSize: 56,
            fontFamily: fonts.sans,
            fontWeight: 700,
            color: colors.textPrimary,
            textAlign: "center",
          }}
        >
          Your bookkeeper processes every payment.
        </div>
      )}

      {/* Dark pause — 0.5s of nothing */}

      {/* "What if they're stealing?" */}
      {frame >= stealingStart && frame < stealingEnd && (
        <div
          style={{
            opacity: stealingOpacity,
            transform: `scale(${stealingScale})`,
            fontSize: 64,
            fontFamily: fonts.sans,
            fontWeight: 700,
            color: colors.textPrimary,
            textAlign: "center",
          }}
        >
          What if they're{" "}
          <span style={{ color: colors.teal }}>stealing</span>?
        </div>
      )}

      {/* Logo */}
      {frame >= logoStart && (
        <div style={{ opacity: logoOpacity }}>
          <FoundryLogo />
        </div>
      )}
    </AbsoluteFill>
  );
};
