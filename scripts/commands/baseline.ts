import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BaselinePrediction, FactPack } from "@/lib/schema";
import { baselineCalls } from "@/lib/baselines";
import { ensureGuru, predictionPath } from "../lib/gurus";
import { DATA, sha256, writeJsonOnce } from "../lib/store";

const PROFILES = {
  "baseline-home": { displayName: "เจ้าบ้านตลอด", descriptionTh: "กูรูฐาน: เลือกเจ้าบ้านทุกคู่ ใช้ความน่าจะเป็นเฉลี่ยของลีก" },
  "baseline-table": { displayName: "ตามตาราง", descriptionTh: "กูรูฐาน: เลือกทีมที่อันดับดีกว่า (ก่อนเปิดฤดูกาลใช้อันดับเริ่มต้น)" },
  "baseline-market": { displayName: "ตลาด", descriptionTh: "กูรูฐาน: ความน่าจะเป็นจากราคาต่อรองเฉลี่ยของหลายเจ้า แสดงเป็นเปอร์เซ็นต์" },
} as const;

export function baseline(opts: { now: string }): { written: number } {
  const dir = join(DATA, "factpacks");
  let written = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const bytes = readFileSync(join(dir, file));
    const fp = FactPack.parse(JSON.parse(bytes.toString("utf8")));
    if (fp.kickoffUtc <= opts.now) continue; // baselines obey the lock too
    for (const call of baselineCalls(fp)) {
      ensureGuru({ guruId: call.guruId, displayName: PROFILES[call.guruId].displayName, kind: "baseline", modelId: call.guruId, harnesses: ["bot"], automation: "bot", descriptionTh: PROFILES[call.guruId].descriptionTh, since: opts.now, active: true });
      const pred = BaselinePrediction.parse({
        schemaVersion: 1, kind: "baseline", matchId: fp.matchId, guruId: call.guruId, lockedAt: opts.now, kickoffUtc: fp.kickoffUtc,
        factpackHash: sha256(bytes), pick: call.pick, probs: call.probs, scoreline: null, over25: call.over25, btts: call.btts, note: call.note,
      });
      if (writeJsonOnce(predictionPath(call.guruId, fp.matchId), pred)) written++;
    }
  }
  console.log(`baseline: wrote ${written} predictions`);
  return { written };
}
