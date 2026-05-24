export const parseMonth = (value: string) => {
  const [year, month] = value.split("-");
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  if (!parsedYear || !parsedMonth) return new Date();
  return new Date(parsedYear, parsedMonth - 1, 1);
};

export const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

export const addWeeks = (date: Date, weeks: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + weeks * 7);

export const formatMonthYear = (date: Date) =>
  date.toLocaleString("en-SG", { month: "short", year: "numeric" });
