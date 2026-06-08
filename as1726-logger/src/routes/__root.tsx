import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import appCss from '../styles.css?url'
import { Toaster } from '@/components/ui/sonner'
import * as React from 'react'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Geotech Data Hub — Borehole Log Editor' },
      { name: 'description', content: 'A field-engineer-friendly web app for logging soil and rock strata to AS1726.' }
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Geotech Data Hub",
          "url": "https://geotech-hub.example.com/"
        })
      }
    ]
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground flex flex-col">
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}
