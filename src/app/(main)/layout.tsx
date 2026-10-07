"use client";

import { useSession, signOut } from "next-auth/react";
import {
  Button,
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Drawer,
  Grid,
} from "antd";
import {
  BookOutlined,
  FolderOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuOutlined,
  ReadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const screens = useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items: NavItem[] = useMemo(
    () => [
      { key: "/documents", label: "Tài liệu", icon: <BookOutlined /> },
      { key: "/categories", label: "Thư mục", icon: <FolderOutlined /> },
      {
        key: "/admin/keys",
        label: "Private Keys",
        icon: <KeyOutlined />,
        adminOnly: true,
      },
    ],
    [],
  );

  const filtered = items.filter(
    (i) => !i.adminOnly || session?.user?.role === "ADMIN",
  );

  const selectedKey =
    filtered.find((i) => pathname?.startsWith(i.key))?.key ?? "/documents";

  const menuItems = filtered.map((i) => ({
    key: i.key,
    icon: i.icon,
    label: <Link href={i.key}>{i.label}</Link>,
  }));

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const userMenu = {
    items: [
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Đăng xuất",
        onClick: handleSignOut,
      },
    ],
  };

  const isMobile = !screens.md;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "0 12px" : "0 24px",
        }}
      >
        <Space>
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined style={{ color: "#fff" }} />}
              onClick={() => setDrawerOpen(true)}
              aria-label="Menu"
            />
          )}
          <Link
            href="/"
            style={{
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ReadOutlined />
            {!isMobile && "IZI Study"}
          </Link>
        </Space>
        <Dropdown menu={userMenu} placement="bottomRight">
          <Space style={{ cursor: "pointer", color: "#fff" }}>
            <Avatar icon={<UserOutlined />} size="small" />
            {!isMobile && (
              <span>{session?.user?.name ?? session?.user?.email}</span>
            )}
          </Space>
        </Dropdown>
      </Header>

      <Layout>
        {!isMobile && (
          <Sider
            width={220}
            style={{ background: "#f0fdf4" }}
            breakpoint="lg"
            collapsedWidth={0}
          >
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              style={{ background: "transparent", borderRight: 0, paddingTop: 8 }}
              items={menuItems}
            />
          </Sider>
        )}

        {isMobile && (
          <Drawer
            title="Menu"
            placement="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            styles={{ body: { padding: 0 } }}
          >
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              onClick={() => setDrawerOpen(false)}
              items={menuItems}
              style={{ borderRight: 0 }}
            />
          </Drawer>
        )}

        <Content style={{ width: "100vw", padding: "10px" }}>{children}</Content>
      </Layout>
    </Layout>
  );
}