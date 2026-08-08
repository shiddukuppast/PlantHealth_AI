'use client'

import { useRouter } from 'next/navigation'
import { Leaf, ScanLine, ShieldCheck, Sparkles } from 'lucide-react'
import { LoginForm } from '@/components/auth/login-form'

export default function Page() {
  const router = useRouter()
  return <main className="min-h-screen bg-background lg:grid lg:grid-cols-[1.05fr_0.95fr]">
    <section className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between"><div className="absolute inset-0 opacity-10 [background-image:linear-gradient(135deg,transparent_0_48%,currentColor_49%_50%,transparent_51%)] [background-size:36px_36px]" /><div className="relative"><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-primary-foreground/15"><Leaf className="size-6" /></span><span className="font-mono font-bold">PlantGuard AI</span></div><div className="mt-28 max-w-lg"><p className="mb-5 flex items-center gap-2 text-sm font-medium text-primary-foreground/70"><Sparkles className="size-4" /> Intelligent crop care, simplified</p><h2 className="font-mono text-5xl font-bold leading-tight tracking-tight">See what your plants are trying to tell you.</h2><p className="mt-6 max-w-md text-base leading-7 text-primary-foreground/70">Turn a single leaf image into a clearer next step with focused, AI-powered plant health analysis.</p></div></div><div className="relative flex items-center gap-8 text-sm text-primary-foreground/70"><span className="flex items-center gap-2"><ScanLine className="size-4" /> Fast analysis</span><span className="flex items-center gap-2"><ShieldCheck className="size-4" /> Private workspace</span></div></section>
    <section className="flex min-h-screen items-center justify-center p-5 sm:p-10"><LoginForm onSuccess={() => router.push('/dashboard')} /></section>
  </main>
}
