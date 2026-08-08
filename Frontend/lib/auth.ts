export const AUTH_KEY = 'plantguard-session'

export type Session = { email: string; name: string }

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null
  const value = window.sessionStorage.getItem(AUTH_KEY)
  return value ? JSON.parse(value) : null
}

export function signIn(email: string, name?: string) {
  const session = { email, name: name?.trim() || email.split('@')[0] }
  window.sessionStorage.setItem(AUTH_KEY, JSON.stringify(session))
  return session
}

export function signOut() {
  window.sessionStorage.removeItem(AUTH_KEY)
}
