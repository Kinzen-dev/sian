import "server-only";
import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { ogFonts } from "./fonts";
import { OG } from "./theme";

export const OG_SIZE = { width: OG.width, height: OG.height };
export const OG_CONTENT_TYPE = "image/png";

export async function renderCard(node: ReactElement): Promise<ImageResponse> {
  const fonts = await ogFonts();
  return new ImageResponse(node, { ...OG_SIZE, fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: f.style })) });
}

export function nowIso(): string {
  return new Date().toISOString();
}
