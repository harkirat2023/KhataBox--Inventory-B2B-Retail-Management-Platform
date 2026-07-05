import { NextRequest, NextResponse } from "next/server"

interface Coupon {
  code: string
  label: string
  discountType: "flat" | "percent"
  discountValue: number
  minCartValue: number
  maxDiscount: number | null
}

const COUPONS: Coupon[] = [
  { code: "WELCOME50", label: "Welcome ₹50 off", discountType: "flat", discountValue: 50, minCartValue: 300, maxDiscount: null },
  { code: "FLAT100", label: "Flat ₹100 off", discountType: "flat", discountValue: 100, minCartValue: 500, maxDiscount: null },
  { code: "FLAT200", label: "Flat ₹200 off", discountType: "flat", discountValue: 200, minCartValue: 1000, maxDiscount: null },
  { code: "PCT10", label: "10% off (max ₹150)", discountType: "percent", discountValue: 10, minCartValue: 400, maxDiscount: 150 },
  { code: "PCT20", label: "20% off (max ₹500)", discountType: "percent", discountValue: 20, minCartValue: 800, maxDiscount: 500 },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { coupon_code, cart_total } = body as {
      coupon_code?: string
      cart_total?: number
    }

    if (!coupon_code) {
      return NextResponse.json({ valid: false, error: "No coupon code provided" })
    }

    const normalized = coupon_code.toUpperCase().trim()
    const coupon = COUPONS.find((c) => c.code === normalized)

    if (!coupon) {
      return NextResponse.json({ valid: false, error: "Invalid coupon code" })
    }

    const total = cart_total || 0
    if (total < coupon.minCartValue) {
      return NextResponse.json({
        valid: false,
        error: `Minimum cart value of ₹${coupon.minCartValue} required for this coupon`,
        coupon: coupon.code,
        minCartValue: coupon.minCartValue,
      })
    }

    let discount = 0
    if (coupon.discountType === "flat") {
      discount = coupon.discountValue
    } else {
      discount = Math.round((total * coupon.discountValue) / 100)
      if (coupon.maxDiscount !== null && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount
      }
    }

    if (discount > total) {
      discount = total
    }

    return NextResponse.json({
      valid: true,
      coupon: coupon.code,
      label: coupon.label,
      discount_type: coupon.discountType,
      discount,
      new_total: Math.round((total - discount) * 100) / 100,
      message: `${coupon.label} applied! You save ₹${discount}`,
    })
  } catch (err) {
    console.error("Coupon error:", err)
    return NextResponse.json({ valid: false, error: "Failed to process coupon" }, { status: 500 })
  }
}
