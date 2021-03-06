import { Address, AddressType, Amount, SimpleBuilder, SimpleSUDTBuilder } from '@lay2/pw-core'
import { Divider, Form, Input } from 'antd'
import { BigNumber } from 'bignumber.js'
import Token from 'components/Token'
import WalletContainer from 'containers/wallet'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { useHistory, useParams, useRouteMatch } from 'react-router-dom'
import styled from 'styled-components'
import { AssetManagerHeader } from '../AssetManagerHeader'
import { Balance } from '../Balance'
import { Button } from '../components/Button'
import { asserts, debounce } from '../helper'
import { AssetManagerContainer } from '../hooks'

const SendWrapper = styled.div`
  padding: 16px;

  .ant-form,
  .ant-form-item-label > label {
    color: #000;
  }

  .send-header {
    text-align: center;
    padding: 16px;
  }

  .ant-input {
    background: #f6f6f6;
    height: 34px;
    padding: 10px;
  }
  .ant-input-affix-wrapper {
    background: #f6f6f6;
    border-radius: 16px;
  }

  textarea {
    border-radius: 16px;
  }

  /* Chrome, Safari, Edge, Opera */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Firefox */
  input[type='number'] {
    -moz-appearance: textfield;
  }
`

const AmountControlLabelWrapper = styled.div`
  padding-bottom: 8px;

  .amount {
    float: right;
    text-decoration: underline;
    color: #5c61da;
    cursor: pointer;
  }
`

export const Send: React.FC = () => {
  const { t } = useTranslation()
  const { tokenName } = useParams<{ tokenName: string }>()
  const [form] = Form.useForm()
  const { push } = useHistory()
  const match = useRouteMatch()
  const { useSudt } = AssetManagerContainer.useContainer()
  const sudt = useSudt()

  const { wallets } = WalletContainer.useContainer()
  const wallet = wallets.find(wallet => wallet.tokenName === tokenName)

  const [inputAllValidated, setInputAllValidated] = useState(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedValidateInput = useCallback(
    debounce(() => {
      const fieldsAllTouched = form.isFieldsTouched(['amount', 'to'], true)
      const noInputError = form.getFieldsError().flatMap(info => info.errors).length === 0
      const isValidated = !!(fieldsAllTouched && noInputError)
      setInputAllValidated(isValidated)
    }, 200),
    [form, setInputAllValidated],
  )

  const { data: transactionFee } = useQuery<string, unknown>(
    ['getTransactionFee', tokenName, inputAllValidated],
    async () => {
      const { amount, to } = form.getFieldsValue(['amount', 'to'])
      if (!inputAllValidated) return ''
      const toAddressType = to.startsWith('ck') ? AddressType.ckb : AddressType.eth
      const toAddress = new Address(to, toAddressType)

      if (tokenName === 'CKB') {
        const builder = new SimpleBuilder(toAddress, new Amount(amount))
        await builder.build()

        const fee = builder.getFee().toString()
        return fee
      }

      asserts(sudt)

      const builder = new SimpleSUDTBuilder(sudt, toAddress, new Amount(amount))
      await builder.build()
      const fee = builder.getFee().toString()

      return fee
    },
    { enabled: inputAllValidated && form },
  )

  function validateInput() {
    setInputAllValidated(false)
    debouncedValidateInput()
  }

  if (!wallet) return null

  async function validateAmount(_: any, input: any): Promise<void> {
    const isCkb = tokenName === 'CKB'
    asserts(wallet)
    const inputNumber = new BigNumber(input)
    asserts(input && !inputNumber.isNaN(), t(`Amount should be a valid number`))

    const balance = new BigNumber(wallet.balance.toString())
    asserts(inputNumber.lt(balance), t('Amount should less than the MAX'))
    asserts(inputNumber.gt(0), t('Amount should more than 0'))
    if (!isCkb) return

    asserts(inputNumber.gte(61), t('Amount should large than 61'))
    asserts(
      balance.minus(inputNumber).gte(61),
      t(
        `The remaining balance is too small(less than 61 CKB). So the transaction won't succeed. You can send less than 61 CKB out. \n Or do you want to send ALL your CKB out?`,
      ),
    )
  }

  async function validateAddress(_: any, input: string): Promise<void> {
    asserts(
      new Address(input, input.startsWith('ck') ? AddressType.ckb : AddressType.eth).valid(),
      t('Please input a valid address'),
    )
  }

  function setAllBalanceToAmount() {
    form.setFieldsValue({ amount: wallet?.balance })
  }

  const amountLabel = (
    <AmountControlLabelWrapper>
      <span>{t('Amount')}</span>
      <span
        tabIndex={0}
        role="button"
        className="amount"
        onClick={setAllBalanceToAmount}
        onKeyDown={setAllBalanceToAmount}
      >
        {t('Max')}
        :&nbsp;
        <Balance value={wallet.balance} fixedTo={4} />
      </span>
    </AmountControlLabelWrapper>
  )

  const transactionFeeTip = (
    <div style={{ marginBottom: '16px' }}>
      <div>{t('Transaction fee')}</div>
      <div>{transactionFee ? <Balance value={transactionFee} type="CKB" /> : '-'}</div>
    </div>
  )

  function onFinish(data: { to: string; amount: string }) {
    const { to, amount } = data
    const confirmUrl = `${match.url}/confirm?to=${to}&amount=${amount}&fee=${transactionFee}`
    push(confirmUrl)
  }

  return (
    <>
      <AssetManagerHeader title={t('Send')} showGoBack />
      <SendWrapper>
        <header className="send-header">
          <Token tokenName={tokenName} />
        </header>
        <Form form={form} onValuesChange={validateInput} autoComplete="off" layout="vertical" onFinish={onFinish}>
          <Form.Item label={t('To')} name="to" rules={[{ validator: validateAddress }]}>
            <Input.TextArea rows={4} placeholder={t('To')} />
          </Form.Item>
          {amountLabel}
          <Form.Item rules={[{ validator: validateAmount }]} name="amount">
            <Input suffix={tokenName} placeholder={t('Amount')} type="number" size="large" />
          </Form.Item>
          <Divider />
          {transactionFeeTip}

          <Form.Item>
            <Button htmlType="submit" size="large" block disabled={!inputAllValidated || !transactionFee}>
              {t('Send')}
            </Button>
          </Form.Item>
        </Form>
      </SendWrapper>
    </>
  )
}
