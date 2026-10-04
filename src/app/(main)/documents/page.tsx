"use client";

import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UploadProps } from "antd";

const { Title } = Typography;

export default function DocumentsPage() {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [docs, setDocs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([
        fetch("/api/documents").then((r) => r.json()),
        fetch("/api/categories").then((r) => r.json()),
      ]);
      setDocs(d);
      setCategories(c);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (doc: any) => {
    setEditing(doc);
    form.setFieldsValue({
      title: doc.title,
      description: doc.description,
      documentNo: doc.documentNo,
      categoryId: doc.categoryId,
    });
    setOpen(true);
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    const url = editing ? `/api/documents/${editing.id}` : "/api/documents";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const d = await res.json();
      message.error(d.error ?? "Lỗi");
      return;
    }
    message.success(editing ? "Đã cập nhật" : "Đã tạo");
    setOpen(false);
    load();
  };

  const onDelete = async (id: string) => {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      message.error(d.error ?? "Lỗi");
      return;
    }
    message.success("Đã xóa");
    load();
  };

  const onImport = async (docId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const hide = message.loading("Đang import...", 0);
    try {
      const res = await fetch(`/api/documents/${docId}/import`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data.error ?? "Import lỗi");
      } else {
        message.success(`Import thành công ${data.sectionCount} mục`);
        load();
      }
    } finally {
      hide();
    }
    return false; // chặn upload mặc định
  };

  const uploadProps = (docId: string): UploadProps => ({
    accept: ".docx",
    showUploadList: false,
    beforeUpload: (file) => onImport(docId, file),
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Tài liệu
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Tạo tài liệu
        </Button>
      </div>

      <Card>
        <Table
          rowKey="id"
          dataSource={docs}
          loading={loading}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "Tiêu đề", dataIndex: "title" },
            {
              title: "Số hiệu",
              dataIndex: "documentNo",
              width: 140,
              render: (v) => v ?? <em style={{ color: "#999" }}>—</em>,
            },
            {
              title: "Thư mục",
              dataIndex: ["category", "name"],
              width: 180,
              render: (v) =>
                v ? <Tag color="green">{v}</Tag> : <em style={{ color: "#999" }}>—</em>,
            },
            {
              title: "Sections",
              width: 100,
              render: (_, r) => (
                <Tag color={r._count?.sections ? "blue" : "default"}>
                  {r._count?.sections ?? 0}
                </Tag>
              ),
            },
            {
              title: "Trạng thái",
              dataIndex: "status",
              width: 120,
              render: (s) =>
                s === "PUBLISHED" ? (
                  <Tag color="green">Đã xuất bản</Tag>
                ) : (
                  <Tag>Bản nháp</Tag>
                ),
            },
            {
              title: "Cập nhật",
              dataIndex: "updatedAt",
              width: 140,
              render: (d) => new Date(d).toLocaleDateString("vi-VN"),
            },
            {
              title: "Thao tác",
              width: 280,
              render: (_, row) => (
                <Space wrap>
                  <Button
                    size="small"
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => router.push(`/documents/${row.id}`)}
                  >
                    Xem
                  </Button>
                  <Upload {...uploadProps(row.id)}>
                    <Button size="small" type="link" icon={<UploadOutlined />}>
                      Import .docx
                    </Button>
                  </Upload>
                  <Button
                    size="small"
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => openEdit(row)}
                  >
                    Sửa
                  </Button>
                  <Popconfirm title="Xóa?" onConfirm={() => onDelete(row.id)}>
                    <Button size="small" type="link" danger icon={<DeleteOutlined />}>
                      Xóa
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editing ? "Sửa tài liệu" : "Tạo tài liệu"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText={editing ? "Cập nhật" : "Tạo"}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
          >
            <Input placeholder="Vd: Luật Giao dịch điện tử 2023" />
          </Form.Item>
          <Form.Item name="documentNo" label="Số hiệu văn bản">
            <Input placeholder="Vd: 20/2023/QH15" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="categoryId" label="Thư mục">
            <Select
              allowClear
              placeholder="— Chưa phân loại —"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}