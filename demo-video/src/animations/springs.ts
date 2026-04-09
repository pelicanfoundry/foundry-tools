import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export const springConfigs = {
  smooth: { damping: 200 },
  snappy: { damping: 20, stiffness: 200 },
  gentle: { damping: 12, mass: 0.5 },
} as const;

export function useSpring(
  delay: number = 0,
  config: { damping?: number; stiffness?: number; mass?: number } = springConfigs.smooth
) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return spring({
    frame,
    fps,
    delay,
    config,
  });
}
