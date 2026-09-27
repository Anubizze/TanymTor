export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return "Пароль должен содержать минимум 6 символов";
  }
  return null;
}

export function validateName(name: string): string | null {
  if (name.trim().length < 2) {
    return "Введите имя (минимум 2 символа)";
  }
  return null;
}
