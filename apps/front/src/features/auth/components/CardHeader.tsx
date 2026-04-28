import { Button, Flex } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import Logo from '@/shared/ui/Logo.tsx'

const CardHeader = () => {
  const navigate = useNavigate()

  return (
    <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
      <Logo style={{ width: '200px', height: '40px' }} />
    </Flex>
  )
}

export default CardHeader
