type FactItemProps = {
  label: string;
  value: string;
};

export function FactItem({ label, value }: FactItemProps) {
  return (
    <div>
      <p className="text-xs text-warm-stone">{label}</p>
      <p className="mt-1 font-medium text-heritage-navy">{value}</p>
    </div>
  );
}
