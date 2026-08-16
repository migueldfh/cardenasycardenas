declare global {
  const Temporal: {
    PlainDate: {
      from: (item: string | { year: number; month: number; day: number }) => any;
      new (year: number, month: number, day: number): any;
    };
    Now: {
      plainDateISO: (timeZone?: string) => any;
      timeZoneId: () => string;
    };
    Instant: {
      fromEpochMilliseconds: (epochMilliseconds: number) => any;
    };
  };
}

export {};
