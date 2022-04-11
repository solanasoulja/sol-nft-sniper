import axios from "axios";
import { programs } from "@metaplex/js";
import bs58 from "bs58";
import { Connection, PublicKey } from "@solana/web3.js";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const { metadata: { Metadata } } = programs;

export async function generateAccountList(token_mint_address: string | undefined, buyer_key: PublicKey, connection: Connection) {
  const url = "https://api-mainnet.magiceden.io/rpc/getNFTByMintAddress/" + token_mint_address;

  try {
    const res = (await axios.get(url)).data.results;
    console.log(res)
    const [token_key, owner_key, escrow_key, a1_key, a2_key, system_key, token_program_key] = [
      new PublicKey(res.id),
      new PublicKey(res.owner),
      new PublicKey(res.escrowPubkey), new PublicKey("2NZukH2TXpcuZP4htiuT8CFxcaQSWzkkR6kepSWnZ24Q"),
      new PublicKey("GUfCR9mK6azb9vcpsxgXyj7XRPAKJd4KMHTTVvtncGgp"),
      new PublicKey("11111111111111111111111111111111"),
      new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    ];

    // @ts-ignore
    const pda_key = new PublicKey((await programs.metadata.Metadata.getPDA(token_mint_address)).toString());

    let keys = [{ isSigner: true, isWritable: true, pubkey: buyer_key },
      { isSigner: false, isWritable: true, pubkey: token_key },
      { isSigner: false, isWritable: true, pubkey: owner_key },
      { isSigner: false, isWritable: true, pubkey: escrow_key },
      { isSigner: false, isWritable: false, pubkey: a2_key },
      { isSigner: false, isWritable: false, pubkey: system_key },
      { isSigner: false, isWritable: false, pubkey: token_program_key },
      { isSigner: false, isWritable: true, pubkey: a1_key },
      { isSigner: false, isWritable: false, pubkey: pda_key }];

    res.creators.forEach((a: any) =>
      keys.push({ isSigner: false, isWritable: true, pubkey: new PublicKey(a.address) }));

    return keys;
  } catch (e) {
    return []
    console.log(e);
  }
}

export async function getInstructionData(token_mint_address: string, buy_price: number) {
  const mint_address_hex = bs58.decode(token_mint_address).toString("hex");
  let hex_buy_price: string;
  // @ts-ignore
  hex_buy_price = (buy_price * 1000000000).toString(16).replace(/^(.(..)*)$/, "0$1")
    .match(/../g).reverse().join("").padEnd(16, "0");
  const result = "438e36d81f1d1b5c" + hex_buy_price + mint_address_hex;
  return result;
}