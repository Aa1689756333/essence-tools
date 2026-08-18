import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSystemSettings, updateSystemSettings } from '@/lib/settings';

export async function GET() {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: '权限不足，仅管理员可访问' }, { status: 403 });
  }

  const settings = await getSystemSettings(true);
  return NextResponse.json({ settings });
}

export async function POST(req) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: '权限不足，仅管理员可访问' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updatedSettings = await updateSystemSettings(body);
    return NextResponse.json({ message: '系统设置保存成功', settings: updatedSettings });
  } catch (error) {
    return NextResponse.json({ error: error.message || '保存设置失败' }, { status: 500 });
  }
}
