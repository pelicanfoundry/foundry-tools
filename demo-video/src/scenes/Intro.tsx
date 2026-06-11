import { AbsoluteFill } from "remotion";
import { colors } from "../theme";
import { FoundryLogo } from "../components/FoundryLogo";

// Branded cold open: the logo springs up on the dark background and holds,
// then the TransitionSeries fade dissolves into the problem hook. Gives the
// video a breath before the stats instead of jumping straight in.
export const Intro: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <FoundryLogo />
    </AbsoluteFill>
  );
};
