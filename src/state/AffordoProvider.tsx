import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  defaultProfile,
  loadProfile,
  saveProfile,
  type Profile,
} from "./profile-store";
import { loadGoals, saveGoals, type Goal } from "./goals-store";

/**
 * The Affordo state layer (docs/affordo-context.md §8). Holds the reference
 * Profile and Goals, persists them to localStorage, and hydrates from storage
 * only AFTER mount — so a server-rendered/first paint always matches the
 * defaults, and stored state arrives once `hydrated` flips true.
 */
interface AffordoContextValue {
  /** False until the post-mount effect has read localStorage. */
  hydrated: boolean;
  profile: Profile;
  /** True once the user has a real income — derived, never stored. */
  hasProfile: boolean;
  setProfile: (profile: Profile) => void;
  clearProfile: () => void;
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
  clearGoals: () => void;
}

const AffordoContext = createContext<AffordoContextValue | null>(null);

export function AffordoProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfileState] = useState<Profile>(defaultProfile);
  const [goals, setGoalsState] = useState<Goal[]>([]);

  // Hydrate from storage once, after mount. Until then we render the defaults,
  // which keeps first paint deterministic (SSR-safe) regardless of stored data.
  useEffect(() => {
    setProfileState(loadProfile());
    setGoalsState(loadGoals());
    setHydrated(true);
  }, []);

  // Mutations write through to storage immediately. Hydration itself does not
  // write (it only reads), so stored data is never clobbered by the defaults.
  const setProfile = (next: Profile) => {
    setProfileState(next);
    saveProfile(next);
  };
  const clearProfile = () => setProfile({ ...defaultProfile });

  const setGoals = (next: Goal[]) => {
    setGoalsState(next);
    saveGoals(next);
  };
  const clearGoals = () => setGoals([]);

  const value: AffordoContextValue = {
    hydrated,
    profile,
    hasProfile: hydrated && profile.salary > 0,
    setProfile,
    clearProfile,
    goals,
    setGoals,
    clearGoals,
  };

  return (
    <AffordoContext.Provider value={value}>{children}</AffordoContext.Provider>
  );
}

/** Read the Affordo state. Throws if used outside an `AffordoProvider`. */
export function useAffordo(): AffordoContextValue {
  const value = useContext(AffordoContext);
  if (value === null) {
    throw new Error("useAffordo must be used within an AffordoProvider");
  }
  return value;
}
