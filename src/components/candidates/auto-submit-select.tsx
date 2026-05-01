"use client";

type AutoSubmitSelectProps = {
  className?: string;
  defaultValue: string;
  name: string;
  options: Array<{
    label: string;
    value: string;
  }>;
};

export function AutoSubmitSelect({ className, defaultValue, name, options }: AutoSubmitSelectProps) {
  return (
    <select
      className={className}
      defaultValue={defaultValue}
      name={name}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
