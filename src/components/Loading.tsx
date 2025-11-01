import './Loading.css';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export default function Loading({ message, size = 'medium' }: LoadingProps) {
  return (
    <div className={`loading-container loading-${size}`}>
      <div className="loading-bars">
        <div className="loading-bar loading-bar-1"></div>
        <div className="loading-bar loading-bar-2"></div>
        <div className="loading-bar loading-bar-3"></div>
        <div className="loading-bar loading-bar-4"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}

