import { useCallback, useEffect, useState } from "react";

type AnySchema<T> = { safeParse: (input: unknown) => { success: true; data: T } | { success: false } };

export function useLocalState<T>(key: string, initial: T, schema?: AnySchema<T>) {

  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (schema) {
          const result = schema.safeParse(parsed);
          if (result.success) setValue(result.data);
        } else {
          setValue(parsed as T);
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // ignore
        }
        return resolved;
      });
    },
    [key],
  );

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setValue(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, update, { hydrated, clear }] as const;
}
