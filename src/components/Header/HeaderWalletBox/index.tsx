/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { useState } from 'react'
import { Button, Tooltip } from 'antd'
import { useContainer } from 'unstated-next'
import WalletContainer from '../../../containers/wallet'
import { ReactComponent as SignOutSVG } from '../../../assets/svg/exit.svg'
import { ReactComponent as CopySVG } from '../../../assets/svg/copy.svg'
import { ReactComponent as QuesitonSVG } from '../../../assets/svg/Question.svg'
import { ReactComponent as ExplorerSVG } from '../../../assets/svg/toExplorer.svg'
import { PairList } from '../../../utils/const'
import i18n from '../../../utils/i18n'
import { HeaderBox, HeaderPanel, HeaderMeta, HeaderWalletBox, HeaderWallet, WalletList } from './styled'

interface Props {
  disconnect: () => void
  addresses: [string, string]
}

export default function WalletBox({ disconnect, addresses }: Props) {
  const Wallet = useContainer(WalletContainer)
  const { ckbWallet, ethWallet } = Wallet

  const truncatureStr = (str: string): string => {
    return str.length > 10 ? `${str.slice(0, 10)}...${str.slice(-10)}` : str
  }

  const balancesListWapper = [
    {
      ...ckbWallet,
      name: 'CKB',
    },
    {
      ...ethWallet,
      name: 'ETH',
    },
  ].map(item => {
    const index: number = PairList.findIndex(pair => pair.name === item.name)

    return {
      ...item,
      logo: index >= 0 ? PairList[index].logo : null,
    }
  })

  const copyToClipboard = 'Copy'
  const copied = 'Copied!'

  const [clipboardTooltip, setClipboardTooltip] = useState(copyToClipboard)

  const validityText = (value: number) => (value >= 0 ? (value / 10 ** 8).toString() : '--')
  const fractionText = (value: number, matrixing: number) =>
    value && value >= 0 ? (value / 10 ** 3).toFixed(matrixing) : '--'
  const walletFlexBox = (item: any) => {
    return (
      <>
        <div className="balance-item">
          <div className="balance-name">{item.name}</div>
          <div
            className="balance-price"
            style={{
              textAlign: 'right',
              alignItems: 'revert',
            }}
          >
            <div className="total-num">{validityText(item.balance?.amount)}</div>
            <div className="price">
              <span>$ 0.00</span>
            </div>
          </div>
        </div>
        {item.name === 'CKB' ? (
          <div className="balance-ckb">
            <div className="ckb-item">
              <span>{i18n.t('header.inUse')}</span>
              <span>{item.inuse?.amount}</span>
            </div>
            <div className="ckb-item">
              <span>{i18n.t('header.free')}</span>
              <span>{fractionText(item.free?.amount, 2)}</span>
            </div>
          </div>
        ) : null}
      </>
    )
  }

  return (
    <HeaderWalletBox>
      <HeaderWallet>
        <span>{i18n.t('header.testWallet')}</span>
        <Button onClick={disconnect} type="text">
          <SignOutSVG />
        </Button>
      </HeaderWallet>
      <WalletList>
        {addresses.map(address => (
          <div className="wallet" key={address}>
            <span className="address">
              {truncatureStr(address)}
              <Tooltip
                title={clipboardTooltip}
                placement="bottom"
                onVisibleChange={visable => visable && setClipboardTooltip(copyToClipboard)}
              >
                <Button
                  type="text"
                  onClick={() => {
                    navigator.clipboard.writeText(address)
                    setClipboardTooltip(copied)
                  }}
                >
                  <CopySVG />
                  {/* <img src={copy} alt="wallet adress copy" /> */}
                </Button>
              </Tooltip>
            </span>
            <Tooltip
              title={address.startsWith('0x') ? i18n.t('header.HexAddressTooltip') : i18n.t('header.ckbAddressTooltip')}
              placement="bottom"
            >
              <Button type="text" className="question-btn">
                <QuesitonSVG />
              </Button>
            </Tooltip>
          </div>
        ))}
      </WalletList>
      <HeaderBox className="header-box">
        <HeaderPanel>
          <HeaderMeta id="header-meta">
            <div className="popover-wallet-box">
              <div className="balances">
                <h4
                  style={{
                    marginLeft: '10px',
                  }}
                >
                  {i18n.t('header.balances')}
                </h4>
                <div className="divider" />
                <ul>
                  {balancesListWapper.map(item => (
                    <li key={item.name} className="balance-list">
                      <div
                        className="logo"
                        style={{
                          marginTop: item.name === 'CKB' ? '10px' : 0,
                        }}
                      >
                        {item.logo ? <img src={item.logo} alt="logo" /> : ''}
                      </div>
                      <div className="wallet-info">{walletFlexBox(item)}</div>
                      <div className="explorer">
                        <Button
                          type="text"
                          size="small"
                          onClick={() => window.open(`https://explorer.nervos.org/aggron/address/${item.address}`)}
                        >
                          <div className="explorer-svg">
                            <ExplorerSVG />
                          </div>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </HeaderMeta>
        </HeaderPanel>
      </HeaderBox>
    </HeaderWalletBox>
  )
}
