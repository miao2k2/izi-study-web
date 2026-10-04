"use client";

import {
  App,
  Button,
  Card,
  Collapse,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const { Title, Paragraph, Text } = Typography;

type Section = {
  id: string;
  parentId: string | null;
  kind: string;
  number: string | null;
  title: string | null;
  content: string | null;
  order: number;
};

/** Label đầy đủ từ DB. Nếu thiếu title, fallback sang number. */
function displayTitle(s: Section): string {
  if (s.title && s.title.trim()) return s.title;
  return s.number ?? "";
}

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { message } = App.useApp();
  const [sections, setSections] = useState<Section[]>([]);
  const [doc, setDoc] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);

  useEffect(() => {
    const id = params.id;
    Promise.all([
      fetch(`/api/documents/${id}`).then((r) => r.json()),
      fetch(`/api/documents/${id}/sections`).then((r) => r.json()),
    ]).then(([d, s]) => {
      setDoc(d);
      setSections(s);
      setLoading(false);
    });
  }, [params.id]);

  // Xây map children: parentId -> children (sorted by order)
  const childrenMap = useMemo(() => {
    const map = new Map<string | null, Section[]>();
    for (const s of sections) {
      const key = s.parentId ?? null;
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.order - b.order);
    }
    return map;
  }, [sections]);

  // Tất cả nodes có children (để "Mở tất cả")
  const expandableIds = useMemo(() => {
    const ids: string[] = [];
    for (const [parentId, kids] of childrenMap.entries()) {
      if (parentId !== null && kids.length > 0) ids.push(parentId);
    }
    return ids;
  }, [childrenMap]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin />
      </div>
    );
  }
  if (!doc || doc.error) {
    return (
      <Card>
        <Text type="danger">Không tìm thấy tài liệu</Text>
        <div style={{ marginTop: 12 }}>
          <Button onClick={() => router.push("/documents")}>Quay lại</Button>
        </div>
      </Card>
    );
  }

  const chapterNodes = childrenMap.get(null) ?? [];
  const totalCount = sections.length;

  return (
    <div>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push("/documents")}
        style={{ paddingLeft: 0 }}
      >
        Quay lại danh sách
      </Button>
      <Card
        title={
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Space>
              <FileTextOutlined />
              <span>{doc.title}</span>
            </Space>
            <Space wrap>
              {doc.documentNo && <Tag color="cyan">{doc.documentNo}</Tag>}
              {doc.category && <Tag color="green">{doc.category.name}</Tag>}
              <Tag>
                {chapterNodes.length} chương · {totalCount} mục
              </Tag>
            </Space>
          </Space>
        }
        extra={
          <Space>
            <Button
              size="small"
              onClick={() => setActiveKeys(expandableIds)}
              icon={<EyeOutlined />}
            >
              Mở tất cả
            </Button>
            <Button
              size="small"
              onClick={() => setActiveKeys([])}
              icon={<EyeInvisibleOutlined />}
            >
              Thu gọn
            </Button>
          </Space>
        }
      >
        {doc.description && <Paragraph>{doc.description}</Paragraph>}

        <Space style={{ marginBottom: 16 }} wrap>
          <Link href={`/documents/${doc.id}/flashcards`}>
            <Button icon={<ReadOutlined />}>
              Flashcards ({doc._count?.flashcards ?? 0})
            </Button>
          </Link>
          <Link href={`/documents/${doc.id}/quizzes`}>
            <Button icon={<PlusOutlined />}>
              Quizzes ({doc._count?.quizzes ?? 0})
            </Button>
          </Link>
        </Space>

        {chapterNodes.length === 0 ? (
          <Card type="inner" style={{ background: "#f6ffed" }}>
            <Paragraph>
              Tài liệu chưa có nội dung. Hãy dùng chức năng{" "}
              <strong>Import .docx</strong> ở trang danh sách để nạp nội dung.
            </Paragraph>
          </Card>
        ) : (
          <Collapse
            activeKey={activeKeys}
            onChange={(keys) =>
              setActiveKeys(Array.isArray(keys) ? keys : [keys])
            }
            items={chapterNodes.map((ch) => ({
              key: ch.id,
              label: <NodeContent section={ch} />,
              children: (
                <NodeCollapse
                  parentId={ch.id}
                  depth={0}
                  childrenMap={childrenMap}
                  activeKeys={activeKeys}
                  setActiveKeys={setActiveKeys}
                />
              ),
            }))}
          />
        )}
      </Card>
    </div>
  );
}

/**
 * Render label đầy đủ cho 1 section - title (bôi đen) + content (text thừa nếu có)
 * Dùng chung cho panel header và leaf row.
 */
function NodeContent({ section }: { section: Section }) {
  const title = displayTitle(section);
  const content = section.content?.trim();
  return (
    <div>
      <Text strong style={{ whiteSpace: "pre-wrap" }}>
        {title}
      </Text>
      {content && (
        <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>
          <Text type="secondary">{content}</Text>
        </div>
      )}
    </div>
  );
}

/**
 * Recursive Collapse cho Mục / Điều / Khoản / Điểm.
 * - Node có children → render panel Collapse lồng
 * - Node không có children (lá) → render LeafRow
 */
function NodeCollapse({
  parentId,
  depth,
  childrenMap,
  activeKeys,
  setActiveKeys,
}: {
  parentId: string;
  depth: number;
  childrenMap: Map<string | null, Section[]>;
  activeKeys: string[];
  setActiveKeys: (k: string[]) => void;
}) {
  const kids = childrenMap.get(parentId) ?? [];
  if (kids.length === 0) {
    return <Text type="secondary">(Trống)</Text>;
  }

  const expandableKids = kids.filter(
    (k) => (childrenMap.get(k.id) ?? []).length > 0,
  );
  const leafKids = kids.filter(
    (k) => (childrenMap.get(k.id) ?? []).length === 0,
  );

  return (
    <div>
      {leafKids.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {leafKids.map((n) => (
            <LeafRow key={n.id} node={n} depth={depth} />
          ))}
        </div>
      )}
      {expandableKids.length > 0 && (
        <Collapse
          ghost={depth === 0 ? false : true}
          activeKey={activeKeys}
          onChange={(keys) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            const set = new Set(activeKeys);
            for (const k of expandableKids) set.delete(k.id);
            for (const k of arr) set.add(k);
            setActiveKeys(Array.from(set));
          }}
          items={expandableKids.map((n) => ({
            key: n.id,
            label: <NodeContent section={n} />,
            children: (
              <NodeCollapse
                parentId={n.id}
                depth={depth + 1}
                childrenMap={childrenMap}
                activeKeys={activeKeys}
                setActiveKeys={setActiveKeys}
              />
            ),
            style:
              depth === 0
                ? { borderLeft: "3px solid #16a34a" }
                : undefined,
          }))}
        />
      )}
    </div>
  );
}

/** Leaf: Khoản / Điểm / Điều không có khoản con - hiển thị title + content */
function LeafRow({ node, depth }: { node: Section; depth: number }) {
  const indent = depth * 16;

  return (
    <div
      style={{
        marginLeft: indent,
        marginBottom: 6,
        paddingLeft: 8,
        borderLeft: depth > 0 ? "2px solid #d9d9d9" : undefined,
      }}
    >
      <NodeContent section={node} />
    </div>
  );
}