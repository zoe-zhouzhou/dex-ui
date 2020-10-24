import React from 'react'
import { Button } from 'antd'
import { useContainer } from 'unstated-next'
import { useSelector } from 'react-redux'
import i18n from '../../../../utils/i18n'

import orderPlace from '../../../../assets/img/orderPlaced.png'
import declined from '../../../../assets/img/declined.png'
import { OrderButton, TracePairResultBox, TradePairConfirmHeader, TradePairConfirmContent } from './styled'
import OrderContainer, { OrderStep } from '../../../../containers/order'

export default function Trade() {
  const isOrderSuccess = useSelector((state: any) => state.trace.isOrderSuccess)
  const tradeResultStr = isOrderSuccess ? i18n.t(`trade.TradeSuccess`) : i18n.t(`trade.TradeFailed`)
  const Order = useContainer(OrderContainer)
  const handleClickSubmit = () => {
    Order.setStep(OrderStep.Order)
  }
  const tradeSuccessBox = (txHash: string) => (
    <div className="trace-success">
      <div className="order-place">
        <img src={orderPlace} alt="Order Place" />
      </div>
      <div>Order Place</div>
      <a target="_blank" rel="noreferrer noopener" href={`https://explorer.nervos.org/aggron/transaction/${txHash}`}>
        View you CKB Explorer
      </a>
    </div>
  )

  const tradeFailedBox = () => (
    <div className="trace-failed">
      <div className="order-place">
        <img src={declined} alt="Order Declined" />
      </div>
      <div>Order Declined</div>
    </div>
  )
  return (
    <TracePairResultBox>
      <TradePairConfirmHeader>
        <span>Review Order</span>
      </TradePairConfirmHeader>
      <TradePairConfirmContent>
        {Order.txHash ? tradeSuccessBox(Order.txHash) : tradeFailedBox()}
      </TradePairConfirmContent>
      <OrderButton>
        <Button type="text" size="large" onClick={() => handleClickSubmit()}>
          {tradeResultStr}
        </Button>
      </OrderButton>
    </TracePairResultBox>
  )
}