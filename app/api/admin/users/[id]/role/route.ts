import { NextResponse } from "next/server";
import { z } from "zod";

import { readSession, requireAdminApi } from "@/lib/admin";
import {
  LogtoManagementError,
  getUserRoleNames,
  isManagementConfigured,
  roleIdForName,
  setUserRoles,
} from "@/lib/auth/management";
import { adminRoleName } from "@/lib/auth/roles";
import { tryConnectToDatabase } from "@/lib/db/client";
import { AppUserModel } from "@/lib/db/models/platform";
import { readJson } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { roles } from "@/lib/platform/enums";

type Ctx = { params: Promise<{ id: string }> };

const roleInputSchema = z.object({ role: z.enum([...roles]) });

/**
 * Changement de rôle d'un compte.
 *
 * L'écriture se fait **dans Logto**, seul détenteur des rôles. Le miroir local
 * est mis à jour ensuite, pour que la liste des clients reflète le changement
 * sans attendre une resynchronisation — mais il ne fait qu'afficher : c'est la
 * revendication du prochain jeton qui ouvrira ou fermera le tableau de bord.
 *
 * Deux protections méritent d'être nommées :
 *
 * 1. **Un administrateur ne peut pas se rétrograder lui-même.** Sur une
 *    installation qui n'en compte qu'un, ce clic fermerait le tableau de bord à
 *    tout le monde, sans moyen de revenir en arrière depuis l'application.
 * 2. **`PUT` et non `POST` côté Logto** : `POST` ajoute sans retirer, et
 *    laisserait administrateur un compte qu'on vient de rétrograder.
 */
export async function PUT(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  if (!isManagementConfigured()) {
    return NextResponse.json(
      {
        error:
          "La Management API de Logto n'est pas configurée. Renseignez LOGTO_M2M_APP_ID et LOGTO_M2M_APP_SECRET.",
      },
      { status: 503 },
    );
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = roleInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });

  const session = await readSession();

  if (session?.user.id === id && parsed.data.role !== "admin") {
    return NextResponse.json(
      {
        error:
          "Vous ne pouvez pas retirer votre propre accès administrateur. Demandez à un autre administrateur de le faire.",
      },
      { status: 409 },
    );
  }

  const adminRole = adminRoleName();

  try {
    /*
     * Les rôles existants sont relus pour ne pas écraser ceux qui ne nous
     * concernent pas : Logto peut en porter d'autres, définis pour d'autres
     * applications du même locataire.
     */
    const current = await getUserRoleNames(id);
    const kept = current.filter((name) => name !== adminRole);
    const wanted = parsed.data.role === "admin" ? [...kept, adminRole] : kept;

    const roleIds = await Promise.all(wanted.map((name) => roleIdForName(name)));
    await setUserRoles(id, roleIds);
  } catch (error) {
    if (error instanceof LogtoManagementError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[rôles] changement impossible :", error);
    return NextResponse.json({ error: "Logto est injoignable." }, { status: 502 });
  }

  // Miroir : au mieux, l'écriture faisant autorité a déjà eu lieu chez Logto.
  if (await tryConnectToDatabase()) {
    await AppUserModel.updateOne(
      { logtoId: id },
      { $set: { role: parsed.data.role, syncedAt: new Date() } },
    ).catch((error) => console.error("[rôles] miroir non mis à jour :", error));
  }

  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "user_role_changed",
    entityType: "AppUser",
    entityId: id,
    metadata: { role: parsed.data.role },
  });

  return NextResponse.json({ ok: true, role: parsed.data.role });
}
