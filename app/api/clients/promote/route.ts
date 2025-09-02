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

    // Llamar al backend para promocionar cliente
    const response = await fetch('http://localhost:3001/api/clients/promote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone })
    })

    if (!response.ok) {
      throw new Error('Error al promocionar cliente en el backend')
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error in /api/clients/promote:', error)
    return NextResponse.json(
      { error: 'Error al promocionar cliente' },
      { status: 500 }
    )
  }
}