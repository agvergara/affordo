import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocalState } from "@/hooks/use-local-state";
import { defaultProfile, GoalsSchema, ProfileSchema, type Goal, type Profile } from "./affordo-types";
import { t as translate, type TKey } from "./i18n";

type Ctx = {
  hydrated: boolean;
  profile: Profile;
  hasProfile: boolean;
  setProfile: (p: Profile | ((prev: Profile) => Profile)) => void;
  clearProfile: () => void;
  goals: Goal[];
  setGoals: (g: Goal[] | ((prev: Goal[]) => Goal[])) => void;
  clearGoals: () => void;
  t: (key: TKey) => string;
};

const AffordoContext = createContext<Ctx | null>(null);

export function AffordoProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile, profileMeta] = useLocalState<Profile>(
    "affordo.profile",
    defaultProfile,
    ProfileSchema,
  );
  const [goals, setGoals, goalsMeta] = useLocalState<Goal[]>("affordo.goals", [], GoalsSchema);

  const hydrated = profileMeta.hydrated && goalsMeta.hydrated;
  const hasProfile = hydrated && profile.salary > 0;

  const value = useMemo<Ctx>(
    () => ({
      hydrated,
      profile,
      hasProfile,
      setProfile,
      clearProfile: profileMeta.clear,
      goals,
      setGoals,
      clearGoals: goalsMeta.clear,
      t: (key) => translate(key),
    }),
    [hydrated, profile, hasProfile, setProfile, profileMeta.clear, goals, setGoals, goalsMeta.clear],
  );

  return <AffordoContext.Provider value={value}>{children}</AffordoContext.Provider>;
}

export function useAffordo(): Ctx {
  const ctx = useContext(AffordoContext);
  if (!ctx) throw new Error("useAffordo must be used inside AffordoProvider");
  return ctx;
}
