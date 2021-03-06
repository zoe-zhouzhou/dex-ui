import PWCore, { Address, AddressType, AmountUnit, Script, SUDT, Web3ModalProvider } from '@lay2/pw-core'
import BigNumber from 'bignumber.js'
import { useCallback, useMemo, useRef, useState } from 'react'
import { createContainer } from 'unstated-next'
import { replayResistOutpoints } from 'utils'
import Web3 from 'web3'
import Web3Modal from 'web3modal'
import { getCkbBalance, getOrCreateBridgeCell, getSudtBalance } from '../APIs'
import {
  CKB_DECIMAL,
  CKB_NODE_URL,
  IssuerLockHash,
  IS_DEVNET,
  ORDER_BOOK_LOCK_SCRIPT,
  PW_DEV_CHAIN_CONFIG,
  SUDT_GLIA,
  SUDT_LIST,
} from '../constants'
import DEXCollector from '../pw/dexCollector'

export interface Wallet {
  balance: BigNumber
  lockedOrder: BigNumber
  address: string
  bestPrice: string
  tokenName: string
}

export interface CkbWallet extends Wallet {
  inuse: BigNumber
  free: BigNumber
}

export function isCkbWallet(wallet: Wallet): wallet is CkbWallet {
  return wallet.tokenName === 'CKB'
}

export interface SudtWallet extends Wallet {
  lockedOrder: BigNumber
  lockHash: IssuerLockHash
}

const defaultCkbWallet: CkbWallet = {
  balance: new BigNumber(0),
  inuse: new BigNumber(0),
  free: new BigNumber(0),
  lockedOrder: new BigNumber(0),
  address: '',
  bestPrice: '0.00',
  tokenName: 'CKB',
}

const defaultSUDTWallet: SudtWallet = {
  balance: new BigNumber(0),
  lockedOrder: new BigNumber(0),
  address: '',
  bestPrice: '0.00',
  lockHash: '',
  tokenName: 'GLIA',
}

const defaultSUDTWallets = SUDT_LIST.map(sudt => {
  return {
    ...defaultSUDTWallet,
    lockHash: sudt.issuerLockHash,
  }
})

const defaultEthWallet: Wallet = {
  balance: new BigNumber(0),
  lockedOrder: new BigNumber(0),
  address: '',
  bestPrice: '0.00',
  tokenName: 'ETH',
}

