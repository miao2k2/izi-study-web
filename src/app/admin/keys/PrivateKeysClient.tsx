"use client";

import {
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { CopyOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

const { Title, Text } = Typography;

export default function PrivateKeysClient({
  currentUserEmail,
}: {
  currentUserEmail: string;
}) {
  const { message } = App.useApp();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/private-keys");
      if (res.ok) setKeys(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async () => {
    const v = await form.validateFields();
    const body = {
      count: v.count,
      description: v.description,
      expiresAt: v.expiresAt ? v.expiresAt.toISOString() : null,
    };
    const res = await fetch("/api/admin/private-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json();
      message.error(d.error ?? "Lỗi");
      return;
    }
    message.success(`Đã tạo ${v.count} key`);
    form.resetFields();
    setOpen(false);
    load();
  };

  const onDelete = async (id: string) => {
    const res = await fetch(`/api/admin/private-keys?id=${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      message.error(data.error ?? "Lỗi");
      return;
    }
    message.success("Đã xóa");
    load();
  };

  const copy = (k: string) => {
    navigator.clipboard.writeText(k);
    message.success("Đã copy");
  };

  return (
    <div>
      <Title level={3}>Quản lý Private Key</Title>
      <Text type="secondary">
        Mỗi user đăng ký cần 1 private key. Tạo key và gửi cho user. Key đã dùng
        hoặc hết hạn sẽ không thể đăng ký.
      </Text>

      <Card style={{ marginTop: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <Text>Đăng nhập với: {currentUserEmail}</Text>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Tạo key mới
          </Button>
        </div>
        <Table
          rowKey="id"
          dataSource={keys}
          loading={loading}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: "Key",
              dataIndex: "key",
              render: (k: string) => (
                <Space>
                  <Text code copyable>
                    {k}
                  </Text>
                  <Button
                    size="small"
                    type="link"
                    icon={<CopyOutlined />}
                    onClick={() => copy(k)}
                  />
                </Space>
              ),
            },
            {
              title: "Mô tả",
              dataIndex: "description",
              render: (d) => d ?? <em style={{ color: "#999" }}>—</em>,
            },
            {
              title: "Trạng thái",
              width: 120,
              render: (_, r) =>
                r.isUsed ? (
                  <Tag color="orange">Đã dùng</Tag>
                ) : r.expiresAt && new Date(r.expiresAt) < new Date() ? (
                  <Tag color="red">Hết hạn</Tag>
                ) : (
                  <Tag color="green">Khả dụng</Tag>
                ),
            },
            {
              title: "Đã dùng bởi",
              render: (_, r) =>
                r.users?.length ? (
                  <Space direction="vertical" size={2}>
                    {r.users.map((u: any) => (
                      <Text key={u.id} style={{ fontSize: 12 }}>
                        {u.email}
                      </Text>
                    ))}
                  </Space>
                ) : (
                  <em style={{ color: "#999" }}>—</em>
                ),
            },
            {
              title: "Hết hạn",
              dataIndex: "expiresAt",
              width: 140,
              render: (d) =>
                d ? dayjs(d).format("DD/MM/YYYY") : <em>Không</em>
            },
            {
              title: "Tạo lúc",
              dataIndex: "createdAt",
              width: 140,
              render: (d) => dayjs(d).format("DD/MM/YYYY HH:mm"),
            },
            {
              title: "Thao tác",
              width: 100,
              render: (_, r) => (
                <Popconfirm
                  title="Xóa key?"
                  description={
                    r.users?.length
                      ? "Key đang được dùng, không thể xóa"
                      : "Bạn chắc chắn?"
                  }
                  disabled={!!r.users?.length}
                  onConfirm={() => onDelete(r.id)}
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={!!r.users?.length}
                  >
                    Xóa
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="Tạo Private Key"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onCreate}
        okText="Tạo"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" initialValues={{ count: 1 }}>
          <Form.Item
            name="count"
            label="Số lượng key"
            rules={[{ required: true, message: "Vui lòng nhập số lượng" }]}
          >
            <InputNumber min={1} max={50} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả (tuỳ chọn)">
            <Input placeholder="Vd: Cho lớp A1" />
          </Form.Item>
          <Form.Item name="expiresAt" label="Ngày hết hạn (tuỳ chọn)">
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder="Không giới hạn"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}