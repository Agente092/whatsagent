import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WhatsApp Business Advisor - Panel de Administración',
  description: 'Sistema de gestión para asesor empresarial especializado en WhatsApp',
  keywords: 'whatsapp, business, advisor, fiscal, empresarial, peru',
  authors: [{ name: 'Business Advisor Team' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.className} prevent-scroll`}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 safe-area-inset">
          {children}
        </div>
      </body>
    </html>
  )
}