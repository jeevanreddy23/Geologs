import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main className="flex flex-col items-center justify-center flex-1 p-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight mb-4 text-primary">AS1726 Borehole Log</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-lg">
        A field-engineer-friendly, spreadsheet-style web app for logging soil and rock strata with real-time validation.
      </p>
      <Button asChild size="lg" className="px-8 shadow-md">
        <Link to="/log">Open Editor</Link>
      </Button>
    </main>
  )
}
