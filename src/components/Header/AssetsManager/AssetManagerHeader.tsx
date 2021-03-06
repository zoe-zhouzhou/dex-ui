import { LeftOutlined } from '@ant-design/icons'
import { Col, Row } from 'antd'
import React, { HTMLAttributes } from 'react'
import { useHistory } from 'react-router-dom'
import styled from 'styled-components'

const AssetManagerHeaderWrapper = styled.header`
  height: 40px;
  padding: 8px 16px;

  font-weight: bold;
  font-size: 18px;
  text-align: center;
`

interface AssetManagerHeaderProps extends HTMLAttributes<HTMLDivElement> {
  showGoBack?: boolean
}

export const AssetManagerHeader: React.FC<AssetManagerHeaderProps> = (props: AssetManagerHeaderProps) => {
  const { children, showGoBack, title } = props
  const { goBack } = useHistory()

  return (
    <AssetManagerHeaderWrapper>
      <Row align="middle">
        <Col flex="24px">{showGoBack && <LeftOutlined translate="" onClick={() => goBack()} />}</Col>
        {children && <Col flex="auto">{children}</Col>}
        {!children && title && <Col flex="auto">{title}</Col>}
      </Row>
    </AssetManagerHeaderWrapper>
  )
}