export function useWallet() {
  const [pw, setPw] = useState<null | PWCore>(null)
  const [web3, setWeb3] = useState<null | Web3>(null)
  const web3ModalRef = useRef<Web3Modal | null>(null)
  const [ckbWallet, setCkbWallet] = useState<CkbWallet>(defaultCkbWallet)
  const [connecting, setConnecting] = useState(false)
  const [ethWallet, setEthWallet] = useState<Wallet>(defaultEthWallet)

  const [sudtWallets, setSudtWallets] = useState<SudtWallet[]>(defaultSUDTWallets)
  const [currentSudtLockHash, setCurrentSudtLockHash] = useState<IssuerLockHash>(SUDT_GLIA.issuerLockHash)
  const currentSudtWallet = useMemo(() => {
    return sudtWallets.find(w => w.lockHash === currentSudtLockHash)!
  }, [currentSudtLockHash, sudtWallets])

  const setEthBalance = useCallback(
    (balance: BigNumber, addr: string) => {
      setEthWallet({
        ...ethWallet,
        balance,
        address: addr,
      })
    },
    [ethWallet, setEthWallet],
  )

  const setEthAddress = useCallback(
    (address: string) => {
      setEthWallet({
        ...ethWallet,
        address,
      })
    },
    [ethWallet, setEthWallet],
  )

  const setCkbAddress = useCallback(
    (address: string) => {
      setCkbWallet({
        ...ckbWallet,
        address,
      })
    },
    [ckbWallet, setCkbWallet],
  )

  const setCkbBalance = useCallback(
    (balance: BigNumber) => {
      setCkbWallet({
        ...ckbWallet,
        balance,
      })
    },
    [ckbWallet],
  )

  const reloadCkbWallet = useCallback(async (address: string) => {
    const res = (await getCkbBalance(PWCore.provider.address.toLockScript())).data
    const free = new BigNumber(res.free).div(CKB_DECIMAL)
    const occupied = new BigNumber(res.occupied).div(CKB_DECIMAL)
    const lockedOrder = new BigNumber(res.locked_order).div(CKB_DECIMAL)

    setCkbWallet({
      balance: free,
      inuse: occupied,
      free,
      lockedOrder,
      address,
      bestPrice: '0',
      tokenName: 'CKB',
    })
  }, [])

  const reloadSudtWallet = useCallback(async (sudt: SUDT) => {
    const res = (await getSudtBalance(sudt.toTypeScript(), PWCore.provider.address.toLockScript())).data
    const decimal = new BigNumber(10).pow(sudt?.info?.decimals ?? AmountUnit.shannon)
    const free = new BigNumber(res.free).div(decimal)
    const lockedOrder = new BigNumber(res.locked_order).div(decimal)
    return {
      balance: free,
      lockedOrder,
      address: '',
      bestPrice: '0',
      lockHash: sudt.issuerLockHash,
      tokenName: sudt.info?.symbol ?? '',
    }
  }, [])

  const reloadEthWallet = useCallback(async () => {
    if (!web3) {
      return
    }
    const [ethAddr] = await web3.eth.getAccounts()
    const ethBalance = await web3.eth.getBalance(ethAddr)

    setEthBalance(new BigNumber(ethBalance).div(new BigNumber(10).pow(18)), ethAddr.toLowerCase())
  }, [web3, setEthBalance])

  const reloadSudtWallets = useCallback(async () => {
    const wallets = await Promise.all(SUDT_LIST.map(sudt => reloadSudtWallet(sudt)))
    setSudtWallets(wallets)
  }, [reloadSudtWallet])

  const reloadWallet = useCallback(
    (address: string) => {
      reloadCkbWallet(address)
      reloadSudtWallets()
      reloadEthWallet()
    },
    [reloadCkbWallet, reloadSudtWallets, reloadEthWallet],
  )

  const connectWallet = useCallback(async () => {
    setConnecting(true)
    try {
      const provider = await web3ModalRef.current?.connect()

      provider.on('accountsChanged', function reconnectWallet() {
        provider.off('accountsChanged', reconnectWallet)
        connectWallet()
      })

      const newWeb3 = new Web3(provider)
      const newPw = await new PWCore(CKB_NODE_URL).init(
        new Web3ModalProvider(newWeb3),
        new DEXCollector(),
        IS_DEVNET ? 2 : undefined,
        IS_DEVNET ? PW_DEV_CHAIN_CONFIG : undefined,
      )

      const [ethAddr] = await newWeb3.eth.getAccounts()
      const ethBalance = await newWeb3.eth.getBalance(ethAddr)
      const ckbAddr = PWCore.provider.address.toCKBAddress()

      setWeb3(newWeb3)
      setPw(newPw)

      setEthBalance(new BigNumber(ethBalance).div(new BigNumber(10).pow(18)), ethAddr.toLowerCase())
      setCkbAddress(ckbAddr)
      reloadWallet(ckbAddr)
    } finally {
      setConnecting(false)
    }
  }, [reloadWallet, setCkbAddress, setEthBalance])

  const disconnectWallet = useCallback(
    async (cb?: Function) => {
      await PWCore.provider.close()
      await web3ModalRef.current?.clearCachedProvider()
      setCkbAddress('')
      setEthAddress('')
      setConnecting(false)
      // eslint-disable-next-line no-unused-expressions
      cb?.()
    },
    [setCkbAddress, setEthAddress],
  )

  const resetWallet = useCallback(() => {
    setCkbWallet(defaultCkbWallet)
    setSudtWallets(defaultSUDTWallets)
    setEthWallet(defaultEthWallet)
  }, [])

  const wallets = useMemo(() => {
    return [ckbWallet, ethWallet, ...sudtWallets]
  }, [ckbWallet, ethWallet, sudtWallets])

  const lockHash = useMemo(() => (ckbWallet.address ? PWCore.provider?.address?.toLockScript().toHash() : ''), [
    ckbWallet.address,
  ])

  const getBridgeCell = useCallback(
    (tokenAddress: string, type: 'cross-order' | 'cross-in') => {
      if (!lockHash) {
        return null
      }
      const ckbAddress = ckbWallet.address
      const address = new Address(ckbAddress, AddressType.ckb)

      const orderLock = new Script(
        ORDER_BOOK_LOCK_SCRIPT.codeHash,
        address.toLockScript().toHash(),
        ORDER_BOOK_LOCK_SCRIPT.hashType,
      )
      const recipientAddress = type === 'cross-in' ? address.toCKBAddress() : orderLock.toAddress().toCKBAddress()
      const key = `${recipientAddress}-${tokenAddress}`
      const ops = replayResistOutpoints.get()[key]

      return ops
    },
    [lockHash, ckbWallet.address],
  )

  const createBridgeCell = useCallback(
    (tokenAddress: string, type: 'cross-order' | 'cross-in', cb?: Function) => {
      if (!lockHash) {
        return
      }
      const ckbAddress = ckbWallet.address
      const address = new Address(ckbAddress, AddressType.ckb)

      const orderLock = new Script(
        ORDER_BOOK_LOCK_SCRIPT.codeHash,
        address.toLockScript().toHash(),
        ORDER_BOOK_LOCK_SCRIPT.hashType,
      )
      const recipientAddress = type === 'cross-in' ? address.toCKBAddress() : orderLock.toAddress().toCKBAddress()
      const key = `${recipientAddress}-${tokenAddress}`
      const ops = replayResistOutpoints.get()[key]
      const isOpsEmpty = !ops || (Array.isArray(ops) && ops.length === 0)
      if (isOpsEmpty) {
        getOrCreateBridgeCell(recipientAddress).then(res => {
          replayResistOutpoints.add(key, res.data.outpoints)
          // eslint-disable-next-line no-unused-expressions
          cb?.()
        })
      }
    },
    [lockHash, ckbWallet.address],
  )

  return {
    pw,
    web3,
    setPw,
    setWeb3,
    ckbWallet,
    setCkbWallet,
    ethWallet,
    sudtWallets,
    setEthBalance,
    setCkbBalance,
    setEthAddress,
    setCkbAddress,
    reloadCkbWallet,
    reloadSudtWallet,
    reloadSudtWallets,
    reloadWallet,
    connecting,
    setConnecting,
    connectWallet,
    disconnectWallet,
    web3ModalRef,
    resetWallet,
    setCurrentSudtLockHash,
    currentSudtWallet,
    wallets,
    createBridgeCell,
    getBridgeCell,
    lockHash,
  }
}

export const WalletContainer = createContainer(useWallet)

export default WalletContainer
