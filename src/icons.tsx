export type IconName =
  | "play"
  | "pause"
  | "sound"
  | "mute"
  | "help"
  | "arrow"
  | "jump"
  | "cheese"
  | "trophy"
  | "close"
  | "check"
  | "sun"
  | "moon"
  | "mountain"
  | "download"
  | "flag"
  | "reset";
const paths: Record<IconName, React.ReactNode> = {
  play: <path d="m9 5 11 7-11 7Z" />,
  pause: (
    <>
      <path d="M8 5v14M16 5v14" />
    </>
  ),
  sound: (
    <>
      <path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16" />
    </>
  ),
  mute: (
    <>
      <path d="m11 4-6 5H2v6h3l6 5ZM16 9l6 6m0-6-6 6" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 4 2l-1.5 1v2M12 17h.01" />
    </>
  ),
  arrow: <path d="M4 12h15m-5-5 5 5-5 5" />,
  jump: <path d="M12 20V4M5 11l7-7 7 7" />,
  cheese: (
    <>
      <path d="m3 9 13-5 5 8v8L3 17Zm0 0 18 3" />
      <path d="M8 13h.01M15 16h.01M15 9h.01" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 3h10v7a5 5 0 0 1-10 0Zm0 2H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 15v6m-5 0h10" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  moon: <path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z" />,
  mountain: <path d="m2 20 7-14 5 9 3-6 5 11Zm4-8 3 2 2-2" />,
  download: <path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" />,
  flag: <path d="M5 22V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0" />,
  reset: (
    <>
      <path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" />
    </>
  ),
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function MouseMark() {
  return (
    <svg
      className="mouse-mark"
      width="43"
      height="43"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round">
        <circle cx="19" cy="19" r="11" fill="#ecd9b4" />
        <circle cx="42" cy="17" r="10" fill="#ecd9b4" />
        <path
          d="M13 38C13 18 44 18 48 32l8 9-8 5c-15 11-35 9-35-8Z"
          fill="#ecd9b4"
        />
        <path d="m26 35 9-3 8 4" />
        <circle cx="39" cy="37" r="2" fill="currentColor" />
        <path d="m53 38 5 2-4 3Z" fill="currentColor" />
        <path d="m17 48 21 3-3 6-20-3Z" fill="#d76a3f" />
      </g>
    </svg>
  );
}
