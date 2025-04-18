'use client';

import { InputHTMLAttributes, useState, useCallback } from 'react';

interface InputFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  validate?: (value: string) => string | null;
  onChange?: (value: string) => void;
  initialValue?: string;
}

export default function InputField({
  validate,
  className = '',
  initialValue = '',
  onChange,
  ...props
}: InputFieldProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      onChange?.(newValue);
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    if (validate) {
      const errorMessage = validate(value);
      setError(errorMessage);
    }
  }, [validate, value]);

  return (
    <div className="mb-4">
      <input
        {...props}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`w-full rounded-lg border bg-white px-4 py-2 text-gray-700 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 hover:border-gray-400 focus:border-transparent focus:ring-blue-500'
        } ${className}`}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
