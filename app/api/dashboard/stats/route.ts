import { NextRequest, NextResponse } from 'next/server'

// 🔧 FIXED: Hacer la ruta dinámica para evitar errores de generación estática
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 🔧 MEJORADO: Obtener token de múltiples fuentes de forma más robusta
    let token = ''
    
    // Intentar obtener de header primero (más confiable)
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      token = authHeader.replace('Bearer ', '')
    }
    
    // Solo usar cookies como fallback si no hay header
    if (!token) {
      try {
        const cookieToken = request.cookies.get('token')?.value
        if (cookieToken) {
          token = cookieToken
        }
      } catch (error) {
        console.log('Cookie access failed, continuing without token')
      }
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'Error al obtener estadísticas')
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    // Manejar correctamente el tipo unknown
    let errorMessage = 'Error al obtener estadísticas';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}