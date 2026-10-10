export default function WaterTower() {
  return (
    <svg viewBox="0 0 320 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <line className="t-line" x1="20" y1="380" x2="300" y2="380" strokeWidth="4" strokeLinecap="round" />
      <g className="t-line" strokeWidth="6" strokeLinecap="round">
        <line x1="104" y1="212" x2="78" y2="380" />
        <line x1="216" y1="212" x2="242" y2="380" />
        <line x1="136" y1="212" x2="128" y2="380" />
        <line x1="184" y1="212" x2="192" y2="380" />
      </g>
      <g className="t-line" strokeWidth="3" strokeLinecap="round">
        <line x1="96" y1="262" x2="224" y2="300" />
        <line x1="224" y1="262" x2="96" y2="300" />
        <line x1="86" y1="330" x2="234" y2="330" />
      </g>
      <line className="t-line" x1="160" y1="66" x2="160" y2="46" strokeWidth="4" strokeLinecap="round" />
      <circle className="t-heart" cx="160" cy="42" r="6" />
      <path className="t-fill" d="M82 116 L160 70 L238 116 Z" strokeWidth="4" strokeLinejoin="round" />
      <rect className="t-fill" x="90" y="116" width="140" height="96" rx="6" strokeWidth="4" />
      <path
        className="t-heart"
        d="M160 196c-34-22-36-52-14-58 9-2.5 14 4 14 9 0-5 5-11.5 14-9 22 6 20 36-14 58z"
      />
    </svg>
  );
}
