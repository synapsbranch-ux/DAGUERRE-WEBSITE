import type { ReactNode } from "react";

import { requireAdmin } from "@/lib/admin";
import { fontVariables } from "@/lib/fonts";
import { AdminNav } from "@/components/admin/AdminNav";
import "../globals.css";

export const metadata = {
  title: "Daguerre — CMS",
  robots: { index: false, follow: false },
};

/**
 * Coquille du tableau de bord.
 *
 * `/admin` n'est pas localisé et vit hors de `app/[locale]` : il porte donc son
 * propre `<html>`. La session est validée ici, côté serveur — le proxy ne fait
 * délibérément aucun contrôle par cookie.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();

  return (
    <html lang="fr" className={fontVariables}>
      <body>
        <div className="min-h-screen bg-background">
          <AdminNav user={{ name: session.user.name, email: session.user.email }} />
          <main className="p-5 sm:p-8 lg:ml-64">{children}</main>
        </div>
      </body>
    </html>
  );
}
