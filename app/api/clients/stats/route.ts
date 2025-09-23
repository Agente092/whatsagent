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
                  
    // Llamar al backend para obtener estadísticas
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/clients/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al obtener estadísticas del backend')
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error: unknown) {
    // Manejar correctamente el tipo unknown
    let errorMessage = 'Error al cargar estadísticas';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    console.error('Error in /api/clients/stats:', error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}