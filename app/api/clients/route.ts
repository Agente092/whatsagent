import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Obtener token de la cookie o header
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '') || 
                  '';
    
    // Llamar al backend para obtener clientes
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/clients`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Error al obtener clientes del backend')
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error in /api/clients:', error)
    return NextResponse.json(
      { error: 'Error al cargar clientes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Obtener token de la cookie o header
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '') || 
                  '';
    
    // Enviar datos al backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Backend client creation error:', errorData);
      throw new Error(errorData.message || 'Error al crear cliente en el backend')
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error: unknown) {
    // Manejar correctamente el tipo unknown
    let errorMessage = 'Error al crear cliente';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    console.error('Error in POST /api/clients:', error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}