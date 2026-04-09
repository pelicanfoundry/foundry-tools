import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fonts, colors, sizes } from "../theme";

type TextOverlayProps = {
  text: string;
  highlight?: string;
  withVoiceover: boolean;
  position?: "center" | "bottom";
};

export const TextOverlay: React.FC<TextOverlayProps> = ({
  text,
  highlight,
  withVoiceover,
  position = "bottom",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const translateY = interpolate(frame, [0, 0.5 * fps], [20, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const fontSize = withVoiceover ? sizes.body : sizes.bodyLarge;

  const parts = highlight ? text.split(highlight) : [text];

  return (
    <AbsoluteFill
      style={{
        justifyContent: position === "center" ? "center" : "flex-end",
        alignItems: "center",
        padding: position === "center" ? 0 : 80,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          fontSize,
          fontFamily: fonts.sans,
          fontWeight: 600,
          color: colors.textPrimary,
          textAlign: "center",
          maxWidth: 1200,
        }}
      >
        {highlight ? (
          <>
            {parts[0]}
            <span style={{ color: colors.teal }}>{highlight}</span>
            {parts[1]}
          </>
        ) : (
          text
        )}
      </div>
    </AbsoluteFill>
  );
};
