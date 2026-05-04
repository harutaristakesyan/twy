import { Grid, Layout } from "antd";
import { Outlet } from "react-router-dom";
import AppHeader from "@/layouts/AppHeader.tsx";
import Sidebar from "@/layouts/Sidebar.tsx";

const { useBreakpoint } = Grid;
const { Content } = Layout;

const AppLayout = () => {
  const screens = useBreakpoint();

  return (
    <Layout hasSider={!screens.xs} style={{ minHeight: "100vh" }}>
      <Sidebar />
      <Layout>
        <AppHeader />
        <Content style={{ padding: 20 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
