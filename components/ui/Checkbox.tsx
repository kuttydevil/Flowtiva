import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const id = React.useId();
    return (
      <input
        id={id}
        type="checkbox"
        ref={ref}
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className={`h-4 w-4 shrink-0 rounded border-brand-border text-brand-accent focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-brand-primary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  }
);
Checkbox.displayName = 'Checkbox';
