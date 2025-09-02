import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Para el build estático retornamos datos vacíos
    // La llamada real se hará desde el cliente
    return NextResponse.json({
      total: 0,
      active: 0,
      expired: 0,
      new: 0
    })
  } catch (error) {
    console.error('Error in /api/clients/stats:', error)
    return NextResponse.json(
      { error: 'Error al cargar estadísticas' },
      { status: 500 }
    )
  }
}