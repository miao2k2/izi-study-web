"use client";

import { App, Button, Card, Form, Input, Typography } from "antd";
import { LockOutlined, MailOutlined, UserOutlined, KeyOutlined } from "@ant-design/icons";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

const { Title, Text } = Typography;

export default function RegisterPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: {
    name: string;
    email: string;
    password: string;
    privateKey: string;
  }) => {
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data.error ?? "Đăng ký thất bại");
        return;
      }
      // auto-login
      const loginRes = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (loginRes?.error) {
        message.success(
          "Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.",
        );
        router.push("/login");
      } else {
        message.success("Đăng ký và đăng nhập thành công");
        router.push("/");
        router.refresh();
      }
    } catch {
      message.error("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#dcfce7 0%,#f0fdf4 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <Card style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            🟢 Đăng ký tài khoản
          </Title>
          <Text type="secondary">
            Bạn cần có Private Key do Admin cấp để đăng ký.
          </Text>
        </div>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="name"
            label="Họ tên"
            rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="email@example.com"
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu" },
              { min: 8, message: "Mật khẩu tối thiểu 8 ký tự" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Tối thiểu 8 ký tự"
            />
          </Form.Item>
          <Form.Item
            name="privateKey"
            label="Private Key"
            rules={[{ required: true, message: "Vui lòng nhập private key" }]}
          >
            <Input
              prefix={<KeyOutlined />}
              placeholder="IZI-XXXX-XXXX-XXXX-XXXX"
              style={{ textTransform: "uppercase" }}
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loading}
          >
            Đăng ký
          </Button>
        </Form>
        <div style={{ textAlign: "center", marginTop: 12 }}>
          Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
        </div>
      </Card>
    </div>
  );
}