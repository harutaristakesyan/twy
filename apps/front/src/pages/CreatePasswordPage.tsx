import { Card, Flex, Typography } from 'antd'
import CardHeader from '@/features/auth/components/CardHeader.tsx'
import CreatePasswordForm from '@/features/auth/create-password/CreatePasswordForm.tsx'

const { Title, Paragraph } = Typography

const SetPasswordPage = () => {
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
        <Title level={3}>Create Password</Title>
        <Paragraph type="secondary">Create a new password that is at least 8 characters long.</Paragraph>
        <CreatePasswordForm />
      </Card>
    </Flex>
  )
}

export default SetPasswordPage
