import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/contexts/language"
import { cn } from "@/lib/utils";

const DESCRIPTION =
  'Interactive visualization of Swiss federal votation results, demographics, and trade statistics.'

export const metadata: Metadata = {
  metadataBase: new URL('https://swiss-maps-zeta.vercel.app'),
  title: 'Swiss Maps',
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: 'Swiss Maps',
    title: 'Swiss Maps',
    description: DESCRIPTION,
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Choropleth map of Swiss votation results by canton' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Swiss Maps',
    description: DESCRIPTION,
    images: ['/og.jpg'],
  },
}

const inter = Inter({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
