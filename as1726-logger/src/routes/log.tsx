import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { type LayerInput, blocksSave } from '@/lib/as1726'
import { StrataGrid } from '@/components/StrataGrid'
import { StrataProfile } from '@/components/StrataProfile'

export const Route = createFileRoute('/log')({
  component: LogComponent,
})

function LogComponent() {
  const [isClient, setIsClient] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [holeId, setHoleId] = useState('');
  const [layers, setLayers] = useState<LayerInput[]>([]);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('borehole-log-v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProjectName(parsed.projectName || '');
        setHoleId(parsed.holeId || '');
        setLayers(parsed.layers || []);
      } catch (e) {
        console.error("Failed to load saved state", e);
      }
    } else {
      setLayers([
         { id: 'initial', depthFrom: 0, depthTo: 1, type: 'soil', major: 'CLAY', uscs: 'CH', description: 'Firm, highly plastic clay.' }
      ]);
    }
  }, []);

  if (!isClient) return null;

  const validation = blocksSave(layers);
  const canSave = validation.ok;

  const handleSave = () => {
    localStorage.setItem('borehole-log-v1', JSON.stringify({ projectName, holeId, layers }));
    toast.success('Borehole log saved successfully!');
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-screen-2xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Log Editor</h1>
          <p className="text-muted-foreground text-sm">AS1726 compliant borehole logging</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!canSave}
          className="w-40"
        >
          {canSave ? 'Save Log' : `Fix ${validation.issues.length} issues`}
        </Button>
      </div>

      {!canSave && (
        <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-md border border-destructive/20">
          <p className="font-semibold mb-2">Please fix the following issues to save:</p>
          <ul className="list-disc pl-5">
            {validation.issues.map((i, idx) => <li key={idx}>{i}</li>)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="projectName">Project Name</Label>
                <Input 
                  id="projectName" 
                  value={projectName} 
                  onChange={e => setProjectName(e.target.value)} 
                  placeholder="e.g. Sydney Metro" 
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="holeId">Hole ID</Label>
                <Input 
                  id="holeId" 
                  value={holeId} 
                  onChange={e => setHoleId(e.target.value)} 
                  placeholder="e.g. BH01" 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Strata Data</CardTitle>
              <CardDescription>Enter layers from top to bottom.</CardDescription>
            </CardHeader>
            <CardContent>
              <StrataGrid layers={layers} onChange={setLayers} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full border-2 border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <StrataProfile layers={layers} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
