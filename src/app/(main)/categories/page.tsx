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
  Tree,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  FolderAddOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  parentId: string | null;
  _count?: { children: number; documents: number };
};

type TreeNode = {
  key: string;
  title: React.ReactNode;
  raw: Category;
  children?: TreeNode[];
};

const { Title } = Typography;

export default function CategoriesPage() {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [list, setList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setList(await res.json());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const tree = useMemo(() => buildTree(list), [list]);

  const openCreate = (parentId?: string) => {
    setEditing(null);
    form.resetFields();
    if (parentId) form.setFieldValue("parentId", parentId);
    setOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    form.setFieldsValue({ name: cat.name, parentId: cat.parentId ?? undefined });
    setOpen(true);
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
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
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      message.error(d.error ?? "Lỗi");
      return;
    }
    message.success("Đã xóa");
    load();
  };

  // Tạo flat rows với cấp độ sâu để hiển thị bảng
  const flatRows = useMemo(() => flatten(list), [list]);

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
          Quản lý thư mục
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openCreate()}
        >
          Tạo thư mục
        </Button>
      </div>

      <Card title="Cây thư mục" style={{ marginBottom: 16 }}>
        {tree.length === 0 ? (
          <em>Chưa có thư mục nào</em>
        ) : (
          <Tree
            treeData={tree}
            defaultExpandAll
            showLine
            titleRender={(node) => {
              const raw = (node as unknown as TreeNode).raw;
              return (
                <Space>
                  <span>{raw.name}</span>
                  <span style={{ color: "#999", fontSize: 12 }}>
                    ({raw._count?.documents ?? 0} tài liệu,{" "}
                    {raw._count?.children ?? 0} thư mục con)
                  </span>
                  <Button
                    size="small"
                    type="link"
                    icon={<FolderAddOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      openCreate(raw.id);
                    }}
                  >
                    Thêm con
                  </Button>
                  <Button
                    size="small"
                    type="link"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(raw);
                    }}
                  >
                    Sửa
                  </Button>
                  <Popconfirm
                    title="Xóa thư mục này?"
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      onDelete(raw.id);
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                  >
                    <Button
                      size="small"
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Xóa
                    </Button>
                  </Popconfirm>
                </Space>
              );
            }}
          />
        )}
      </Card>

      <Card title="Danh sách chi tiết">
        <Table
          rowKey="id"
          dataSource={flatRows}
          loading={loading}
          pagination={false}
          size="small"
          columns={[
            { title: "Tên", dataIndex: "name" },
            {
              title: "Cấp",
              dataIndex: "depth",
              width: 80,
              render: (d: number) => "—".repeat(d),
            },
            { title: "Thư mục cha", dataIndex: "parentName", width: 240 },
            {
              title: "Số tài liệu",
              dataIndex: ["_count", "documents"],
              width: 120,
            },
            {
              title: "Số thư mục con",
              dataIndex: ["_count", "children"],
              width: 140,
            },
            {
              title: "Thao tác",
              width: 200,
              render: (_, row) => (
                <Space>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEdit(row.raw)}
                  >
                    Sửa
                  </Button>
                  <Popconfirm
                    title="Xóa?"
                    onConfirm={() => onDelete(row.raw.id)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />}>
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
        title={editing ? "Sửa thư mục" : "Tạo thư mục"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText={editing ? "Cập nhật" : "Tạo"}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Tên thư mục"
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          >
            <Input placeholder="Vd: Văn bản pháp luật về CNTT" />
          </Form.Item>
          <Form.Item name="parentId" label="Thư mục cha (tuỳ chọn)">
            <Select
              allowClear
              placeholder="— Thư mục gốc —"
              options={list
                .filter((c) => c.id !== editing?.id)
                .map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function buildTree(list: Category[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  list.forEach((c) =>
    map.set(c.id, {
      key: c.id,
      title: c.name,
      raw: c,
      children: [],
    }),
  );
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.raw.parentId && map.has(node.raw.parentId)) {
      map.get(node.raw.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function flatten(list: Category[]) {
  const map = new Map<string, Category>();
  list.forEach((c) => map.set(c.id, c));
  const result: Array<Category & { depth: number; parentName?: string; raw: Category }> = [];
  function walk(id: string | null, depth: number) {
    const children = list
      .filter((c) => (c.parentId ?? null) === id)
      .sort((a, b) => a.name.localeCompare(b.name));
    children.forEach((c) => {
      const parent = c.parentId ? map.get(c.parentId) : null;
      result.push({
        ...c,
        depth,
        parentName: parent?.name,
        raw: c,
      });
      walk(c.id, depth + 1);
    });
  }
  walk(null, 0);
  return result;
}