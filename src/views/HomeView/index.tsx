import React, { useCallback, useEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { programs } from "@metaplex/js";
import { EntryList } from "../../components/EntryList";
import { Entry } from "../../interfaces";
import { CollectionForm } from "../../components/CollectionForm";
import axios from "axios";
import { io } from "socket.io-client";
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";
import { AccountMeta, Message, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { generateAccountList } from "./transaction";

const { metadata: { Metadata } } = programs;

export type entryList = {
  entries: Entry[];
}


export function HomeView() {
  // States for wallet and connection
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const publickeyRef = useRef(publicKey);

  // States used in order to make transaction
  const busy_transaction = useRef<boolean>(false);
  const [currentMintAddress, setMintAddress] = useState<string>();
  const [transactionData, setTransactionData] = useState<string | any[]>();

  // entries (used in refreshcollections) and entrylist (used in entrylist component)
  const result: Entry[] = [];
  const [entryList, setEntryList] = useState({ entries: result });
  const entries = useRef<Entry[]>([]);
  const rate_limit = useRef<number>(120);

  useEffect(() => {
    publickeyRef.current = publicKey
  }, [publicKey]);


  /**
   * Set up socket connection
   */
  const socket = io("localhost:420");
  socket.on("message_v1", async (object: { data: string; }) => {
    setTransactionData(object.data);
  });

  /**
   * Run refresh collections first time the page loads
   */
  useEffect(() => {
    refreshCollections();
  }, []);

  /**
   * Buy NFT whenever busy_transaction or transaction_data changes
   */
  useEffect(() => {
    if (transactionData != null) {
      if (Array.isArray(transactionData)) {
        buyNFT_v2(transactionData);
      }
       else {
        buyNFT_v1(transactionData);
      }
    }
  }, [transactionData, busy_transaction]);

  /**
   * Buy NFT v1 listing
   */
  const buyNFT_v1 = useCallback(async (instructionData: string) => {
    if (!publicKey) throw new WalletNotConnectedError();
    const keys: AccountMeta[] = await generateAccountList(currentMintAddress, publicKey, connection);
    let allocateTransaction = new Transaction({
      feePayer: publicKey,
    });
    const databuf = Buffer.from(instructionData, "hex");
    allocateTransaction.add(new TransactionInstruction({
      keys: keys,
      programId: new PublicKey("MEisE1HzehtrDpAAT8PnLHjpSSkRYakotTuJRPjTpo8"),
      data: databuf,
    }));
    try {
      const signature = await sendTransaction(allocateTransaction, connection);
      await connection.confirmTransaction(signature, "processed").then(a => {
        busy_transaction.current = false;
        setTransactionData("");
      });
    } catch (e) {
      busy_transaction.current = false;
      setTransactionData("");
    }
  }, [publicKey, sendTransaction, connection, currentMintAddress, busy_transaction]);

  /**
   * Buy NFT v2 listing
   */
  const buyNFT_v2 = useCallback(async (instructionData: any[]) => {
    if (!publicKey) throw new WalletNotConnectedError();

    const transaction = Transaction.populate(Message.from(instructionData));

    try {
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "processed").then(a => {
        busy_transaction.current = false;
        // @ts-ignore
        setTransactionData("");
      });
    } catch (e) {
      busy_transaction.current = false;
      // @ts-ignore
      setTransactionData("");
    }
  }, [publicKey, sendTransaction, connection, currentMintAddress, busy_transaction]);

  /**
   * API request, returns v2 instruction data
   * @param params
   */
  async function getInstructionDataV2(params: Object) {
    try {
      const res = await axios.get("https://api-mainnet.magiceden.io/v2/instructions/buy_now", {
        params: params,
      });
      return res.data.tx.data;
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Fetch API getNFTS
   * @param collection_symbol
   */
  async function fetchNFTs(collection_symbol: string) {
    const res = await axios.get("https://api-mainnet.magiceden.io/rpc/getListedNFTsByQuery", {
      params: {
        "q": {
          "$match": { "collectionSymbol": collection_symbol },
          "$sort": { "takerAmount": 1, "createdAt": -1 },
        },
      },
    });
    return res.data;
  }

  /**
   * Send buy order to socket
   * @param mint_address
   * @param price
   */
  function sendBuyOrder(mint_address: string, price: number) {
    const instructionDataObject = {
      tokenMintAddress: mint_address,
      buyPrice: price,
    };
    socket.emit("instruction_data_send", instructionDataObject);
  }

  /**
   * Refresh NFT collections in entrylist
   */
  async function refreshCollections() {
    if (!busy_transaction.current) {
      for (var entry of entries.current) {
        try {
          const data = await fetchNFTs(entry.collection_symbol);
          for (let i in data.results) {
            if (data.results[i].price <= entry.max_sol_price) {
              if (!busy_transaction.current) {
                busy_transaction.current = true;
                setMintAddress(data.results[i].mintAddress);

                // v2
                if (data.results[i].hasOwnProperty('v2')) {

                  const params = {
                    // @ts-ignore
                    "buyer": publickeyRef.current.toString(),
                    "seller": data.results[i].owner,
                    "auctionHouseAddress": data.results[i].v2.auctionHouseKey,
                    "tokenMint": data.results[i].mintAddress,
                    "tokenATA": data.results[i].id,
                    "price": data.results[i].price.toString(),
                    "sellerReferral": data.results[i].v2.sellerReferral,
                    "sellerExpiry": data.results[i].v2.expiry, // used to be hardcoded to 0 (and that worked), seems to be -1 at some listings?
                  }
                  const instructionDataObject = makeV2DataObj(params);
                  const v2InstructionData = await getInstructionDataV2(instructionDataObject);
                  setTransactionData(v2InstructionData)
                } else {
                  const instructionDataObject = {
                    tokenMintAddress: data.results[i].mintAddress,
                    buyPrice: data.results[i].price,
                  };
                  socket.emit("instruction_data_send_v1", instructionDataObject);
                }
              }
            }
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
    const ms = 1000/(rate_limit.current/60/entries.current.length);
    await setTimeout(refreshCollections, ms);
  }

  const makeV2DataObj = (params: { buyer: string, seller: string, auctionHouseAddress: string,
    tokenMint: string, tokenATA: string, price: string, sellerReferral: string, sellerExpiry: string}) => {
    let v2DataObj = JSON.parse(JSON.stringify(params));
    // @ts-ignore
    // v2DataObj.buyer = "" + publickeyRef.current.toString();
    return v2DataObj;
  }


  /**
   * Add entry into entrylist
   * @param e collection entry
   */
  const addEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const target = e.target as typeof e.target & {
      collection_name: { value: string };
      max_price: { value: number };
    };
    const col_name = target.collection_name.value.split("magiceden.io/marketplace/")[1];
    const valid_col_name = col_name != null
    if (!valid_col_name) {
      alert("Not a valid MagicEden link");
    }
    if (entryList.entries.filter(a => a.collection_symbol == col_name).length == 0 && valid_col_name) {
      try {
        const res = await axios.get("https://api-mainnet.magiceden.io/collections/" + col_name)
        var newList = entryList.entries;
        newList.push({
          collection_symbol: res.data.symbol,
          max_sol_price: target.max_price.value,
          collection_name: res.data.name,
          img_src: res.data.image,
        });
        setEntryList({
          entries: newList,
        });
        entries.current = newList;
      } catch (err) {
        alert("Not a valid MagicEden link")
        console.log(err)
      }
    }
  };

  /**
   * Remove entry from entrylist
   * @param entry
   */
  const removeEntry = async (entry: Entry) => {
    await setEntryList({
      entries: entryList.entries.filter(inp => (inp != entry)),
    });
    entries.current = entryList.entries.filter(inp => (inp != entry));
  };

  function Application() {
    if (publicKey) {
      return <div>
        <div className="flex flex-row mt-10">
          <div className="basis-1/4">
            <h2 className="mb-5 text-1xl font-bold"> Add collections to snipe</h2>
          </div>
          <div className="basis-3/4">
            <CollectionForm onSubmit={addEntry}></CollectionForm>
          </div>
        </div>
        <div className="flex flex-col mt-14">
          <a>Sniping the following collections:</a>
          <div className="divider"></div>
          <div className="space-y-8">
            <EntryList key={1} entries={entryList.entries} removeEntry={removeEntry}></EntryList>
          </div>
        </div>
      </div>;
    }
    return <div className="flex justify-center py-20">
      <p className="">Please connect your wallet</p>
    </div>;
  }

  return (
    <div>
      <main>
        <div className="container mx-auto max-w-6xl p-8 2xl:px-0">
          <div className="navbar mb-2 shadow-lg bg-neutral text-neutral-content rounded-box">
            <div className="flex-1 px-2 mx-2">
              <div className="avatar">
                <div className="content-center">
                <span className="text-lg font-bold ">
              Sniper Bot Beta
              </span>
                </div>
              </div>
            </div>
            <div className="flex-none">
              <WalletMultiButton className="btn btn-ghost" />
            </div>
          </div>
          <Application></Application>
        </div>
      </main>
    </div>
  );
}


