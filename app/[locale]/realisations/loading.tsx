import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette de chargement — shadcn `Skeleton`. Seule route publique
 * server-rendue à la demande (filtres dans l'URL) : les autres pages sont
 * pré-rendues statiquement et n'ont pas besoin d'état de chargement.
 */
export default function Loading() {
  return (
    <Container>
      <header className="border-b border-border py-14 sm:py-20">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="mt-5 h-11 w-2/3 max-w-md sm:h-14" />
        <Skeleton className="mt-6 h-4 w-full max-w-[52ch]" />
        <Skeleton className="mt-2 h-4 w-3/4 max-w-[52ch]" />
      </header>

      <div className="divide-y divide-border">
        <section className="py-12 sm:py-16">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-4 h-7 w-40" />
          <div className="mt-7 grid gap-5">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-4 h-7 w-48" />
          <ul className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index}>
                <Skeleton className="aspect-[4/3] w-full" />
                <Skeleton className="mt-4 h-3 w-1/3" />
                <Skeleton className="mt-3 h-5 w-3/4" />
                <Skeleton className="mt-3 h-4 w-full" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Container>
  );
}
