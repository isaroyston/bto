export const currency = (value: number) =>
  `S$ ${value.toLocaleString("en-SG", { maximumFractionDigits: 0 })}`;

export const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
