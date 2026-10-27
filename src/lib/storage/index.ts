import { useCloud } from "../supabase";
import { createLocalRepo } from "./local";
import { createSupabaseRepo } from "./supabase";
import type { Repo } from "./types";

let cached: Repo | null = null;

export function getRepo(): Repo {
  cached ??= useCloud ? createSupabaseRepo() : createLocalRepo();
  return cached;
}

export type { Repo };
