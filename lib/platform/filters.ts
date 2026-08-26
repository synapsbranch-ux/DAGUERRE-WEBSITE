import type { QueryFilter } from "mongoose";

import type { PlatformDoc } from "@/lib/db/models/platform";

/**
 * Filtre de requête des modèles de la plate-forme.
 *
 * Mongoose 9 a renommé `FilterQuery` en `QueryFilter`. L'alias est déclaré ici
 * une fois : le jour où la bibliothèque renomme encore, un seul fichier change
 * au lieu d'une dizaine.
 */
export type PlatformFilter = QueryFilter<PlatformDoc>;
