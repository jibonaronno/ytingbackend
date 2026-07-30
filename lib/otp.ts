import { randomInt } from "node:crypto";

export function generateOtpCode(length = 6) {
  const max = Number.parseInt("9".repeat(length), 10);
  const min = Number.parseInt(`1${"0".repeat(length - 1)}`, 10);

  return String(randomInt(min, max + 1));
}

export function getOtpExpiryDate(minutes = 10) {
  return new Date(Date.now() + minutes * 60 * 1000);
}
