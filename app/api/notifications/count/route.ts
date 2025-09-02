import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Para entornos estáticos, simplemente retornamos 0 notificaciones
    // Las llamadas reales se hacen desde el cliente con el token
    return NextResponse.json({ count: 0 })
  } catch (error) {
    console.error('Get notifications count API error:', error)
    return NextResponse.json(
      { message: 'Error al obtener notificaciones' },
      { status: 500 }
    )
  }
}
