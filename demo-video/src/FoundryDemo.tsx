import React from "react";
import { AbsoluteFill, interpolate, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Audio } from "@remotion/media";
import type { DemoProps } from "./types";
import { colors, fonts } from "./theme";
import { Intro } from "./scenes/Intro";
import { ProblemHook } from "./scenes/ProblemHook";
import { DashboardOverview } from "./scenes/DashboardOverview";
import { AlertInvestigation } from "./scenes/AlertInvestigation";
import { Lineage } from "./scenes/Lineage";
import { BenfordAnalysis } from "./scenes/BenfordAnalysis";
import { BankReconciliation } from "./scenes/BankReconciliation";
import { CTA } from "./scenes/CTA";

const FADE_DURATION = 10;

// Scene durations. Scene 0 is the silent branded intro (2s). The rest =
// voiceover audio length + ~2s breathing room (ceil(dur*30)+60).
// VO durations: 10.96s, 12.31s, 14.77s, 12.82s, 14.16s, 13.10s, 4.23s
const SCENE_FRAMES = [60, 389, 430, 504, 445, 485, 453, 187];

// Total: sum(SCENE_FRAMES) - (7 transitions * 10) = 2953 - 70 = 2883
const TOTAL_FRAMES = 2883;

// One entry per scene. The intro has no voiceover (empty string => no Audio).
const VOICEOVER_FILES = [
  "",
  "voiceover/scene-1-hook.mp3",
  "voiceover/scene-2-dashboard.mp3",
  "voiceover/scene-3-alerts.mp3",
  "voiceover/scene-4-lineage.mp3",
  "voiceover/scene-5-reconciliation.mp3",
  "voiceover/scene-6-benford.mp3",
  "voiceover/scene-7-cta.mp3",
];

// Wrapper that layers a scene component with its voiceover audio
const SceneWithAudio: React.FC<{
  children: React.ReactNode;
  voiceoverFile: string;
  withVoiceover: boolean;
}> = ({ children, voiceoverFile, withVoiceover }) => {
  return (
    <AbsoluteFill>
      {children}
      {withVoiceover && voiceoverFile && (
        <Audio src={staticFile(voiceoverFile)} volume={0.9} />
      )}
    </AbsoluteFill>
  );
};

export const FoundryDemo: React.FC<DemoProps> = ({ withVoiceover }) => {
  const scenes = [
    <Intro />,
    <ProblemHook withVoiceover={withVoiceover} />,
    <DashboardOverview withVoiceover={withVoiceover} />,
    <AlertInvestigation withVoiceover={withVoiceover} />,
    <Lineage withVoiceover={withVoiceover} />,
    <BankReconciliation withVoiceover={withVoiceover} />,
    <BenfordAnalysis withVoiceover={withVoiceover} />,
    <CTA withVoiceover={withVoiceover} />,
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, fontFamily: fonts.sans }}>
      <TransitionSeries>
        {scenes.map((scene, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: FADE_DURATION })}
              />
            )}
            <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES[i]}>
              <SceneWithAudio
                voiceoverFile={VOICEOVER_FILES[i]}
                withVoiceover={withVoiceover}
              >
                {scene}
              </SceneWithAudio>
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}
      </TransitionSeries>

      {/* Background music */}
      <Audio
        src={staticFile("music.mp3")}
        volume={(f) => {
          const fadeInEnd = 45;
          const fadeOutStart = TOTAL_FRAMES - 100;

          let vol = withVoiceover ? 0.12 : 0.25;

          if (f < fadeInEnd) {
            vol = interpolate(f, [0, fadeInEnd], [0, vol], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
          }

          if (f > fadeOutStart) {
            vol = interpolate(f, [fadeOutStart, TOTAL_FRAMES], [vol, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
          }

          return vol;
        }}
      />
    </AbsoluteFill>
  );
};
