import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:3001'}/api/dashboard/stats`, {
      headers: {
        'Authorization': authHeader || '',
      },
    })

    const data = await response.json()

    if (response.ok) {
      return NextResponse.json(data)
    } else {
      return NextResponse.json(data, { status: response.status })
    }
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { message: 'Error al obtener estadísticas' },
      { status: 500 }
    )
  }
}
