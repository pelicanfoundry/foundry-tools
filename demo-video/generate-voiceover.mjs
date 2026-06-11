import { writeFileSync, mkdirSync, existsSync } from "fs";

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "cjVigY5qzO86Huf0OWal"; // Eric - Smooth, Trustworthy
const OUTPUT_DIR = "public/voiceover";

// Scene scripts — one per scene, in order. SCENE_FRAMES in src/FoundryDemo.tsx
// is re-timed to these audio lengths after regeneration.
// 1 ProblemHook · 2 DashboardOverview · 3 AlertInvestigation · 4 Lineage
// 5 BankReconciliation · 6 BenfordAnalysis · 7 CTA

const scenes = [
  {
    id: "scene-1-hook",
    text: "Half of all small businesses<break time=\"0.65s\" /> will face fraud. And the average scheme runs for more than a year<break time=\"0.4s\" /> before anyone notices. Your bookkeeper touches every payment. So what happens<break time=\"0.35s\" /> when they're the one stealing?",
    settings: { stability: 0.5, similarity_boost: 0.8, style: 0.32 },
  },
  {
    id: "scene-2-dashboard",
    text: "Foundry watches every QuickBooks transaction as it posts. One dashboard — your spend, your open alerts, your riskiest vendors — with an owner's view and a finance view. The moment something's off, you see it.",
  },
  {
    id: "scene-3-alerts",
    text: "Every alert explains itself in plain English: the vendor, the amount, the risk. And Foundry's AI writes the story behind it — the address it shares with an employee, payments that escalated too fast, a tax ID that doesn't exist.",
  },
  {
    id: "scene-4-lineage",
    text: "Foundry traces the full lineage of every payment — when the vendor was added, the bill it came from, each check that went out, and the moment it cleared your bank. A complete chain of custody, so every dollar can account for itself.",
  },
  {
    id: "scene-5-reconciliation",
    text: "Foundry checks your books against reality — every recorded payment matched to a real bank withdrawal. Recorded as paid but never left the account? Paid twice? A name that doesn't line up? It surfaces all of it.",
  },
  {
    id: "scene-6-benford",
    text: "Real spending follows a mathematical fingerprint. When numbers are invented, that fingerprint breaks. Foundry's Benford analysis flags the accounts where the digits don't add up — a classic tell for fabricated books.",
  },
  {
    id: "scene-7-cta",
    text: "Foundry. Real-time fraud detection for the people you trust with your money.",
  },
];

async function generateScene(scene) {
  console.log(`Generating: ${scene.id}...`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: scene.text,
        model_id: "eleven_multilingual_v2",
        // Per-scene override via scene.settings; default is the steady narrator
        // voice. The opening hook uses a more expressive setting (lower
        // stability, higher style) so it lands like a cold open, not a readout.
        voice_settings: scene.settings || {
          stability: 0.6,
          similarity_boost: 0.75,
          style: 0.2,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error for ${scene.id}: ${response.status} ${error}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const outputPath = `${OUTPUT_DIR}/${scene.id}.mp3`;
  writeFileSync(outputPath, audioBuffer);
  console.log(`  Saved: ${outputPath} (${(audioBuffer.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  if (!API_KEY) {
    console.error("Set ELEVENLABS_API_KEY environment variable");
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  // ONLY=scene-id regenerates a single scene (leaves the rest untouched).
  const targets = process.env.ONLY ? scenes.filter((s) => s.id === process.env.ONLY) : scenes;
  for (const scene of targets) {
    await generateScene(scene);
  }

  console.log("\nDone! Voiceover files saved to:", OUTPUT_DIR);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
