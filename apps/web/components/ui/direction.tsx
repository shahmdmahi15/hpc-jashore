'use client';

import * as React from 'react';

export type Direction = 'ltr' | 'rtl';

const DirectionContext = React.createContext<Direction>('ltr');

export function DirectionProvider({
  direction = 'ltr',
  children,
}: {
  direction?: Direction;
  children: React.ReactNode;
}) {
  return (
    <DirectionContext.Provider value={direction}>
      <div dir={direction} className="contents">
        {children}
      </div>
    </DirectionContext.Provider>
  );
}

export function useDirection(): Direction {
  return React.useContext(DirectionContext);
}
