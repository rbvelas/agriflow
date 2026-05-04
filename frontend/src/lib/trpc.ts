import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc = createTRPCReact<any>();

export function getTrpcClient() {
  // En producción apunta directo al backend de Render
  // En desarrollo usa localhost
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${apiUrl}/trpc`,
        headers: () => {
          const token =
            typeof window !== 'undefined'
              ? localStorage.getItem('agriflow_token')
              : null;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}