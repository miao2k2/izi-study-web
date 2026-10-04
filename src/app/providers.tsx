"use client";

import "@ant-design/v5-patch-for-react-19";
import { SessionProvider } from "next-auth/react";
import { ConfigProvider, App as AntdApp } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { greenTheme } from "@/lib/theme";
import viVN from "antd/locale/vi_VN";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AntdRegistry>
        <ConfigProvider theme={greenTheme} locale={viVN}>
          <AntdApp>{children}</AntdApp>
        </ConfigProvider>
      </AntdRegistry>
    </SessionProvider>
  );
}