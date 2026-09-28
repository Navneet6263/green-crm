import { request } from './runtime';
import { ApiError, unwrap } from './client';
import type { Session } from './types';

export type OtpChallenge = { challenge_id: string; expires_in: number; retry_after: number; message: string };
export async function requestEmailOtp(email: string) {
  try {
    const data = unwrap<OtpChallenge>(await request('/auth/mobile-otp/request', '', { email: email.trim().toLowerCase() }));
    if (!data?.challenge_id || !Number.isFinite(data.retry_after) || !Number.isFinite(data.expires_in)) throw new ApiError('Could not request a login code.');
    return data;
  } catch (error) {
    if (error instanceof ApiError && [404, 503].includes(error.status)) throw new ApiError('Email OTP is not available yet. Please use your password.', error.status);
    throw error;
  }
}
export async function verifyEmailOtp(email: string, challengeId: string, code: string) {
  const data = unwrap<Session>(await request('/auth/mobile-otp/verify', '', { email: email.trim().toLowerCase(), challenge_id: challengeId, code }));
  if (!data?.token || !data.user?.user_id) throw new ApiError('Login response is incomplete.');
  return data;
}
