import { useState, useRef, useEffect, useCallback } from 'react';

type AsyncFn<TArgs extends any[], TResult> = (...args: TArgs) => Promise<TResult>;

interface UseAsyncActionReturn<TArgs extends any[], TResult> {
  execute: (...args: TArgs) => Promise<TResult | undefined>;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

export function useAsyncAction<TArgs extends any[], TResult>(
  fn: AsyncFn<TArgs, TResult>,
): UseAsyncActionReturn<TArgs, TResult> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const busyRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async (...args: TArgs): Promise<TResult | undefined> => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await fn(...args);
      if (mountedRef.current) {
        setLoading(false);
      }
      busyRef.current = false;
      return result;
    } catch (e: any) {
      if (mountedRef.current) {
        setError(e.data?.message ?? e.message ?? 'Something went wrong');
        setLoading(false);
      }
      busyRef.current = false;
      return undefined;
    }
  }, [fn]);

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return { execute, loading, error, reset };
}
