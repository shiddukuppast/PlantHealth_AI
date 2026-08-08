'use client'

import { FormEvent, useState } from 'react'
import { Eye, EyeOff, Leaf, LockKeyhole, Mail, Sprout } from 'lucide-react'
import { signIn } from '@/lib/auth'

export function LoginForm({ onSuccess }: { onSuccess: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address.')
    if (!password) return setError('Enter your password.')
    setError('')
    setLoading(true)
    window.setTimeout(() => { signIn(email); onSuccess(email) }, 550)
  }

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-7 shadow-[0_24px_70px_-32px_rgba(25,76,46,0.35)] sm:p-10">
      <div className="mb-8 flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Leaf className="size-6" /></span><span className="font-mono text-sm font-bold tracking-tight text-foreground">PlantGuard AI</span></div>
      <h1 className="font-mono text-3xl font-bold tracking-tight text-foreground">Welcome back</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Sign in to detect plant diseases using AI.</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <label className="block space-y-2 text-sm font-medium">Email<input aria-label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-12 w-full rounded-xl border border-input bg-background px-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30" /><Mail className="pointer-events-none relative -mt-9 ml-auto mr-4 size-4 text-muted-foreground" /></label>
        <label className="block space-y-2 text-sm font-medium">Password<div className="relative"><input aria-label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="h-12 w-full rounded-xl border border-input bg-background px-4 pr-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-muted-foreground"><>{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</></button></div></label>
        <div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2 text-muted-foreground"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-primary" />Remember me</label><button type="button" className="font-medium text-primary hover:underline">Forgot password?</button></div>
        {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
        <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">{loading ? <span className="size-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" /> : <><Sprout className="size-4" />Sign In</>}</button>
      </form>
      <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-3.5" />Your workspace is protected</div>
      <p className="mt-6 text-center text-sm text-muted-foreground">Don&apos;t have an account? <a href="/signup" className="font-semibold text-primary hover:underline">Create one</a></p>
    </div>
  )
}
