/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { useState } from 'react'
import { Button, Tooltip } from 'antd'
import { useContainer } from 'unstated-next'
import WalletContainer from '../../../containers/wallet'
import { ReactComponent as SignOutSVG } from '../../../assets/svg/exit.svg'
import { ReactComponent as CopySVG } from '../../../assets/svg/copy.svg'
import { ReactComponent as QuestionSVG } from '../../../assets/svg/Question.svg'
import { ReactComponent as ExplorerSVG } from '../../../assets/svg/toExplorer.svg'
import { EXPLORER_URL, PairList } from '../../../constants'
import i18n from '../../../utils/i18n'
import { HeaderBox, HeaderPanel, HeaderMeta, HeaderWalletBox, HeaderWallet, WalletList } from './styled'

interface Props {
  disconnect: () => void
  addresses: [string, string]
}

function clipboard(content: string) {
  const input = document.createElement('input')
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.value = content
  input.select()
  input.setSelectionRange(0, 99999)
  document.execCommand('copy')
  document.body.removeChild(input)
}

export default function WalletBox({ disconnect, addresses }: Props) {
  const Wallet = useContainer(WalletContainer)
  const { ckbWallet, currentSudtWallet: sudtWallet } = Wallet

  const truncateStr = (str: string): string => {
    return str.length > 10 ? `${str.slice(0, 10)}...${str.slice(-10)}` : str
  }

  const balanceList = [
    {
      ...ckbWallet,
      name: 'CKB',
    },
    {
      ...sudtWallet,
      name: 'DAI',
    },
  ].map(item => {
    const index: number = PairList.findIndex(pair => pair.name === item.name)

    return {
      ...item,
      logo: index >= 0 ? PairList[index].logo : null,
    }
  })

  // @TODO: i18n
  const copyToClipboard = 'Copy'
  const copied = 'Copied!'

  const [clipboardTooltip, setClipboardTooltip] = useState(copyToClipboard)

  const validityText = (value: number) => (value >= 0 ? (value / 10 ** 8).toString() : '--')

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
          </div>
        </div>
        <div className="balance-ckb">
          {item.name === 'CKB' ? (
            <div className="ckb-item">
              <span>{i18n.t('header.inUse')}</span>
              <span>{item.inuse?.toString()}</span>
            </div>
          ) : null}
          <div className="ckb-item">
            <span>{i18n.t('header.lockIndex')}</span>
            <span>{item.lockedOrder?.toString()}</span>
          </div>
        </div>
      </>
    )
  }

  return (
    <HeaderWalletBox>
      <HeaderWallet>
        <span>{i18n.t('header.testWallet')}</span>
        <Button onClick={disconnect} type="text">
          <SignOutSVG className="full-width-and-height" />
        </Button>
      </HeaderWallet>
      <WalletList>
        {addresses.map(address => (
          <div className="wallet" key={address}>
            <span className="address">
              {truncateStr(address)}
              <Tooltip
                title={clipboardTooltip}
                placement="bottom"
                onVisibleChange={visible => visible && setClipboardTooltip(copyToClipboard)}
              >
                <Button
                  type="text"
                  onClick={() => {
                    clipboard(address)
                    setClipboardTooltip(copied)
                  }}
                >
                  <CopySVG className="full-width-and-height" />
                </Button>
              </Tooltip>
            </span>
            <Tooltip
              title={address.startsWith('0x') ? i18n.t('header.HexAddressTooltip') : i18n.t('header.ckbAddressTooltip')}
              placement="bottom"
            >
              <Button type="text" className="question-btn">
                <QuestionSVG className="full-width-and-height" />
              </Button>
            </Tooltip>
          </div>
        ))}
      </WalletList>
      <HeaderBox>
        <HeaderPanel>
          <HeaderMeta>
            <div className="popover-wallet-box">
              <div className="balances">
                <h4
                  style={{
                    marginLeft: '10px',
                  }}
                >
                  {i18n.t('header.balance')}
                </h4>
                <div className="divider" />
                <ul>
                  {balanceList.map(item => (
                    <li key={item.name} className="balance-list">
                      <div
                        className="logo"
                        style={{
                          marginTop: '8px',
                        }}
                      >
                        {item.logo ? <img src={item.logo} alt="logo" /> : ''}
                      </div>
                      <div className="wallet-info">{walletFlexBox(item)}</div>
                      <div className="explorer">
                        <a href={`${EXPLORER_URL}address/${item.address}`} target="_blank" rel="noreferrer noopener">
                          <div className="explorer-svg">
                            <ExplorerSVG className="full-width-and-height" fill="#7d7d7d" />
                          </div>
                        </a>
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
