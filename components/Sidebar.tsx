'use client'

import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Shield,
  DollarSign
} from 'lucide-react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Vista general del sistema'
  },
  {
    name: 'Clientes',
    href: '/dashboard/clients',
    icon: Users,
    description: 'Gestión de suscriptores'
  },
  {
    name: 'Consumo API',
    href: '/dashboard/api-usage',
    icon: DollarSign,
    description: 'Costos de API por usuario'
  },
  {
    name: 'Bot Status',
    href: '/dashboard/bot',
    icon: Shield,
    description: 'Estado del WhatsApp Bot'
  },
  {
    name: 'Configuración',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Ajustes del sistema'
  }
]

interface SidebarProps {
  isMobileMenuOpen?: boolean
  setIsMobileMenuOpen?: (open: boolean) => void
}

export default function Sidebar({ isMobileMenuOpen = false, setIsMobileMenuOpen }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-[90]"
          onClick={() => setIsMobileMenuOpen?.(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed lg:static inset-y-0 left-0 z-[95] w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col shadow-xl lg:shadow-none",
        // En desktop (lg+): siempre visible
        // En mobile: mostrar/ocultar según isMobileMenuOpen
        "lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo - Mobile padding adjustment */}
          <div className="flex items-center justify-start h-16 px-4 sm:px-6 border-b border-gray-200">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base sm:text-lg font-bold text-gray-900 truncate">Business Advisor</span>
                <span className="text-xs text-gray-500">Panel Admin</span>
              </div>
            </div>
          </div>

          {/* Navigation - Improved mobile layout */}
          <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1 sm:space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    router.push(item.href)
                    setIsMobileMenuOpen?.(false)
                  }}
                  className={cn(
                    "w-full flex items-center px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-lg transition-all duration-200 group",
                    isActive
                      ? "bg-primary text-white shadow-lg"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon className={cn(
                    "mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 transition-colors flex-shrink-0",
                    isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"
                  )} />
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="truncate">{item.name}</span>
                    <span className={cn(
                      "text-xs mt-0.5 truncate",
                      isActive ? "text-blue-100" : "text-gray-500"
                    )}>
                      {item.description}
                    </span>
                  </div>
                </button>
              )
            })}
          </nav>

          {/* User section - Mobile optimized */}
          <div className="p-3 sm:p-4 border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs sm:text-sm font-medium text-gray-600">AD</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  Administrador
                </p>
                <p className="text-xs text-gray-500 truncate">
                  admin@advisor.com
                </p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-gray-700 hover:text-red-600 hover:border-red-200 text-xs sm:text-sm"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
