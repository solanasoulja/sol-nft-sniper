import React from "react";
import { SubmitProps } from "../interfaces";

export class CollectionForm extends React.Component<SubmitProps> {

  constructor(props: SubmitProps) {
    super(props);
  }

  render() {
    return (
      <form onSubmit={this.props.onSubmit}>
        <div className="flex flex-row space-x-4 ">
          <div className="basis-8/12">
            <label className="label-text input-group" htmlFor="name">
              <span>Collection Link</span>
              <input className="input input-bordered"
                     id="collection_name" name="collection_name"
                     type="text" required />
            </label>
          </div>
          <div className="basis-2/12">
            <label className="label-text input-group">
              <span>Max Price</span>
              <input className="input input-bordered"
                     id="max_price" name="max_price" type="number" step="any" min="0"
                     placeholder="0.0"
                     required />
              <span>Sol</span>
            </label>
          </div>
          <div className="basis-2/12">
            <button className="btn btn-primary" type="submit">Snipe</button>
          </div>
        </div>
      </form>
    );
  }
}


