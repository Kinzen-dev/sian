import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PredictionsBoard } from "@/components/board/PredictionsBoard";
import { COMPETITION_LABEL } from "@/lib/site";
import { COPY } from "@/lib/copy";
import type { Competition } from "@/lib/schema";

export const dynamicParams = false;
export function generateStaticParams() { return [{ comp: "epl" }, { comp: "ucl" }]; }

export async function generateMetadata({ params }: { params: Promise<{ comp: string }> }): Promise<Metadata> {
  const { comp } = await params;
  const c = comp as Competition;
  const title = `${COPY.board.title} ${COMPETITION_LABEL[c]?.th ?? comp}`;
  return { title, description: COPY.board.lead, openGraph: { title: `${title} | SIAN`, description: COPY.board.lead }, twitter: { card: "summary_large_image", title: `${title} | SIAN`, description: COPY.board.lead } };
}

export default async function PredictionsByComp({ params }: { params: Promise<{ comp: string }> }) {
  const { comp } = await params;
  if (comp !== "epl" && comp !== "ucl") notFound();
  return <PredictionsBoard comp={comp} />;
}
