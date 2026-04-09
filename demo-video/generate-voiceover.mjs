import { writeFileSync, mkdirSync, existsSync } from "fs";

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "cjVigY5qzO86Huf0OWal"; // Eric - Smooth, Trustworthy
const OUTPUT_DIR = "public/voiceover";

// Scene scripts — timed to match our 6 scenes
// Scene 1: ProblemHook (0-15s)
// Scene 2: DashboardOverview (15-35s)
// Scene 3: AlertInvestigation (35-55s)
// Scene 4: ForensicGraph (55-70s)
// Scene 5: BankReconciliation (70-85s)
// Scene 6: CTA (85-90s)

const scenes = [
  {
    id: "scene-1-hook",
    text: "Forty-two percent of fraud targets small businesses. The average loss? A hundred and forty-five thousand dollars. And it takes a full year to even notice. Your bookkeeper handles every payment. But what if they're the one stealing?",
  },
  {
    id: "scene-2-dashboard",
    text: "Foundry monitors every transaction from QuickBooks in real time. The dashboard gives you an instant risk overview — total spend, open alerts, and your highest-risk vendors. When something suspicious hits, you know immediately.",
  },
  {
    id: "scene-3-alerts",
    text: "Each alert tells you exactly what happened, in plain English. The linked transaction shows the vendor, amount, and risk score. And our AI analysis connects the dots — flagging patterns like address matches with employees and rapid payment escalation.",
  },
  {
    id: "scene-4-graph",
    text: "The relationship graph reveals connections your spreadsheet never could. Vendors linked to employees. Same-day payment clusters. Duplicate invoice flags. Patterns that only emerge when you see the full picture.",
  },
  {
    id: "scene-5-reconciliation",
    text: "Payment verification cross-references every QuickBooks entry against your actual bank withdrawals. If money was recorded as paid but never left the bank account, Foundry finds it.",
  },
  {
    id: "scene-6-cta",
    text: "Foundry. Real-time fraud detection for your business. One hundred ninety-nine dollars a month. Five-minute setup.",
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
        voice_settings: {
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

  for (const scene of scenes) {
    await generateScene(scene);
  }

  console.log("\nDone! Voiceover files saved to:", OUTPUT_DIR);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
