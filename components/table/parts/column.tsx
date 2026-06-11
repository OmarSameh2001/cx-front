import { isTruthy } from "@/utils/helper/checker";
import { CircleCheck, CircleX } from "lucide-react";

export function TableColumn({ type, data }: any) {
  switch (type) {
    case "logo": {
      const logo = typeof data === "string" ? data : data?.logo;

      const name = typeof data === "object" ? data?.name : null;

      return (
        <div className="flex flex-col items-center justify-center">
          {logo && (
            <div className="shrink-0 flex items-center">
              <img
                className="w-10 h-10 rounded object-cover"
                src={logo}
                // width={40}
                // height={40}
                alt={name || "logo"}
              />
            </div>
          )}

          {name && <span className="">{name}</span>}
        </div>
      );
    }
    case "text":
      return <div className="text-center">{data?.name || data}</div>;
    case "date":
      return <div className="text-center">{data.split("T")[0]}</div>;
    case "action":
      return (
        <div className="flex flex-col gap-2">
          <span className="font-bold">{data.name}</span>
          <span className="text-sm">{data.description}</span>
        </div>
      );
    case "price":
      return <div className="text-left font-medium text-green-500">{data}</div>;
    case "boolean":
      return <div className="flex justify-center items-center">{isTruthy(data) ? <CircleCheck color="green" /> : <CircleX color="red" />}</div>;
    case "status": {
      const STATUS_STYLES: Record<string, string> = {
        active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        inactive: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        archived: "bg-muted text-muted-foreground",
        in_progress: "bg-muted text-muted-foreground border border-border",
        submitted: "bg-primary/10 text-primary border border-primary/40",
        late: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border border-yellow-500/40",
        expired: "bg-destructive/10 text-destructive border border-destructive/40",
      };
      const style = STATUS_STYLES[data] ?? "bg-muted text-muted-foreground";
      return <span className={`px-2 py-0.5 rounded-full text-xs ${style}`}>{data}</span>;
    }
    default:
      return null;
  }
}
