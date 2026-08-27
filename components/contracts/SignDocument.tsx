"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Dictionary } from "@/lib/dictionaries";

type Outcome = "signed" | "declined" | null;

/**
 * Apposition d'une signature par une partie externe.
 *
 * Deux modes, et un seul envoi : le nom saisi ou le tracé. Le tracé est capturé
 * sur un `<canvas>` dimensionné en pixels réels de l'écran — sans quoi une
 * signature tracée sur mobile arriverait floue au moment d'être imprimée dans
 * le PDF.
 *
 * Rien ici n'autorise quoi que ce soit : le composant ne connaît que le jeton
 * présent dans l'URL, et c'est le serveur qui décide si la signature est
 * recevable. Le champ « nom » n'est pas une identité déclarée — le signataire
 * est celui que le jeton désigne.
 */
export function SignDocument({
  dict,
  token,
  signerName,
  documentUrl,
}: {
  dict: Dictionary;
  token: string;
  signerName: string;
  documentUrl: string;
}) {
  const t = dict.platform.signature;

  const [mode, setMode] = useState<"typed" | "drawn">("typed");
  const [typed, setTyped] = useState(signerName);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [completed, setCompleted] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [hasDrawing, setHasDrawing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  /**
   * Le `<canvas>` est redimensionné à la densité réelle de l'écran, une fois
   * monté et à chaque redimensionnement : un canevas CSS de 600 px sur un écran
   * à deux fois la densité doit contenir 1200 px de tracé, sinon la signature
   * apparaît crénelée dans le document final.
   */
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;

    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);

    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111111";
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  function position(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const box = canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = position(event);
    context.beginPath();
    context.moveTo(x, y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const { x, y } = position(event);
    context.lineTo(x, y);
    context.stroke();
    setHasDrawing(true);
  }

  function stop() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  }

  const ready =
    consent && (mode === "typed" ? typed.trim().length >= 2 : hasDrawing);

  async function submit(action?: "decline") {
    setBusy(true);
    setError("");

    const body =
      action === "decline"
        ? { action: "decline", reason }
        : {
            mode,
            consent: true,
            value:
              mode === "drawn"
                ? (canvasRef.current?.toDataURL("image/png") ?? "")
                : typed.trim(),
          };

    const response = await fetch(`/api/contracts/sign?jeton=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);

    setBusy(false);

    const payload = (await response?.json().catch(() => null)) as
      | { error?: unknown; outcome?: string; completed?: boolean }
      | null;

    if (!response?.ok) {
      setError(typeof payload?.error === "string" ? payload.error : t.failedFallback);
      return;
    }

    setCompleted(payload?.completed === true);
    setOutcome(payload?.outcome === "declined" ? "declined" : "signed");
  }

  if (outcome === "declined") {
    return (
      <Done title={t.declinedTitle} body={t.declinedBody} />
    );
  }

  if (outcome === "signed") {
    return <Done title={t.signedTitle} body={completed ? t.completedBody : t.signedBody} />;
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <h2 className="font-heading text-lg">{t.documentLabel}</h2>
        {/*
          Le document est affiché en ligne pour être lu sans quitter la page.
          Les deux liens couvrent le cas — fréquent sur mobile — où le
          navigateur ne sait pas rendre un PDF dans un cadre.
        */}
        <iframe
          src={documentUrl}
          title={t.documentLabel}
          className="h-[60vh] min-h-80 w-full rounded-lg border border-border bg-[var(--plate)]"
        />
        <div className="flex flex-wrap gap-3 text-sm">
          <a href={documentUrl} target="_blank" rel="noreferrer" className="underline">
            {t.openDocument}
          </a>
          <a href={`${documentUrl}&telecharger=1`} className="underline">
            {t.downloadDocument}
          </a>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-border p-5">
        <h2 className="font-heading text-lg">{t.signAs} {signerName}</h2>

        <Tabs value={mode} onValueChange={(value) => setMode(value === "drawn" ? "drawn" : "typed")}>
          <TabsList>
            <TabsTrigger value="typed">{t.modeTyped}</TabsTrigger>
            <TabsTrigger value="drawn">{t.modeDrawn}</TabsTrigger>
          </TabsList>

          <TabsContent value="typed" className="grid gap-2 pt-4">
            <Label htmlFor="signature-typed">{t.typedLabel}</Label>
            <Input
              id="signature-typed"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="name"
            />
            <p
              className="font-heading text-2xl"
              aria-hidden="true"
              style={{ fontStyle: "italic" }}
            >
              {typed}
            </p>
            <p className="text-xs text-muted-foreground">{t.typedHint}</p>
          </TabsContent>

          <TabsContent value="drawn" className="grid gap-2 pt-4">
            <p className="text-xs text-muted-foreground">{t.drawnHint}</p>
            <canvas
              ref={canvasRef}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={stop}
              onPointerLeave={stop}
              onPointerCancel={stop}
              className="h-40 w-full touch-none rounded-lg border border-border bg-white"
            />
            <div>
              <Button type="button" variant="secondary" size="sm" onClick={clear}>
                {t.clear}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
          />
          <span>{t.consent}</span>
        </label>

        <p className="text-xs text-muted-foreground">{t.legalNote}</p>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={busy || !ready} onClick={() => submit()}>
            {busy ? t.submitting : t.submit}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => setDeclining((current) => !current)}
          >
            {t.decline}
          </Button>
        </div>

        {!consent ? <p className="text-xs text-muted-foreground">{t.consentRequired}</p> : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </section>

      {declining ? (
        <section className="grid gap-3 rounded-lg border border-destructive/40 p-5">
          <h2 className="font-heading text-lg">{t.declineTitle}</h2>
          <div className="grid gap-1.5">
            <Label htmlFor="decline-reason">{t.declineReason}</Label>
            <Textarea
              id="decline-reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <div>
            <Button type="button" variant="destructive" disabled={busy} onClick={() => submit("decline")}>
              {t.declineConfirm}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Done({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--plate)] p-6">
      <h2 className="font-heading text-xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
