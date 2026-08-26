"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import { MilestoneStepper } from "@/components/ruixen/milestone-stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type QuoteServiceOption = { id: string; label: string };

type StepKey = "service" | "project" | "data" | "timing" | "contact" | "review";

const STEPS: StepKey[] = ["service", "project", "data", "timing", "contact", "review"];

type Values = {
  serviceId: string;
  serviceType: string;
  title: string;
  description: string;
  businessObjective: string;
  dataSources: string;
  estimatedDataVolume: string;
  desiredDeliverables: string;
  budgetRange: string;
  desiredStartDate: string;
  deadline: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  phone: string;
  newsletterOptIn: boolean;
  website: string;
};

export type QuoteFormDefaults = Partial<Pick<Values, "firstName" | "lastName" | "email" | "companyName" | "phone">>;

/** Cinq pièces jointes, dix mégaoctets chacune : la limite du serveur. */
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * Demande de devis — parcours en six étapes.
 *
 * ## Un seul formulaire
 *
 * Le même composant sert la page publique et l'espace client. Deux
 * formulaires distincts auraient fini par collecter des champs différents, et
 * l'estimation aurait dépendu de la porte d'entrée.
 *
 * ## Ce qui est obligatoire
 *
 * L'intitulé, la description et le contact. Tout le reste enrichit
 * l'estimation sans bloquer l'envoi : un formulaire qui exige le budget et le
 * volume de données avant d'accepter une demande perd les prospects qui ne les
 * connaissent pas encore.
 *
 * ## Idempotence
 *
 * Un identifiant de soumission est tiré une fois pour la durée du formulaire.
 * Un double envoi porte le même identifiant et retrouve la demande déjà créée
 * au lieu d'en fabriquer une seconde.
 */
