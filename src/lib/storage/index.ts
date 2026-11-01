import { useCloud } from "../supabase";
import type { ProfileId } from "../profile";
import { createLocalRepo } from "./local";
import { createSupabaseRepo } from "./supabase";
import type { Repo } from "./types";

const cached = new Map<ProfileId, Repo>();

/** Mỗi TKB (profile) có một repo riêng, dữ liệu không lẫn vào nhau. */
export function getRepo(profile: ProfileId): Repo {
  let repo = cached.get(profile);
  if (!repo) {
    repo = useCloud ? createSupabaseRepo(profile) : createLocalRepo(profile);
    cached.set(profile, repo);
  }
  return repo;
}

export type { Repo };
