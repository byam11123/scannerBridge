import { NextResponse } from 'next/server';

export function corsResponse(data: any, status: number = 200) {
  const response = NextResponse.json(data, { status });
  
  // Allow requests from your Vercel domain and localhost
  response.headers.set('Access-Control-Allow-Origin', '*'); 
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}

// Handle OPTIONS preflight requests
export async function handleOptions() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}
