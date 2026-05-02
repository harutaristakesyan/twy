import GlobalErrorBoundary from "@components/GlobalErrorBoundary.tsx";
import { App, ConfigProvider, Empty, type ThemeConfig } from "antd";
import type { FC, PropsWithChildren } from "react";

export const themeConfig: ThemeConfig = {
  components: {
    Layout: {
      headerBg: "#ffffff",
    },
  },
};

const AntdApp: FC<PropsWithChildren> = ({ children }) => {
  return (
    <ConfigProvider renderEmpty={() => <Empty description={false} />} theme={themeConfig}>
      <App>
        <GlobalErrorBoundary>{children}</GlobalErrorBoundary>
      </App>
    </ConfigProvider>
  );
};

export default AntdApp;
