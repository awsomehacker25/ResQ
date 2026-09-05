import type { Metadata } from "next";
import { FullClient } from "./FullClient";

export const metadata: Metadata = { title: "ResQ: Responder unlock" };

export default async function ResponderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="rq-shell" style={{ padding: "36px 16px", justifyContent: "center" }}>
      <FullClient slug={slug} />
    </div>
  );
}
