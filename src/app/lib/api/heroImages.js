import { apiFetch } from "./client";

export function fetchHeroImages() {
  return apiFetch("/hero-images");
}
