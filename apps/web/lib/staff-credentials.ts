import type { Staff } from './models'

export type StaffCredentials = { name: string; role: Staff['role']; pin: string }

/**
 * Six digits, the top of the 4–6 range the backend accepts.
 *
 * Uses the platform CSPRNG with rejection sampling rather than `% 10` over raw bytes: 256 is not a
 * multiple of 10, so a plain modulo would make 0–5 measurably likelier than 6–9. This is a sign-in
 * credential, so the bias matters. Bytes at or above 250 are discarded to keep every digit equally
 * likely.
 */
export function generatePin(): string {
  const digits: string[] = []
  const buffer = new Uint8Array(16)
  while (digits.length < 6) {
    crypto.getRandomValues(buffer)
    for (const byte of buffer) {
      if (digits.length === 6) break
      if (byte < 250) digits.push(String(byte % 10))
    }
  }
  return digits.join('')
}

/** The message copied to the clipboard so a manager can paste it straight to the staff member. */
export function credentialMessage(credentials: StaffCredentials): string {
  return [
    'Heavenly Foods — staff sign-in',
    `Name: ${credentials.name}`,
    `Role: ${credentials.role}`,
    `PIN: ${credentials.pin}`,
    '',
    'Please keep this PIN private. It cannot be shown again.',
  ].join('\n')
}
