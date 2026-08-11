'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Heart, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';

const registerSchema = z
  .object({
    studioName: z.string().min(2, 'Studio name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      terms: false,
    },
  });

  const studioNameValue = watch('studioName');
  const emailValue = watch('email');
  const passwordValue = watch('password') || '';
  const confirmPasswordValue = watch('confirmPassword') || '';

  // Password strength logic (4 segments: Weak, Fair, Strong)
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-[#B5564A]' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-[#B4863F]' };
    return { score: 4, label: 'Strong', color: 'bg-[#8A9678]' };
  };

  const strength = getPasswordStrength(passwordValue);

  const onSubmit = async (data: RegisterFormValues) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/register', {
        studioName: data.studioName,
        email: data.email,
        password: data.password,
      });

      if (response.data?.success) {
        const { accessToken, refreshToken, user } = response.data;
        login(accessToken, refreshToken, user);
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to create studio account.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6EDE2] px-6 py-12 relative overflow-hidden text-[#3A2B23]">
      {/* Blurred photo accent anchored bottom-left corner for visual rhythm */}
      <div 
        className="absolute bottom-[-5%] left-[-5%] w-[450px] h-[450px] rounded-full bg-[#E7B6AC]/30 blur-[100px] pointer-events-none"
      />

      <div className="w-full max-w-[480px] space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center justify-center mb-2">
            <span className="font-serif italic text-3xl font-medium tracking-tight text-[#3A2B23] flex items-center gap-2">
              Studioz <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#B4863F]"></span>
            </span>
          </Link>
          <p className="text-sm text-[#6B5B4E]">
            Start delivering warm, tactile photo selection galleries.
          </p>
        </div>

        <div className="paper-card p-8 bg-[#FFFDF9] border border-[#3A2B23]/10 rounded-[3px] shadow-[0_8px_20px_rgba(58,43,35,0.10)]">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="flex items-center gap-2 p-3.5 rounded-[3px] bg-[#B5564A]/08 border-l-3 border-[#B5564A] text-xs text-[#B5564A] font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Studio Name */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                {studioNameValue && studioNameValue.length >= 2 && (
                  <Heart className="h-3 w-3 fill-[#8A9678] text-[#8A9678] animate-fade-in" />
                )}
                <label htmlFor="studioName" className="block text-xs font-semibold text-[#6B5B4E] uppercase tracking-wider">
                  Studio Name
                </label>
              </div>
              <input
                id="studioName"
                type="text"
                placeholder="e.g. Royal Wedding Studio"
                className="w-full px-4 py-3 rounded-[3px] bg-[#FFFDF9] border border-[#3A2B23]/15 text-[#3A2B23] placeholder-[#6B5B4E]/40 focus:outline-none focus:border-[#C17B72] text-sm transition-colors"
                {...register('studioName')}
              />
              {errors.studioName && (
                <p className="mt-1 text-xs text-[#B5564A]">{errors.studioName.message}</p>
              )}
            </div>

            {/* Owner Email */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                {emailValue && z.string().email().safeParse(emailValue).success && (
                  <Heart className="h-3 w-3 fill-[#8A9678] text-[#8A9678] animate-fade-in" />
                )}
                <label htmlFor="email" className="block text-xs font-semibold text-[#6B5B4E] uppercase tracking-wider">
                  Owner Email
                </label>
              </div>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-[3px] bg-[#FFFDF9] border border-[#3A2B23]/15 text-[#3A2B23] placeholder-[#6B5B4E]/40 focus:outline-none focus:border-[#C17B72] text-sm transition-colors"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-[#B5564A]">{errors.email.message}</p>
              )}
            </div>

            {/* Password with 4-segment strength meter */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                {passwordValue && passwordValue.length >= 6 && (
                  <Heart className="h-3 w-3 fill-[#8A9678] text-[#8A9678] animate-fade-in" />
                )}
                <label htmlFor="password" className="block text-xs font-semibold text-[#6B5B4E] uppercase tracking-wider">
                  Password
                </label>
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-[3px] bg-[#FFFDF9] border border-[#3A2B23]/15 text-[#3A2B23] placeholder-[#6B5B4E]/40 focus:outline-none focus:border-[#C17B72] text-sm transition-colors"
                {...register('password')}
              />
              {passwordValue && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#6B5B4E]">
                    <span>Strength</span>
                    <span className="font-medium">{strength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 h-1.5 w-full">
                    <div className={`h-full rounded-xs transition-colors ${strength.score >= 1 ? strength.color : 'bg-[#EFE2D2]'}`} />
                    <div className={`h-full rounded-xs transition-colors ${strength.score >= 2 ? strength.color : 'bg-[#EFE2D2]'}`} />
                    <div className={`h-full rounded-xs transition-colors ${strength.score >= 3 ? strength.color : 'bg-[#EFE2D2]'}`} />
                    <div className={`h-full rounded-xs transition-colors ${strength.score >= 4 ? strength.color : 'bg-[#EFE2D2]'}`} />
                  </div>
                </div>
              )}
              {errors.password && (
                <p className="mt-1 text-xs text-[#B5564A]">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {confirmPasswordValue && passwordValue === confirmPasswordValue && (
                    <Heart className="h-3 w-3 fill-[#8A9678] text-[#8A9678] animate-fade-in" />
                  )}
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold text-[#6B5B4E] uppercase tracking-wider">
                    Confirm Password
                  </label>
                </div>
                {confirmPasswordValue && passwordValue === confirmPasswordValue && (
                  <span className="text-xs text-[#8A9678] flex items-center gap-1 font-medium">
                    <Check className="h-3.5 w-3.5" /> Matches
                  </span>
                )}
              </div>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-[3px] bg-[#FFFDF9] border border-[#3A2B23]/15 text-[#3A2B23] placeholder-[#6B5B4E]/40 focus:outline-none focus:border-[#C17B72] text-sm transition-colors"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-[#B5564A]">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Custom Terms Checkbox */}
            <div className="flex items-start gap-3 pt-1">
              <input
                id="terms"
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded-[2px] accent-[#C17B72] border-[#3A2B23]/20 text-[#C17B72] focus:ring-[#C17B72] cursor-pointer"
                {...register('terms')}
              />
              <label htmlFor="terms" className="text-xs text-[#6B5B4E] leading-relaxed cursor-pointer select-none">
                I agree to the{' '}
                <Link href="/terms" className="text-[#C17B72] hover:underline font-medium">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-[#C17B72] hover:underline font-medium">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>
            {errors.terms && (
              <p className="text-xs text-[#B5564A]">{errors.terms.message}</p>
            )}

            {/* Commit CTA: --gold background with dark ink text */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-[3px] bg-[#B4863F] hover:bg-[#a37835] disabled:bg-[#B4863F]/50 text-[#3A2B23] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm shadow-md"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#3A2B23] border-t-transparent rounded-full animate-spin"></span>
                  <span>Creating Studio Account...</span>
                </div>
              ) : (
                <span>Create Studio Account</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[#6B5B4E]">
            Already have a studio account?{' '}
            <Link href="/login" className="text-[#C17B72] hover:underline font-medium transition-colors">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
