import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Llamar al backend para obtener estadísticas
    const response = await fetch('http://localhost:3001/api/clients/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Error al obtener estadísticas del backend')
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error in /api/clients/stats:', error)
    return NextResponse.json(
      { error: 'Error al cargar estadísticas' },
      { status: 500 }
    )
  }
}