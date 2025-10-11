import { requireAuth } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

// Twitter OAuth 1.1 configuration
const TWITTER_API_KEY = process.env.TWITTER_API_KEY!;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET!;
const TWITTER_CALLBACK_URL =
  process.env.TWITTER_CALLBACK_URL ||
  `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/twitter/callback`;

// OAuth 1.1 signature generation
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ""
) {
  // Sort parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    )
    .join("&");

  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join("&");

  // Create signing key
  const signingKey = `${encodeURIComponent(
    consumerSecret
  )}&${encodeURIComponent(tokenSecret)}`;

  // Generate signature
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBaseString)
    .digest("base64");

  return signature;
}

// Generate OAuth header
function generateOAuthHeader(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerKey: string,
  consumerSecret: string,
  tokenSecret: string = ""
) {
  const signature = generateOAuthSignature(
    method,
    url,
    params,
    consumerSecret,
    tokenSecret
  );

  const authParams = { ...params, oauth_signature: signature };

  const authHeader =
    "OAuth " +
    Object.keys(authParams)
      .sort()
      .map(
        (key) =>
          `${encodeURIComponent(key)}="${encodeURIComponent(
            authParams[key as keyof typeof authParams]
          )}"`
      )
      .join(", ");

  return authHeader;
}

// Request token endpoint
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "request_token") {
      // Step 1: Request token from Twitter
      const oauthParams = {
        oauth_callback: TWITTER_CALLBACK_URL,
        oauth_consumer_key: TWITTER_API_KEY,
        oauth_nonce: crypto.randomBytes(16).toString("hex"),
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_version: "1.0",
      };

      const requestTokenUrl = "https://api.twitter.com/oauth/request_token";
      const authHeader = generateOAuthHeader(
        "POST",
        requestTokenUrl,
        oauthParams,
        TWITTER_API_KEY,
        TWITTER_API_SECRET
      );

      const response = await fetch(requestTokenUrl, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Twitter request token error:", error);
        return NextResponse.json(
          { error: "트위터 인증 요청에 실패했습니다." },
          { status: 500 }
        );
      }

      const responseBody = await response.text();
      const params = new URLSearchParams(responseBody);

      const oauthToken = params.get("oauth_token");
      const oauthTokenSecret = params.get("oauth_token_secret");

      if (!oauthToken || !oauthTokenSecret) {
        return NextResponse.json(
          { error: "트위터 토큰을 받아올 수 없습니다." },
          { status: 500 }
        );
      }

      // Store token secret temporarily (in a real app, use Redis or database)
      // For now, we'll return it and handle it on the client side
      const authUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${oauthToken}`;

      return NextResponse.json({
        success: true,
        authUrl,
        oauthToken,
        oauthTokenSecret, // In production, store this server-side
      });
    }

    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  } catch (error) {
    console.error("Twitter auth error:", error);
    return NextResponse.json(
      { error: "트위터 인증 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// Handle access token exchange
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { oauthToken, oauthVerifier, oauthTokenSecret } = body;

    if (!oauthToken || !oauthVerifier || !oauthTokenSecret) {
      return NextResponse.json(
        { error: "필수 매개변수가 누락되었습니다." },
        { status: 400 }
      );
    }

    // Step 3: Exchange for access token
    const oauthParams = {
      oauth_consumer_key: TWITTER_API_KEY,
      oauth_nonce: crypto.randomBytes(16).toString("hex"),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: oauthToken,
      oauth_verifier: oauthVerifier,
      oauth_version: "1.0",
    };

    const accessTokenUrl = "https://api.twitter.com/oauth/access_token";
    const authHeader = generateOAuthHeader(
      "POST",
      accessTokenUrl,
      oauthParams,
      TWITTER_API_KEY,
      TWITTER_API_SECRET,
      oauthTokenSecret
    );

    const response = await fetch(accessTokenUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Twitter access token error:", error);
      return NextResponse.json(
        { error: "트위터 액세스 토큰 교환에 실패했습니다." },
        { status: 500 }
      );
    }

    const responseBody = await response.text();
    const params = new URLSearchParams(responseBody);

    const accessToken = params.get("oauth_token");
    const accessTokenSecret = params.get("oauth_token_secret");
    const twitterUserId = params.get("user_id");
    const twitterUsername = params.get("screen_name");

    if (!accessToken || !accessTokenSecret || !twitterUserId) {
      return NextResponse.json(
        { error: "트위터 액세스 토큰이 유효하지 않습니다." },
        { status: 500 }
      );
    }

    // Save Twitter credentials to user record
    const { error: updateError } = await supabase
      .from("users")
      .update({
        twitter_access_token: accessToken,
        twitter_access_token_secret: accessTokenSecret,
        twitter_user_id: twitterUserId,
        twitter_username: twitterUsername,
        twitter_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", Number(user.userId));

    if (updateError) {
      console.error("Database update error:", updateError);
      return NextResponse.json(
        { error: "트위터 계정 연동 정보 저장에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "트위터 계정이 성공적으로 연동되었습니다.",
      twitterUsername,
      connectedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Twitter access token error:", error);
    return NextResponse.json(
      { error: "트위터 계정 연동 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
