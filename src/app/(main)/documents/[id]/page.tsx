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
      setSections(Array.isArray(s) ? s : []);
      setLoading(false);
    });
  }, [params.id]);

  // Xây map children: parentId -> children (sorted by order)
  const childrenMap = useMemo(() => {
    const map = new Map<string | null, Section[]>();
    for (const s of Array.isArray(sections) ? sections : []) {
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

  // Đếm điều (kind = ARTICLE) - hook phải đặt trên mọi early return
  const articleCount = useMemo(
    () => sections.filter((s) => s.kind === "ARTICLE").length,
    [sections],
  );

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
  const safeSections = Array.isArray(sections) ? sections : [];
  const totalCount = safeSections.length;

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
                {chapterNodes.length} chương · {articleCount} điều
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
              label: <NodeTitle section={ch} />,
              children: (
                <>
                  {ch.content?.trim() && (
                    <div
                      style={{
                        padding: "0 0 8px 8px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      <Text type="secondary">{ch.content}</Text>
                    </div>
                  )}
                  <NodeCollapse
                    parentId={ch.id}
                    depth={0}
                    childrenMap={childrenMap}
                    activeKeys={activeKeys}
                    setActiveKeys={setActiveKeys}
                  />
                </>
              ),
            }))}
          />
        )}
      </Card>
    </div>
  );
}

/**
 * Header label cho panel Collapse: chỉ hiển thị title (đậm).
 * Khi panel collapse, đây là phần duy nhất người dùng thấy.
 * Khi expand, content được render riêng trong `children` của Collapse.
 */
function NodeTitle({ section }: { section: Section }) {
  const title = displayTitle(section);
  return (
    <Text strong style={{ whiteSpace: "pre-wrap" }}>
      {title}
    </Text>
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

  // Giữ nguyên thứ tự order từ childrenMap (đã sort ở useMemo).
  // Điều (ARTICLE) luôn dùng Collapse để có thể expand/collapse dù không có
  // khoản nào (ví dụ Điều 2) — content hiển thị bên trong body của Collapse.
  // Các loại khác (SECTION/MỤc/CHAPTER) cũng dùng Collapse nếu có children;
  // không có children thì dùng LeafRow ( cho title ngắn như "Khoản 1").
  const expandableKids = kids.filter((k) => {
    const hasChildren = (childrenMap.get(k.id) ?? []).length > 0;
    if (hasChildren) return true;
    // ARTICLE không có children → vẫn expandable (content nằm trong node)
    return k.kind === "ARTICLE";
  });
  const expandableById =new Map(expandableKids.map((k) => [k.id, k]));

  return (
    <div>
      {kids.map((n) => {
        if (expandableById.has(n.id)) {
          const hasChildren = (childrenMap.get(n.id) ?? []).length > 0;
          return (
            <Collapse
              key={n.id}
              ghost={depth === 0 ? false : true}
              activeKey={activeKeys}
              onChange={(keys) => {
                const arr = Array.isArray(keys) ? keys : [keys];
                const set = new Set(activeKeys);
                for (const k of expandableKids) set.delete(k.id);
                for (const k of arr) set.add(k);
                setActiveKeys(Array.from(set));
              }}
              items={[
                {
                  key: n.id,
                  label: <NodeTitle section={n} />,
                  children: (
                    <>
                      {n.content?.trim() && (
                        <div
                          style={{
                            padding: "0 0 8px 8px",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          <Text type="secondary">{n.content}</Text>
                        </div>
                      )}
                      {hasChildren ? (
                        <NodeCollapse
                          parentId={n.id}
                          depth={depth + 1}
                          childrenMap={childrenMap}
                          activeKeys={activeKeys}
                          setActiveKeys={setActiveKeys}
                        />
                      ) : !n.content?.trim() ? (
                        <Text type="secondary">(Không có nội dung)</Text>
                      ) : null}
                    </>
                  ),
                  style:
                    depth === 0
                      ? { borderLeft: "3px solid #16a34a" }
                      : undefined,
                },
              ]}
            />
          );
        }
        return <LeafRow key={n.id} node={n} depth={depth} />;
      })}
    </div>
  );
}

/** Leaf: Khoản/Điểm (title ngắn như "Khoản 1", "Điểm a") + content. */
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
      <Text strong style={{ whiteSpace: "pre-wrap" }}>
        {node.title}
      </Text>
      {node.content && (
        <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>
          <Text type="secondary">{node.content}</Text>
        </div>
      )}
    </div>
  );
}