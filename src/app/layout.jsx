import './globals.css';
import Sidebar from '@/shell/Sidebar';
import Topbar from '@/shell/Topbar';
import ThemeProvider from '@/shell/ThemeProvider';
import { SidebarProvider } from '@/shell/useSidebar';
import { AuthProvider } from '@/context/AuthContext';
import AuthModal from '@/components/auth/AuthModal';
import CheckInModal from '@/components/auth/CheckInModal';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastProvider } from '@/context/ToastContext';
import Toast from '@/components/ui/Toast';
import { tools, getToolsByCategory } from '@/tools/registry';
import { getSystemSettings } from '@/lib/settings';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export async function generateMetadata() {
  const settings = await getSystemSettings();
  return {
    title: settings.site_title || '极粹工具 (Essence Tools)',
    description: settings.site_description || '免费在线工具集合，所有工具在浏览器本地运行，不上传任何数据。',
    keywords: settings.site_keywords || '在线工具, 小说排版, HTML编辑器, Markdown编辑器, 开发工具',
  };
}

export default async function RootLayout({ children }) {
  const toolsByCategory = getToolsByCategory();

  const inlineScript = `
    (function() {
      try {
        const isDark = localStorage.getItem('essence-dark') === 'true';
        if (isDark) {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {}
    })();
  `;

  return (
    <html lang="zh-CN" suppressHydrationWarning className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: inlineScript }} />
      </head>
      <body className="bg-bg antialiased font-sans" suppressHydrationWarning>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
            <SidebarProvider>
              <div className="flex h-screen overflow-hidden">
                <Sidebar tools={tools} toolsByCategory={toolsByCategory} />
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                  <Topbar />
                  <main className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 lg:p-8">
                    <ErrorBoundary>
                      {children}
                    </ErrorBoundary>
                  </main>
                </div>
              </div>
              <AuthModal />
              <CheckInModal />
            </SidebarProvider>
            <Toast />
          </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
