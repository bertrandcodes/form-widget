'use client';

import { useState } from 'react';

export default function OldForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateUsername = (value: string) => {
    if (value.length > 0 && value.length < 7) {
      setUsernameError('Username must be at least 7 characters long');
    } else {
      setUsernameError('');
    }
  };

  const validatePassword = (value: string) => {
    if (value.length > 0 && value.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
    } else {
      setPasswordError('');
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    validateUsername(value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    // Only validate if there was an error and the user is typing
    if (passwordError) {
      validatePassword(value);
    }
  };

  const handleUsernameBlur = () => {
    validateUsername(username);
  };

  const handlePasswordBlur = () => {
    validatePassword(password);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate both fields on submit
    validateUsername(username);
    validatePassword(password);

    // Don't submit if there are any errors
    if (usernameError || passwordError || username.length < 7 || password.length < 8) {
      return;
    }

    console.log(username, password);
    setUsername('');
    setPassword('');
    setUsernameError('');
    setPasswordError('');
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md p-4">
      {console.log('Old form rerenders')}
      <h2 className="mb-4 text-2xl font-bold">Old Form</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Enter username..."
          className={`w-full rounded-lg border px-4 py-2 text-gray-700 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
            usernameError
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 hover:border-gray-400 focus:border-transparent focus:ring-blue-500'
          }`}
          value={username}
          onChange={handleUsernameChange}
        />
        {usernameError && <p className="mt-1 text-sm text-red-500">{usernameError}</p>}
      </div>
      <div className="mb-4">
        <input
          type="password"
          placeholder="Enter password..."
          className={`w-full rounded-lg border px-4 py-2 text-gray-700 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
            passwordError
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 hover:border-gray-400 focus:border-transparent focus:ring-blue-500'
          }`}
          value={password}
          onChange={handlePasswordChange}
        />
        {passwordError && <p className="mt-1 text-sm text-red-500">{passwordError}</p>}
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
      >
        Submit
      </button>
    </form>
  );
}
