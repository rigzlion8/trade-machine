import { ethers } from 'ethers'

export interface CryptoWallet {
  address: string
  balance: string
  network: string
  isConnected: boolean
}

export interface CryptoTransaction {
  hash: string
  from: string
  to: string
  amount: string
  token: string
  status: 'pending' | 'confirmed' | 'failed'
  timestamp: number
  gasUsed?: string
  gasPrice?: string
}

export interface SupportedToken {
  symbol: string
  name: string
  address: string
  decimals: number
  logo: string
  balance?: string
}

export class CryptoWalletService {
  private provider: ethers.providers.Web3Provider | null = null
  private signer: ethers.Signer | null = null
  private currentWallet: CryptoWallet | null = null

  // Supported tokens (you can expand this list)
  private supportedTokens: SupportedToken[] = [
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum mainnet
      decimals: 6,
      logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xA0b86a33E6441b8c4C8C0E4b8c4C8C0E4b8c4C8C', // Ethereum mainnet
      decimals: 6,
      logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      address: '0x0000000000000000000000000000000000000000', // Native token
      decimals: 18,
      logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
    }
  ]

  async connectWallet(): Promise<CryptoWallet> {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask or compatible wallet not found')
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      // Create provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum)
      this.signer = this.provider.getSigner()
      
      const address = accounts[0]
      const network = await this.provider.getNetwork()
      
      // Get ETH balance
      const balance = await this.provider.getBalance(address)
      const balanceInEth = ethers.utils.formatEther(balance)

      this.currentWallet = {
        address,
        balance: balanceInEth,
        network: network.name,
        isConnected: true
      }

      // Listen for account changes
      window.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this))
      window.ethereum.on('chainChanged', this.handleChainChanged.bind(this))

      return this.currentWallet
    } catch (error) {
      console.error('Error connecting wallet:', error)
      throw error
    }
  }

  async disconnectWallet(): Promise<void> {
    this.provider = null
    this.signer = null
    this.currentWallet = null
    
    // Remove event listeners
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', this.handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', this.handleChainChanged)
    }
  }

  async getWalletInfo(): Promise<CryptoWallet | null> {
    if (!this.currentWallet || !this.provider) {
      return null
    }

    try {
      const balance = await this.provider.getBalance(this.currentWallet.address)
      const balanceInEth = ethers.utils.formatEther(balance)
      
      this.currentWallet.balance = balanceInEth
      return this.currentWallet
    } catch (error) {
      console.error('Error getting wallet info:', error)
      return null
    }
  }

  async getTokenBalance(tokenAddress: string): Promise<string> {
    if (!this.signer || !this.provider) {
      throw new Error('Wallet not connected')
    }

    try {
      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        // Native ETH
        const balance = await this.provider.getBalance(this.currentWallet!.address)
        return ethers.utils.formatEther(balance)
      } else {
        // ERC-20 token
        const tokenContract = new ethers.Contract(
          tokenAddress,
          [
            'function balanceOf(address owner) view returns (uint256)',
            'function decimals() view returns (uint8)'
          ],
          this.signer
        )

        const balance = await tokenContract.balanceOf(this.currentWallet!.address)
        const decimals = await tokenContract.decimals()
        
        return ethers.utils.formatUnits(balance, decimals)
      }
    } catch (error) {
      console.error('Error getting token balance:', error)
      throw error
    }
  }

  async sendCrypto(
    to: string,
    amount: string,
    tokenAddress: string = '0x0000000000000000000000000000000000000000'
  ): Promise<CryptoTransaction> {
    if (!this.signer) {
      throw new Error('Wallet not connected')
    }

    try {
      let tx: ethers.providers.TransactionResponse

      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        // Send ETH
        const txRequest = {
          to,
          value: ethers.utils.parseEther(amount)
        }
        tx = await this.signer.sendTransaction(txRequest)
      } else {
        // Send ERC-20 token
        const tokenContract = new ethers.Contract(
          tokenAddress,
          [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function decimals() view returns (uint8)'
          ],
          this.signer
        )

        const decimals = await tokenContract.decimals()
        const amountInWei = ethers.utils.parseUnits(amount, decimals)
        
        tx = await tokenContract.transfer(to, amountInWei)
      }

      // Wait for transaction confirmation
      const receipt = await tx.wait()

      const transaction: CryptoTransaction = {
        hash: tx.hash,
        from: tx.from,
        to: to,
        amount: amount,
        token: tokenAddress === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'TOKEN',
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        timestamp: Date.now(),
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: tx.gasPrice?.toString()
      }

      return transaction
    } catch (error) {
      console.error('Error sending crypto:', error)
      throw error
    }
  }

  async getSupportedTokens(): Promise<SupportedToken[]> {
    if (!this.currentWallet) {
      return this.supportedTokens
    }

    // Get balances for all supported tokens
    const tokensWithBalances = await Promise.all(
      this.supportedTokens.map(async (token) => {
        try {
          const balance = await this.getTokenBalance(token.address)
          return { ...token, balance }
        } catch (error) {
          console.error(`Error getting balance for ${token.symbol}:`, error)
          return { ...token, balance: '0' }
        }
      })
    )

    return tokensWithBalances
  }

  async estimateGas(
    to: string,
    amount: string,
    tokenAddress: string = '0x0000000000000000000000000000000000000000'
  ): Promise<string> {
    if (!this.signer || !this.provider) {
      throw new Error('Wallet not connected')
    }

    try {
      let gasEstimate: ethers.BigNumber

      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        // ETH transfer
        const txRequest = {
          to,
          value: ethers.utils.parseEther(amount)
        }
        gasEstimate = await this.provider.estimateGas(txRequest)
      } else {
        // ERC-20 transfer
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ['function transfer(address to, uint256 amount) returns (bool)'],
          this.signer
        )

        const decimals = await tokenContract.decimals()
        const amountInWei = ethers.utils.parseUnits(amount, decimals)
        
        gasEstimate = await tokenContract.estimateGas.transfer(to, amountInWei)
      }

      return gasEstimate.toString()
    } catch (error) {
      console.error('Error estimating gas:', error)
      throw error
    }
  }

  private handleAccountsChanged(accounts: string[]) {
    if (accounts.length === 0) {
      this.disconnectWallet()
    } else if (this.currentWallet) {
      this.currentWallet.address = accounts[0]
      this.getWalletInfo() // Update balance
    }
  }

  private handleChainChanged(chainId: string) {
    // Reload the page when chain changes
    window.location.reload()
  }

  isWalletConnected(): boolean {
    return this.currentWallet?.isConnected || false
  }

  getCurrentWallet(): CryptoWallet | null {
    return this.currentWallet
  }
}

// Export singleton instance
export const cryptoWalletService = new CryptoWalletService()

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on: (event: string, callback: (...args: any[]) => void) => void
      removeListener: (event: string, callback: (...args: any[]) => void) => void
    }
  }
}
