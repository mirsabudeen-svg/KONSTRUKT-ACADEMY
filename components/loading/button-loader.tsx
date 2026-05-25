import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonLoaderProps = ComponentProps<typeof Button> & {
  loading?: boolean;
  loadingText?: string;
};

export function ButtonLoader({
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: ButtonLoaderProps) {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      className={cn(className)}
      aria-busy={loading}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
