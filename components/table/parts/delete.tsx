import { TableActionIcon } from "./action";

export default function DeleteButton({
  id,
  fun,
  query,
  name,
  permission,
}: {
  id: number;
  fun: (id: number, value?: any) => Promise<any> | void;
  query?: string;
  name?: string;
  permission?: string;
}) {
  return (
    <TableActionIcon
      action={{ name: "Delete", onClick: fun, permission }}
      row={{ id, name }}
      query={query}
      tabelName={name ? name + "s" : undefined}
    />
  );
}
