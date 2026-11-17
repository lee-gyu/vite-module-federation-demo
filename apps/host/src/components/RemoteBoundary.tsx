import { Component, Suspense, type ReactNode } from 'react';

interface Props {
  /** 에러 메시지에 표시할 remote 이름 */
  name: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * remote 는 별도로 배포되는 앱이라 언제든 내려가 있을 수 있습니다.
 * Suspense(로딩) + ErrorBoundary(실패)로 감싸서 host 전체가 깨지지 않게 합니다.
 */
export class RemoteBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { name, children } = this.props;

    if (this.state.error) {
      return (
        <div className="remote-error" role="alert">
          <strong>{name}</strong> remote 를 불러오지 못했습니다.
          <br />
          <small>{this.state.error.message.split('\n')[0]}</small>
        </div>
      );
    }

    return (
      <Suspense fallback={<div className="remote-fallback">{name} 불러오는 중…</div>}>
        {children}
      </Suspense>
    );
  }
}
