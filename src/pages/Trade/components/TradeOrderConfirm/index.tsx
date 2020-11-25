import React, { useState, useCallback, useMemo, useEffect } from 'react'
import PWCore, { Amount, Builder, AmountUnit } from '@lay2/pw-core'
import { useContainer } from 'unstated-next'
import BigNumber from 'bignumber.js'
import ConfirmButton from 'components/ConfirmButton'
import HeaderWithGoback from 'components/HeaderWithGoback'
import { Divider, Modal } from 'antd'
import { TradePairConfirmBox, TradePairConfirmContent, OrderResult, Footer } from './styled'
import i18n from '../../../../utils/i18n'
import OrderContainer, { OrderMode, OrderStep, OrderType } from '../../../../containers/order'
import type { SubmittedOrder } from '../../../../containers/order'
import WalletContainer from '../../../../containers/wallet'
import { calcBuyReceive, calcSellReceive, toFormatWithoutTrailingZero } from '../../../../utils/fee'
import { COMMISSION_FEE, MAX_TRANSACTION_FEE, ORDER_CELL_CAPACITY } from '../../../../constants'
import { spentCells } from '../../../../utils'
import { Pairs } from './pairs'
import { List, Item } from './list'
import { Meta } from './meta'
import CrossChain from './CrossChain'
import CrossIn from './CrossIn'
import CrossOut from './CrossOut'

export default function TradePairConfirm() {
  const Wallet = useContainer(WalletContainer)
  const Order = useContainer(OrderContainer)
  const [buyer, seller] = Order.pair
  const [disabled, setDisabled] = useState(false)
  const { address } = Wallet.ckbWallet

  useEffect(() => {
    if (address === '') {
      setDisabled(false)
      Order.reset()
      Order.setStep(OrderStep.Order)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  const onConfirm = useCallback(async () => {
    setDisabled(true)
    try {
      const tx = Order.tx!
      const txHash = await Wallet.pw?.sendTransaction(tx)
      spentCells.add(tx.raw.inputs.map(input => input.previousOutput.serializeJson()) as any)

      const isBid = Order.orderType === OrderType.Bid
      const receiveCalc = isBid ? calcBuyReceive : calcSellReceive

      const submittedOrder: SubmittedOrder = {
        key: `${txHash}:0x0`,
        isBid,
        status: 'pending',
        pay: Order.pay,
        receive: receiveCalc(Order.pay, Order.price),
        price: Order.price,
        createdAt: `${Date.now()}`,
      }
      Order.setAndCacheSubmittedOrders(orders => [submittedOrder, ...orders])
      Order.setTxHash(txHash!)
      Order.setStep(OrderStep.Result)
      Wallet.reloadWallet(PWCore.provider.address.toCKBAddress())
    } catch (error) {
      Modal.error({ title: 'Submission Error', content: error.message })
    } finally {
      setDisabled(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    Wallet.reloadWallet,
    Order.setStep,
    Order.setTxHash,
    Order.setAndCacheSubmittedOrders,
    Order.pay,
    Order.price,
    Wallet.pw,
    Order.tx,
    Order.orderType,
  ])

  const transactionFee = useMemo(() => {
    return Order.tx ? Builder.calcFee(Order.tx).toString() : '0'
  }, [Order.tx])

  const tradeFee = useMemo(() => {
    return toFormatWithoutTrailingZero(new BigNumber(Order.pay).times(COMMISSION_FEE).toString())
  }, [Order.pay])

  const totalPay = useMemo(() => {
    let pay = new BigNumber(Order.pay).plus(new BigNumber(tradeFee))
    if (buyer === 'CKB') {
      pay = pay.plus(new BigNumber(transactionFee))
    }
    return toFormatWithoutTrailingZero(pay.toString())
  }, [Order.pay, buyer, tradeFee, transactionFee])

  const lockedCkbAmount = useMemo(() => {
    if (Order.tx) {
      const [orderOutput] = Order.tx.raw.outputs
      return orderOutput.capacity.toString(AmountUnit.ckb)
    }
    return '0'
  }, [Order.tx])

  const totalPayDetail = useMemo(() => {
    const list: Item[] = [
      {
        desc: i18n.t(`trade.totalPay`),
        value: totalPay,
        unit: buyer,
      },
    ]

    if (Order.tx && Order.orderType === OrderType.Ask) {
      list.push({
        desc: '',
        value: new Amount(ORDER_CELL_CAPACITY.toString())
          .sub(new Amount(transactionFee))
          .add(new Amount(`${MAX_TRANSACTION_FEE}`))
          .toString(),
        unit: 'CKB',
      })
    }

    return list
  }, [Order.orderType, totalPay, Order.tx, buyer, transactionFee])

  const tradeDetails = useMemo(() => {
    const list: Item[] = [
      {
        desc: i18n.t('trade.result.trade'),
        value: toFormatWithoutTrailingZero(Order.pay),
        unit: buyer,
      },
      {
        desc: i18n.t('trade.result.tradeFee'),
        value: toFormatWithoutTrailingZero(tradeFee),
        unit: buyer,
      },
      {
        desc: i18n.t('trade.result.transactionFee'),
        value: toFormatWithoutTrailingZero(transactionFee),
        unit: 'CKB',
      },
    ]
    return list
  }, [tradeFee, buyer, transactionFee, Order.pay])

  const payDetail = useMemo(() => {
    const list: Item[] = [
      {
        desc: i18n.t(`trade.price`),
        value: toFormatWithoutTrailingZero(Order.price),
        unit: `CKB per ${Wallet.currentSudtWallet.tokenName}`,
      },
    ]

    return list
  }, [Order.price, Wallet.currentSudtWallet.tokenName])

  const receive = useMemo(() => {
    return toFormatWithoutTrailingZero(Order.receive)
  }, [Order.receive])

  const receiveDetail = useMemo(() => {
    const list: Item[] = [
      {
        desc: i18n.t(`trade.result.receive`),
        value: receive,
        unit: seller,
      },
    ]

    return list
  }, [receive, seller])

  const result: Record<OrderMode, JSX.Element> = {
    [OrderMode.Order]: (
      <OrderResult>
        <List list={totalPayDetail} />
        <List list={tradeDetails} isDeatil />
        <Meta amount={lockedCkbAmount} />
        <List list={payDetail} />
        <Divider style={{ margin: '20px 0' }} />
        <List list={receiveDetail} />
      </OrderResult>
    ),
    [OrderMode.CrossChain]: <CrossChain />,
    [OrderMode.CrossIn]: <CrossIn />,
    [OrderMode.CrossOut]: <CrossOut />,
  }

  return (
    <TradePairConfirmBox>
      <HeaderWithGoback title={i18n.t(`trade.reviewOrder`)} onClick={() => Order.setStep(OrderStep.Order)} />
      <TradePairConfirmContent>
        <Pairs pairs={Order.pair} />
        <Divider />
        {result[Order.orderMode]}
      </TradePairConfirmContent>
      <Footer>
        <ConfirmButton
          onClick={onConfirm}
          disabled={disabled}
          loading={disabled}
          text={i18n.t(`trade.confirmOrder`)}
          bgColor={Order.confirmButtonColor}
        />
      </Footer>
    </TradePairConfirmBox>
  )
}