import { AxiosResponse } from "axios";
import { TableActionIcon } from "./action";

export default function DeleteButton({
  id,
  fun,
  query,
  name,
  brokerId
}: {
  id: number;
  fun: (id: number) => Promise<AxiosResponse<any, any, {}>>;
  query?: string;
  name?: string;
  brokerId?: number
}) {
  return(
  <TableActionIcon
    action={{ name: "Delete", onClick: fun}}
    row={{ id, name, brokerId }}
    query={query}
    tabelName={name + "s"}
  />
  )
}
