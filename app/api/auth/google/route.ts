import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: 'ID Token is required' }, { status: 400 });
    }

    // Verify token with Google's API
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!googleRes.ok) {
      return NextResponse.json({ error: 'Invalid Google ID Token' }, { status: 400 });
    }

    const payload = await googleRes.json();
    const email = payload.email?.toLowerCase().trim();
    const name = payload.name;
    const googleId = payload.sub; // Google User ID

    if (!email) {
      return NextResponse.json({ error: 'Email not provided by Google' }, { status: 400 });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create a new user with Google login
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          passwordHash: `GOOGLE_AUTH_${googleId}`, // Mock password hash for Google OAuth users
        },
      });
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    // Set session cookie
    response.cookies.set('user_id', user.id, { httpOnly: true, path: '/' });
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Google Auth failed' }, { status: 500 });
  }
}
