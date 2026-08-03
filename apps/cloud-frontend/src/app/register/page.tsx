'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';

const registerSchema = z.object({
  name: z.string().min(2, 'Studio name must be at least 2 characters'),
  subdomain: z
    .string()
    .min(2, 'Subdomain must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and dashes are allowed'),
  ownerEmail: z.string().email('Invalid email address'),
  ownerPasswordHash: z.string().min(6, 'Password must be at least 6 characters'),
  ownerFirstName: z.string().min(1, 'First name is required'),
  ownerLastName: z.string().min(1, 'Last name is required'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmitForm = async (data: RegisterFormValues) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/register/studio', data);

      if (response.data?.success) {
        setRegisteredEmail(data.ownerEmail);
        setStep('otp');
      } else {
        setError('Registration failed. Please check inputs.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Error occurred. This email or subdomain might be taken.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVerifyingOtp(true);

    try {
      const response = await api.post('/auth/verify-otp', {
        email: registeredEmail,
        otp: otpCode,
      });

      if (response.data?.success) {
        setStep('otp'); // Keep on success message or redirect
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08080a] px-6 py-12 relative">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-lg space-y-8 relative z-10">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Photo<span className="text-indigo-400">Select</span>
            </span>
          </Link>
          <h2 className="text-3xl font-extrabold text-white">Create your studio</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Set up your studio workspace and start sharing local previews.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-2xl">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'form' ? (
            <form className="space-y-5" onSubmit={handleSubmit(onSubmitForm)}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ownerFirstName" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    First Name
                  </label>
                  <input
                    id="ownerFirstName"
                    type="text"
                    placeholder="Jane"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors text-sm"
                    {...register('ownerFirstName')}
                  />
                  {errors.ownerFirstName && (
                    <p className="mt-1 text-xs text-red-400">{errors.ownerFirstName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="ownerLastName" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Last Name
                  </label>
                  <input
                    id="ownerLastName"
                    type="text"
                    placeholder="Doe"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors text-sm"
                    {...register('ownerLastName')}
                  />
                  {errors.ownerLastName && (
                    <p className="mt-1 text-xs text-red-400">{errors.ownerLastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Studio Brand Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Doe Weddings Co."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors text-sm"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="subdomain" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Subdomain Address
                </label>
                <div className="relative flex items-center">
                  <input
                    id="subdomain"
                    type="text"
                    placeholder="doeweddings"
                    className="w-full pl-4 pr-32 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors text-sm"
                    {...register('subdomain')}
                  />
                  <span className="absolute right-4 text-xs font-semibold text-zinc-500">
                    .studioz.clickone.com
                  </span>
                </div>
                {errors.subdomain && (
                  <p className="mt-1 text-xs text-red-400">{errors.subdomain.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="ownerEmail" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  id="ownerEmail"
                  type="email"
                  placeholder="owner@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors text-sm"
                  {...register('ownerEmail')}
                />
                {errors.ownerEmail && (
                  <p className="mt-1 text-xs text-red-400">{errors.ownerEmail.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="ownerPasswordHash" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  id="ownerPasswordHash"
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors text-sm"
                  {...register('ownerPasswordHash')}
                />
                {errors.ownerPasswordHash && (
                  <p className="mt-1 text-xs text-red-400">{errors.ownerPasswordHash.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-indigo-600/10"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating studio...</span>
                  </>
                ) : (
                  <span>Register Studio</span>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Verify your email</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  We've sent a 6-digit code to <strong className="text-zinc-300">{registeredEmail}</strong>. Check your console log!
                </p>
              </div>

              <form onSubmit={onVerifyOtp} className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center tracking-[1em] font-mono text-xl px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={verifyingOtp || otpCode.length !== 6}
                  className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {verifyingOtp ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify & Continue</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {step === 'form' && (
            <div className="mt-6 text-center text-xs text-zinc-500">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                Log in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
