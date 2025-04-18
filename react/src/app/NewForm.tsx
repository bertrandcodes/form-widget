'use client';

import { useRef } from 'react';
import InputField from './InputField';

export default function NewForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const validateUsername = (value: string) => {
    if (value.length > 0 && value.length < 7) {
      return 'Username must be at least 7 characters long';
    }
    return null;
  };

  const validatePassword = (value: string) => {
    if (value.length > 0 && value.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
    };
    console.log('Form submitted with data:', data);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mx-auto max-w-md p-4">
      {console.log('New form rerenders')}
      <h2 className="mb-4 text-2xl font-bold">New Form</h2>
      <InputField
        name="username"
        type="text"
        placeholder="Enter username..."
        validate={validateUsername}
      />
      <InputField
        name="password"
        type="password"
        placeholder="Enter password..."
        validate={validatePassword}
      />
      <button
        type="submit"
        className="w-full rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
      >
        Submit
      </button>
    </form>
  );
}
