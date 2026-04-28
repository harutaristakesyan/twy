import { Card, Col, Divider, Grid, Row, Typography } from 'antd'
import { Link } from 'react-router-dom'
import CardHeader from '@/features/auth/components/CardHeader.tsx'
import RegistrationForm from '@/features/auth/registration/RegistrationForm.tsx'

const { Title, Text, Paragraph } = Typography
const { useBreakpoint } = Grid

const RegistrationPage = () => {
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
          <CardHeader />
          <Title level={3} style={{ textAlign: 'center', fontSize: screens.xs ? 20 : 24 }}>
            Create your account
          </Title>
          <Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 32 }}>
            Join TWY
          </Paragraph>
          <RegistrationForm />
          <Divider />
          <Row align="middle" justify="space-between" gutter={[0, 12]}>
            <Col>
              <Text strong> Already have an account?</Text>
            </Col>
            <Col>
              <Link to="/login">Log in</Link>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  )
}

export default RegistrationPage
