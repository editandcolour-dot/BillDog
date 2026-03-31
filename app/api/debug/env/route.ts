import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    hasMerchantId: !!process.env.PAYFAST_MERCHANT_ID,
    merchantIdLength: process.env.PAYFAST_MERCHANT_ID?.length,
    merchantIdFirst3: process.env.PAYFAST_MERCHANT_ID?.substring(0, 3),
    hasSandbox: !!process.env.PAYFAST_SANDBOX,
    sandboxValue: process.env.PAYFAST_SANDBOX,
  })
}
