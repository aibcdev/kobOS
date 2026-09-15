import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/kob/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full rounded-full border border-line bg-paper px-5 text-base text-espresso placeholder:text-subtle outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-espresso/30 focus-visible:ring-2 focus-visible:ring-espresso/20",
          className,
        )}
        {...props}
      />
    );
  },
);
