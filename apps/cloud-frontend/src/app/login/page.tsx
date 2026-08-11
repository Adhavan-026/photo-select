'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      if (response.data?.success) {
        const { accessToken, refreshToken, user } = response.data;
        login(accessToken, refreshToken, user);
      } else {
        setError("That email and password don't match.");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "That email and password don't match."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6EDE2] px-6 py-12 relative overflow-hidden text-[#3A2B23]">
      {/* Blurred photo accent anchored bottom-right corner only */}
      <div 
        className="absolute bottom-[-5%] right-[-5%] w-[450px] h-[450px] rounded-full bg-[#E7B6AC]/30 blur-[100px] pointer-events-none"
      />

      <div className="w-full max-w-[420px] space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center justify-center mb-2">
            <span className="font-serif italic text-3xl font-medium tracking-tight text-[#3A2B23] flex items-center gap-2">
              Studioz <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#C17B72]"></span>
            </span>
          </Link>
          <p className="text-sm text-[#6B5B4E]">
            Welcome back — your albums are waiting.
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

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#6B5B4E] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-[3px] bg-[#FFFDF9] border border-[#3A2B23]/15 text-[#3A2B23] placeholder-[#6B5B4E]/50 focus:outline-none focus:border-[#C17B72] text-sm transition-colors"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-[#B5564A]">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-[#6B5B4E] uppercase tracking-wider">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-[#C17B72] hover:underline transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-10 rounded-[3px] bg-[#FFFDF9] border border-[#3A2B23]/15 text-[#3A2B23] placeholder-[#6B5B4E]/50 focus:outline-none focus:border-[#C17B72] text-sm transition-colors"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B5B4E] hover:text-[#3A2B23] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-[#B5564A]">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-[3px] bg-[#C17B72] hover:bg-[#b06a61] disabled:bg-[#C17B72]/50 text-[#FFFDF9] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm shadow-md"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#FFFDF9] border-t-transparent rounded-full animate-spin"></span>
                  <span>Logging in...</span>
                </div>
              ) : (
                <span>Log in</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[#6B5B4E]">
            New studio?{' '}
            <Link href="/register" className="text-[#C17B72] hover:underline font-medium transition-colors">
              Create your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
