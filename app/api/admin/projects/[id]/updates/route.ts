import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { ClientProjectModel, ClientProjectUpdateModel } from "@/lib/db/models/platform";
import { publicUrl, sendTransactionalEmail } from "@/lib/email/service";
import { projectUpdateEmail } from "@/lib/email/templates";
import { readJson, validObjectId } from "@/lib/http";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import { recordAudit } from "@/lib/platform/audit";
import { getClientProfile } from "@/lib/platform/client";
import { notify } from "@/lib/platform/notifications";
import { findAccount } from "@/lib/platform/users";
import { href } from "@/lib/routes";
import { clientProjectUpdateInputSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Publication d'un point d'avancement.
 *
 * Une note d'avancement est **destinée au client** : elle est immédiatement
 * visible dans son espace, notifiée et relayée par courriel. C'est ce qui la
 * distingue d'une note interne, qui n'existe que sur les dossiers de devis.
 */
export async function POST(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = clientProjectUpdateInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });

  await connectToDatabase();
  const project = (await ClientProjectModel.findById(id).lean()) as Record<string, unknown> | null;
  if (!project) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const session = await readSession();

  await ClientProjectUpdateModel.create({
    projectId: id,
    title: parsed.data.title,
    body: parsed.data.body,
    authorId: session?.user.id ?? "",
  });

  const clientId = String(project.clientId ?? "");
  const profile = clientId ? await getClientProfile(clientId) : null;
  const preferred = profile?.preferredLanguage ?? "";
  const locale: Locale = isLocale(preferred) ? preferred : defaultLocale;

  await notify({
    userId: clientId,
    type: "project_update",
    title: parsed.data.title,
    message: String(project.title ?? ""),
    href: href("portalProjects", locale, id),
  });

  const account = clientId ? await findAccount(clientId) : null;
  if (account?.email) {
    await sendTransactionalEmail(
      account.email,
      projectUpdateEmail(locale, {
        projectNumber: String(project.projectNumber ?? ""),
        updateTitle: parsed.data.title,
        url: publicUrl("portalProjects", locale, id),
      }),
    );
  }

  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "project_updated",
    entityType: "ClientProject",
    entityId: id,
    metadata: { update: parsed.data.title },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
