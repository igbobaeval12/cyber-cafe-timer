import { trpc } from "@/lib/trpc";

export function useSettings() {
  const settingsQuery = trpc.settings.get.useQuery();
  return settingsQuery;
}
