import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { ClientProjectModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { clientProjectInputSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Modification d'un projet.
 *
 * Le client et le devis d'origine ne figurent pas dans le schéma d'entrée :
 * un projet ne change pas de propriétaire par un formulaire, et sa filiation
 * avec le dossier accepté est un fait, pas un champ modifiable.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = clientProjectInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();
  const data = parsed.data;

  const doc = await ClientProjectModel.findByIdAndUpdate(
    id,
    {
      $set: {
        title: data.title,
        description: data.description,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : null,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        completedAt: data.completedAt
          ? new Date(data.completedAt)
          : data.status === "completed"
            ? new Date()
            : null,
      },
    },
    { new: true },
  );
  if (!doc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const session = await readSession();
  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "project_updated",
    entityType: "ClientProject",
    entityId: id,
    metadata: { status: data.status },
  });

  return NextResponse.json({ ok: true });
}
