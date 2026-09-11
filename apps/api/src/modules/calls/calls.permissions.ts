import type { UserRole } from "@skygem/shared";

export interface CallPermissions {
  canBrowseCalls: boolean;
  canViewSummary: boolean;
  canViewTranscript: boolean;
  canViewPhoneNumbers: boolean;
}

export function callPermissionsFor(role: UserRole): CallPermissions {
  if (role === "owner" || role === "admin") {
    return {
      canBrowseCalls: true,
      canViewSummary: true,
      canViewTranscript: true,
      canViewPhoneNumbers: true
    };
  }

  if (role === "member") {
    return {
      canBrowseCalls: true,
      canViewSummary: true,
      canViewTranscript: false,
      canViewPhoneNumbers: false
    };
  }

  return {
    canBrowseCalls: false,
    canViewSummary: false,
    canViewTranscript: false,
    canViewPhoneNumbers: false
  };
}
