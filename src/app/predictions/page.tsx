import type { Metadata } from "next";
import { PredictionsBoard } from "@/components/board/PredictionsBoard";
import { COPY } from "@/lib/copy";

export const metadata: Metadata = { title: COPY.board.title, description: COPY.board.lead, openGraph: { title: `${COPY.board.title} | SIAN`, description: COPY.board.lead }, twitter: { card: "summary_large_image", title: `${COPY.board.title} | SIAN`, description: COPY.board.lead } };

export default function PredictionsPage() {
  return <PredictionsBoard comp={null} />;
}
