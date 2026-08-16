import { Badge } from "@/components/ui/badge";
import type { OrderStatus, ProcessStatus } from "@/types/models";

interface StatusBadgeProps {
  status: OrderStatus | ProcessStatus;
}

const statusColors: Record<string, string> = {
  // OrderStatus
  draft: "bg-gray-200 text-gray-800 hover:bg-gray-200",
  production: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  completed: "bg-green-100 text-green-800 hover:bg-green-100",
  // ProcessStatus
  pending: "bg-gray-200 text-gray-800 hover:bg-gray-200",
  ready: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  in_progress: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  paused: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = statusColors[status] || "bg-gray-100 text-gray-800";
  
  const formattedStatus = status
    .replace('_', ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return (
    <Badge variant="outline" className={`border-none ${colorClass}`}>
      {formattedStatus}
    </Badge>
  );
}
