// dev/src/middleware/auth-guard.tsx
'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUserStore } from '@/store';
import { z } from 'zod';
import type { IndividualProfile, EnterpriseProfile, User } from '@/types';
import type { PlatformRoleKey, UserCapabilities } from '@/lib/capabilities';

// 轻量守卫：在私有布局中使用，未登录则跳转登录
export function useAuthGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const hasBootstrappedRef = useRef(false);

  const { isAuthenticated, setUser, setProfile, setAuthMeta, setLoading, logout } = useUserStore();

  useEffect(() => {
    if (!pathname) return;

    if (hasBootstrappedRef.current && isAuthenticated) return;
    hasBootstrappedRef.current = true;

    const platformRoleSchema = z.enum([
      'END_USER',
      'LAWYER',
      'ARBITRATOR',
      'MEDIATOR',
      'COURT',
      'NOTARY',
      'ADMIN',
      'OPS_ADMIN',
      'AUDITOR_READONLY',
      'APPLICANT',
      'RESPONDENT',
    ]);

    const capabilitiesSchema: z.ZodType<UserCapabilities> = z.object({
      nav: z.array(z.string()),
      actions: z.array(z.string()),
      admin: z.object({
        canAccessOps: z.boolean(),
        canAccessAdmin: z.boolean(),
      }),
    }) as z.ZodType<UserCapabilities>;

    const authMeSchema = z.object({
      success: z.literal(true),
      data: z.object({
        user: z.object({
          id: z.string(),
          email: z.string().email(),
          phone: z.string().nullable().optional(),
          userType: z.union([z.literal('INDIVIDUAL'), z.literal('ENTERPRISE')]),
          status: z.union([z.literal('ACTIVE'), z.literal('INACTIVE'), z.literal('SUSPENDED')]),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          profile: z
            .object({
              profileType: z.union([z.literal('INDIVIDUAL'), z.literal('ENTERPRISE')]),
              realName: z.string().nullable().optional(),
              idNumber: z.string().nullable().optional(),
              idCardFrontUrl: z.string().nullable().optional(),
              idCardBackUrl: z.string().nullable().optional(),
              faceVerificationData: z.string().nullable().optional(),
              companyName: z.string().nullable().optional(),
              businessLicense: z.string().nullable().optional(),
              legalRepresentative: z.string().nullable().optional(),
              legalRepIdNumber: z.string().nullable().optional(),
              companyAddress: z.string().nullable().optional(),
              verificationStatus: z.union([z.literal('PENDING'), z.literal('VERIFIED'), z.literal('REJECTED')]).optional(),
              verifiedAt: z.string().nullable().optional(),
              verificationDocuments: z.unknown().optional(),
            })
            .nullable()
            .optional(),
        }),
        platformRoles: z.array(platformRoleSchema).default([]),
        capabilities: capabilitiesSchema.optional(),
      }),
    });

    const toUserType = (value: 'INDIVIDUAL' | 'ENTERPRISE'): User['userType'] =>
      value === 'ENTERPRISE' ? 'enterprise' : 'individual';

    const toUserStatus = (value: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): User['status'] => {
      if (value === 'SUSPENDED') return 'suspended';
      if (value === 'INACTIVE') return 'inactive';
      return 'active';
    };

    const toVerificationStatus = (
      value: 'PENDING' | 'VERIFIED' | 'REJECTED' | undefined
    ): IndividualProfile['verificationStatus'] => {
      if (value === 'VERIFIED') return 'verified';
      if (value === 'REJECTED') return 'rejected';
      return 'pending';
    };

    const bootstrap = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const json: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          logout();
          router.replace('/login');
          return;
        }

        const parsed = authMeSchema.safeParse(json);
        if (!parsed.success) {
          logout();
          router.replace('/login');
          return;
        }

        const me = parsed.data.data;
        const platformRoles = me.platformRoles as PlatformRoleKey[];

        const mappedUser: User = {
          id: me.user.id,
          email: me.user.email,
          phone: me.user.phone ?? null,
          userType: toUserType(me.user.userType),
          status: toUserStatus(me.user.status),
          roles: platformRoles,
          createdAt: me.user.createdAt ? new Date(me.user.createdAt) : undefined,
          updatedAt: me.user.updatedAt ? new Date(me.user.updatedAt) : undefined,
        };

        let mappedProfile: IndividualProfile | EnterpriseProfile | null = null;
        const profile = me.user.profile ?? null;
        if (profile) {
          if (profile.profileType === 'ENTERPRISE') {
            mappedProfile = {
              userId: me.user.id,
              companyName: profile.companyName ?? null,
              businessLicense: profile.businessLicense ?? null,
              legalRepresentative: profile.legalRepresentative ?? null,
              legalRepIdNumber: profile.legalRepIdNumber ?? null,
              verificationStatus: toVerificationStatus(profile.verificationStatus),
              verifiedAt: profile.verifiedAt ? new Date(profile.verifiedAt) : null,
              verificationDocuments: Array.isArray(profile.verificationDocuments)
                ? profile.verificationDocuments.filter((v): v is string => typeof v === 'string')
                : undefined,
              phone: me.user.phone ?? null,
              address: profile.companyAddress ?? null,
            };
          } else {
            const images = [profile.idCardFrontUrl, profile.idCardBackUrl].filter(
              (v): v is string => typeof v === 'string' && v.length > 0
            );
            mappedProfile = {
              userId: me.user.id,
              realName: profile.realName ?? null,
              idNumber: profile.idNumber ?? null,
              idCardImages: images.length > 0 ? images : undefined,
              faceVerificationData: profile.faceVerificationData ?? null,
              verificationStatus: toVerificationStatus(profile.verificationStatus),
              verifiedAt: profile.verifiedAt ? new Date(profile.verifiedAt) : null,
              phone: me.user.phone ?? null,
              address: profile.companyAddress ?? null,
            };
          }
        }

        setUser(mappedUser);
        setProfile(mappedProfile);
        setAuthMeta(platformRoles, me.capabilities ?? null);
      } catch {
        logout();
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [isAuthenticated, logout, pathname, router, setAuthMeta, setLoading, setProfile, setUser]);
}
