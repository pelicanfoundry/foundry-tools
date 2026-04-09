import { linearTiming } from "@remotion/transitions";

export const TRANSITION_DURATION = 10;

export const fadeTransitionTiming = () =>
  linearTiming({ durationInFrames: TRANSITION_DURATION });
