import { createApiClient } from './client';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://greencall.online/api';
let expiredHandler: ((token: string) => void) | undefined;
export const onSessionExpired = (handler?: (token: string) => void) => { expiredHandler = handler; };
export const request = createApiClient(API_BASE, {
  development: __DEV__, onUnauthorized: token => expiredHandler?.(token),
});
