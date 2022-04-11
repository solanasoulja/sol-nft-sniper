import { FormEventHandler } from "react";
import { Socket } from "socket.io-client";
import { DefaultEventsMap } from "@socket.io/component-emitter";

export interface EntriesProps {
  entries: Entry[];
  removeEntry: (entry: Entry) => void;
}

export interface Entry {
  collection_symbol: string;
  max_sol_price: number;
  collection_name: string;
  img_src: string
}

export interface SubmitProps {
  onSubmit: FormEventHandler<HTMLFormElement>
}

export type IState = {
  entries: Entry[];
  socket: Socket<DefaultEventsMap, DefaultEventsMap>;
}