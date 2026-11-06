'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/lib/action-result';
import { attempt } from './toast';

/** Przycisk wykonujący akcję serwerową z opcjonalnym potwierdzeniem i komunikatem. */
export function ActionButton({
  action,
  confirm: question,
  success,
  redirectTo,
  className = 'btn-outline',
  title,
  children,
}: {
  action: () => Promise<ActionResult<unknown>>;
  confirm?: string;
  success?: string;
  redirectTo?: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      title={title}
      disabled={pending}
      className={className}
      onClick={() => {
        if (question && !window.confirm(question)) return;
        startTransition(async () => {
          const r = await attempt(action(), success);
          if (r !== undefined && redirectTo) router.push(redirectTo);
        });
      }}
    >
      {children}
    </button>
  );
}
