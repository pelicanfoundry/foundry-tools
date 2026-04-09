import { interpolate, useCurrentFrame } from "remotion";
import { fonts, colors } from "../theme";

type TypedTextProps = {
  text: string;
  startFrame?: number;
  charsPerFrame?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
};

export const TypedText: React.FC<TypedTextProps> = ({
  text,
  startFrame = 0,
  charsPerFrame = 0.5,
  fontSize = 48,
  color = colors.textPrimary,
  fontWeight = 600,
}) => {
  const frame = useCurrentFrame();

  const elapsed = Math.max(0, frame - startFrame);
  const charCount = Math.min(text.length, Math.floor(elapsed * charsPerFrame));
  const displayText = text.slice(0, charCount);

  const cursorOpacity = interpolate(
    frame % 16,
    [0, 8, 16],
    [1, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        fontSize,
        fontFamily: fonts.sans,
        fontWeight,
        color,
      }}
    >
      <span>{displayText}</span>
      {charCount < text.length && (
        <span style={{ opacity: cursorOpacity, color: colors.teal }}>▌</span>
      )}
    </div>
  );
};
