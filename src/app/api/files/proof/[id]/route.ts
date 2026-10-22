import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSessionUser } from "@/lib/session";
import { proofResponse } from "@/server/storage";

// Proof files are private: only the claimant and administrators can open them.
export async function GET(_: Request, { params }: RouteContext<"/api/files/proof/[id]">) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });

  const [proof] = await db
    .select({ filePath: schema.claimProof.filePath, claimantId: schema.claim.claimantId })
    .from(schema.claimProof)
    .innerJoin(schema.claim, eq(schema.claim.id, schema.claimProof.claimId))
    .where(eq(schema.claimProof.id, id));
  if (!proof?.filePath) return new Response("Not found", { status: 404 });
  if (user.role !== "admin" && proof.claimantId !== user.id) {
    return new Response("Not found", { status: 404 });
  }
  return proofResponse(proof.filePath);
}
