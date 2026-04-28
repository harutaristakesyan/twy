import { Card, Col, Divider, Flex, Grid, Row, Typography } from 'antd'
import LoginForm from '@/features/auth/login/LoginForm.tsx'
import Logo from '@/shared/ui/Logo.tsx'
import FooterSection from '@/features/auth/login/FooterSection.tsx'

const { Title } = Typography
const { useBreakpoint } = Grid

const LoginPage = () => {
  const screens = useBreakpoint()
  return (
    <Row
      justify="center"
      align="middle"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)',
        padding: screens.xs ? 12 : 24,
      }}
    >
      <Col xs={24} sm={20} md={16} lg={12} xl={8}>
        <Card style={{ width: '100%', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <Flex vertical align="center" style={{ marginBottom: 16 }}>
            <Logo style={{ width: 180, height: 36 }} />
            <Title level={3} style={{ margin: '16px 0 0 0', fontSize: screens.xs ? 20 : 24 }}>
              Log in to your account
            </Title>
          </Flex>
          <LoginForm />
          <Divider />
          <FooterSection />
        </Card>
      </Col>
    </Row>
  )
}

export default LoginPage
