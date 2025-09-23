import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhone(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Add +51 if it doesn't start with country code
  if (!cleaned.startsWith('51') && cleaned.length === 9) {
    return `51${cleaned}`
  }
  
  return cleaned
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) {
    return 'Fecha no disponible'
  }
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    
    // Verificar si la fecha es válida
    if (isNaN(dateObj.getTime())) {
      return 'Fecha inválida'
    }
    
    return new Intl.DateTimeFormat('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj)
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', date)
    return 'Fecha inválida'
  }
}

export function getTimeUntilExpiry(expiryDate: Date): {
  isExpired: boolean
  isExpiringSoon: boolean
  timeLeft: string
} {
  const now = new Date()
  const expiry = new Date(expiryDate)
  const diffMs = expiry.getTime() - now.getTime()
  
  const isExpired = diffMs <= 0
  const isExpiringSoon = diffMs <= 24 * 60 * 60 * 1000 && diffMs > 0 // 24 hours
  
  if (isExpired) {
    return {
      isExpired: true,
      isExpiringSoon: false,
      timeLeft: 'Expirado'
    }
  }
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) {
    return {
      isExpired: false,
      isExpiringSoon,
      timeLeft: `${days}d ${hours}h`
    }
  } else if (hours > 0) {
    return {
      isExpired: false,
      isExpiringSoon,
      timeLeft: `${hours}h ${minutes}m`
    }
  } else {
    return {
      isExpired: false,
      isExpiringSoon: true,
      timeLeft: `${minutes}m`
    }
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length >= 9 && cleaned.length <= 15
}

export function generateClientId(): string {
  return Math.random().toString(36).substr(2, 9)
}
