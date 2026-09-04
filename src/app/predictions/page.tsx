import type { Metadata } from "next";
import { PredictionsBoard } from "@/components/board/PredictionsBoard";
import { COPY } from "@/lib/copy";

export const metadata: Metadata = { title: COPY.board.title, description: COPY.board.lead };

export default function PredictionsPage() {
  return <PredictionsBoard comp={null} />;
}
