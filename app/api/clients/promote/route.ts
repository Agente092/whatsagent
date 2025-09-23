import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()
    
    if (!phone) {
      return NextResponse.json(
        { error: 'Número de teléfono requerido' },
        { status: 400 }
      )
    }

    // Obtener token de la cookie o header
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '') || 
                  '';
                  
    // Llamar al backend para promocionar cliente
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/clients/promote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ phone })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al promocionar cliente en el backend')
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error: unknown) {
    // Manejar correctamente el tipo unknown
    let errorMessage = 'Error al promocionar cliente';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    console.error('Error in /api/clients/promote:', error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}