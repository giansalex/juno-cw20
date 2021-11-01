const { SigningCosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const { calculateFee } = require("@cosmjs/stargate");

let tokenInfo;
let contract = "juno1suhgf5svhu4usrurvxzlgn54ksxmn8gljarjtxqnapv8kjnp4nrsf8smqw";
const chainId = "uni";

window.onload = async () => {
    const status = await registerKeplr();
    if (!status) {
        return;
    }

    const queryString = window.location.search;
    const qparams = new URLSearchParams(queryString);

    if (qparams.has('contract')) {
        contract = qparams.get('contract');
    }

    if (!contract) {
        alert("Error not contract");
        return;
    }

    // You should request Keplr to enable the wallet.
    // This method will ask the user whether or not to allow access if they haven't visited this website.
    // Also, it will request user to unlock the wallet if the wallet is locked.
    // If you don't request enabling before usage, there is no guarantee that other methods will work.
    await window.keplr.enable(chainId);

    const offlineSigner = window.getOfflineSigner(chainId);

    // You can get the address/public keys by `getAccounts` method.
    // It can return the array of address/public key.
    // But, currently, Keplr extension manages only one address/public key pair.
    // XXX: This line is needed to set the sender address for SigningCosmosClient.
    const accounts = await offlineSigner.getAccounts();

    document.getElementById("address").append(accounts[0].address);
    const cosmJS = await SigningCosmWasmClient.connectWithSigner(
        "https://rpc.juno.giansalex.dev:443",
        offlineSigner
    );
    
    try {
        tokenInfo = await cosmJS.queryContractSmart(contract, {token_info: {}});
        document.getElementById("symbolcoin").textContent = tokenInfo.symbol;
    
        await updateBalance(accounts[0].address, cosmJS);

    } catch (error) {
        alert("Cannot query contract!");
    }
};

document.sendForm.onsubmit = () => {
    document.getElementById("txt").textContent = "";
    if (!tokenInfo) {
        alert("cw20 token info not found!");
        return false;
    }

    let recipient = document.sendForm.recipient.value;
    let amount = document.sendForm.amount.value;

    amount = parseFloat(amount);
    if (isNaN(amount)) {
        alert("Invalid amount");
        return false;
    }

    amount *= Math.pow(10, tokenInfo.decimals);
    amount = Math.floor(amount);

    (async () => {
        await window.keplr.enable(chainId);
        const offlineSigner = window.getOfflineSigner(chainId);

        const accounts = await offlineSigner.getAccounts();

        // Initialize the juno roc with the offline signer that is injected by Keplr extension.
        const cosmJS = await SigningCosmWasmClient.connectWithSigner(
            "https://rpc.juno.giansalex.dev:443",
            offlineSigner
        );

        const executMsg = {transfer: {recipient: recipient, amount: amount.toString()}};
        try {
            
            const fee = await calculateFee(400000, "0.025ucosm");
            const result = await cosmJS.execute(accounts[0].address, contract, executMsg, fee);

            console.log(result);

            if (result.code !== undefined &&
                result.code !== 0) {
                alert("Failed to send tx: " + result.log || result.rawLog);
            } else {
                alert("Succeed to send tx");

                const txhash = result.transactionHash;
                const txtlink = document.getElementById("txt");
                txtlink.textContent = txhash;
                txtlink.setAttribute("href", "https://blueprints.juno.giansalex.dev/#/transactions/" + txhash);
                
                await updateBalance(accounts[0].address, cosmJS);
            }
        } catch (error) {
            console.log(error);
            alert("Tx Failed");
        }
    })();

    return false;
};

async function registerKeplr() {
    if (!window.getOfflineSigner || !window.keplr) {
        alert("Please install keplr extension");
    } else {
        if (window.keplr.experimentalSuggestChain) {
            try {
                // Keplr v0.6.4 introduces an experimental feature that supports the feature to suggests the chain from a webpage.
                // If the user approves, the chain will be added to the user's Keplr extension.
                // If the user rejects it or the suggested chain information doesn't include the required fields, it will throw an error.
                // If the same chain id is already registered, it will resolve and not require the user interactions.
                await window.keplr.experimentalSuggestChain({
                    // Chain-id of the Cosmos SDK chain.
                    chainId: chainId,
                    // The name of the chain to be displayed to the user.
                    chainName: "Juno Testnet",
                    // RPC endpoint of the chain.
                    rpc: "https://rpc.juno.giansalex.dev:443",
                    // REST endpoint of the chain.
                    rest: "https://lcd.juno.giansalex.dev:443",
                    // Staking coin information
                    // (Currently, Keplr doesn't have the UI that shows multiple tokens, therefore this uses the SHELL token as the primary token althought SHELL is not a staking coin.)
                    stakeCurrency: {
                        // Coin denomination to be displayed to the user.
                        coinDenom: "JUNOX",
                        // Actual denom (i.e. uatom, uscrt) used by the blockchain.
                        coinMinimalDenom: "ujunox",
                        // # of decimal points to convert minimal denomination to user-facing denomination.
                        coinDecimals: 6,
                        // (Optional) Keplr can show the fiat value of the coin if a coingecko id is provided.
                        // You can get id from https://api.coingecko.com/api/v3/coins/list if it is listed.
                        // coinGeckoId: ""
                    },
                    // (Optional) If you have a wallet webpage used to stake the coin then provide the url to the website in `walletUrlForStaking`.
                    // The 'stake' button in Keplr extension will link to the webpage.
                    // walletUrlForStaking: "",
                    // The BIP44 path.
                    bip44: {
                        // You can only set the coin type of BIP44.
                        // 'Purpose' is fixed to 44.
                        coinType: 118,
                    },
                    // Bech32 configuration to show the address to user.
                    // This field is the interface of
                    // {
                    //   bech32PrefixAccAddr: string;
                    //   bech32PrefixAccPub: string;
                    //   bech32PrefixValAddr: string;
                    //   bech32PrefixValPub: string;
                    //   bech32PrefixConsAddr: string;
                    //   bech32PrefixConsPub: string;
                    // }
                    bech32Config: {
                        bech32PrefixAccAddr: "juno",
                        bech32PrefixAccPub: "junopub",
                        bech32PrefixValAddr: "junovaloper",
                        bech32PrefixValPub: "junovaloperpub",
                        bech32PrefixConsAddr: "junovalcons",
                        bech32PrefixConsPub: "junovalconspub"
                    },
                    // List of all coin/tokens used in this chain.
                    currencies: [{
                        // Coin denomination to be displayed to the user.
                        coinDenom: "JUNOX",
                        // Actual denom (i.e. uatom, uscrt) used by the blockchain.
                        coinMinimalDenom: "ujunox",
                        // # of decimal points to convert minimal denomination to user-facing denomination.
                        coinDecimals: 6,
                        // (Optional) Keplr can show the fiat value of the coin if a coingecko id is provided.
                        // You can get id from https://api.coingecko.com/api/v3/coins/list if it is listed.
                        // coinGeckoId: ""
                        // coinGeckoId: ""
                    }],
                    // List of coin/tokens used as a fee token in this chain.
                    feeCurrencies: [{
                        // Coin denomination to be displayed to the user.
                        coinDenom: "JUNOX",
                        // Actual denom (i.e. uatom, uscrt) used by the blockchain.
                        coinMinimalDenom: "ujunox",
                        // # of decimal points to convert minimal denomination to user-facing denomination.
                        coinDecimals: 6,
                        // (Optional) Keplr can show the fiat value of the coin if a coingecko id is provided.
                        // You can get id from https://api.coingecko.com/api/v3/coins/list if it is listed.
                        // coinGeckoId: ""
                        // coinGeckoId: ""
                    }],
                    // (Optional) The number of the coin type.
                    // This field is only used to fetch the address from ENS.
                    // Ideally, it is recommended to be the same with BIP44 path's coin type.
                    // However, some early chains may choose to use the Cosmos Hub BIP44 path of '118'.
                    // So, this is separated to support such chains.
                    // coinType: 118,
                    // (Optional) This is used to set the fee of the transaction.
                    // If this field is not provided, Keplr extension will set the default gas price as (low: 0.01, average: 0.025, high: 0.04).
                    // Currently, Keplr doesn't support dynamic calculation of the gas prices based on on-chain data.
                    // Make sure that the gas prices are higher than the minimum gas prices accepted by chain validators and RPC/REST endpoint.
                    gasPriceStep: {
                        low: 0.01,
                        average: 0.025,
                        high: 0.04
                    },
                    features: ["stargate", 'ibc-transfer', 'cosmwasm', 'no-legacy-stdTx']
                });

                return true;
            } catch {
                alert("Failed to suggest the chain");
            }
        } else {
            alert("Please use the recent version of keplr extension");
        }
    }

    return false;
}
async function updateBalance(address, client) {

    const qBalance = {balance: {address: address}};
    const result = await client.queryContractSmart(contract, qBalance);

    const balance = parseInt(result.balance) / Math.pow(10, tokenInfo.decimals);
    document.getElementById("balance").textContent = balance + " " + tokenInfo.symbol;
}
