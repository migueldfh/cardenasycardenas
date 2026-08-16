import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateWorkOrder, useUploadArtwork } from "@/hooks/useWorkOrders";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/shared/DatePicker";
import { Loader2, Shield } from "lucide-react";
import type { Priority } from "@/types/models";

const STANDARD_PROCESSES = [
  "CTP",
  "Impresión",
  "Corte Hoja",
  "Corrugado",
  "Empalme",
  "Troquelado",
  "Pegado"
];

export function CreateOrder() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  if (profile?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-card border border-border rounded-xl">
        <Shield className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-xl font-bold text-foreground">Acceso Restringido</h3>
        <p className="text-muted-foreground mt-2 max-w-md">
          Esta página contiene funciones administrativas restringidas. Solo los usuarios con rol de administrador pueden crear nuevas órdenes de producción.
        </p>
      </div>
    );
  }

  const createMutation = useCreateWorkOrder();
  const uploadMutation = useUploadArtwork();

  const [client, setClient] = useState("");
  const [projectName, setProjectName] = useState("");
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [file, setFile] = useState<File | null>(null);
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);

  const toggleProcess = (proc: string) => {
    setSelectedProcesses(prev => 
      prev.includes(proc) ? prev.filter(p => p !== proc) : [...prev, proc]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryDate || selectedProcesses.length === 0) {
      alert("Please select a delivery date and at least one process.");
      return;
    }

    let fileUrl = undefined;
    if (file) {
      fileUrl = await uploadMutation.mutateAsync(file);
    }

    const folio = `WO-${Date.now().toString().slice(-6)}`;

    createMutation.mutate({
      workOrder: {
        folio,
        client,
        project_name: projectName,
        product,
        quantity: parseInt(quantity, 10),
        delivery_date: deliveryDate.toISOString(),
        priority,
        status: 'draft',
        file_url: fileUrl,
        created_by: profile?.id || "unknown"
      },
      processes: selectedProcesses.map((procName, index) => ({
        process_name: procName,
        sequence_order: index + 1
      }))
    }, {
      onSuccess: () => {
        navigate("/orders");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Create New Production Order</h2>
        <p className="text-muted-foreground mt-1">Fill out the details and required processes for the new job.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Client Details */}
          <Card>
            <CardHeader>
              <CardTitle>Client & Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Client Name</label>
                <Input required value={client} onChange={e => setClient(e.target.value)} placeholder="Smartier Software" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Name</label>
                <Input required value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Summer Campaign 2024" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Product Description</label>
                <Input required value={product} onChange={e => setProduct(e.target.value)} placeholder="5000 Folletos - Offset" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <Input required type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="5000" />
              </div>
            </CardContent>
          </Card>

          {/* Logistics & Files */}
          <Card>
            <CardHeader>
              <CardTitle>Logistics & Artwork</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium block">Delivery Date</label>
                <DatePicker date={deliveryDate} setDate={setDeliveryDate} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={priority} onValueChange={(val) => setPriority(val as Priority)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Artwork File (optional)</label>
                <div className="flex items-center gap-4">
                  <Input 
                    type="file" 
                    className="flex-1"
                    onChange={e => setFile(e.target.files?.[0] || null)} 
                  />
                  {uploadMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Processes Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Required Processes</CardTitle>
            <CardDescription>Select the production stages in the order they should occur.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STANDARD_PROCESSES.map((proc) => {
                const isSelected = selectedProcesses.includes(proc);
                const sequenceIndex = selectedProcesses.indexOf(proc) + 1;
                return (
                  <div 
                    key={proc}
                    onClick={() => toggleProcess(proc)}
                    className={`
                      cursor-pointer rounded-lg border p-4 transition-all flex flex-col items-center justify-center text-center gap-2
                      ${isSelected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}
                    `}
                  >
                    <span className="font-medium text-sm">{proc}</span>
                    {isSelected && (
                      <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {sequenceIndex}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" type="button" onClick={() => navigate("/orders")}>Cancel</Button>
          <Button type="submit" disabled={createMutation.isPending || uploadMutation.isPending}>
            {(createMutation.isPending || uploadMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Order
          </Button>
        </div>
      </form>
    </div>
  );
}
