import React, { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function NativeWindStyleProvider({ children }: Props) {
  return <>{children}</>;
}
