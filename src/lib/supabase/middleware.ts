import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";
import { sanitizeClickId, trackingAllowed } from "@/lib/tiktok-consent";

const PROTECTED_PREFIXES = ["/dashboard", "/grade"];

// Remember the TikTok click id from ad landing URLs so the Stripe webhook can
// attribute a later purchase. Skipped for visitors we may not track.
function captureTikTokClickId(request: NextRequest, response: NextResponse) {
  const ttclid = sanitizeClickId(request.nextUrl.searchParams.get("ttclid"));
  if (ttclid && trackingAllowed(request.headers)) {
    response.cookies.set("ttclid", ttclid, {
      maxAge: 60 * 60 * 24 * 90,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
  }
  return response;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as never),
        );
      },
    },
  });

  let user = null;
  try {
    user = (await supabase.auth.getUser()).data.user;
  } catch {
    user = null;
  }

  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return captureTikTokClickId(request, NextResponse.redirect(url));
  }

  return captureTikTokClickId(request, response);
}
