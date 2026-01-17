'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDepositModal } from '@/components/DepositModal';

export default function OnboardPage() {
  const router = useRouter();
  const { openDeposit } = useDepositModal();

  useEffect(() => {
    // Open the deposit modal and redirect to the main page
    openDeposit();
    router.replace('/robo');
  }, [openDeposit, router]);

  return null;
}
