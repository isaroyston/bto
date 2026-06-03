import { useState } from "react";
import { clampNumber } from "../utils/format";

type NumberSliderFieldProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  helperText?: string;
  minLabel?: string;
  maxLabel?: string;
};

export function NumberSliderField({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  helperText,
  minLabel,
  maxLabel,
}: NumberSliderFieldProps) {
  const [draftValue, setDraftValue] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);
  const visibleValue = isFocused ? draftValue : String(value);

  const commitDraftValue = () => {
    const parsed = Number(draftValue);
    setIsFocused(false);

    if (!Number.isFinite(parsed)) {
      setDraftValue(String(value));
      return;
    }

    const nextValue = clampNumber(parsed, min, max);
    setDraftValue(String(nextValue));
    onChange(nextValue);
  };

  const handleSliderChange = (nextValue: number) => {
    setIsFocused(false);
    onChange(nextValue);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        {helperText && (
          <p className="mt-1 text-sm leading-6 text-warm-stone">{helperText}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => handleSliderChange(Number(event.target.value))}
          className="interactive-slider"
          aria-label={label}
        />
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={visibleValue}
          onFocus={() => {
            setDraftValue(String(value));
            setIsFocused(true);
          }}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={commitDraftValue}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              setIsFocused(false);
              setDraftValue(String(value));
              event.currentTarget.blur();
            }
          }}
          className="control w-full text-right tabular-nums"
          aria-label={`${label} amount`}
        />
      </div>

      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-xs text-warm-stone">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}
