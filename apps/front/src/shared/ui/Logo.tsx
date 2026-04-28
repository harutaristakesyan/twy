import React from 'react'
import { Typography } from 'antd'

const { Title } = Typography
interface LogoProps {
  style?: React.CSSProperties
}

const Logo: React.FC<LogoProps> = ({ style }) => {
  return <Title>TWY</Title>
}

export default Logo
