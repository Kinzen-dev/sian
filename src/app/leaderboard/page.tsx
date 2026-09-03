import type { Metadata } from "next";
import { LeaderboardView } from "./LeaderboardView";

export const metadata: Metadata = { title: "กระดานคะแนน" };

export default function LeaderboardPage() {
  return <LeaderboardView comp={null} />;
}
