import { useWebSocket } from '../hooks/useWebSocket';

export default function Dashboard() {
  const { lastMessage, status } = useWebSocket('/ws/sensors/', 1); // replace 1 with your real household id

  return (
    <div>
      <h1>Dashboard (WebSocket test)</h1>
      <p>Connection status: {status}</p>
      <pre>{JSON.stringify(lastMessage, null, 2)}</pre>
    </div>
  );
}