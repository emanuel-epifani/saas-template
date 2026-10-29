"use client";

import { AuthView } from "@daveyplate/better-auth-ui";
import { useRouter } from "next/navigation";

// With cacheComponents, Next.js keeps visited pages alive inside React
// <Activity> subtrees (restored, not remounted). better-auth-ui guards several
// one-shot mount effects with a useRef flag that stays true when the subtree
// is restored (SignOut.signingOut, AuthCallback.isRedirecting,
// OneTap.oneTapFetched, ResetPasswordForm.tokenChecked), so a second
// soft-navigation to such a view renders its spinner forever without firing
// the action (confirmed: no POST /api/auth/sign-out on the second visit).
// bfcacheId changes on every push/replace navigation, so keying AuthView with
// it forces a fresh mount; browser back/forward still restores as designed.
export function AuthViewWithReset({ path }: { path: string }) {
  const { bfcacheId } = useRouter();
  return <AuthView key={bfcacheId} path={path} />;
}
