import { CellDep, DepType, OutPoint, Script, HashType, SUDT } from '@lay2/pw-core'
import { buildShadowAssetSUDT } from './erc20'

export const SUDT_DEP = new CellDep(DepType.code, new OutPoint(process.env.REACT_APP_SUDT_DEP_OUT_POINT!, '0x0'))

export const SUDT_TYPE_SCRIPT = new Script(
  process.env.REACT_APP_SUDT_TYPE_HASH!,
  process.env.REACT_APP_SUDT_TYPE_ARGS!,
  (process.env.REACT_APP_SUDT_TYPE_HASH_TYPE as HashType) || HashType.type,
)

export const SUDT_GLIA = new SUDT(process.env.REACT_APP_SUDT_TYPE_ARGS!, {
  symbol: 'GLIA',
  name: 'GLIA',
  decimals: 8,
})

export const SUDT_CK_ETH = buildShadowAssetSUDT({
  symbol: 'ckETH',
  name: 'ckETH',
  decimals: 18,
})

export const ERC20_LIST = ['DAI', 'USDT', 'USDC']

export type IssuerLockHash = string

export const SUDT_LIST = [SUDT_GLIA, SUDT_CK_ETH]

export const SUDT_MAP = new Map<IssuerLockHash, SUDT>()
SUDT_LIST.forEach(sudt => {
  SUDT_MAP.set(sudt.issuerLockHash, sudt)
})
