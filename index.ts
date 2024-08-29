import { Connection, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, Signer, SystemProgram, Transaction } from '@solana/web3.js';
import { createAssociatedTokenAccountIdempotent, createCloseAccountInstruction, createSyncNativeInstruction, createWrappedNativeAccount, getOrCreateAssociatedTokenAccount, NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { mnemonicToSeedSync } from 'bip39';
import { derivePath } from 'ed25519-hd-key';

import dotenv from 'dotenv';
dotenv.config();

const wrapSol = async (
    connection: Connection,
    signer: Signer,
    amount: number
) => {
    // wSol ATA 
    const wSolAta = await getOrCreateAssociatedTokenAccount(connection, signer, NATIVE_MINT, signer.publicKey);
 
    // wrap Sol
    let transaction = new Transaction().add(
        // trasnfer SOL
        SystemProgram.transfer({
          fromPubkey: signer.publicKey,
          toPubkey: wSolAta.address,
          lamports: amount,
        }),
        // sync wrapped SOL balance
        createSyncNativeInstruction(wSolAta.address)
    );

    // submit transaction
    const txSignature = await sendAndConfirmTransaction(connection, transaction, [signer]);
    console.log(`transaction submitted with hash: ${txSignature}`);
}

const unwrapSol = async (
    connection: Connection,
    signer: Signer,
) => {
    // wSol ATA
    const a = await getOrCreateAssociatedTokenAccount(connection, signer, NATIVE_MINT, signer.publicKey);
    // const a = await createAssociatedTokenAccountIdempotent(connection, signer, NATIVE_MINT, signer.publicKey);
    const transaction = new Transaction;
    const instructions = [];

    // close wSol account instruction
    instructions.push(
        createCloseAccountInstruction(
          a.address,
          signer.publicKey,
          signer.publicKey
        )
    );

    // add instruction to transaction
    transaction.add(...instructions);

    // submit transaction
    const txSignature = await sendAndConfirmTransaction(connection, transaction, [signer]);
    console.log(`transaction submitted with hash: ${txSignature}`);
}

const run = async() => {
    const connection = new Connection(
        'https://smart-young-meadow.solana-mainnet.quiknode.pro/001e2a39874b0e429cb46ed1073ed3f80bdff9bd/', "confirmed"
    )

    
    const PRIVATE_KEY = retrieveEnvVariable('PRIVATE_KEY');
    const wallet = getWallet(PRIVATE_KEY);
    const signer: Signer = {
        publicKey: wallet.publicKey,
        secretKey: wallet.secretKey
    } 

    wrapSol(connection, signer, LAMPORTS_PER_SOL * 0.00001);

    unwrapSol(connection, signer);
}


export function getWallet(wallet: string): Keypair {
  // most likely someone pasted the private key in binary format
  if (wallet.startsWith('[')) {
    const raw = new Uint8Array(JSON.parse(wallet))
    return Keypair.fromSecretKey(raw);
  }

  // most likely someone pasted mnemonic
  if (wallet.split(' ').length > 1) {
    const seed = mnemonicToSeedSync(wallet, '');
    const path = `m/44'/501'/0'/0'`; // we assume it's first path
    return Keypair.fromSeed(derivePath(path, seed.toString('hex')).key);
  }

  // most likely someone pasted base58 encoded private key
  return Keypair.fromSecretKey(bs58.decode(wallet));
}

const retrieveEnvVariable = (variableName: string) => {
    const variable = process.env[variableName] || '';
    if (!variable) {
      console.error(`${variableName} is not set`);
      process.exit(1);
    }
    return variable;
};

run()
