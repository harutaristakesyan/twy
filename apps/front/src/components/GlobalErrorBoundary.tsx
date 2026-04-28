import React, { Component, type ReactNode } from 'react'
import { App as AntdApp } from 'antd'

interface Props {
  children: ReactNode
  modal: ReturnType<typeof AntdApp.useApp>['modal']
  message: ReturnType<typeof AntdApp.useApp>['message']
  notification: ReturnType<typeof AntdApp.useApp>['notification']
}

interface State {
  hasError: boolean
  errorInfo: string
}

class ErrorBoundaryCore extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, errorInfo: '' }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorInfo: error.message }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Caught by ErrorBoundary:', error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, errorInfo: '' })
  }

  render() {
    const { hasError, errorInfo } = this.state

    if (hasError) {
      this.props.modal.error({
        title: 'Unexpected Error',
        content: errorInfo,
        onOk: this.resetError,
      })

      this.props.message.error('Something went wrong.')

      return null
    }

    return this.props.children
  }
}

// ✅ Functional wrapper that injects Ant Design App context
const GlobalErrorBoundary = ({ children }: { children: ReactNode }) => {
  const { modal, message, notification } = AntdApp.useApp()

  return (
    <ErrorBoundaryCore modal={modal} message={message} notification={notification}>
      {children}
    </ErrorBoundaryCore>
  )
}

export default GlobalErrorBoundary
