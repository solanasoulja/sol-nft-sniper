import { EntriesProps, Entry } from "../interfaces";
import React from "react";

export class EntryList extends React.Component<EntriesProps> {

  constructor(props: EntriesProps) {
    super(props);
  }

  CollectionEntry: React.FC<{ entry: Entry }> = ({ entry }) => {
    return (
      <div className="flex flex-row shadow-lg text-neutral-content rounded-box ">
        <div className="basis-1/6 avatar box-border h-40 rounded-box bg-center bg-no-repeat bg-cover"
             style={{ backgroundImage: `url(${entry.img_src})` }}>
        </div>
        <div className="basis-3/6 pl-4 mt-2">
          <a className="items-center">{entry.collection_name}</a>
        </div>
        <div className="basis-1/6 mt-2">
          <a>Max Price:</a>
          <div className="badge px-10"> {entry.max_sol_price} Sol</div>
        </div>
        <div className="basis-1/6 mt-2">
          <button className="btn btn-error ml-10" onClick={(event: React.MouseEvent<HTMLElement>) => {
            this.props.removeEntry(entry);
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="white">
              <path fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  render() {
    return this.props.entries.map(entry => {
      return <this.CollectionEntry entry={entry} key={this.props.entries.indexOf(entry)} />;
    });
  }
}
