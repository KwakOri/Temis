import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Twitter API configuration
const TWITTER_API_KEY = process.env.TWITTER_API_KEY!;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET!;

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
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');

  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  return signature;
}

// Generate OAuth header
function generateOAuthHeader(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  tokenSecret: string
) {
  const oauthParams = {
    ...params,
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0'
  };

  console.log('OAuth params before signature:', {
    method,
    url,
    consumer_key: consumerKey.substring(0, 8) + '...',
    access_token: accessToken.substring(0, 8) + '...',
    timestamp: oauthParams.oauth_timestamp,
    nonce: oauthParams.oauth_nonce.substring(0, 8) + '...'
  });

  const signature = generateOAuthSignature(method, url, oauthParams, consumerSecret, tokenSecret);
  
  console.log('Generated OAuth signature:', signature.substring(0, 10) + '...');
  
  const authParams = { ...oauthParams, oauth_signature: signature };
  
  // Remove non-oauth parameters from auth header
  const oauthOnlyParams = Object.keys(authParams)
    .filter(key => key.startsWith('oauth_'))
    .reduce((obj, key) => ({ ...obj, [key]: authParams[key as keyof typeof authParams] }), {} as Record<string, string>);
  
  const authHeader = 'OAuth ' + Object.keys(oauthOnlyParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthOnlyParams[key as keyof typeof oauthOnlyParams])}"`)
    .join(', ');

  return authHeader;
}

// Post tweet with image
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const formData = await request.formData();
    const text = formData.get('text') as string;
    const imageFile = formData.get('image') as File;

    if (!text || !imageFile) {
      return NextResponse.json(
        { error: '텍스트와 이미지가 필요합니다.' },
        { status: 400 }
      );
    }

    // Get user's Twitter tokens
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('twitter_access_token, twitter_access_token_secret, twitter_username')
      .eq('id', Number(user.userId))
      .single();

    if (userError || !userData?.twitter_access_token) {
      return NextResponse.json(
        { error: '트위터 계정이 연동되지 않았습니다.' },
        { status: 400 }
      );
    }

    const { twitter_access_token, twitter_access_token_secret } = userData;

    // Step 1: Upload media to Twitter v1.1 (still supported for media upload)
    const imageBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Upload image using v1.1 API (still supported)
    const mediaUploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';

    const mediaAuthHeader = generateOAuthHeader(
      'POST',
      mediaUploadUrl,
      {},
      TWITTER_API_KEY,
      TWITTER_API_SECRET,
      twitter_access_token!,
      twitter_access_token_secret!
    );

    const mediaFormData = new FormData();
    mediaFormData.append('media_data', base64Image);

    console.log('Uploading media with auth header:', mediaAuthHeader.substring(0, 50) + '...');

    const mediaResponse = await fetch(mediaUploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': mediaAuthHeader
      },
      body: mediaFormData
    });

    if (!mediaResponse.ok) {
      const mediaError = await mediaResponse.text();
      console.error('Twitter media upload error:', mediaError);
      return NextResponse.json(
        { error: '이미지 업로드에 실패했습니다.' },
        { status: 500 }
      );
    }

    const mediaResult = await mediaResponse.json();
    const mediaId = mediaResult.media_id_string;

    console.log('Media uploaded successfully, ID:', mediaId);

    // Step 2: Post tweet with media using v2 API
    const tweetUrl = 'https://api.twitter.com/2/tweets';
    
    const tweetBody = {
      text: text,
      media: {
        media_ids: [mediaId]
      }
    };

    // For v2 API, we need to use JSON body instead of form data
    const tweetAuthHeader = generateOAuthHeader(
      'POST',
      tweetUrl,
      {},  // No query params for JSON body
      TWITTER_API_KEY,
      TWITTER_API_SECRET,
      twitter_access_token!,
      twitter_access_token_secret!
    );

    console.log('Posting tweet with auth header:', tweetAuthHeader.substring(0, 50) + '...');

    const tweetResponse = await fetch(tweetUrl, {
      method: 'POST',
      headers: {
        'Authorization': tweetAuthHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tweetBody)
    });

    if (!tweetResponse.ok) {
      const tweetError = await tweetResponse.text();
      console.error('Twitter post error:', tweetError);
      return NextResponse.json(
        { error: '트윗 게시에 실패했습니다.' },
        { status: 500 }
      );
    }

    const tweetResult = await tweetResponse.json();

    return NextResponse.json({
      success: true,
      message: '트윗이 성공적으로 게시되었습니다!',
      tweetId: tweetResult.data?.id,
      tweetUrl: `https://twitter.com/${userData.twitter_username}/status/${tweetResult.data?.id}`
    });

  } catch (error) {
    console.error('Twitter post error:', error);
    return NextResponse.json(
      { error: '트윗 게시 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}