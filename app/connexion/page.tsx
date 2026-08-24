"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ConnexionPage() {
 const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
 return <main className="mx-auto grid min-h-screen max-w-md place-items-center px-6"><form className="w-full space-y-5 border border-border p-7" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(""); const f = new FormData(e.currentTarget); const r = await fetch("/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: f.get("email"), password: f.get("password"), rememberMe: true }) }); setBusy(false); if (r.ok) router.replace("/admin"); else setError("Connexion impossible. Vérifiez vos identifiants."); }}><div><p className="eyebrow">Administration</p><h1 className="mt-2 text-3xl">Connexion</h1></div><div><Label htmlFor="email">Courriel</Label><Input className="mt-2" id="email" name="email" type="email" required /></div><div><Label htmlFor="password">Mot de passe</Label><Input className="mt-2" id="password" name="password" type="password" required /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button size="block" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</Button></form></main>;
}
