import { useCallback, useState } from "react";

interface UseClipboardOptions {
    timeout?: number;
}

interface UseClipboardReturn {
    copy: (text: string) => Promise<void>;
    copied: boolean;
    error: Error | null;
}

export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
    const { timeout = 2000 } = options;
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const copy = useCallback(
        async (text: string) => {
            try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setError(null);

                setTimeout(() => {
                    setCopied(false);
                }, timeout);
            } catch (err) {
                setError(err instanceof Error ? err : new Error("Failed to copy"));
                setCopied(false);
            }
        },
        [timeout]
    );

    return { copy, copied, error };
}
