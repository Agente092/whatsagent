'use client'

import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

interface MobileMenuButtonProps {
  isOpen: boolean
  onClick: () => void
}

export default function MobileMenuButton({ isOpen, onClick }: MobileMenuButtonProps) {
  // Ocultar completamente cuando el menú está abierto
  if (isOpen) return null
  
  return (
    <div className="lg:hidden fixed top-4 left-4 z-[100]">
      <Button
        variant="outline"
        size="icon"
        onClick={onClick}
        className="bg-white shadow-lg h-12 w-12 border-2 border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200"
      >
        <Menu className="h-5 w-5" />
      </Button>
    </div>
  )
}