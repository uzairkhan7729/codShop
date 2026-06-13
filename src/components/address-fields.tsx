'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { COUNTRIES, DEFAULT_COUNTRY, dialFor } from '@/lib/countries';
import { cn } from '@/lib/utils';

/** Country dropdown (value = ISO alpha-2 code). */
export function CountrySelect({
  value,
  onChange,
  className,
  id,
}: {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  id?: string;
}) {
  return (
    <select
      id={id}
      value={value || DEFAULT_COUNTRY}
      onChange={(e) => onChange(e.target.value)}
      className={cn('h-10 w-full rounded-md border bg-background px-3 text-sm', className)}
    >
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

/**
 * Phone input with a country-code dropdown. Stores a combined string like
 * "+1 5551234567". Defaults to the US dial code.
 */
export function PhoneInput({
  value,
  onChange,
  defaultCountry = DEFAULT_COUNTRY,
}: {
  value?: string;
  onChange: (phone: string) => void;
  defaultCountry?: string;
}) {
  // Initialise from an existing value when possible (best-effort).
  const initialMatch = COUNTRIES.find((c) => value?.startsWith(c.dial));
  const [country, setCountry] = useState(initialMatch?.code ?? defaultCountry);
  const [num, setNum] = useState(initialMatch ? (value ?? '').slice(initialMatch.dial.length).trim() : value ?? '');

  const emit = (code: string, number: string) => {
    const trimmed = number.trim();
    onChange(trimmed ? `${dialFor(code)} ${trimmed}` : '');
  };

  return (
    <div className="flex gap-2">
      <select
        aria-label="Country code"
        value={country}
        onChange={(e) => {
          setCountry(e.target.value);
          emit(e.target.value, num);
        }}
        className="h-10 w-24 shrink-0 rounded-md border bg-background px-2 text-sm"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} {c.dial}
          </option>
        ))}
      </select>
      <Input
        type="tel"
        inputMode="tel"
        value={num}
        placeholder="555 123 4567"
        onChange={(e) => {
          setNum(e.target.value);
          emit(country, e.target.value);
        }}
        className="flex-1"
      />
    </div>
  );
}
