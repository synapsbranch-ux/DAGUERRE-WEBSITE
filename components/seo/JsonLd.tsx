import type { JsonLdObject } from "@/lib/schema";

type JsonLdProps = {
  data: JsonLdObject | JsonLdObject[];
};

/**
 * Injecte des données structurées schema.org dans la page.
 *
 * Les `<` sont échappés pour qu'une chaîne contenant `</script>` ne puisse pas
 * fermer la balise prématurément.
 */
export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
