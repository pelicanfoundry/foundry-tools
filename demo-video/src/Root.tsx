import { Composition } from "remotion";
import { FoundryDemo } from "./FoundryDemo";
import type { DemoProps } from "./types";
import "./index.css";

const DURATION = 2925;

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="FoundryDemo"
        component={FoundryDemo}
        durationInFrames={DURATION}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ withVoiceover: false } satisfies DemoProps}
      />
      <Composition
        id="FoundryDemoWithVoiceover"
        component={FoundryDemo}
        durationInFrames={DURATION}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ withVoiceover: true } satisfies DemoProps}
      />
    </>
  );
};
