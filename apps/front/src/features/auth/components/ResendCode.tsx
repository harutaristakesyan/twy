import { Flex, message, Space, Typography } from 'antd'
import { useLocation } from 'react-router-dom'
import ApiClient from '@/shared/api/ApiClient.ts'
import { useEffect, useState } from 'react'

const { Text, Link } = Typography

const ResendCode = () => {
  const location = useLocation()
  const email = location.state?.email

  const [timer, setTimer] = useState(119)

  useEffect(() => {
    if (timer === 0) return

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [timer])

  const handleResendCode = async () => {
    if (!email) return
    await ApiClient.post('/resend-code', { email })
    message.success('Verification code resent')
    setTimer(119)
  }

  return (
    <Flex justify="center" align="center" style={{ marginTop: 24 }}>
      <Space>
        <Text type="secondary">Didn&#39;t receive the code?</Text>
        <Link disabled={!email || timer > 0} onClick={handleResendCode}>
          Resend Code
        </Link>
        <Text type="secondary">|</Text>
        <Text>{`${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')}`}</Text>
      </Space>
    </Flex>
  )
}

export default ResendCode
