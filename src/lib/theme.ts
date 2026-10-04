"use client";

import type { ThemeConfig } from "antd";
import { theme } from "antd";

// Theme chủ đạo xanh lá cây
export const greenTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: "#16a34a", // green-600
    colorInfo: "#16a34a",
    colorSuccess: "#22c55e",
    colorWarning: "#f59e0b",
    colorError: "#dc2626",
    colorLink: "#15803d",
    borderRadius: 8,
    fontFamily:
      "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  components: {
    Layout: {
      headerBg: "#16a34a",
      headerColor: "#ffffff",
      siderBg: "#f0fdf4",
      bodyBg: "#f7fafc",
    },
    Menu: {
      itemSelectedBg: "#dcfce7",
      itemSelectedColor: "#15803d",
      itemHoverBg: "#f0fdf4",
    },
    Button: {
      colorPrimary: "#16a34a",
      colorPrimaryHover: "#15803d",
      colorPrimaryActive: "#166534",
    },
  },
};