import React from 'react'

type State = { hasError: boolean; error?: Error | null }

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error('Unhandled error caught by ErrorBoundary', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Une erreur est survenue</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#c53030' }}>{String(this.state.error)}</pre>
          <p>Regarde la console du navigateur pour plus de détails.</p>
        </div>
      )
    }

    return this.props.children
  }
}
