"use client";

import { Button, Card, Form, Input, Typography, App, Divider } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

const { Title, Text } = Typography;

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") ?? "/";
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (res?.error) {
        message.error("Email hoặc mật khẩu không đúng");
      } else {
        message.success("Đăng nhập thành công");
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      message.error("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
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
          size="large"
        />
      </Form.Item>
      <Form.Item
        name="password"
        label="Mật khẩu"
        rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Mật khẩu"
          size="large"
        />
      </Form.Item>
      <Button
        type="primary"
        htmlType="submit"
        block
        size="large"
        loading={loading}
      >
        Đăng nhập
      </Button>
    </Form>
  );
}

export default function LoginPage() {
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
      <Card style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            🟢 IZI Study
          </Title>
          <Text type="secondary">Đăng nhập để tiếp tục học tập</Text>
        </div>
        <Suspense fallback={<Text>Đang tải...</Text>}>
          <LoginForm />
        </Suspense>
        <Divider plain>Chưa có tài khoản?</Divider>
        <div style={{ textAlign: "center" }}>
          <Link href="/register">Đăng ký ngay</Link>
        </div>
      </Card>
    </div>
  );
}