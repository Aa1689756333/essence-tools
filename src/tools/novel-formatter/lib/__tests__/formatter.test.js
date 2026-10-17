import { describe, expect, it } from 'vitest';
import { format } from '../formatter';

const IDEOGRAPHIC_SPACE = '\u3000';

/**
 * 排版结果每个非空段落会带两个全角空格缩进（规则 4.4）。
 * 断言前统一去掉行首缩进、把残留全角空格换成半角、并裁掉首尾空白，
 * 让测试关注"排版规则本身"，而不是缩进带来的固定噪音。
 */
function plain(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/^\u3000+/, '').replace(/\u3000/g, ' '))
    .join('\n')
    .trim();
}

describe('formatter：字符级转换', () => {
  it('全角数字转半角', () => {
    expect(plain(format('编号００１'))).toContain('001');
  });

  it('项目符号统一为间隔号', () => {
    expect(plain(format('苹果\u2022手机'))).toContain('\u00B7');
  });
});

describe('formatter：中文标点全角化', () => {
  it('中文上下文的半角标点转全角', () => {
    expect(plain(format('他走了,没回头'))).toContain('他走了，没回头');
  });

  it('保护小数不被改成句号', () => {
    const out = plain(format('圆周率是3.14'));
    expect(out).toContain('3.14');
    expect(out).not.toContain('3。14');
  });

  it('保护时间里的冒号', () => {
    expect(plain(format('12:30开会'))).toContain('12:30');
  });

  it('纯英文上下文不转全角', () => {
    expect(plain(format('hello, world'))).toContain('hello, world');
  });

  it('三个点统一成省略号', () => {
    expect(plain(format('等等...算了'))).toContain('等等……算了');
  });

  it('双连字符统一成破折号', () => {
    expect(plain(format('他说--停顿'))).toContain('他说——停顿');
  });

  it('直引号按开合状态配对成中文引号', () => {
    expect(plain(format('他说"你好"然后'))).toContain('他说“你好”然后');
  });

  it('连续的问号合并成一个', () => {
    const out = plain(format('真的吗？？'));
    expect(out).toContain('真的吗？');
    expect(out).not.toContain('？？');
  });

  it('尖括号书名号转书名号', () => {
    expect(plain(format('<<红楼梦>>'))).toContain('《红楼梦》');
  });
});

describe('formatter：空格处理', () => {
  it('中英文之间补空格', () => {
    expect(plain(format('我用Next.js写代码'))).toContain('我用 Next.js 写代码');
  });

  it('删除中文字符之间的多余空格', () => {
    expect(plain(format('你 好 吗'))).toContain('你好吗');
  });
});

describe('formatter：段落级处理', () => {
  it('多个空行压缩成一个空行', () => {
    expect(plain(format('甲段\n\n\n\n乙段'))).toBe('甲段\n\n乙段');
  });

  it('正文段落自动首行缩进', () => {
    expect(format('这是正文').startsWith(IDEOGRAPHIC_SPACE.repeat(2))).toBe(true);
  });

  it('章节标题不加缩进', () => {
    expect(format('第一章启程').startsWith(IDEOGRAPHIC_SPACE)).toBe(false);
  });

  it('相邻重复段落只保留一段', () => {
    expect(plain(format('重复\n重复'))).toBe('重复');
  });
});
