"use client";

import {
  App,
  Button,
  Card,
  Empty,
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
  ArrowLeftOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { UploadProps } from "antd";

const { Title, Text } = Typography;

export default function FlashcardsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { message: msg } = App.useApp();
  const [doc, setDoc] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form] = Form.useForm();
  const [studyMode, setStudyMode] = useState(false);
  const [studyIndex, setStudyIndex] = useState(0);
  const [studyShowBack, setStudyShowBack] = useState(false);

  const docId = params.id;

  const load = async () => {
    setLoading(true);
    try {
      const [d, f, s] = await Promise.all([
        fetch(`/api/documents/${docId}`).then((r) => r.json()),
        fetch(`/api/flashcards?documentId=${docId}`).then((r) => r.json()),
        fetch(`/api/documents/${docId}/sections`).then((r) => r.json()),
      ]);
      setDoc(d);
      setItems(f);
      setSections(s);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (docId) load();
  }, [docId]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (it: any) => {
    setEditing(it);
    form.setFieldsValue({
      front: it.front,
      back: it.back,
      sectionId: it.sectionId,
      tags: it.tags,
    });
    setOpen(true);
  };

  const onSubmit = async () => {
    const v = await form.validateFields();
    const body = { ...v, documentId: docId };
    const url = editing ? `/api/flashcards/${editing.id}` : "/api/flashcards";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json();
      msg.error(d.error ?? "Lỗi");
      return;
    }
    msg.success(editing ? "Đã cập nhật" : "Đã tạo");
    setOpen(false);
    load();
  };

  const onDelete = async (id: string) => {
    const res = await fetch(`/api/flashcards/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      msg.error(d.error ?? "Lỗi");
      return;
    }
    msg.success("Đã xóa");
    load();
  };

  const onImport: UploadProps["beforeUpload"] = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const hide = msg.loading("Đang import...", 0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const hide = msg.loading("Đang import...", 0);
      const res = await fetch(`/api/flashcards/import?documentId=${docId}`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        msg.error(data.error ?? "Lỗi");
      } else {
        msg.success(`Đã thêm ${data.count} flashcard`);
        load();
      }
      hide();
    } catch (e) {
      msg.error("Import lỗi");
      console.error(e);
    }
    return false;
  };

  const sectionOptions = [
    { value: "", label: "— Theo tài liệu —" },
    ...sections
      .filter((s) => s.kind === "CHAPTER" || s.kind === "ARTICLE")
      .map((s) => ({
        value: s.id,
        // title đã chứa prefix "Chương I: ..." hoặc "Điều 1: ..." từ DB
        label: s.title ?? "",
      })),
  ];

  if (!doc) {
    return <Empty description="Đang tải..." />;
  }

  // Study mode
  if (studyMode && items.length > 0) {
    const cur = items[studyIndex];
    return (
      <div>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            setStudyMode(false);
            setStudyIndex(0);
            setStudyShowBack(false);
          }}
        >
          Thoát chế độ học
        </Button>
        <Card style={{ textAlign: "center", minHeight: 300 }}>
          <Space direction="vertical" size={24} style={{ width: "100%" }}>
            <Text type="secondary">
              {studyIndex + 1} / {items.length}
            </Text>
            <Title level={3} style={{ whiteSpace: "pre-wrap" }}>
              {cur.front}
            </Title>
            {studyShowBack ? (
              <div>
                <Text strong style={{ whiteSpace: "pre-wrap" }}>
                  {cur.back}
                </Text>
              </div>
            ) : (
              <Button type="primary" onClick={() => setStudyShowBack(true)}>
                Lật thẻ - Xem đáp án
              </Button>
            )}
            <Space>
              <Button
                disabled={studyIndex === 0}
                onClick={() => {
                  setStudyIndex(studyIndex - 1);
                  setStudyShowBack(false);
                }}
              >
                Trước
              </Button>
              <Button
                type="primary"
                disabled={studyIndex === items.length - 1}
                onClick={() => {
                  setStudyIndex(studyIndex + 1);
                  setStudyShowBack(false);
                }}
              >
                Sau
              </Button>
            </Space>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push(`/documents/${docId}`)}
        style={{ paddingLeft: 0 }}
      >
        Quay lại tài liệu
      </Button>

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
          Flashcards · {doc.title}
        </Title>
        <Space wrap>
          <Button
            icon={<ReadOutlined />}
            disabled={items.length === 0}
            onClick={() => {
              setStudyMode(true);
              setStudyIndex(0);
              setStudyShowBack(false);
            }}
          >
            Học ({items.length})
          </Button>
          <Button
            icon={<DownloadOutlined />}
            href="/api/templates?type=flashcard"
            target="_blank"
          >
            Tải mẫu
          </Button>
          <Upload beforeUpload={onImport} accept=".docx" showUploadList={false}>
            <Button icon={<UploadOutlined />}>Import .docx</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tạo flashcard
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          rowKey="id"
          dataSource={items}
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "Chưa có flashcard nào" }}
          columns={[
            {
              title: "Mặt trước",
              dataIndex: "front",
              ellipsis: true,
              width: "35%",
            },
            {
              title: "Mặt sau",
              dataIndex: "back",
              ellipsis: true,
              width: "35%",
            },
            {
              title: "Gắn với",
              width: 240,
              render: (_, r) =>
                r.section ? (
                  <Tag color={r.section.kind === "CHAPTER" ? "green" : "purple"}>
                    {r.section.title ?? r.section.number}
                  </Tag>
                ) : (
                  <Tag>Cả tài liệu</Tag>
                ),
            },
            {
              title: "Thao tác",
              width: 160,
              render: (_, row) => (
                <Space>
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
        title={editing ? "Sửa flashcard" : "Tạo flashcard"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText={editing ? "Cập nhật" : "Tạo"}
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="front"
            label="Mặt trước (câu hỏi)"
            rules={[{ required: true, message: "Vui lòng nhập" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="back"
            label="Mặt sau (câu trả lời)"
            rules={[{ required: true, message: "Vui lòng nhập" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="sectionId" label="Gắn với">
            <Select options={sectionOptions} />
          </Form.Item>
          <Form.Item name="tags" label="Tags (tuỳ chọn)">
            <Input placeholder="vd: quan trọng, thi" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}