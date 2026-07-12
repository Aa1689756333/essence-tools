import './globals.css';
import Sidebar from '@/shell/Sidebar';
import Topbar from '@/shell/Topbar';
import ThemeProvider from '@/shell/ThemeProvider';
import { SidebarProvider } from '@/shell/useSidebar';
import { tools, getToolsByCategory } from '@/tools/registry';

export const metadata = {
  title: 'ToolBox · 在线工具箱',
  description: '免费在线工具集合，所有工具在浏览器本地运行，不上传任何数据。',
};

export default function RootLayout({ children }) {
  const toolsByCategory = getToolsByCategory();

  return (
    <html lang="zh-CN">
      <body className="bg-bg antialiased">
        <ThemeProvider>
          <SidebarProvider>
            <div className="flex h-screen overflow-hidden">
              <Sidebar tools={tools} toolsByCategory={toolsByCategory} />
              <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 lg:p-8">
                  {children}
                </main>
              </div>
            </div>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
