"use client";

import type { HTMLAttributes } from "react";
import "iconify-icon";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "iconify-icon": HTMLAttributes<HTMLElement> & { icon?: string; "stroke-width"?: string; class?: string };
    }
  }
}

type SaasIconProps = HTMLAttributes<HTMLElement> & {
  icon: string;
  "stroke-width"?: string;
};

export function SaasIcon({ icon, className, ...rest }: SaasIconProps) {
  return <iconify-icon icon={icon} class={className} {...rest} />;
}
