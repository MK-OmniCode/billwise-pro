import { Input } from "@/components/ui/input";
import * as React from "react";

type Props = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number | null | undefined;
  onChange: (n: number) => void;
  allowEmpty?: boolean; // if true, empty string -> 0 silently
};

/**
 * Numeric input that does NOT show a sticky leading "0".
 * - If value is 0/null/undefined => shows empty string.
 * - Accepts decimals naturally (e.g. 3.5).
 * - Selects content on focus so the user can overwrite without manually clearing.
 */
export function NumberInput({ value, onChange, onFocus, ...rest }: Props) {
  const display = value === 0 || value === null || value === undefined || Number.isNaN(value as number)
    ? ""
    : String(value);

  return (
    <Input
      {...rest}
      type="number"
      inputMode="decimal"
      value={display}
      onFocus={(e) => { e.currentTarget.select(); onFocus?.(e); }}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || v === "-") { onChange(0); return; }
        const n = Number(v);
        onChange(Number.isFinite(n) ? n : 0);
      }}
    />
  );
}
