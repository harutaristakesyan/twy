import { Col, Row, Typography } from 'antd'
import { Link } from 'react-router-dom'

const { Text } = Typography

const FooterSection = () => (
  <Row align="middle" justify="space-between" gutter={[0, 12]}>
    <Col>
      <Text strong>Don’t have an account?</Text>
    </Col>
    <Col>
      <Link to="/register">Register now</Link>
    </Col>
  </Row>
)

export default FooterSection
