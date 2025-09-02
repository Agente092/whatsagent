import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Llamar al backend para obtener clientes
    const response = await fetch('http://localhost:3001/api/clients', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
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
    
    // Enviar datos al backend
    const response = await fetch('http://localhost:3001/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error('Error al crear cliente en el backend')
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error in POST /api/clients:', error)
    return NextResponse.json(
      { error: 'Error al crear cliente' },
      { status: 500 }
    )
  }
}