import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Para entornos estáticos, simplemente retornamos un objeto vacío
    // Las llamadas reales se hacen desde el cliente con el token
    return NextResponse.json({
      totalClients: 0,
      activeClients: 0,
      expiredClients: 0,
      totalMessages: 0,
      todayMessages: 0,
      expiringToday: 0
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { message: 'Error al obtener estadísticas' },
      { status: 500 }
    )
  }
}