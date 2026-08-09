import { AuthResponse, getCurrentUser, login, logout, signup } from '@/lib/api'

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  return login(email, password)
}

export async function signUp(name: string, email: string, password: string): Promise<AuthResponse> {
  return signup(name, email, password)
}

export async function getSession() {
  try {
    return await getCurrentUser()
  } catch {
    return null
  }
}

export async function signOut() {
  await logout()
}

