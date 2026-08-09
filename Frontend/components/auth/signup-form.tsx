'use client'

import { FormEvent, useState } from 'react'
import { Eye, EyeOff, Leaf, LockKeyhole, Mail, Sprout, User } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { signUp } from '@/lib/auth'

export function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return setError('Enter your name.')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    setError('')
    setLoading(true)
    try {
      await signUp(name.trim(), email, password)
      onSuccess()
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Unable to create account right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-7 shadow-[0_24px_70px_-32px_rgba(25,76,46,0.35)] sm:p-10">
      <div className="mb-8 flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Leaf className="size-6" /></span><span className="font-mono text-sm font-bold tracking-tight text-foreground">PlantGuard AI</span></div>
      <h1 className="font-mono text-3xl font-bold tracking-tight text-foreground">Create your account</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Start protecting your plants with AI-powered insights.</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <label className="block space-y-2 text-sm font-medium">Full name<div className="relative"><input aria-label="Full name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Farmer" className="h-12 w-full rounded-xl border border-input bg-background px-4 pr-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30" /><User className="pointer-events-none absolute right-4 top-3.5 size-4 text-muted-foreground" /></div></label>
        <label className="block space-y-2 text-sm font-medium">Email<div className="relative"><input aria-label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-12 w-full rounded-xl border border-input bg-background px-4 pr-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30" /><Mail className="pointer-events-none absolute right-4 top-3.5 size-4 text-muted-foreground" /></div></label>
        <label className="block space-y-2 text-sm font-medium">Password<div className="relative"><input aria-label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="h-12 w-full rounded-xl border border-input bg-background px-4 pr-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-muted-foreground">{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></div></label>
        {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
        <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">{loading ? <span className="size-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" /> : <><Sprout className="size-4" />Create account</>}</button>
      </form>
      <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-3.5" />Your workspace is protected</div>
    </div>
  )
}
