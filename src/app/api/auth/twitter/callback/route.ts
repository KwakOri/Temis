import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const oauthToken = searchParams.get('oauth_token');
  const oauthVerifier = searchParams.get('oauth_verifier');
  const denied = searchParams.get('denied');

  // Handle user denial
  if (denied) {
    return NextResponse.redirect(
      new URL('/my-page?twitter=cancelled', request.url)
    );
  }

  // Handle successful callback
  if (oauthToken && oauthVerifier) {
    // Redirect back to my-page with the tokens
    const callbackUrl = new URL('/my-page', request.url);
    callbackUrl.searchParams.set('twitter', 'callback');
    callbackUrl.searchParams.set('oauth_token', oauthToken);
    callbackUrl.searchParams.set('oauth_verifier', oauthVerifier);
    
    return NextResponse.redirect(callbackUrl);
  }

  // Handle error case
  return NextResponse.redirect(
    new URL('/my-page?twitter=error', request.url)
  );
}