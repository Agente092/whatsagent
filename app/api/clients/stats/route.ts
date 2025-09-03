import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Obtener token de la cookie o header
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '') || 
                  '';
                  
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