export function QuoteRequestForm({
  dict,
  locale,
  services,
  defaults,
  trackHrefBase,
  registerHref,
  signedIn,
}: {
  dict: Dictionary;
  locale: Locale;
  services: QuoteServiceOption[];
  defaults?: QuoteFormDefaults;
  /** Base des liens de suivi, sans identifiant. */
  trackHrefBase: string;
  registerHref: string;
  signedIn: boolean;
}) {
  const t = dict.platform.quotes;
  const common = dict.platform.common;

  /**
   * Identifiant de soumission, tiré au **premier envoi** et conservé ensuite.
   *
   * Le tirer pendant le rendu produirait une valeur différente à chaque
   * réaffichage — et l'idempotence du serveur repose précisément sur sa
   * stabilité entre deux tentatives.
   */
  const submissionId = useRef("");
  const takeSubmissionId = () => {
    if (!submissionId.current) {
      submissionId.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.round(performance.now() * 1000)}`;
    }
    return submissionId.current;
  };

  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ id: string; quoteNumber: string } | null>(null);

  const [values, setValues] = useState<Values>({
    serviceId: services[0]?.id ?? "",
    serviceType: "",
    title: "",
    description: "",
    businessObjective: "",
    dataSources: "",
    estimatedDataVolume: "",
    desiredDeliverables: "",
    budgetRange: "",
    desiredStartDate: "",
    deadline: "",
    firstName: defaults?.firstName ?? "",
    lastName: defaults?.lastName ?? "",
    email: defaults?.email ?? "",
    companyName: defaults?.companyName ?? "",
    phone: defaults?.phone ?? "",
    newsletterOptIn: false,
    website: "",
  });

  const set =
    <K extends keyof Values>(key: K) =>
    (value: Values[K]) =>
      setValues((current) => ({ ...current, [key]: value }));

  const stepValid = (index: number): boolean => {
    switch (STEPS[index]) {
      case "project":
        return values.title.trim().length >= 3 && values.description.trim().length >= 20;
      case "contact":
        return (
          values.firstName.trim().length > 0 &&
          values.lastName.trim().length > 0 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
        );
      default:
        return true;
    }
  };

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_FILES) break;
      if (file.size > MAX_FILE_BYTES) {
        setError(`${file.name} dépasse 10 Mo.`);
        continue;
      }
      next.push(file);
    }
    setFiles(next);
  }

  async function submit() {
    setBusy(true);
    setError("");

    const payload = {
      ...values,
      serviceId: values.serviceId,
      serviceType: values.serviceId ? "service" : values.serviceType || "other",
      locale,
      submissionId: takeSubmissionId(),
    };

    const body = new FormData();
    body.set("payload", JSON.stringify(payload));
    for (const file of files) body.append("files", file);

    try {
      const response = await fetch("/api/quotes", { method: "POST", body });
      const data = (await response.json().catch(() => null)) as
        | { id?: string; quoteNumber?: string; error?: unknown }
        | null;

      setBusy(false);

      if (!response.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Certains champs sont invalides. Reprenez les étapes précédentes.",
        );
        return;
      }

      setResult({ id: String(data?.id ?? ""), quoteNumber: String(data?.quoteNumber ?? "") });
    } catch {
      setBusy(false);
      setError(common.networkError);
    }
  }

  if (result) {
    return (
      <section className="rounded-lg border border-border p-8">
        <p className="eyebrow">| {t.title} |</p>
        <h2 className="mt-4 font-heading text-3xl leading-tight">{t.successTitle}</h2>
        <p className="mt-3 max-w-[60ch] text-sm text-muted-foreground">{t.successLead}</p>

        <p className="mt-6 inline-flex rounded-md border border-border bg-[var(--plate)] px-4 py-2 font-mono text-lg">
          {result.quoteNumber}
        </p>

        <p className="mt-4 text-sm text-muted-foreground">{t.successEmailed}</p>

        <div className="mt-7 flex flex-wrap gap-3">
          {signedIn ? (
            <Button asChild>
              <Link href={`${trackHrefBase}/${result.id}`}>{t.successTrack}</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href={registerHref}>{t.successCreateAccount}</Link>
            </Button>
          )}
        </div>
      </section>
    );
  }

  const milestones = STEPS.map((key, index) => ({
    id: key,
    title: t.steps[key],
    description: t.stepHints[key],
    date: `${index + 1}/${STEPS.length}`,
  }));

  return (
    <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
      <div className="hidden lg:block">
        <MilestoneStepper milestones={milestones} currentMilestone={step} variant="compact" />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (step < STEPS.length - 1) {
            if (stepValid(step)) setStep(step + 1);
            return;
          }
          void submit();
        }}
        className="grid gap-6"
      >
        <div className="lg:hidden">
          <p className="eyebrow">
            | {t.steps[STEPS[step]]} — {step + 1}/{STEPS.length} |
          </p>
        </div>

        {STEPS[step] === "service" ? (
          <fieldset className="grid gap-4">
            <legend className="font-heading text-2xl">{t.steps.service}</legend>
            <p className="text-sm text-muted-foreground">{t.stepHints.service}</p>

            <div className="grid gap-2">
              {services.map((service) => (
                <label
                  key={service.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors",
                    values.serviceId === service.id ? "border-foreground bg-foreground/5" : "border-border",
                  )}
                >
                  <input
                    type="radio"
                    name="service"
                    checked={values.serviceId === service.id}
                    onChange={() => set("serviceId")(service.id)}
                    className="size-4 accent-foreground"
                  />
                  {service.label}
                </label>
              ))}

              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors",
                  values.serviceId === "" ? "border-foreground bg-foreground/5" : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="service"
                  checked={values.serviceId === ""}
                  onChange={() => set("serviceId")("")}
                  className="size-4 accent-foreground"
                />
                {t.fields.otherService}
              </label>
            </div>

            {values.serviceId === "" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="quote-service-type">{t.fields.service}</Label>
                <Input
                  id="quote-service-type"
                  value={values.serviceType}
                  onChange={(event) => set("serviceType")(event.target.value)}
                />
              </div>
            ) : null}
          </fieldset>
        ) : null}

        {STEPS[step] === "project" ? (
          <fieldset className="grid gap-4">
            <legend className="font-heading text-2xl">{t.steps.project}</legend>
            <p className="text-sm text-muted-foreground">{t.stepHints.project}</p>

            <div className="grid gap-1.5">
              <Label htmlFor="quote-title">
                {t.fields.title} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quote-title"
                required
                value={values.title}
                onChange={(event) => set("title")(event.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="quote-description">
                {t.fields.description} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="quote-description"
                required
                rows={7}
                value={values.description}
                onChange={(event) => set("description")(event.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="quote-objective">{t.fields.businessObjective}</Label>
              <Textarea
                id="quote-objective"
                rows={4}
                value={values.businessObjective}
                onChange={(event) => set("businessObjective")(event.target.value)}
              />
            </div>
          </fieldset>
        ) : null}

        {STEPS[step] === "data" ? (
          <fieldset className="grid gap-4">
            <legend className="font-heading text-2xl">{t.steps.data}</legend>
            <p className="text-sm text-muted-foreground">{t.stepHints.data}</p>

            <div className="grid gap-1.5">
              <Label htmlFor="quote-sources">{t.fields.dataSources}</Label>
              <Textarea
                id="quote-sources"
                rows={5}
                value={values.dataSources}
                onChange={(event) => set("dataSources")(event.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="quote-volume">{t.fields.volume}</Label>
              <Input
                id="quote-volume"
                value={values.estimatedDataVolume}
                onChange={(event) => set("estimatedDataVolume")(event.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="quote-deliverables">{t.fields.deliverables}</Label>
              <Textarea
                id="quote-deliverables"
                rows={4}
                value={values.desiredDeliverables}
                onChange={(event) => set("desiredDeliverables")(event.target.value)}
              />
            </div>
          </fieldset>
        ) : null}

        {STEPS[step] === "timing" ? (
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="font-heading text-2xl sm:col-span-2">{t.steps.timing}</legend>
            <p className="text-sm text-muted-foreground sm:col-span-2">{t.stepHints.timing}</p>

            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="quote-budget">{t.fields.budget}</Label>
              <Input
                id="quote-budget"
                value={values.budgetRange}
                onChange={(event) => set("budgetRange")(event.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="quote-start">{t.fields.startDate}</Label>
              <Input
                id="quote-start"
                type="date"
                value={values.desiredStartDate}
                onChange={(event) => set("desiredStartDate")(event.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="quote-deadline">{t.fields.deadline}</Label>
              <Input
                id="quote-deadline"
                type="date"
                value={values.deadline}
                onChange={(event) => set("deadline")(event.target.value)}
              />
            </div>
          </fieldset>
        ) : null}

        {STEPS[step] === "contact" ? (
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="font-heading text-2xl sm:col-span-2">{t.steps.contact}</legend>

            <div className="grid gap-1.5">
              <Label htmlFor="quote-first">
                {t.fields.firstName} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quote-first"
                required
                autoComplete="given-name"
                value={values.firstName}
                onChange={(event) => set("firstName")(event.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="quote-last">
                {t.fields.lastName} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quote-last"
                required
                autoComplete="family-name"
                value={values.lastName}
                onChange={(event) => set("lastName")(event.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="quote-email">
                {t.fields.email} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quote-email"
                type="email"
                required
                autoComplete="email"
                readOnly={signedIn && Boolean(defaults?.email)}
                value={values.email}
                onChange={(event) => set("email")(event.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="quote-phone">{t.fields.phone}</Label>
              <Input
                id="quote-phone"
                type="tel"
                autoComplete="tel"
                value={values.phone}
                onChange={(event) => set("phone")(event.target.value)}
              />
            </div>

            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="quote-company">{t.fields.company}</Label>
              <Input
                id="quote-company"
                autoComplete="organization"
                value={values.companyName}
                onChange={(event) => set("companyName")(event.target.value)}
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="quote-files">{t.fields.attachments}</Label>
              <input
                id="quote-files"
                type="file"
                multiple
                onChange={(event) => addFiles(event.target.files)}
                className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm"
              />
              <p className="text-xs text-muted-foreground">{t.attachmentsHint}</p>
              <p
                role="note"
                className="rounded-md border border-border bg-[var(--plate)] p-3 text-xs leading-relaxed"
              >
                {t.attachmentsWarning}
              </p>

              {files.length > 0 ? (
                <ul className="grid gap-1.5 text-sm">
                  {files.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFiles(files.filter((_, position) => position !== index))}
                      >
                        {common.close}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="flex items-start gap-2 sm:col-span-2">
              <input
                id="quote-newsletter"
                type="checkbox"
                checked={values.newsletterOptIn}
                onChange={(event) => set("newsletterOptIn")(event.target.checked)}
                className="mt-1 size-4 shrink-0 rounded-sm border border-border accent-foreground"
              />
              <Label htmlFor="quote-newsletter" className="text-xs font-normal leading-relaxed text-muted-foreground">
                {dict.platform.auth.marketingOptIn} — {dict.platform.auth.marketingHint}
              </Label>
            </div>

            {/* Piège à pourriel. */}
            <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
              <label htmlFor="quote-website">Site web</label>
              <input
                id="quote-website"
                tabIndex={-1}
                autoComplete="off"
                value={values.website}
                onChange={(event) => set("website")(event.target.value)}
              />
            </div>
          </fieldset>
        ) : null}

        {STEPS[step] === "review" ? (
          <section className="grid gap-4">
            <h2 className="font-heading text-2xl">{t.steps.review}</h2>
            <p className="text-sm text-muted-foreground">{t.stepHints.review}</p>

            <dl className="grid gap-3 rounded-lg border border-border p-5 text-sm">
              <Row label={t.fields.service} value={services.find((s) => s.id === values.serviceId)?.label || values.serviceType || "—"} />
              <Row label={t.fields.title} value={values.title} />
              <Row label={t.fields.description} value={values.description} />
              {values.businessObjective ? <Row label={t.fields.businessObjective} value={values.businessObjective} /> : null}
              {values.dataSources ? <Row label={t.fields.dataSources} value={values.dataSources} /> : null}
              {values.desiredDeliverables ? <Row label={t.fields.deliverables} value={values.desiredDeliverables} /> : null}
              {values.budgetRange ? <Row label={t.fields.budget} value={values.budgetRange} /> : null}
              {values.desiredStartDate ? <Row label={t.fields.startDate} value={values.desiredStartDate} /> : null}
              {values.deadline ? <Row label={t.fields.deadline} value={values.deadline} /> : null}
              <Row
                label={t.fields.email}
                value={`${values.firstName} ${values.lastName} — ${values.email}`}
              />
              {files.length > 0 ? (
                <Row label={t.fields.attachments} value={files.map((file) => file.name).join(", ")} />
              ) : null}
            </dl>
          </section>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
          {step > 0 ? (
            <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
              {common.previous}
            </Button>
          ) : null}

          <Button type="submit" disabled={busy || !stepValid(step)}>
            {step < STEPS.length - 1 ? common.next : busy ? common.sending : t.submitRequest}
          </Button>

          <span className="text-xs text-muted-foreground">
            {step + 1}/{STEPS.length}
          </span>
        </div>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-line">{value}</dd>
    </div>
  );
}
