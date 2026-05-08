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
    default:
      return null;
  }
}
