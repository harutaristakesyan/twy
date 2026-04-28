import { Card, Flex } from 'antd'
import CardHeader from '@/features/auth/components/CardHeader.tsx'
import VerificationForm from '@/features/auth/verification/VerificationForm.tsx'

const VerificationPage = () => {
  return (
    <Flex
      justify="center"
      align="center"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)',
      }}
    >
      <Card style={{ width: '100%', maxWidth: 500, borderRadius: 16 }}>
        <CardHeader />
        <VerificationForm />
      </Card>
    </Flex>
  )
}

export default VerificationPage
