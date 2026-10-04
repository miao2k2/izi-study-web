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
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { UploadProps } from "antd";
import { Checkbox } from "antd";

const { Title, Text, Paragraph } = Typography;

type Quiz = {
  id: string;
  question: string;
  explanation: string | null;
  section?: { id: string; number: string; title: string | null; kind: string };
  answers: { id: string; text: string; isCorrect: boolean }[];
};

export default function QuizzesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { message: msg } = App.useApp();
  const [doc, setDoc] = useState<any>(null);
  const [items, setItems] = useState<Quiz[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [form] = Form.useForm();
  const [answers, setAnswers] = useState<
    { text: string; isCorrect: boolean }[]
  >([{ text: "", isCorrect: true }, { text: "", isCorrect: false }]);

  // Quiz mode
  const [doing, setDoing] = useState<Quiz[] | null>(null);
  const [questionOrder, setQuestionOrder] = useState<number[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answersPicked, setAnswersPicked] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [finished, setFinished] = useState<{
    score: number;
    total: number;
    details: { quizId: string; correctAnswerId: string; pickedId?: string; isCorrect: boolean }[];
  } | null>(null);

  const docId = params.id;

  const load = async () => {
    setLoading(true);
    try {
      const [d, q, s] = await Promise.all([
        fetch(`/api/documents/${docId}`).then((r) => r.json()),
        fetch(`/api/quizzes?documentId=${docId}`).then((r) => r.json()),
        fetch(`/api/documents/${docId}/sections`).then((r) => r.json()),
      ]);
      setDoc(d);
      setItems(q);
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
    setAnswers([{ text: "", isCorrect: true }, { text: "", isCorrect: false }]);
    setOpen(true);
  };

  const openEdit = (q: Quiz) => {
    setEditing(q);
    form.setFieldsValue({
      question: q.question,
      explanation: q.explanation,
      sectionId: q.section?.id,
    });
    setAnswers(
      q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
    );
    setOpen(true);
  };

  const onSubmit = async () => {
    const v = await form.validateFields();
    if (answers.filter((a) => a.text.trim()).length < 2) {
      msg.error("Cần ít nhất 2 đáp án");
      return;
    }
    if (!answers.some((a) => a.isCorrect)) {
      msg.error("Cần ít nhất 1 đáp án đúng");
      return;
    }
    const body = {
      ...v,
      documentId: docId,
      answers: answers.filter((a) => a.text.trim()),
    };
    const url = editing ? `/api/quizzes/${editing.id}` : "/api/quizzes";
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
    const res = await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
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
      const res = await fetch(`/api/quizzes/import?documentId=${docId}`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) msg.error(data.error ?? "Lỗi");
      else {
        msg.success(`Đã thêm ${data.count} câu hỏi`);
        load();
      }
    } finally {
      hide();
    }
    return false;
  };

  // ===== QUIZ MODE =====
  const startQuiz = async () => {
    if (items.length === 0) {
      msg.warning("Chưa có câu hỏi");
      return;
    }
    // Shuffle câu hỏi
    const idx = items.map((_, i) => i).sort(() => Math.random() - 0.5);
    // Shuffle đáp án cho mỗi câu
    const shuffled = items.map((q) => ({
      ...q,
      answers: [...q.answers].sort(() => Math.random() - 0.5),
    }));
    // Tạo attempt
    const res = await fetch("/api/quiz-attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizIds: shuffled.map((s) => s.id) }),
    });
    const data = await res.json();
    if (!res.ok) {
      msg.error(data.error ?? "Lỗi");
      return;
    }
    setDoing(shuffled);
    setQuestionOrder(idx);
    setCurrentIdx(0);
    setAnswersPicked({});
    setAttemptId(data.attemptId);
    setFinished(null);
  };

  const finishQuiz = async () => {
    if (!doing || !attemptId) return;
    const results = doing.map((q) => {
      const pickedId = answersPicked[q.id];
      const pickedAnswer = q.answers.find((a) => a.id === pickedId);
      const correctAnswer = q.answers.find((a) => a.isCorrect);
      return {
        quizId: q.id,
        answerId: pickedId ?? null,
        isCorrect: !!pickedAnswer?.isCorrect,
      };
    });
    const res = await fetch("/api/quiz-attempts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, results }),
    });
    const data = await res.json();
    if (!res.ok) {
      msg.error(data.error ?? "Lỗi");
      return;
    }
    // Build kết quả
    const details = doing.map((q) => {
      const pickedId = answersPicked[q.id];
      const correctAnswer = q.answers.find((a) => a.isCorrect);
      return {
        quizId: q.id,
        correctAnswerId: correctAnswer?.id ?? "",
        pickedId,
        isCorrect: !!q.answers.find((a) => a.id === pickedId)?.isCorrect,
      };
    });
    setFinished({ score: data.score, total: data.total, details });
    setDoing(null);
  };

  const sectionOptions = [
    { value: "", label: "— Theo tài liệu —" },
    ...sections
      .filter((s) => s.kind === "CHAPTER" || s.kind === "ARTICLE")
      .map((s) => ({
        value: s.id,
        // title đã chứa prefix từ DB: "Chương I: ..." / "Điều 1: ..."
        label: s.title ?? "",
      })),
  ];

  if (!doc) return <Empty description="Đang tải..." />;

  // ====== DOING QUIZ ======
  if (doing) {
    const cur = doing[questionOrder[currentIdx]];
    return (
      <div>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            Modal.confirm({
              title: "Thoát làm bài?",
              content: "Kết quả chưa lưu sẽ bị mất.",
              onOk: () => setDoing(null),
            });
          }}
        >
          Thoát
        </Button>
        <Card>
          <Space
            style={{ width: "100%", justifyContent: "space-between" }}
            wrap
          >
            <Text>
              Câu {currentIdx + 1} / {doing.length}
            </Text>
            <Text type="secondary">
              Đã trả lời {Object.keys(answersPicked).length}/{doing.length}
            </Text>
          </Space>
          <div style={{ height: 16 }} />
          <Title level={4}>{cur.question}</Title>
          <Radio.Group
            style={{ width: "100%" }}
            value={answersPicked[cur.id]}
            onChange={(e) =>
              setAnswersPicked({ ...answersPicked, [cur.id]: e.target.value })
            }
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              {cur.answers.map((a) => (
                <Radio key={a.id} value={a.id} style={{ width: "100%" }}>
                  {a.text}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
          <div style={{ marginTop: 24 }}>
            <Space wrap>
              <Button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(currentIdx - 1)}
              >
                Câu trước
              </Button>
              {currentIdx === doing.length - 1 ? (
                <Button type="primary" onClick={finishQuiz}>
                  Nộp bài
                </Button>
              ) : (
                <Button type="primary" onClick={() => setCurrentIdx(currentIdx + 1)}>
                  Câu sau
                </Button>
              )}
            </Space>
          </div>
        </Card>
      </div>
    );
  }

  // ====== RESULT ======
  if (finished) {
    return (
      <div>
        <Card style={{ textAlign: "center" }}>
          <Title level={2}>
            Kết quả: {finished.score}/{finished.total}
          </Title>
          <Paragraph>
            Tỷ lệ đúng:{" "}
            {Math.round((finished.score / finished.total) * 100)}%
          </Paragraph>
          <Space style={{ marginTop: 16 }} wrap>
            <Button type="primary" onClick={startQuiz}>
              Làm lại
            </Button>
            <Button onClick={() => setFinished(null)}>Quay lại danh sách</Button>
          </Space>
        </Card>
        <Card title="Chi tiết" style={{ marginTop: 16 }}>
          {finished.details.map((d, i) => {
            const q = items.find((q) => q.id === d.quizId);
            if (!q) return null;
            return (
              <div
                key={d.quizId}
                style={{
                  padding: 12,
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <Space>
                  {d.isCorrect ? (
                    <Tag color="green" icon={<CheckCircleOutlined />}>
                      Đúng
                    </Tag>
                  ) : (
                    <Tag color="red" icon={<CloseCircleOutlined />}>
                      Sai
                    </Tag>
                  )}
                  <Text strong>{i + 1}. {q.question}</Text>
                </Space>
                <div style={{ marginLeft: 24, marginTop: 8 }}>
                  {q.answers.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        color: a.isCorrect
                          ? "#16a34a"
                          : d.pickedId === a.id
                            ? "#dc2626"
                            : undefined,
                        fontWeight: a.isCorrect ? 600 : 400,
                      }}
                    >
                      • {a.text}
                      {a.isCorrect && " ✓"}
                      {d.pickedId === a.id && !a.isCorrect && " ✗ (bạn chọn)"}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    );
  }

  // ====== LIST MODE ======
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
          Quiz · {doc.title}
        </Title>
        <Space wrap>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            disabled={items.length === 0}
            onClick={startQuiz}
          >
            Làm quiz ({items.length} câu)
          </Button>
          <Button
            icon={<DownloadOutlined />}
            href="/api/templates?type=quiz"
            target="_blank"
          >
            Tải mẫu
          </Button>
          <Upload beforeUpload={onImport} accept=".docx" showUploadList={false}>
            <Button icon={<UploadOutlined />}>Import .docx</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tạo câu hỏi
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          rowKey="id"
          dataSource={items}
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "Chưa có câu hỏi nào" }}
          columns={[
            {
              title: "Câu hỏi",
              dataIndex: "question",
              ellipsis: true,
              width: "45%",
            },
            {
              title: "Số đáp án",
              width: 100,
              render: (_, r) => <Tag>{r.answers.length}</Tag>,
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
        title={editing ? "Sửa câu hỏi" : "Tạo câu hỏi"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText={editing ? "Cập nhật" : "Tạo"}
        cancelText="Hủy"
        width={680}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="question"
            label="Câu hỏi"
            rules={[{ required: true, message: "Vui lòng nhập" }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="sectionId" label="Gắn với">
            <Select options={sectionOptions} />
          </Form.Item>
          <Form.Item name="explanation" label="Giải thích (tuỳ chọn)">
            <Input.TextArea rows={2} />
          </Form.Item>
          <div style={{ marginBottom: 8 }}>
            <Text strong>Đáp án</Text>
          </div>
          {answers.map((a, i) => (
            <Space key={i} style={{ display: "flex", marginBottom: 8 }} align="start">
              <Checkbox
                checked={a.isCorrect}
                onChange={(e) => {
                  const next = [...answers];
                  next[i] = { ...next[i], isCorrect: e.target.checked };
                  setAnswers(next);
                }}
              >
                Đúng
              </Checkbox>
              <Input
                style={{ width: 460 }}
                value={a.text}
                placeholder={`Đáp án ${i + 1}`}
                onChange={(e) => {
                  const next = [...answers];
                  next[i] = { ...next[i], text: e.target.value };
                  setAnswers(next);
                }}
              />
              {answers.length > 2 && (
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    const next = [...answers];
                    next.splice(i, 1);
                    setAnswers(next);
                  }}
                />
              )}
            </Space>
          ))}
          <Button
            size="small"
            type="dashed"
            onClick={() =>
              setAnswers([...answers, { text: "", isCorrect: false }])
            }
          >
            + Thêm đáp án
          </Button>
        </Form>
      </Modal>
    </div>
  );
}