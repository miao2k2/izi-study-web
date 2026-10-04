"use client";

import { Card, Col, Row, Statistic, Typography } from "antd";
import { BookOutlined, FolderOutlined, ReadOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Title, Paragraph } = Typography;

type Props = {
  userName: string;
  docCount: number;
  categoryCount: number;
};

export default function DashboardClient({ userName, docCount, categoryCount }: Props) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ marginBottom: 4 }}>
          Xin chào, {userName}
        </Title>
        <Paragraph type="secondary">
          Chào mừng bạn đến với IZI Study – nền tảng học thuộc văn bản pháp luật.
        </Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Tài liệu"
              value={docCount}
              prefix={<BookOutlined />}
            />
            <Link href="/documents">Quản lý tài liệu →</Link>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Thư mục"
              value={categoryCount}
              prefix={<FolderOutlined />}
            />
            <Link href="/categories">Quản lý thư mục →</Link>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Phiên bản"
              value="MVP"
              prefix={<ReadOutlined />}
            />
            <Paragraph type="secondary" style={{ marginTop: 8 }}>
              Tạo tài liệu, flashcard, quiz và bắt đầu học.
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
}