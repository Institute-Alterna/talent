/**
 * Candidates Page
 *
 * Main page for viewing and managing candidates in the pipeline.
 * This is a placeholder that will be fully implemented in Phase 6.
 */

import { strings } from '@/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { recruitment } from '@/config';

export const metadata = {
  title: 'Candidates',
};

export default function CandidatesPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{strings.nav.candidates}</h1>
          <p className="text-muted-foreground">
            View and manage candidate applications
          </p>
        </div>
      </div>

      {/* Pipeline Stages */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {recruitment.stages.map((stage) => (
          <Card key={stage.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{stage.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <Badge variant="outline" className="mt-2">
                Stage {stage.order}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Candidate List Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>All Candidates</CardTitle>
          <CardDescription>
            Candidate list with filtering and search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[400px] items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">{strings.empty.noCandidates}</p>
              <p className="mt-1 text-sm">
                Candidates will appear here once the Tally webhook is configured.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Full implementation coming in Phase 6
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
