import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import createNextIntlPlugin from 'next-intl/plugin';

function mitigateWindowsUserProfileGlobEPERM(phase: string): void {
  if (process.platform !== 'win32') return;
  if (phase !== PHASE_PRODUCTION_BUILD) return;

  const userProfile = process.env.USERPROFILE;
  if (!userProfile) return;

  const legacyJunction = path.join(userProfile, 'Application Data');
  if (!fs.existsSync(legacyJunction)) return;

  const cwd = process.cwd();
  process.env.USERPROFILE = cwd;
  process.env.HOME = cwd;
}

  const nextConfig = (phase: string): NextConfig => {
    mitigateWindowsUserProfileGlobEPERM(phase);
    return {
      poweredByHeader: false,
      eslint: { ignoreDuringBuilds: true },
      async headers() {
        return [
          {
            source: '/(.*)',
            headers: [
              { key: 'X-Frame-Options', value: 'DENY' },
              { key: 'X-Content-Type-Options', value: 'nosniff' },
              { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
              { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
            ],
          },
        ];
      },
    };
  };

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
