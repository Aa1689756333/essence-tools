'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/20">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>

            <h1 className="text-2xl font-bold text-text mb-3">
              组件出错了
            </h1>
            <h2 className="text-lg font-semibold text-text mb-4">
              这个组件遇到了问题
            </h2>

            <div className="mb-6 p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
              <p className="text-sm text-text-secondary font-mono text-left break-words">
                {this.state.error?.message || '未知错误'}
              </p>
            </div>

            <p className="text-text-secondary mb-8 leading-relaxed">
              抱歉，这个组件遇到了意外错误。<br />
              您可以尝试重新加载，或返回首页。
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.resetError}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-card text-text font-medium transition-all hover:bg-bg-primary hover:border-border-light"
              >
                <RefreshCw className="w-4 h-4" />
                重新加载
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all hover:shadow-lg hover:-translate-y-0.5"
                style={{
                  background: 'var(--theme-gradient, linear-gradient(135deg, #10b981, #34d399))',
                }}
              >
                <Home className="w-4 h-4" />
                返回首页
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
