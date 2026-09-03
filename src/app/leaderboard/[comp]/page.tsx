import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeaderboardView } from "../LeaderboardView";
import { COMPETITION_LABEL } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() { return [{ comp: "epl" }, { comp: "ucl" }]; }

export async function generateMetadata({ params }: { params: Promise<{ comp: string }> }): Promise<Metadata> {
  const { comp } = await params;
  return { title: `กระดานคะแนน ${COMPETITION_LABEL[comp as "epl" | "ucl"]?.th ?? ""}` };
}

export default async function LeaderboardCompPage({ params }: { params: Promise<{ comp: string }> }) {
  const { comp } = await params;
  if (comp !== "epl" && comp !== "ucl") notFound();
  return <LeaderboardView comp={comp} />;
}
