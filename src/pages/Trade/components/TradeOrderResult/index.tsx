import React from 'react'
import { Button } from 'antd'
import { useContainer } from 'unstated-next'
import i18n from '../../../../utils/i18n'
import orderPlace from '../../../../assets/img/orderPlaced.png'
import declined from '../../../../assets/img/declined.png'
import { OrderButton, TracePairResultBox, TradePairConfirmHeader, TradePairConfirmContent } from './styled'
import OrderContainer, { OrderStep } from '../../../../containers/order'
import { ReactComponent as ExplorerSVG } from '../../../../assets/svg/toExplorer.svg'
import { EXPLORER_URL } from '../../../../constants'

export default function Trade() {
  const Order = useContainer(OrderContainer)
  const handleClickSubmit = () => {
    Order.setStep(OrderStep.Order)
  }
  const tradeSuccessBox = (txHash: string) => (
    <div className="trace-success">
      <div className="order-place">
        <img src={orderPlace} alt="Order Place" />
      </div>
      <div className="order-tip">{i18n.t('trade.orderSubmitted')}</div>
      <a target="_blank" rel="noreferrer noopener" href={`${EXPLORER_URL}transaction/${txHash}`}>
        {i18n.t('trade.viewExplorer')}
        <div className="explorer-svg">
          <ExplorerSVG className="full-width-and-height" />
        </div>
      </a>
    </div>
  )

  const tradeFailedBox = () => (
    <div className="trace-failed">
      <div className="order-place">
        <img src={declined} alt="Order Declined" />
      </div>
      <div>{i18n.t(`trade.orderDeclined`)}</div>
    </div>
  )
  return (
    <TracePairResultBox>
      <TradePairConfirmHeader>
        <span>{i18n.t(`trade.reviewOrder`)}</span>
      </TradePairConfirmHeader>
      <TradePairConfirmContent>
        {Order.txHash ? tradeSuccessBox(Order.txHash) : tradeFailedBox()}
      </TradePairConfirmContent>
      <OrderButton>
        <Button
          type="text"
          size="large"
          onClick={() => handleClickSubmit()}
          style={{
            color: 'rgba(0, 106, 151, 1)',
          }}
        >
          {i18n.t(`trade.TradeSuccess`)}
        </Button>
      </OrderButton>
    </TracePairResultBox>
  )
}