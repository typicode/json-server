import { createConfig, configureChains, mainnet, sepolia, arbitrum } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { createStorage, cookieStorage } from 'wagmi';
import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';

export const { chains, publicClient } = configureChains(
  [mainnet, sepolia, arbitrum],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'Bridge App',
  chains
});

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  chains,
  publicClient,
  storage: createStorage({ storage: cookieStorage })
});
