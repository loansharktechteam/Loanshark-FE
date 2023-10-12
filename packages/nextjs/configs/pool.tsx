import type { ContractName } from "~~/utils/scaffold-eth/contract";

export type RealmType = "main";

export type Token = {
  name: "USDC" | "ETH" | "WETH";
  address: string;
  icon: string;
};

export type Market = {
  cToken: ContractName;
  token: string;
};

export type RealmConfig = {
  id: RealmType;
  name: string;
  icon: string;
  key: 534352;
  tokens: Token[];
  markets: Market[];
};

export const realms: RealmConfig[] = [
  {
    id: "main",
    name: "Main Hub",
    icon: "/assets/realm/realm-main.png",
    key: 534352,
    markets: [
      {
        cToken: "cETH",
        token: "ETH",
      },
      {
       cToken: "cUSDC",
       token: "USDC",
      },
    ],
    tokens: [
      {
        name: "USDC",
        address: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4",
        icon: "/assets/tokens/usdc.svg",
      },
      {
        name: "ETH",
        icon: "/assets/tokens/eth.svg",
        address: "0x0000000000000000000000000000000000000000",
      },
    ],
  },
];
