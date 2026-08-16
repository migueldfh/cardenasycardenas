import { useParams, Link } from "react-router-dom";
import { useWorkOrderDetails } from "@/hooks/useWorkOrders";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Calendar, FileText, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

export function OrderDetail() {
  const { id } = useParams();
  const { data, isLoading, error } = useWorkOrderDetails(id as string);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-destructive">Error loading order details.</div>;
  }

  const { workOrder, processes } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/orders">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Order {workOrder.folio}</h2>
          <p className="text-muted-foreground">{workOrder.client} - {workOrder.project_name}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={workOrder.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Product</span>
                <p className="font-medium">{workOrder.product}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Quantity</span>
                <p className="font-medium">{workOrder.quantity.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm text-muted-foreground block">Delivery Date</span>
                  <p className="font-medium">{format(new Date(workOrder.delivery_date), "PPP")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Files</CardTitle>
            </CardHeader>
            <CardContent>
              {workOrder.file_url ? (
                <a href={workOrder.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-muted transition-colors">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Artwork File</span>
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">No files attached.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Timeline */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Production Timeline</CardTitle>
              <CardDescription>{processes.filter(p => p.status === 'completed').length} of {processes.length} stages completed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {processes.map((proc) => {
                  const isCompleted = proc.status === 'completed';
                  const isInProgress = proc.status === 'in_progress' || proc.status === 'paused';
                  
                  return (
                    <div key={proc.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      {/* Icon */}
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow z-10
                        ${isCompleted ? 'bg-green-500' : isInProgress ? 'bg-blue-500' : 'bg-muted'}
                      `}>
                        {isCompleted ? <CheckCircle2 className="h-4 w-4 text-white" /> : <Clock className="h-4 w-4 text-white" />}
                      </div>
                      
                      {/* Content Card */}
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-card shadow-sm z-10">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold">{proc.process_name}</h3>
                          <StatusBadge status={proc.status} />
                        </div>
                        <div className="text-sm text-muted-foreground flex flex-col gap-1 mt-2">
                          {proc.assigned_to && <span>Op. {proc.assigned_to}</span>}
                          {proc.started_at && <span>Started: {format(new Date(proc.started_at), "PP p")}</span>}
                          {proc.finished_at && <span>Finished: {format(new Date(proc.finished_at), "PP p")}</span>}
                          {!proc.started_at && <span>Pending assignment</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
