"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { adminGroups, adminSections } from "@/lib/admin-sections";
import { cn } from "@/lib/utils";

type NavUser = { name: string; email: string };

/**
 * Navigation du tableau de bord.
 *
 * Sur grand écran c'est une colonne fixe ; en dessous de `lg`, le même contenu
 * est servi dans un panneau latéral. Le lien correspondant à la page courante
 * porte `aria-current="page"` : sans lui, un lecteur d'écran ne peut pas dire
 * où l'on se trouve.
 */
export function AdminNav({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 z-30 hidden w-64 flex-col border-r border-border bg-[var(--plate)] p-5 lg:flex">
        <Link href="/admin" className="font-heading text-xl">
          Daguerre — CMS
        </Link>
        <NavLinks className="mt-8 flex-1 overflow-y-auto" />
        <UserBlock user={user} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="secondary" size="sm">
              Menu
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 overflow-y-auto p-5">
            <SheetHeader className="p-0">
              <SheetTitle>
                <Link href="/admin" onClick={() => setOpen(false)}>
                  Daguerre — CMS
                </Link>
              </SheetTitle>
            </SheetHeader>
            <NavLinks className="mt-6" onNavigate={() => setOpen(false)} />
            <UserBlock user={user} className="mt-6" />
          </SheetContent>
        </Sheet>
        <Link href="/admin" className="font-heading text-lg">
          Daguerre — CMS
        </Link>
      </header>
    </>
  );
}

function NavLinks({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className={cn("grid gap-5", className)} aria-label="Sections du tableau de bord">
      {adminGroups.map((group) => (
        <div key={group}>
          <p className="px-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{group}</p>
          <ul className="mt-1.5 grid gap-0.5">
            {adminSections
              .filter((section) => section.group === group)
              .map((section) => {
                const href = `/admin/${section.path}`;
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <li key={section.path}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm transition-colors",
                        active ? "bg-foreground text-background" : "hover:bg-foreground/7",
                      )}
                    >
                      {section.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserBlock({ user, className }: { user: NavUser; className?: string }) {
  return (
    <div className={cn("mt-6 border-t border-border pt-4", className)}>
      <p className="truncate text-sm font-medium">{user.name || "Administrateur"}</p>
      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      <LogoutButton className="mt-3 w-full" />
    </div>
  );
}
